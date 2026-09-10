import { getD1 } from "@/db";
import { preferenceCollegeIds, recordAuditEvent, savePreferenceVersion } from "@/lib/counselling-operations";
import { BUILTIN_COLLEGES, BUILTIN_MASTER_ID } from "@/lib/master-data";
import { requireAdmin } from "@/lib/portal-auth";

type RouteContext = { params: Promise<{ id: string }> };

async function allowedIds(masterId: string) {
  if (masterId === BUILTIN_MASTER_ID) return new Set(BUILTIN_COLLEGES.map((college) => college.id));
  const rows = await getD1().prepare("SELECT id FROM master_colleges WHERE master_id = ?").bind(masterId).all();
  return new Set(rows.results.map((row: Record<string, unknown>) => Number(row.id)));
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const exists = await getD1().prepare("SELECT id FROM preference_lists WHERE id = ?").bind(id).first();
    if (!exists) return Response.json({ error: "Student account not found." }, { status: 404 });
    const rows = await getD1().prepare(`
      SELECT id, student_name AS studentName, college_ids_json AS collegeIdsJson,
             actor_role AS actorRole, created_at AS createdAt
      FROM preference_list_versions WHERE list_id = ? ORDER BY created_at DESC LIMIT 100
    `).bind(id).all();
    return Response.json({ versions: rows.results.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      studentName: String(row.studentName),
      collegeIds: JSON.parse(String(row.collegeIdsJson)) as number[],
      actorRole: String(row.actorRole),
      createdAt: Number(row.createdAt),
    })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't load preference-list history." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const payload = await request.json() as { versionId?: string };
    if (!payload.versionId) return Response.json({ error: "Choose a version to restore." }, { status: 400 });
    const db = getD1();
    const list = await db.prepare(`
      SELECT student_name AS studentName, COALESCE(master_id, ?) AS masterId, locked_at AS lockedAt
      FROM preference_lists WHERE id = ?
    `).bind(BUILTIN_MASTER_ID, id).first();
    if (!list) return Response.json({ error: "Student account not found." }, { status: 404 });
    if (list.lockedAt) return Response.json({ error: "Unlock the preference list before restoring a version." }, { status: 423 });
    const version = await db.prepare(
      "SELECT college_ids_json AS collegeIdsJson FROM preference_list_versions WHERE id = ? AND list_id = ?",
    ).bind(payload.versionId, id).first();
    if (!version) return Response.json({ error: "Preference-list version not found." }, { status: 404 });
    const collegeIds = JSON.parse(String(version.collegeIdsJson)) as number[];
    const allowed = await allowedIds(String(list.masterId));
    if (!Array.isArray(collegeIds) || collegeIds.some((collegeId) => !Number.isInteger(collegeId) || !allowed.has(collegeId))) {
      return Response.json({ error: "This version no longer matches the active counselling master." }, { status: 409 });
    }
    await savePreferenceVersion(id, String(list.studentName), await preferenceCollegeIds(id), "admin");
    const now = Date.now();
    await db.batch([
      db.prepare("DELETE FROM preference_items WHERE list_id = ?").bind(id),
      ...collegeIds.map((collegeId, index) => db.prepare(
        "INSERT INTO preference_items (list_id, college_id, position) VALUES (?, ?, ?)",
      ).bind(id, collegeId, index + 1)),
      db.prepare("UPDATE preference_lists SET updated_at = ? WHERE id = ?").bind(now, id),
    ]);
    await recordAuditEvent(id, "admin", "preference_version_restored", { versionId: payload.versionId, collegeCount: collegeIds.length });
    return Response.json({ ok: true, collegeIds, updatedAt: now });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't restore this preference-list version." }, { status: 500 });
  }
}
