import { getD1 } from "@/db";
import type { ActorRole, DocumentChecklistItem, DocumentRequirement } from "@/lib/counselling-types";

export { COUNSELLING_STAGES, STAGE_STATUSES } from "@/lib/counselling-types";
export type { ActorRole, DocumentChecklistItem, DocumentRequirement, StageStatus } from "@/lib/counselling-types";

export async function recordAuditEvent(
  listId: string | null,
  actorRole: ActorRole,
  eventType: string,
  details: Record<string, unknown> = {},
) {
  await getD1().prepare(
    "INSERT INTO audit_events (id, list_id, actor_role, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), listId, actorRole, eventType, JSON.stringify(details), Date.now()).run();
}

export async function preferenceCollegeIds(listId: string) {
  const result = await getD1().prepare(
    "SELECT college_id AS collegeId FROM preference_items WHERE list_id = ? ORDER BY position ASC",
  ).bind(listId).all();
  return result.results.map((row: Record<string, unknown>) => Number(row.collegeId));
}

export async function savePreferenceVersion(
  listId: string,
  studentName: string,
  collegeIds: number[],
  actorRole: ActorRole,
) {
  await getD1().prepare(
    "INSERT INTO preference_list_versions (id, list_id, student_name, college_ids_json, actor_role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), listId, studentName, JSON.stringify(collegeIds), actorRole, Date.now()).run();
}

export async function listRequirements(masterId: string): Promise<DocumentRequirement[]> {
  const result = await getD1().prepare(`
    SELECT id, master_id AS masterId, document_name AS documentName, created_at AS createdAt
    FROM required_documents WHERE master_id = ? ORDER BY document_name COLLATE NOCASE ASC
  `).bind(masterId).all();
  return result.results.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    masterId: String(row.masterId),
    documentName: String(row.documentName),
    createdAt: Number(row.createdAt),
  }));
}

export async function listChecklist(listId: string): Promise<DocumentChecklistItem[]> {
  const list = await getD1().prepare(
    "SELECT COALESCE(master_id, 'builtin-up-private-mbbs-2026') AS masterId FROM preference_lists WHERE id = ?",
  ).bind(listId).first();
  if (!list) return [];
  const requirements = await listRequirements(String(list.masterId));
  const documents = await getD1().prepare(`
    SELECT id, requirement_id AS requirementId, original_filename AS originalFilename,
           review_status AS reviewStatus, rejection_reason AS rejectionReason, uploaded_at AS uploadedAt
    FROM profile_documents
    WHERE list_id = ? AND requirement_id IS NOT NULL
    ORDER BY uploaded_at DESC
  `).bind(listId).all();
  const latest = new Map<string, Record<string, unknown>>();
  for (const row of documents.results as Record<string, unknown>[]) {
    const requirementId = String(row.requirementId ?? "");
    if (requirementId && !latest.has(requirementId)) latest.set(requirementId, row);
  }
  return requirements.map((requirement) => {
    const document = latest.get(requirement.id);
    const status = document && ["uploaded", "accepted", "rejected", "reupload_required"].includes(String(document.reviewStatus))
      ? String(document.reviewStatus) as DocumentChecklistItem["status"]
      : "missing";
    return {
      ...requirement,
      status,
      documentId: document ? String(document.id) : null,
      originalFilename: document ? String(document.originalFilename) : null,
      rejectionReason: document?.rejectionReason ? String(document.rejectionReason) : null,
      uploadedAt: document?.uploadedAt ? Number(document.uploadedAt) : null,
    };
  });
}

export async function checklistReady(listId: string) {
  const checklist = await listChecklist(listId);
  const incomplete = checklist.filter((item) => item.status !== "accepted");
  return { ready: incomplete.length === 0, checklist, incomplete };
}
