import { getD1 } from "@/db";
import { recordAuditEvent } from "@/lib/counselling-operations";
import { hashStudentPassword, isValidStudentPassword, requireAdmin, verifyStudentPassword } from "@/lib/portal-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const payload = await request.json() as { password?: string };
    const password = payload.password ?? "";
    if (!isValidStudentPassword(password)) {
      return Response.json({ error: "Enter a 4 to 32 character password without spaces." }, { status: 400 });
    }
    const existing = await getD1().prepare(
      "SELECT id, student_name AS studentName FROM preference_lists WHERE id = ?",
    ).bind(id).first();
    if (!existing) return Response.json({ error: "Student account not found." }, { status: 404 });
    const otherPasswords = await getD1().prepare(`
      SELECT student_pin_hash AS passwordHash, student_pin_salt AS passwordSalt
      FROM preference_lists
      WHERE student_name = ? COLLATE NOCASE AND id <> ?
        AND student_pin_hash IS NOT NULL AND student_pin_salt IS NOT NULL
      LIMIT 100
    `).bind(existing.studentName, id).all();
    for (const row of otherPasswords.results as Record<string, unknown>[]) {
      if (await verifyStudentPassword(password, String(row.passwordHash), String(row.passwordSalt))) {
        return Response.json(
          { error: "Choose a different password. It is already used for another account with the same student name." },
          { status: 409 },
        );
      }
    }
    const credentials = await hashStudentPassword(password);
    const db = getD1();
    await db.batch([
      db.prepare(`
        UPDATE preference_lists
        SET student_pin_hash = ?, student_pin_salt = ?,
            student_setup_hash = NULL, student_setup_salt = NULL,
            student_setup_expires_at = NULL, updated_at = ?
        WHERE id = ?
      `).bind(credentials.hash, credentials.salt, Date.now(), id),
      db.prepare("DELETE FROM portal_sessions WHERE role = 'student' AND list_id = ?").bind(id),
    ]);
    await recordAuditEvent(id, "admin", "student_pin_changed", { studentName: String(existing.studentName) });
    return Response.json({ ok: true, hasStudentPassword: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't update the student PIN." }, { status: 500 });
  }
}
