import { getD1 } from "@/db";
import { checkRateLimit, recordFailedAttempt, requireAdmin } from "@/lib/portal-auth";
import { recordAuditEvent } from "@/lib/counselling-operations";

const MAX_QUESTIONS = 500;
const QUESTION_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

async function deleteExpiredQuestions(now = Date.now()) {
  await getD1().prepare(
    "DELETE FROM counselling_questions WHERE created_at <= ?",
  ).bind(now - QUESTION_RETENTION_MS).run();
}

function errorResponse(error: unknown) {
  console.error(error);
  return Response.json(
    { error: "We couldn't access the counselling question inbox. Please try again." },
    { status: 500 },
  );
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/gu, " ") : "";
}

function normaliseWhatsAppNumber(value: unknown) {
  if (typeof value !== "string") return "";
  const digits = value.replace(/\D/gu, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export async function GET(request: Request) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const now = Date.now();
    await deleteExpiredQuestions(now);

    const result = await getD1().prepare(`
      SELECT id, student_name AS studentName, whatsapp_number AS whatsappNumber,
             topic, question, priority, assigned_counsellor AS assignedCounsellor,
             reply_notes AS replyNotes, replied_at AS repliedAt,
             status, created_at AS createdAt, updated_at AS updatedAt
      FROM counselling_questions
      WHERE created_at > ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(now - QUESTION_RETENTION_MS, MAX_QUESTIONS).all();

    return Response.json({ questions: result.results });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = await checkRateLimit(request, "counselling-question");
    if (limited) return limited;

    const payload = (await request.json()) as {
      studentName?: unknown;
      whatsappNumber?: unknown;
      topic?: unknown;
      question?: unknown;
      priority?: unknown;
    };
    const studentName = cleanText(payload.studentName);
    const whatsappNumber = normaliseWhatsAppNumber(payload.whatsappNumber);
    const topic = cleanText(payload.topic);
    const question = typeof payload.question === "string" ? payload.question.trim() : "";
    const priority = payload.priority === "urgent" || payload.priority === "low" ? payload.priority : "normal";

    if (studentName.length < 2 || studentName.length > 100) {
      return Response.json({ error: "Enter the student's full name." }, { status: 400 });
    }
    if (whatsappNumber.length < 10 || whatsappNumber.length > 15) {
      return Response.json({ error: "Enter a valid WhatsApp number with country code if required." }, { status: 400 });
    }
    if (topic.length < 2 || topic.length > 80) {
      return Response.json({ error: "Enter the counselling topic." }, { status: 400 });
    }
    if (question.length < 10 || question.length > 2_000) {
      return Response.json({ error: "Write your question in 10 to 2,000 characters." }, { status: 400 });
    }

    await deleteExpiredQuestions();
    await recordFailedAttempt(request, "counselling-question");
    const id = crypto.randomUUID();
    const now = Date.now();
    await getD1().prepare(`
      INSERT INTO counselling_questions
        (id, student_name, whatsapp_number, topic, question, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).bind(id, studentName, whatsappNumber, topic, question, priority, now, now).run();
    await recordAuditEvent(null, "student", "question_submitted", { studentName, topic, priority });

    return Response.json({
      question: { id, studentName, whatsappNumber, topic, priority, status: "open", createdAt: now },
      confirmation: "Your question has been received. The VidyaSaarthi team will reply on WhatsApp.",
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
