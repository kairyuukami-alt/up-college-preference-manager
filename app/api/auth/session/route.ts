import { getD1 } from "@/db";
import { deletePortalSession, expiredSessionCookie, getPortalSession } from "@/lib/portal-auth";

export async function GET(request: Request) {
  try {
    const session = await getPortalSession(request);
    if (!session) return Response.json({ authenticated: false });
    if (session.role === "admin") {
      return Response.json({ authenticated: true, role: "admin", expiresAt: session.expiresAt });
    }
    const list = await getD1().prepare(
      "SELECT student_name AS studentName FROM preference_lists WHERE id = ?",
    ).bind(session.listId).first();
    if (!list) {
      await deletePortalSession(request);
      return Response.json(
        { authenticated: false },
        { headers: { "Set-Cookie": expiredSessionCookie() } },
      );
    }
    return Response.json({
      authenticated: true,
      role: "student",
      studentName: list.studentName,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't check your session." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await deletePortalSession(request);
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": expiredSessionCookie() } },
    );
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't sign you out." }, { status: 500 });
  }
}
