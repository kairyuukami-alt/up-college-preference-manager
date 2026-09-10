import { getRuntimeValue } from "@/db";
import {
  checkRateLimit,
  clearFailedAttempts,
  createPortalSession,
  passwordsMatch,
  recordFailedAttempt,
  sessionCookie,
} from "@/lib/portal-auth";

export async function POST(request: Request) {
  try {
    const limited = await checkRateLimit(request, "admin-login");
    if (limited) return limited;
    const payload = (await request.json()) as { password?: string };
    const expected = getRuntimeValue("PREFERENCE_UNLOCK_PASSWORD");
    if (!expected) throw new Error("Admin password is not configured.");
    if (!(await passwordsMatch(payload.password ?? "", expected))) {
      await recordFailedAttempt(request, "admin-login");
      return Response.json({ error: "Incorrect admin password." }, { status: 401 });
    }
    await clearFailedAttempts(request, "admin-login");
    const session = await createPortalSession("admin");
    return Response.json(
      { authenticated: true, role: "admin", expiresAt: session.expiresAt },
      { headers: { "Set-Cookie": sessionCookie(session.token) } },
    );
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't sign you in. Please try again." }, { status: 500 });
  }
}
