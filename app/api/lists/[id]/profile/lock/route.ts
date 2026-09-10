import { requireAdmin } from "@/lib/portal-auth";
import { loadProfile, setProfileLocked } from "@/lib/profile-server";
import { validateStudentProfile } from "@/lib/student-profile";
import { checklistReady, recordAuditEvent } from "@/lib/counselling-operations";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const payload = await request.json() as { locked?: boolean };
    const existing = await loadProfile(id);
    if (!existing) return Response.json({ error: "Student account not found." }, { status: 404 });
    if (payload.locked) {
      const validation = validateStudentProfile(existing.data);
      if (!validation.valid) {
        return Response.json({ error: "Complete every required field before locking.", missing: validation.missing, invalid: validation.invalid }, { status: 400 });
      }
      const documents = await checklistReady(id);
      if (!documents.ready) {
        return Response.json({
          error: "Every required counselling document must be accepted before locking.",
          missing: documents.incomplete.map((item) => `${item.documentName}: ${item.status.replaceAll("_", " ")}`),
        }, { status: 400 });
      }
    }
    const profile = await setProfileLocked(id, Boolean(payload.locked));
    await recordAuditEvent(id, "admin", payload.locked ? "profile_locked" : "profile_unlocked", {
      lockedAt: profile?.lockedAt,
    });
    return Response.json({ profile }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't change the profile lock." }, { status: 500 });
  }
}
