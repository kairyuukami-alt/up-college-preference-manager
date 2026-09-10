import { requireStudent } from "@/lib/portal-auth";
import { documentResponse, readProfileDocument, removeProfileDocument } from "@/lib/profile-server";
import { recordAuditEvent } from "@/lib/counselling-operations";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await requireStudent(request);
  if (session instanceof Response) return session;
  const { documentId } = await context.params;
  const result = await readProfileDocument(session.listId!, documentId);
  return result ? documentResponse(result) : Response.json({ error: "Document not found." }, { status: 404 });
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requireStudent(request);
    if (session instanceof Response) return session;
    const { documentId } = await context.params;
    const result = await removeProfileDocument(session.listId!, documentId);
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    await recordAuditEvent(session.listId!, "student", "document_deleted", { documentName: result.documentName });
    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't remove this document." }, { status: 500 });
  }
}
