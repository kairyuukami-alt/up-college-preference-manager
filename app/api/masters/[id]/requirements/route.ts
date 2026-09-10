import { getD1 } from "@/db";
import { listRequirements, recordAuditEvent } from "@/lib/counselling-operations";
import { requireAdmin } from "@/lib/portal-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    return Response.json({ requirements: await listRequirements(id) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't load the document checklist." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id: masterId } = await context.params;
    const payload = await request.json() as { documentName?: unknown };
    const documentName = typeof payload.documentName === "string" ? payload.documentName.trim().replace(/\s+/gu, " ") : "";
    if (documentName.length < 2 || documentName.length > 100) {
      return Response.json({ error: "Enter a document name of 2 to 100 characters." }, { status: 400 });
    }
    const requirement = { id: crypto.randomUUID(), masterId, documentName, createdAt: Date.now() };
    await getD1().prepare(
      "INSERT INTO required_documents (id, master_id, document_name, created_at) VALUES (?, ?, ?, ?)",
    ).bind(requirement.id, masterId, documentName, requirement.createdAt).run();
    await recordAuditEvent(null, "admin", "document_requirement_added", { masterId, documentName });
    return Response.json({ requirement }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = String(error).includes("UNIQUE") ? "This document is already required for the counselling." : "We couldn't add this document requirement.";
    return Response.json({ error: message }, { status: String(error).includes("UNIQUE") ? 409 : 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id: masterId } = await context.params;
    const payload = await request.json() as { requirementId?: unknown };
    const requirementId = typeof payload.requirementId === "string" ? payload.requirementId : "";
    const existing = await getD1().prepare(
      "SELECT document_name AS documentName FROM required_documents WHERE id = ? AND master_id = ?",
    ).bind(requirementId, masterId).first();
    if (!existing) return Response.json({ error: "Document requirement not found." }, { status: 404 });
    await getD1().prepare("DELETE FROM required_documents WHERE id = ? AND master_id = ?").bind(requirementId, masterId).run();
    await recordAuditEvent(null, "admin", "document_requirement_deleted", { masterId, documentName: existing.documentName });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't remove this document requirement." }, { status: 500 });
  }
}
