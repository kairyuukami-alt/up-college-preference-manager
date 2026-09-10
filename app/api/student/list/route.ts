import { getD1 } from "@/db";
import { preferenceCollegeIds, recordAuditEvent, savePreferenceVersion } from "@/lib/counselling-operations";
import { BUILTIN_COLLEGES, BUILTIN_MASTER, BUILTIN_MASTER_ID, type MasterCollege } from "@/lib/master-data";
import { requireStudent } from "@/lib/portal-auth";

function validCollegeIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id < 1) || new Set(ids).size !== ids.length) return null;
  return ids;
}

async function studentPayload(listId: string) {
  const db = getD1();
  const list = await db.prepare(`
    SELECT id, student_name AS studentName, COALESCE(master_id, ?) AS masterId,
           locked_at AS lockedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM preference_lists WHERE id = ?
  `).bind(BUILTIN_MASTER_ID, listId).first();
  if (!list) return null;

  const itemResult = await db.prepare(
    "SELECT college_id AS collegeId FROM preference_items WHERE list_id = ? ORDER BY position ASC",
  ).bind(listId).all();
  const masterId = String(list.masterId);
  if (masterId === BUILTIN_MASTER_ID) {
    return {
      list: { ...list, collegeIds: itemResult.results.map((item: Record<string, unknown>) => Number(item.collegeId)) },
      master: BUILTIN_MASTER,
      colleges: BUILTIN_COLLEGES,
    };
  }

  const masterRow = await db.prepare(`
    SELECT id, title, source_filename AS sourceFilename, columns_json AS columnsJson,
           college_name_key AS collegeNameKey, preference_key AS preferenceKey,
           updated_at AS updatedAt
    FROM counselling_masters WHERE id = ?
  `).bind(masterId).first();
  if (!masterRow) return null;
  const collegeResult = await db.prepare(
    "SELECT id, position, data_json AS dataJson FROM master_colleges WHERE master_id = ? ORDER BY position ASC",
  ).bind(masterId).all();
  const colleges: MasterCollege[] = collegeResult.results.map((college: Record<string, unknown>) => {
    const data = JSON.parse(String(college.dataJson));
    return {
      id: Number(college.id),
      position: Number(college.position),
      name: String(data[String(masterRow.collegeNameKey)] ?? ""),
      data,
    };
  });
  return {
    list: { ...list, collegeIds: itemResult.results.map((item: Record<string, unknown>) => Number(item.collegeId)) },
    master: {
      id: masterRow.id,
      title: masterRow.title,
      sourceFilename: masterRow.sourceFilename,
      columns: JSON.parse(String(masterRow.columnsJson)),
      collegeNameKey: masterRow.collegeNameKey,
      preferenceKey: masterRow.preferenceKey,
      updatedAt: masterRow.updatedAt,
      collegeCount: colleges.length,
      builtin: false,
    },
    colleges,
  };
}

export async function GET(request: Request) {
  try {
    const session = await requireStudent(request);
    if (session instanceof Response) return session;
    const data = await studentPayload(String(session.listId));
    if (!data) return Response.json({ error: "Your preference list is unavailable." }, { status: 404 });
    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't open your preference list." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireStudent(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as { collegeIds?: unknown };
    const collegeIds = validCollegeIds(payload.collegeIds);
    if (!collegeIds) return Response.json({ error: "The preference order is invalid." }, { status: 400 });

    const db = getD1();
    const existing = await db.prepare(`
      SELECT student_name AS studentName, COALESCE(master_id, ?) AS masterId, locked_at AS lockedAt
      FROM preference_lists WHERE id = ?
    `).bind(BUILTIN_MASTER_ID, session.listId).first();
    if (!existing) return Response.json({ error: "Your preference list is unavailable." }, { status: 404 });
    if (existing.lockedAt) {
      return Response.json({ error: "This preference list is locked. Contact the administrator to make changes." }, { status: 423 });
    }

    const masterId = String(existing.masterId);
    let allowed: Set<number>;
    if (masterId === BUILTIN_MASTER_ID) {
      allowed = new Set(BUILTIN_COLLEGES.map((college) => college.id));
    } else {
      const result = await db.prepare("SELECT id FROM master_colleges WHERE master_id = ?").bind(masterId).all();
      allowed = new Set(result.results.map((row: Record<string, unknown>) => Number(row.id)));
    }
    if (collegeIds.some((collegeId) => !allowed.has(collegeId))) {
      return Response.json({ error: "The list contains a college from another counselling." }, { status: 400 });
    }

    const now = Date.now();
    await savePreferenceVersion(String(session.listId), String(existing.studentName), await preferenceCollegeIds(String(session.listId)), "student");
    await db.batch([
      db.prepare("UPDATE preference_lists SET updated_at = ? WHERE id = ?").bind(now, session.listId),
      db.prepare("DELETE FROM preference_items WHERE list_id = ?").bind(session.listId),
      ...collegeIds.map((collegeId, index) =>
        db.prepare("INSERT INTO preference_items (list_id, college_id, position) VALUES (?, ?, ?)")
          .bind(session.listId, collegeId, index + 1),
      ),
    ]);
    await recordAuditEvent(String(session.listId), "student", "preference_list_saved", { collegeCount: collegeIds.length });
    return Response.json({ ok: true, updatedAt: now, collegeCount: collegeIds.length });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't save your preference list." }, { status: 500 });
  }
}
