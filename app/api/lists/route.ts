import { getD1 } from "@/db";
import { recordAuditEvent } from "@/lib/counselling-operations";
import { BUILTIN_COLLEGES, BUILTIN_MASTER_ID } from "@/lib/master-data";
import { hashStudentPassword, isValidStudentPassword, requireAdmin, verifyStudentPassword } from "@/lib/portal-auth";

function errorResponse(error: unknown) {
  console.error(error);
  return Response.json(
    { error: "We couldn't access the saved preference lists. Please try again." },
    { status: 500 },
  );
}

function validCollegeIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id < 1) || new Set(ids).size !== ids.length) return null;
  return ids;
}

async function masterCollegeIds(masterId: string): Promise<number[]> {
  if (masterId === BUILTIN_MASTER_ID) return BUILTIN_COLLEGES.map((college) => college.id);
  const result = await getD1()
    .prepare("SELECT id FROM master_colleges WHERE master_id = ? ORDER BY position ASC")
    .bind(masterId)
    .all();
  return result.results.map((row: Record<string, unknown>) => Number(row.id));
}

export async function GET(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const result = await getD1()
      .prepare(`
        SELECT l.id, l.student_name AS studentName,
               COALESCE(l.master_id, ?) AS masterId,
               l.locked_at AS lockedAt, l.created_at AS createdAt,
               l.updated_at AS updatedAt, COUNT(i.id) AS collegeCount,
               CASE WHEN l.student_pin_hash IS NULL THEN 0 ELSE 1 END AS hasStudentPassword
        FROM preference_lists l
        LEFT JOIN preference_items i ON i.list_id = l.id
        GROUP BY l.id
        ORDER BY l.updated_at DESC, l.student_name COLLATE NOCASE ASC
      `)
      .bind(BUILTIN_MASTER_ID)
      .all();
    return Response.json({
      lists: result.results.map((row: Record<string, unknown>) => ({
        ...row,
        hasStudentPassword: Boolean(row.hasStudentPassword),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const payload = (await request.json()) as {
      studentName?: string;
      masterId?: string;
      mode?: "master" | "blank";
      collegeIds?: unknown;
      studentPassword?: string;
      password?: string;
    };
    const studentName = payload.studentName?.trim() ?? "";
    const studentPassword = payload.studentPassword ?? payload.password ?? "";
    const masterId = payload.masterId?.trim() || BUILTIN_MASTER_ID;
    if (!studentName) return Response.json({ error: "Student name is required." }, { status: 400 });
    if (studentName.length > 100) return Response.json({ error: "Student name is too long." }, { status: 400 });
    if (!isValidStudentPassword(studentPassword)) {
      return Response.json({ error: "Set a 4 to 32 character student password without spaces." }, { status: 400 });
    }
    const allowedIds = await masterCollegeIds(masterId);
    if (!allowedIds.length) return Response.json({ error: "The selected counselling list is empty or unavailable." }, { status: 400 });
    const suppliedIds = payload.collegeIds === undefined ? null : validCollegeIds(payload.collegeIds);
    if (payload.collegeIds !== undefined && !suppliedIds) {
      return Response.json({ error: "The preference order is invalid." }, { status: 400 });
    }
    const allowedSet = new Set(allowedIds);
    if (suppliedIds?.some((id) => !allowedSet.has(id))) {
      return Response.json({ error: "The preference list contains a college from another counselling." }, { status: 400 });
    }

    const collegeIds = suppliedIds ?? (payload.mode === "blank" ? [] : allowedIds);
    const id = crypto.randomUUID();
    const now = Date.now();
    const db = getD1();
    const sameName = await getD1().prepare(`
      SELECT student_pin_hash AS passwordHash, student_pin_salt AS passwordSalt
      FROM preference_lists
      WHERE student_name = ? COLLATE NOCASE
        AND student_pin_hash IS NOT NULL AND student_pin_salt IS NOT NULL
      LIMIT 100
    `).bind(studentName).all();
    for (const row of sameName.results as Record<string, unknown>[]) {
      if (await verifyStudentPassword(studentPassword, String(row.passwordHash), String(row.passwordSalt))) {
        return Response.json({ error: "Use a unique password for accounts that share the same student name." }, { status: 409 });
      }
    }
    const credentials = await hashStudentPassword(studentPassword);
    await db.batch([
      db.prepare(
        "INSERT INTO preference_lists (id, student_name, master_id, student_pin_hash, student_pin_salt, student_setup_hash, student_setup_salt, student_setup_expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)",
      ).bind(id, studentName, masterId, credentials.hash, credentials.salt, now, now),
      db.prepare(
        "INSERT INTO student_profiles (list_id, data_json, locked_at, created_at, updated_at) VALUES (?, '{}', NULL, ?, ?)",
      ).bind(id, now, now),
      ...collegeIds.map((collegeId, index) =>
        db.prepare("INSERT INTO preference_items (list_id, college_id, position) VALUES (?, ?, ?)")
          .bind(id, collegeId, index + 1),
      ),
    ]);
    await recordAuditEvent(id, "admin", "student_account_created", { studentName, masterId, collegeCount: collegeIds.length });
    return Response.json({
      list: {
        id,
        studentName,
        masterId,
        lockedAt: null,
        hasStudentPassword: true,
        createdAt: now,
        updatedAt: now,
        collegeCount: collegeIds.length,
      },
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
