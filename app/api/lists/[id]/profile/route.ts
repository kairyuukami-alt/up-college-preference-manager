import { requireAdmin } from "@/lib/portal-auth";
import { listProfileDocuments, loadProfile, saveProfile } from "@/lib/profile-server";
import { listChecklist, recordAuditEvent } from "@/lib/counselling-operations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const profile = await loadProfile(id);
    if (!profile) return Response.json({ error: "Student account not found." }, { status: 404 });
    const documents = await listProfileDocuments(id);
    const checklist = await listChecklist(id);
    return Response.json({ profile, documents, checklist }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't load this student's private profile." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const payload = await request.json() as { data?: unknown };
    const result = await saveProfile(id, payload.data, true);
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    await recordAuditEvent(id, "admin", "profile_saved");
    return Response.json({ profile: result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't save this student's private profile." }, { status: 500 });
  }
}
