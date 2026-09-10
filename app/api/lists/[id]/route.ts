import { getD1, getR2, getRuntimeValue } from "@/db";
import { preferenceCollegeIds, recordAuditEvent, savePreferenceVersion } from "@/lib/counselling-operations";
import { BUILTIN_COLLEGES, BUILTIN_MASTER_ID } from "@/lib/master-data";
import { passwordsMatch, requireAdmin } from "@/lib/portal-auth";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  console.error(error);
  return Response.json(
    { error: "We couldn't update this preference list. Please try again." },
    { status: 500 },
  );
}

function validCollegeIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id < 1) || new Set(ids).size !== ids.length) return null;
  return ids;
}

async function allowedCollegeIds(masterId: string): Promise<Set<number>> {
  if (masterId === BUILTIN_MASTER_ID) return new Set(BUILTIN_COLLEGES.map((college) => college.id));
  const result = await getD1().prepare("SELECT id FROM master_colleges WHERE master_id = ?").bind(masterId).all();
  return new Set(result.results.map((row: Record<string, unknown>) => Number(row.id)));
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const db = getD1();
    const list = await db.prepare(`
      SELECT id, student_name AS studentName, COALESCE(master_id, ?) AS masterId,
             locked_at AS lockedAt, created_at AS createdAt, updated_at AS updatedAt,
             CASE WHEN student_pin_hash IS NULL THEN 0 ELSE 1 END AS hasStudentPassword
      FROM preference_lists WHERE id = ?
    `).bind(BUILTIN_MASTER_ID, id).first();
    if (!list) return Response.json({ error: "List not found." }, { status: 404 });

    const items = await db
      .prepare("SELECT college_id AS collegeId, position FROM preference_items WHERE list_id = ? ORDER BY position ASC")
      .bind(id)
      .all();
    return Response.json({
      list: {
        ...list,
        hasStudentPassword: Boolean(list.hasStudentPassword),
        collegeIds: items.results.map((item: Record<string, unknown>) => Number(item.collegeId)),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const payload = (await request.json()) as { studentName?: string; collegeIds?: unknown };
    const studentName = payload.studentName?.trim() ?? "";
    const collegeIds = validCollegeIds(payload.collegeIds);
    if (!studentName) return Response.json({ error: "Student name is required." }, { status: 400 });
    if (studentName.length > 100 || !collegeIds) {
      return Response.json({ error: "The list details are invalid." }, { status: 400 });
    }

    const db = getD1();
    const existing = await db.prepare(
      "SELECT student_name AS studentName, COALESCE(master_id, ?) AS masterId, locked_at AS lockedAt FROM preference_lists WHERE id = ?",
    ).bind(BUILTIN_MASTER_ID, id).first();
    if (!existing) return Response.json({ error: "List not found." }, { status: 404 });
    if (existing.lockedAt) {
      return Response.json({ error: "This preference list is locked. Unlock it before making changes." }, { status: 423 });
    }

    const allowed = await allowedCollegeIds(String(existing.masterId));
    if (collegeIds.some((collegeId) => !allowed.has(collegeId))) {
      return Response.json({ error: "The list contains a college from another counselling." }, { status: 400 });
    }

    const now = Date.now();
    await savePreferenceVersion(id, String(existing.studentName), await preferenceCollegeIds(id), "admin");
    await db.batch([
      db.prepare("UPDATE preference_lists SET student_name = ?, updated_at = ? WHERE id = ?").bind(studentName, now, id),
      db.prepare("DELETE FROM preference_items WHERE list_id = ?").bind(id),
      ...collegeIds.map((collegeId, index) =>
        db.prepare("INSERT INTO preference_items (list_id, college_id, position) VALUES (?, ?, ?)")
          .bind(id, collegeId, index + 1),
      ),
    ]);
    await recordAuditEvent(id, "admin", "preference_list_saved", { collegeCount: collegeIds.length, studentName });
    return Response.json({
      list: { id, studentName, masterId: existing.masterId, lockedAt: null, updatedAt: now, collegeCount: collegeIds.length },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const db = getD1();
    const existing = await db.prepare(`
      SELECT l.student_name AS studentName, l.locked_at AS choiceLockedAt, p.locked_at AS profileLockedAt
      FROM preference_lists l LEFT JOIN student_profiles p ON p.list_id = l.id WHERE l.id = ?
    `).bind(id).first();
    if (!existing) return Response.json({ error: "List not found." }, { status: 404 });
    const isLocked = Boolean(existing.choiceLockedAt || existing.profileLockedAt);
    if (isLocked) {
      const payload = await request.json().catch(() => ({})) as { password?: string };
      const configuredPassword = getRuntimeValue("PREFERENCE_UNLOCK_PASSWORD");
      if (!configuredPassword) throw new Error("Administrator password is not configured.");
      if (!(await passwordsMatch(payload.password ?? "", configuredPassword))) {
        return Response.json({ error: "The administrator password is required to delete this locked profile." }, { status: 401 });
      }
    }
    const documents = await db.prepare("SELECT object_key AS objectKey FROM profile_documents WHERE list_id = ?").bind(id).all();
    const objectKeys = documents.results.map((row: Record<string, unknown>) => String(row.objectKey));
    if (objectKeys.length) await getR2().delete(objectKeys);
    await db.prepare("DELETE FROM preference_lists WHERE id = ?").bind(id).run();
    await recordAuditEvent(id, "admin", "student_profile_deleted", {
      studentName: String(existing.studentName),
      deletedDocumentCount: objectKeys.length,
      wasLocked: isLocked,
    });
    return Response.json({ ok: true, deletedDocumentCount: objectKeys.length });
  } catch (error) {
    return errorResponse(error);
  }
}
