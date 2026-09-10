import { getD1, getRuntimeValue } from "@/db";
import { recordAuditEvent } from "@/lib/counselling-operations";
import { passwordsMatch, requireAdmin } from "@/lib/portal-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const payload = (await request.json()) as { action?: "lock" | "unlock"; password?: string };
    const db = getD1();
    const existing = await db.prepare("SELECT id, locked_at AS lockedAt FROM preference_lists WHERE id = ?").bind(id).first();
    if (!existing) return Response.json({ error: "List not found." }, { status: 404 });

    if (payload.action === "lock") {
      const lockedAt = existing.lockedAt ? Number(existing.lockedAt) : Date.now();
      await db.prepare("UPDATE preference_lists SET locked_at = ?, updated_at = ? WHERE id = ?")
        .bind(lockedAt, Date.now(), id)
        .run();
      await recordAuditEvent(id, "admin", "preference_list_locked", { lockedAt });
      return Response.json({ lockedAt });
    }

    if (payload.action === "unlock") {
      const configuredPassword = getRuntimeValue("PREFERENCE_UNLOCK_PASSWORD");
      if (!configuredPassword) throw new Error("Unlock password is not configured.");
      const valid = await passwordsMatch(payload.password ?? "", configuredPassword);
      if (!valid) return Response.json({ error: "Incorrect password." }, { status: 401 });
      await db.prepare("UPDATE preference_lists SET locked_at = NULL, updated_at = ? WHERE id = ?")
        .bind(Date.now(), id)
        .run();
      await recordAuditEvent(id, "admin", "preference_list_unlocked", { previousLockedAt: existing.lockedAt ? Number(existing.lockedAt) : null });
      return Response.json({ lockedAt: null });
    }

    return Response.json({ error: "Choose lock or unlock." }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't change the lock status. Please try again." }, { status: 500 });
  }
}
