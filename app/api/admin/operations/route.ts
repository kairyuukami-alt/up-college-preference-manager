import { getD1 } from "@/db";
import {
  COUNSELLORS,
  caseworkFromRow,
  normaliseCasework,
  type PortalAnnouncement,
} from "@/lib/case-management";
import { recordAuditEvent } from "@/lib/counselling-operations";
import { BUILTIN_MASTER } from "@/lib/master-data";
import { requireAdmin } from "@/lib/portal-auth";
import { normaliseStudentProfile } from "@/lib/student-profile";

function parseJson(value: unknown, fallback: unknown = {}) {
  try {
    return value ? JSON.parse(String(value)) : fallback;
  } catch {
    return fallback;
  }
}

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function cleanTimestamp(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp >= 0 ? Math.trunc(timestamp) : null;
}

function announcementFromRow(row: Record<string, unknown>): PortalAnnouncement {
  return {
    id: String(row.id),
    masterId: row.masterId ? String(row.masterId) : null,
    title: String(row.title),
    body: String(row.body),
    priority: ["info", "important", "urgent"].includes(String(row.priority))
      ? String(row.priority) as PortalAnnouncement["priority"]
      : "important",
    dueAt: row.dueAt ? Number(row.dueAt) : null,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function GET(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const db = getD1();
    const url = new URL(request.url);
    const requestedMasterId = url.searchParams.get("masterId") || "all";
    const [masterRows, studentRows, caseRows, announcementRows] = await Promise.all([
      db.prepare("SELECT id, title FROM counselling_masters ORDER BY updated_at DESC").all(),
      db.prepare(`
        SELECT l.id, l.student_name AS studentName, COALESCE(l.master_id, ?) AS masterId,
               l.locked_at AS choiceLockedAt, l.updated_at AS updatedAt,
               p.data_json AS profileDataJson, p.locked_at AS profileLockedAt,
               (SELECT COUNT(*) FROM preference_items WHERE list_id = l.id) AS collegeCount
        FROM preference_lists l
        LEFT JOIN student_profiles p ON p.list_id = l.id
        ORDER BY l.updated_at DESC
      `).bind(BUILTIN_MASTER.id).all(),
      db.prepare(`
        SELECT list_id AS listId, primary_counsellor_id AS primaryCounsellorId,
               backup_counsellor_id AS backupCounsellorId, priority,
               courses_json AS coursesJson, quotas_json AS quotasJson, tags_json AS tagsJson,
               next_action AS nextAction, next_action_due_at AS nextActionDueAt,
               internal_notes AS internalNotes, student_instructions AS studentInstructions,
               rounds_json AS roundsJson, tasks_json AS tasksJson,
               allotments_json AS allotmentsJson, finances_json AS financesJson,
               communications_json AS communicationsJson, updated_at AS updatedAt
        FROM student_casework
      `).all(),
      db.prepare(`
        SELECT id, master_id AS masterId, title, body, priority, due_at AS dueAt,
               created_at AS createdAt, updated_at AS updatedAt
        FROM portal_announcements ORDER BY created_at DESC LIMIT 100
      `).all(),
    ]);

    const masters = [
      { id: BUILTIN_MASTER.id, title: BUILTIN_MASTER.title },
      ...masterRows.results.map((row: Record<string, unknown>) => ({ id: String(row.id), title: String(row.title) })),
    ];
    const masterTitles = new Map(masters.map((master) => [master.id, master.title]));
    const caseworkRows = new Map(caseRows.results.map((row: Record<string, unknown>) => [String(row.listId), row]));
    const allStudents = studentRows.results.map((row: Record<string, unknown>) => {
      const profile = normaliseStudentProfile(parseJson(row.profileDataJson));
      return {
        id: String(row.id),
        studentName: String(row.studentName),
        masterId: String(row.masterId),
        masterTitle: masterTitles.get(String(row.masterId)) ?? "Counselling",
        mobile: profile.fields.primaryMobile || profile.fields.alternativeMobile || "",
        email: profile.fields.primaryEmail || profile.fields.alternativeEmail || "",
        choiceLockedAt: row.choiceLockedAt ? Number(row.choiceLockedAt) : null,
        profileLockedAt: row.profileLockedAt ? Number(row.profileLockedAt) : null,
        collegeCount: Number(row.collegeCount ?? 0),
        updatedAt: Number(row.updatedAt),
        casework: caseworkFromRow(caseworkRows.get(String(row.id))),
      };
    });
    const students = requestedMasterId === "all"
      ? allStudents
      : allStudents.filter((student) => student.masterId === requestedMasterId);
    const now = Date.now();
    const weekAhead = now + 7 * 24 * 60 * 60 * 1_000;
    const fortnightAhead = now + 14 * 24 * 60 * 60 * 1_000;
    const workload = COUNSELLORS.map((counsellor) => ({
      counsellorId: counsellor.id,
      studentCount: students.filter((student) => student.casework.primaryCounsellorId === counsellor.id).length,
      openTasks: students.reduce((count, student) => count + student.casework.tasks.filter((task) => task.assigneeId === counsellor.id && task.status !== "completed").length, 0),
    }));
    const metrics = {
      activeCases: students.length,
      urgentCases: students.filter((student) => student.casework.priority === "urgent").length,
      unassignedCases: students.filter((student) => !student.casework.primaryCounsellorId).length,
      overdueTasks: students.reduce((count, student) => count + student.casework.tasks.filter((task) => task.status !== "completed" && task.dueAt !== null && task.dueAt < now).length, 0),
      duePayments: students.reduce((count, student) => count + student.casework.finances.filter((item) => ["planned", "due"].includes(item.status) && item.dueAt !== null && item.dueAt <= weekAhead).length, 0),
      reportingSoon: students.reduce((count, student) => count + student.casework.allotments.filter((item) => item.reportingAt !== null && item.reportingAt >= now && item.reportingAt <= fortnightAhead).length, 0),
      activeRounds: students.reduce((count, student) => count + student.casework.rounds.filter((round) => round.status === "active").length, 0),
    };
    const announcements = announcementRows.results
      .map((row: Record<string, unknown>) => announcementFromRow(row))
      .filter((item) => requestedMasterId === "all" || !item.masterId || item.masterId === requestedMasterId);
    return Response.json(
      { team: COUNSELLORS, masters, students, announcements, metrics, workload },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't load the counselling operations centre." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const payload = await request.json() as { listId?: unknown; casework?: unknown };
    const listId = cleanText(payload.listId, 120);
    if (!listId) return Response.json({ error: "Choose a student first." }, { status: 400 });
    const list = await getD1().prepare("SELECT student_name AS studentName FROM preference_lists WHERE id = ?").bind(listId).first();
    if (!list) return Response.json({ error: "This student no longer exists." }, { status: 404 });
    const casework = normaliseCasework(payload.casework);
    const updatedAt = Date.now();
    await getD1().prepare(`
      INSERT INTO student_casework (
        list_id, primary_counsellor_id, backup_counsellor_id, priority,
        courses_json, quotas_json, tags_json, next_action, next_action_due_at,
        internal_notes, student_instructions, rounds_json, tasks_json,
        allotments_json, finances_json, communications_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(list_id) DO UPDATE SET
        primary_counsellor_id = excluded.primary_counsellor_id,
        backup_counsellor_id = excluded.backup_counsellor_id,
        priority = excluded.priority,
        courses_json = excluded.courses_json,
        quotas_json = excluded.quotas_json,
        tags_json = excluded.tags_json,
        next_action = excluded.next_action,
        next_action_due_at = excluded.next_action_due_at,
        internal_notes = excluded.internal_notes,
        student_instructions = excluded.student_instructions,
        rounds_json = excluded.rounds_json,
        tasks_json = excluded.tasks_json,
        allotments_json = excluded.allotments_json,
        finances_json = excluded.finances_json,
        communications_json = excluded.communications_json,
        updated_at = excluded.updated_at
    `).bind(
      listId,
      casework.primaryCounsellorId || null,
      casework.backupCounsellorId || null,
      casework.priority,
      JSON.stringify(casework.courses),
      JSON.stringify(casework.quotas),
      JSON.stringify(casework.tags),
      casework.nextAction || null,
      casework.nextActionDueAt,
      casework.internalNotes || null,
      casework.studentInstructions || null,
      JSON.stringify(casework.rounds),
      JSON.stringify(casework.tasks),
      JSON.stringify(casework.allotments),
      JSON.stringify(casework.finances),
      JSON.stringify(casework.communications),
      updatedAt,
    ).run();
    await recordAuditEvent(listId, "admin", "casework_updated", {
      studentName: String(list.studentName),
      primaryCounsellorId: casework.primaryCounsellorId,
      priority: casework.priority,
      tasks: casework.tasks.length,
      rounds: casework.rounds.length,
    });
    return Response.json({ ok: true, casework: { ...casework, updatedAt } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't save this student case file." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const payload = await request.json() as Record<string, unknown>;
    const title = cleanText(payload.title, 160);
    const body = cleanText(payload.body, 2_000);
    if (!title || !body) return Response.json({ error: "Add both an announcement title and message." }, { status: 400 });
    const priority = ["info", "important", "urgent"].includes(String(payload.priority)) ? String(payload.priority) : "important";
    const masterId = cleanText(payload.masterId, 120) || null;
    const dueAt = cleanTimestamp(payload.dueAt);
    const id = crypto.randomUUID();
    const now = Date.now();
    await getD1().prepare(`
      INSERT INTO portal_announcements (id, master_id, title, body, priority, due_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, masterId, title, body, priority, dueAt, now, now).run();
    await recordAuditEvent(null, "admin", "announcement_created", { announcementId: id, title, masterId, priority });
    return Response.json({ announcement: { id, masterId, title, body, priority, dueAt, createdAt: now, updatedAt: now } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't publish this portal announcement." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const payload = await request.json() as { id?: unknown };
    const id = cleanText(payload.id, 120);
    if (!id) return Response.json({ error: "Choose an announcement to remove." }, { status: 400 });
    const result = await getD1().prepare("DELETE FROM portal_announcements WHERE id = ?").bind(id).run();
    if (!result.meta.changes) return Response.json({ error: "This announcement no longer exists." }, { status: 404 });
    await recordAuditEvent(null, "admin", "announcement_deleted", { announcementId: id });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "We couldn't remove this portal announcement." }, { status: 500 });
  }
}
