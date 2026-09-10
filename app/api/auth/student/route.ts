import { getD1 } from "@/db";
import {
  checkRateLimit,
  clearFailedAttempts,
  createPortalSession,
  isValidStudentPassword,
  recordFailedAttempt,
  sessionCookie,
  verifyStudentPassword,
} from "@/lib/portal-auth";

export async function POST(request: Request) {
  try {
    const limited = await checkRateLimit(request, "student-login");
    if (limited) return limited;
    const payload = (await request.json()) as { studentName?: string; password?: string; pin?: string };
    const studentName = payload.studentName?.trim() ?? "";
    const password = payload.password ?? payload.pin ?? "";
    if (!studentName || !isValidStudentPassword(password)) {
      await recordFailedAttempt(request, "student-login");
      return Response.json({ error: "Student name or password is incorrect." }, { status: 401 });
    }

    const result = await getD1().prepare(`
      SELECT id, student_name AS studentName, student_pin_hash AS pinHash,
             student_pin_salt AS pinSalt
      FROM preference_lists
      WHERE student_name = ? COLLATE NOCASE
        AND student_pin_hash IS NOT NULL AND student_pin_salt IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 100
    `).bind(studentName).all();

    const matches: Record<string, unknown>[] = [];
    for (const row of result.results as Record<string, unknown>[]) {
      if (await verifyStudentPassword(password, String(row.pinHash), String(row.pinSalt))) {
        matches.push(row);
      }
    }
    if (!matches.length) {
      await recordFailedAttempt(request, "student-login");
      return Response.json({ error: "Student name or password is incorrect." }, { status: 401 });
    }
    if (matches.length > 1) {
      return Response.json(
        { error: "This name and password match more than one account. Ask the administrator to set a unique password." },
        { status: 409 },
      );
    }
    const matched = matches[0];

    await clearFailedAttempts(request, "student-login");
    const session = await createPortalSession("student", String(matched.id));
    return Response.json(
      { authenticated: true, role: "student", studentName: matched.studentName, expiresAt: session.expiresAt },
      { headers: { "Set-Cookie": sessionCookie(session.token) } },
    );
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't sign you in. Please try again." }, { status: 500 });
  }
}
