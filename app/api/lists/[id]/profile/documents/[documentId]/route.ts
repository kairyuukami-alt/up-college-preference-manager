import { requireAdmin } from "@/lib/portal-auth";
import { documentResponse, readProfileDocument, removeProfileDocument, reviewProfileDocument } from "@/lib/profile-server";
import { recordAuditEvent } from "@/lib/counselling-operations";

type RouteContext = { params: Promise<{ id: string; documentId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id, documentId } = await context.params;
  const result = await readProfileDocument(id, documentId);
  const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
  return result ? documentResponse(result, disposition) : Response.json({ error: "Document not found." }, { status: 404 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id, documentId } = await context.params;
    const payload = await request.json() as { status?: unknown; reason?: unknown; rejectionReason?: unknown };
    const status = typeof payload.status === "string" ? payload.status : "";
    const reason = typeof payload.rejectionReason === "string" ? payload.rejectionReason : typeof payload.reason === "string" ? payload.reason : "";
    if (!["uploaded", "accepted", "rejected", "reupload_required"].includes(status)) {
      return Response.json({ error: "Choose a valid document status." }, { status: 400 });
    }
    const result = await reviewProfileDocument(id, documentId, status as "uploaded" | "accepted" | "rejected" | "reupload_required", reason);
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    await recordAuditEvent(id, "admin", "document_reviewed", { status, reason: result.rejectionReason });
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't review this document." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id, documentId } = await context.params;
    const result = await removeProfileDocument(id, documentId, true);
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    await recordAuditEvent(id, "admin", "document_deleted", { documentName: result.documentName });
    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't remove this document." }, { status: 500 });
  }
}
