import { requireAdmin } from "@/lib/portal-auth";
import { listProfileDocuments, uploadProfileDocument } from "@/lib/profile-server";
import { recordAuditEvent } from "@/lib/counselling-operations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { id } = await context.params;
  return Response.json({ documents: await listProfileDocuments(id) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 10 * 1024 * 1024 + 256 * 1024) return Response.json({ error: "Each document must be 10 MB or smaller." }, { status: 413 });
    const formData = await request.formData();
    const result = await uploadProfileDocument(id, formData.get("documentName"), formData.get("file"), true, formData.get("requirementId"));
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    await recordAuditEvent(id, "admin", "document_uploaded", { documentName: result.document.documentName });
    return Response.json(result, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't upload this document." }, { status: 500 });
  }
}
