import { getD1 } from "@/db";
import { BUILTIN_MASTER } from "@/lib/master-data";
import { requireAdmin } from "@/lib/portal-auth";
import { normaliseStudentProfile, profileCompletion, validateStudentProfile } from "@/lib/student-profile";

const QUESTION_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

function safeJson(value: unknown, fallback: unknown = {}) {
  try { return value ? JSON.parse(String(value)) : fallback; } catch { return fallback; }
}

export async function GET(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const url = new URL(request.url);
    const requestedMasterId = url.searchParams.get("masterId") || "all";
    const db = getD1();
    const now = Date.now();
    await db.prepare("DELETE FROM counselling_questions WHERE created_at <= ?").bind(now - QUESTION_RETENTION_MS).run();

    const [masterRows, listRows, requirementRows, acceptedRows, statusRows, deadlineRows, questionCount, auditRows] = await Promise.all([
      db.prepare("SELECT id, title FROM counselling_masters ORDER BY updated_at DESC").all(),
      db.prepare(`
        SELECT l.id, l.student_name AS studentName, COALESCE(l.master_id, ?) AS masterId,
               l.locked_at AS choiceLockedAt, l.updated_at AS updatedAt,
               p.data_json AS dataJson, p.locked_at AS profileLockedAt,
               COUNT(i.id) AS collegeCount
        FROM preference_lists l
        LEFT JOIN student_profiles p ON p.list_id = l.id
        LEFT JOIN preference_items i ON i.list_id = l.id
        GROUP BY l.id ORDER BY l.updated_at DESC
      `).bind(BUILTIN_MASTER.id).all(),
      db.prepare("SELECT id, master_id AS masterId, document_name AS documentName FROM required_documents ORDER BY document_name COLLATE NOCASE").all(),
      db.prepare("SELECT list_id AS listId, requirement_id AS requirementId FROM profile_documents WHERE requirement_id IS NOT NULL AND review_status = 'accepted'").all(),
      db.prepare(`
        SELECT list_id AS listId, registration_status AS registrationStatus,
               verification_status AS verificationStatus, choice_filling_status AS choiceFillingStatus,
               allotment_status AS allotmentStatus, reporting_status AS reportingStatus,
               admission_status AS admissionStatus, admin_instructions AS adminInstructions,
               updated_at AS updatedAt
        FROM student_counselling_statuses
      `).all(),
      db.prepare(`
        SELECT id, master_id AS masterId, title, due_at AS dueAt, notes,
               created_at AS createdAt, updated_at AS updatedAt
        FROM counselling_deadlines WHERE due_at >= ? ORDER BY due_at ASC LIMIT 100
      `).bind(now - 24 * 60 * 60 * 1_000).all(),
      db.prepare("SELECT COUNT(*) AS count FROM counselling_questions WHERE status = 'open' AND created_at > ?").bind(now - QUESTION_RETENTION_MS).first(),
      db.prepare(`
        SELECT a.id, a.list_id AS listId, a.actor_role AS actorRole, a.event_type AS eventType,
               a.details_json AS detailsJson, a.created_at AS createdAt, l.student_name AS studentName
        FROM audit_events a LEFT JOIN preference_lists l ON l.id = a.list_id
        ORDER BY a.created_at DESC LIMIT 100
      `).all(),
    ]);

    const masters = [
      { id: BUILTIN_MASTER.id, title: BUILTIN_MASTER.title },
      ...masterRows.results.map((row: Record<string, unknown>) => ({ id: String(row.id), title: String(row.title) })),
    ];
    const masterNames = new Map(masters.map((master) => [master.id, master.title]));
    const requirements = requirementRows.results.map((row: Record<string, unknown>) => ({
      id: String(row.id), masterId: String(row.masterId), documentName: String(row.documentName),
    }));
    const accepted = new Set(acceptedRows.results.map((row: Record<string, unknown>) => `${row.listId}:${row.requirementId}`));
    const statuses = new Map(statusRows.results.map((row: Record<string, unknown>) => [String(row.listId), row]));

    const allStudents = listRows.results.map((row: Record<string, unknown>) => {
      const data = normaliseStudentProfile(safeJson(row.dataJson));
      const validation = validateStudentProfile(data);
      const masterId = String(row.masterId);
      const required = requirements.filter((item) => item.masterId === masterId);
      const acceptedCount = required.filter((item) => accepted.has(`${row.id}:${item.id}`)).length;
      const status = statuses.get(String(row.id)) as Record<string, unknown> | undefined;
      return {
        id: String(row.id),
        studentName: String(row.studentName),
        masterId,
        masterTitle: masterNames.get(masterId) ?? "Counselling",
        profileCompletion: profileCompletion(data),
        profileComplete: validation.valid,
        profileLockedAt: row.profileLockedAt ? Number(row.profileLockedAt) : null,
        choiceLockedAt: row.choiceLockedAt ? Number(row.choiceLockedAt) : null,
        collegeCount: Number(row.collegeCount),
        requiredDocuments: required.length,
        acceptedDocuments: acceptedCount,
        missingDocuments: Math.max(0, required.length - acceptedCount),
        missingDocumentNames: required.filter((item) => !accepted.has(`${row.id}:${item.id}`)).map((item) => item.documentName),
        status: {
          registrationStatus: String(status?.registrationStatus ?? "not_started"),
          verificationStatus: String(status?.verificationStatus ?? "not_started"),
          choiceFillingStatus: String(status?.choiceFillingStatus ?? "not_started"),
          allotmentStatus: String(status?.allotmentStatus ?? "not_started"),
          reportingStatus: String(status?.reportingStatus ?? "not_started"),
          admissionStatus: String(status?.admissionStatus ?? "not_started"),
          adminInstructions: String(status?.adminInstructions ?? ""),
        },
        updatedAt: Number(row.updatedAt),
      };
    });
    const students = requestedMasterId === "all" ? allStudents : allStudents.filter((student) => student.masterId === requestedMasterId);
    const metrics = {
      totalStudents: students.length,
      incompleteProfiles: students.filter((student) => !student.profileComplete).length,
      missingDocuments: students.reduce((total, student) => total + student.missingDocuments, 0),
      unlockedChoices: students.filter((student) => !student.choiceLockedAt).length,
      unansweredQuestions: Number(questionCount?.count ?? 0),
    };
    const deadlines = deadlineRows.results
      .map((row: Record<string, unknown>) => ({ ...row, masterTitle: masterNames.get(String(row.masterId)) ?? "Counselling" }))
      .filter((row: Record<string, unknown>) => requestedMasterId === "all" || String(row.masterId) === requestedMasterId);
    const audit = auditRows.results.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      listId: row.listId ? String(row.listId) : null,
      studentName: row.studentName ? String(row.studentName) : typeof safeJson(row.detailsJson) === "object" && safeJson(row.detailsJson) !== null && "studentName" in safeJson(row.detailsJson) ? String((safeJson(row.detailsJson) as Record<string, unknown>).studentName) : null,
      actorRole: String(row.actorRole),
      eventType: String(row.eventType),
      details: safeJson(row.detailsJson),
      createdAt: Number(row.createdAt),
    }));
    return Response.json({ masters, metrics, students, deadlines, requirements, audit }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't load the administrator dashboard." }, { status: 500 });
  }
}
