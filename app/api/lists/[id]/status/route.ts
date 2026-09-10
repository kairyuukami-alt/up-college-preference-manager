import { getD1 } from "@/db";
import { COUNSELLING_STAGES, recordAuditEvent, STAGE_STATUSES, type StageStatus } from "@/lib/counselling-operations";
import { requireAdmin } from "@/lib/portal-auth";

type RouteContext = { params: Promise<{ id: string }> };

const defaultStatus = Object.fromEntries(COUNSELLING_STAGES.map((stage) => [stage.key, "not_started"])) as Record<string, StageStatus>;

export async function GET(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const list = await getD1().prepare("SELECT id FROM preference_lists WHERE id = ?").bind(id).first();
    if (!list) return Response.json({ error: "Student account not found." }, { status: 404 });
    const row = await getD1().prepare(`
      SELECT registration_status AS registrationStatus, verification_status AS verificationStatus,
             choice_filling_status AS choiceFillingStatus, allotment_status AS allotmentStatus,
             reporting_status AS reportingStatus, admission_status AS admissionStatus,
             admin_instructions AS adminInstructions, updated_at AS updatedAt
      FROM student_counselling_statuses WHERE list_id = ?
    `).bind(id).first();
    return Response.json({ status: row ?? { ...defaultStatus, adminInstructions: "", updatedAt: null } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't load this student's counselling progress." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const { id } = await context.params;
    const payload = await request.json() as Record<string, unknown>;
    const values = COUNSELLING_STAGES.map((stage) => payload[stage.key]);
    if (values.some((value) => !STAGE_STATUSES.includes(value as StageStatus))) {
      return Response.json({ error: "Choose a valid status for every counselling stage." }, { status: 400 });
    }
    const adminInstructions = typeof payload.adminInstructions === "string" ? payload.adminInstructions.trim().slice(0, 2_000) : "";
    const now = Date.now();
    const result = await getD1().prepare(`
      INSERT INTO student_counselling_statuses
        (list_id, registration_status, verification_status, choice_filling_status,
         allotment_status, reporting_status, admission_status, admin_instructions, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(list_id) DO UPDATE SET
        registration_status = excluded.registration_status,
        verification_status = excluded.verification_status,
        choice_filling_status = excluded.choice_filling_status,
        allotment_status = excluded.allotment_status,
        reporting_status = excluded.reporting_status,
        admission_status = excluded.admission_status,
        admin_instructions = excluded.admin_instructions,
        updated_at = excluded.updated_at
    `).bind(id, ...values, adminInstructions || null, now).run();
    if (!result.meta.changes) return Response.json({ error: "Student account not found." }, { status: 404 });
    await recordAuditEvent(id, "admin", "counselling_status_updated", { statuses: Object.fromEntries(COUNSELLING_STAGES.map((stage, index) => [stage.key, values[index]])) });
    return Response.json({ status: { ...Object.fromEntries(COUNSELLING_STAGES.map((stage, index) => [stage.key, values[index]])), adminInstructions, updatedAt: now } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't update this student's counselling progress." }, { status: 500 });
  }
}
