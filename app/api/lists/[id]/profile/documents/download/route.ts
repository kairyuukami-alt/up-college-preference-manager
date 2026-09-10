import { requireAdmin } from "@/lib/portal-auth";
import { documentsZipResponse } from "@/lib/zip-stream";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    return await documentsZipResponse(id) ?? Response.json({ error: "Student account not found." }, { status: 404 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't prepare the document archive." }, { status: 500 });
  }
}
