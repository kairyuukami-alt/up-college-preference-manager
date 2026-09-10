import { getD1 } from "@/db";
import { requireAdmin } from "@/lib/portal-auth";
import { recordAuditEvent } from "@/lib/counselling-operations";

function errorResponse(error: unknown) {
  console.error(error);
  return Response.json(
    { error: "We couldn't update this counselling question. Please try again." },
    { status: 500 },
  );
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const payload = (await request.json()) as {
      status?: unknown;
      priority?: unknown;
      assignedCounsellor?: unknown;
      replyNotes?: unknown;
    };
    const existing = await getD1().prepare(`
      SELECT status, priority, assigned_counsellor AS assignedCounsellor,
             reply_notes AS replyNotes, replied_at AS repliedAt
      FROM counselling_questions WHERE id = ?
    `).bind(id).first();
    if (!existing) return Response.json({ error: "This question no longer exists." }, { status: 404 });
    const status = payload.status === undefined ? String(existing.status) : payload.status;
    const priority = payload.priority === undefined ? String(existing.priority) : payload.priority;
    const assignedCounsellor = payload.assignedCounsellor === undefined
      ? String(existing.assignedCounsellor ?? "")
      : typeof payload.assignedCounsellor === "string" ? payload.assignedCounsellor.trim().slice(0, 100) : "";
    const replyNotes = payload.replyNotes === undefined
      ? String(existing.replyNotes ?? "")
      : typeof payload.replyNotes === "string" ? payload.replyNotes.trim().slice(0, 2_000) : "";
    if (status !== "open" && status !== "replied") {
      return Response.json({ error: "Choose a valid question status." }, { status: 400 });
    }
    if (priority !== "urgent" && priority !== "normal" && priority !== "low") {
      return Response.json({ error: "Choose a valid question priority." }, { status: 400 });
    }

    const updatedAt = Date.now();
    const repliedAt = status === "replied" ? Number(existing.repliedAt ?? updatedAt) : null;
    const result = await getD1().prepare(
      "UPDATE counselling_questions SET status = ?, priority = ?, assigned_counsellor = ?, reply_notes = ?, replied_at = ?, updated_at = ? WHERE id = ?",
    ).bind(status, priority, assignedCounsellor || null, replyNotes || null, repliedAt, updatedAt, id).run();
    if (!result.meta.changes) {
      return Response.json({ error: "This question no longer exists." }, { status: 404 });
    }
    await recordAuditEvent(null, "admin", "question_updated", { questionId: id, status, priority, assignedCounsellor });
    return Response.json({ ok: true, status, priority, assignedCounsellor, replyNotes, repliedAt, updatedAt });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const result = await getD1().prepare("DELETE FROM counselling_questions WHERE id = ?").bind(id).run();
    if (!result.meta.changes) {
      return Response.json({ error: "This question no longer exists." }, { status: 404 });
    }
    await recordAuditEvent(null, "admin", "question_deleted", { questionId: id });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
