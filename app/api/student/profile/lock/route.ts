import { requireStudent } from "@/lib/portal-auth";
import { loadProfile, setProfileLocked } from "@/lib/profile-server";
import { validateStudentProfile } from "@/lib/student-profile";
import { checklistReady, recordAuditEvent } from "@/lib/counselling-operations";

export async function POST(request: Request) {
  try {
    const session = await requireStudent(request);
    if (session instanceof Response) return session;
    const profile = await loadProfile(session.listId!);
    if (!profile) return Response.json({ error: "Student account not found." }, { status: 404 });
    if (profile.lockedAt) return Response.json({ error: "Your profile is already locked. Only an administrator can change it." }, { status: 423 });
    const validation = validateStudentProfile(profile.data);
    if (!validation.valid) {
      return Response.json({
        error: "Complete every required profile field before locking.",
        missing: validation.missing,
        invalid: validation.invalid,
      }, { status: 400 });
    }
    const documents = await checklistReady(session.listId!);
    if (!documents.ready) {
      return Response.json({
        error: "Every required counselling document must be accepted before locking.",
        missing: documents.incomplete.map((item) => `${item.documentName}: ${item.status.replaceAll("_", " ")}`),
      }, { status: 400 });
    }
    const updated = await setProfileLocked(session.listId!, true);
    await recordAuditEvent(session.listId!, "student", "profile_locked", { lockedAt: updated?.lockedAt });
    return Response.json({ profile: updated }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't lock your profile." }, { status: 500 });
  }
}
