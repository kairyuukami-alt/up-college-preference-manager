import { getD1 } from "@/db";
import { caseworkFromRow } from "@/lib/case-management";
import { listChecklist } from "@/lib/counselling-operations";
import { requireStudent } from "@/lib/portal-auth";
import { loadProfile } from "@/lib/profile-server";
import { profileCompletion } from "@/lib/student-profile";

const QUESTION_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

function digits(value: string) {
  const number = value.replace(/\D/gu, "");
  return number.length > 10 ? number.slice(-10) : number;
}

export async function GET(request: Request) {
  try {
    const session = await requireStudent(request);
    if (session instanceof Response) return session;
    const listId = session.listId!;
    const db = getD1();
    const profile = await loadProfile(listId);
    if (!profile) return Response.json({ error: "Student account not found." }, { status: 404 });
    const [list, checklist, status, questions, caseworkRow, announcementRows] = await Promise.all([
      db.prepare(`
        SELECT COALESCE(master_id, 'builtin-up-private-mbbs-2026') AS masterId,
               locked_at AS choiceLockedAt, updated_at AS choiceUpdatedAt,
               (SELECT COUNT(*) FROM preference_items WHERE list_id = preference_lists.id) AS collegeCount
        FROM preference_lists WHERE id = ?
      `).bind(listId).first(),
      listChecklist(listId),
      db.prepare(`
        SELECT registration_status AS registrationStatus, verification_status AS verificationStatus,
               choice_filling_status AS choiceFillingStatus, allotment_status AS allotmentStatus,
               reporting_status AS reportingStatus, admission_status AS admissionStatus,
               admin_instructions AS adminInstructions, updated_at AS updatedAt
        FROM student_counselling_statuses WHERE list_id = ?
      `).bind(listId).first(),
      db.prepare(`
        SELECT id, whatsapp_number AS whatsappNumber, topic, status, priority,
               assigned_counsellor AS assignedCounsellor, reply_notes AS replyNotes,
               replied_at AS repliedAt, created_at AS createdAt
        FROM counselling_questions
        WHERE student_name = ? COLLATE NOCASE AND created_at > ?
        ORDER BY created_at DESC LIMIT 20
      `).bind(profile.studentName, Date.now() - QUESTION_RETENTION_MS).all(),
      db.prepare(`
        SELECT primary_counsellor_id AS primaryCounsellorId,
               backup_counsellor_id AS backupCounsellorId, priority,
               courses_json AS coursesJson, quotas_json AS quotasJson, tags_json AS tagsJson,
               next_action AS nextAction, next_action_due_at AS nextActionDueAt,
               internal_notes AS internalNotes, student_instructions AS studentInstructions,
               rounds_json AS roundsJson, tasks_json AS tasksJson,
               allotments_json AS allotmentsJson, finances_json AS financesJson,
               communications_json AS communicationsJson, updated_at AS updatedAt
        FROM student_casework WHERE list_id = ?
      `).bind(listId).first(),
      db.prepare(`
        SELECT id, master_id AS masterId, title, body, priority,
               due_at AS dueAt, created_at AS createdAt, updated_at AS updatedAt
        FROM portal_announcements
        WHERE (master_id IS NULL OR master_id = (
          SELECT COALESCE(master_id, 'builtin-up-private-mbbs-2026') FROM preference_lists WHERE id = ?
        )) AND (due_at IS NULL OR due_at >= ?)
        ORDER BY created_at DESC LIMIT 30
      `).bind(listId, Date.now() - 24 * 60 * 60 * 1_000).all(),
    ]);
    if (!list) return Response.json({ error: "Student account not found." }, { status: 404 });
    const phoneNumbers = new Set([
      profile.data.fields.primaryMobile,
      profile.data.fields.alternativeMobile,
      profile.data.fields.emergencyMobile,
    ].map(digits).filter((value) => value.length === 10));
    const latestQuestion = (questions.results as Record<string, unknown>[]).find((item) => phoneNumbers.has(digits(String(item.whatsappNumber)))) ?? null;
    const acceptedDocuments = checklist.filter((item) => item.status === "accepted").length;
    const casework = caseworkFromRow(caseworkRow as Record<string, unknown> | null);
    return Response.json({
      progress: {
        studentName: profile.studentName,
        profileCompletion: profileCompletion(profile.data),
        profileLockedAt: profile.lockedAt,
        acceptedDocuments,
        requiredDocuments: checklist.length,
        choiceLockedAt: list.choiceLockedAt ? Number(list.choiceLockedAt) : null,
        collegeCount: Number(list.collegeCount),
        status: status ?? {
          registrationStatus: "not_started",
          verificationStatus: "not_started",
          choiceFillingStatus: "not_started",
          allotmentStatus: "not_started",
          reportingStatus: "not_started",
          admissionStatus: "not_started",
          adminInstructions: "",
          updatedAt: null,
        },
        checklist,
        latestQuestion,
        casework: {
          ...casework,
          internalNotes: "",
        },
        announcements: announcementRows.results.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          title: String(row.title),
          body: String(row.body),
          priority: String(row.priority),
          dueAt: row.dueAt ? Number(row.dueAt) : null,
          createdAt: Number(row.createdAt),
        })),
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't load your counselling progress." }, { status: 500 });
  }
}
