import { requireStudent } from "@/lib/portal-auth";
import { listProfileDocuments, uploadProfileDocument } from "@/lib/profile-server";
import { recordAuditEvent } from "@/lib/counselling-operations";

export async function GET(request: Request) {
  const session = await requireStudent(request);
  if (session instanceof Response) return session;
  return Response.json({ documents: await listProfileDocuments(session.listId!) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  try {
    const session = await requireStudent(request);
    if (session instanceof Response) return session;
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 10 * 1024 * 1024 + 256 * 1024) return Response.json({ error: "Each document must be 10 MB or smaller." }, { status: 413 });
    const formData = await request.formData();
    const result = await uploadProfileDocument(session.listId!, formData.get("documentName"), formData.get("file"), false, formData.get("requirementId"));
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    await recordAuditEvent(session.listId!, "student", "document_uploaded", { documentName: result.document.documentName });
    return Response.json(result, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't upload this document." }, { status: 500 });
  }
}
