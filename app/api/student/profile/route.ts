import { requireStudent } from "@/lib/portal-auth";
import { listProfileDocuments, loadProfile, saveProfile } from "@/lib/profile-server";
import { listChecklist, recordAuditEvent } from "@/lib/counselling-operations";

export async function GET(request: Request) {
  try {
    const session = await requireStudent(request);
    if (session instanceof Response) return session;
    const profile = await loadProfile(session.listId!);
    if (!profile) return Response.json({ error: "Student account not found." }, { status: 404 });
    const documents = await listProfileDocuments(session.listId!);
    const checklist = await listChecklist(session.listId!);
    return Response.json({ profile, documents, checklist }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't load your private profile." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireStudent(request);
    if (session instanceof Response) return session;
    const payload = await request.json() as { data?: unknown };
    const result = await saveProfile(session.listId!, payload.data);
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    await recordAuditEvent(session.listId!, "student", "profile_saved");
    return Response.json({ profile: result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't save your private profile." }, { status: 500 });
  }
}
