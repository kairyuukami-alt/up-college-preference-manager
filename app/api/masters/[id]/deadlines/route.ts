import { getD1 } from "@/db";
import { recordAuditEvent } from "@/lib/counselling-operations";
import { requireAdmin } from "@/lib/portal-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const result = await getD1().prepare(`
      SELECT id, master_id AS masterId, title, due_at AS dueAt, notes,
             created_at AS createdAt, updated_at AS updatedAt
      FROM counselling_deadlines WHERE master_id = ? ORDER BY due_at ASC
    `).bind(id).all();
    return Response.json({ deadlines: result.results });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't load counselling deadlines." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id: masterId } = await context.params;
    const payload = await request.json() as { title?: unknown; dueAt?: unknown; notes?: unknown };
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const dueAt = Number(payload.dueAt);
    const notes = typeof payload.notes === "string" ? payload.notes.trim().slice(0, 500) : "";
    if (title.length < 2 || title.length > 120 || !Number.isFinite(dueAt)) {
      return Response.json({ error: "Enter a valid deadline title and date." }, { status: 400 });
    }
    const deadline = { id: crypto.randomUUID(), masterId, title, dueAt, notes: notes || null, createdAt: Date.now(), updatedAt: Date.now() };
    await getD1().prepare(`
      INSERT INTO counselling_deadlines (id, master_id, title, due_at, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(deadline.id, masterId, title, dueAt, deadline.notes, deadline.createdAt, deadline.updatedAt).run();
    await recordAuditEvent(null, "admin", "deadline_added", { masterId, title, dueAt });
    return Response.json({ deadline }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't add this counselling deadline." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id: masterId } = await context.params;
    const payload = await request.json() as { deadlineId?: unknown };
    const deadlineId = typeof payload.deadlineId === "string" ? payload.deadlineId : "";
    const existing = await getD1().prepare(
      "SELECT title FROM counselling_deadlines WHERE id = ? AND master_id = ?",
    ).bind(deadlineId, masterId).first();
    if (!existing) return Response.json({ error: "Deadline not found." }, { status: 404 });
    await getD1().prepare("DELETE FROM counselling_deadlines WHERE id = ? AND master_id = ?").bind(deadlineId, masterId).run();
    await recordAuditEvent(null, "admin", "deadline_deleted", { masterId, title: existing.title });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't remove this deadline." }, { status: 500 });
  }
}
