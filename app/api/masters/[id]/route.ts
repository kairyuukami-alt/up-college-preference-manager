import { getD1 } from "@/db";
import { recordAuditEvent } from "@/lib/counselling-operations";
import { BUILTIN_COLLEGES, BUILTIN_MASTER, BUILTIN_MASTER_ID, type MasterCollege } from "@/lib/master-data";
import { requireAdmin } from "@/lib/portal-auth";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  console.error(error);
  return Response.json(
    { error: "We couldn't open this counselling master list. Please try again." },
    { status: 500 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    if (id === BUILTIN_MASTER_ID) {
      return Response.json({ master: BUILTIN_MASTER, colleges: BUILTIN_COLLEGES });
    }

    const db = getD1();
    const row = await db.prepare(`
      SELECT id, title, source_filename AS sourceFilename, columns_json AS columnsJson,
             college_name_key AS collegeNameKey, preference_key AS preferenceKey,
             updated_at AS updatedAt
      FROM counselling_masters WHERE id = ?
    `).bind(id).first();
    if (!row) return Response.json({ error: "Counselling list not found." }, { status: 404 });

    const result = await db.prepare(
      "SELECT id, position, data_json AS dataJson FROM master_colleges WHERE master_id = ? ORDER BY position ASC",
    ).bind(id).all();
    const colleges: MasterCollege[] = result.results.map((college: Record<string, unknown>) => {
      const data = JSON.parse(String(college.dataJson));
      return {
        id: Number(college.id),
        position: Number(college.position),
        name: String(data[String(row.collegeNameKey)] ?? ""),
        data,
      };
    });
    return Response.json({
      master: {
        id: row.id,
        title: row.title,
        sourceFilename: row.sourceFilename,
        columns: JSON.parse(String(row.columnsJson)),
        collegeNameKey: row.collegeNameKey,
        preferenceKey: row.preferenceKey,
        updatedAt: row.updatedAt,
        collegeCount: colleges.length,
        builtin: false,
      },
      colleges,
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
    if (id === BUILTIN_MASTER_ID) {
      return Response.json({ error: "The built-in counselling list cannot be deleted." }, { status: 400 });
    }

    const db = getD1();
    const master = await db.prepare("SELECT id FROM counselling_masters WHERE id = ?").bind(id).first();
    if (!master) return Response.json({ error: "Counselling list not found." }, { status: 404 });

    const usage = await db.prepare(
      "SELECT COUNT(*) AS studentListCount FROM preference_lists WHERE master_id = ?",
    ).bind(id).first();
    const studentListCount = Number(usage?.studentListCount ?? 0);
    if (studentListCount > 0) {
      return Response.json({
        error: `Delete the ${studentListCount} student preference ${studentListCount === 1 ? "list" : "lists"} using this counselling before deleting it.`,
      }, { status: 409 });
    }

    await db.batch([
      db.prepare("DELETE FROM required_documents WHERE master_id = ?").bind(id),
      db.prepare("DELETE FROM counselling_deadlines WHERE master_id = ?").bind(id),
      db.prepare("DELETE FROM master_colleges WHERE master_id = ?").bind(id),
      db.prepare("DELETE FROM counselling_masters WHERE id = ?").bind(id),
    ]);
    await recordAuditEvent(null, "admin", "counselling_master_deleted", { masterId: id });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
