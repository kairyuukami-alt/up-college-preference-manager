import { getD1, getR2 } from "@/db";
import { emptyStudentProfile, normaliseStudentProfile } from "@/lib/student-profile";

export const MAX_PROFILE_DOCUMENTS = 20;
export const MAX_PROFILE_DOCUMENT_SIZE = 10 * 1024 * 1024;

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type ProfileDocument = {
  id: string;
  documentName: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  requirementId: string | null;
  reviewStatus: "uploaded" | "accepted" | "rejected" | "reupload_required";
  rejectionReason: string | null;
  reviewedAt: number | null;
  uploadedAt: number;
};

export async function loadProfile(listId: string) {
  const row = await getD1().prepare(`
    SELECT l.id, l.student_name AS studentName, p.data_json AS dataJson,
           p.locked_at AS profileLockedAt, p.updated_at AS profileUpdatedAt
    FROM preference_lists l
    LEFT JOIN student_profiles p ON p.list_id = l.id
    WHERE l.id = ?
  `).bind(listId).first();
  if (!row) return null;
  let parsed: unknown = {};
  try { parsed = row.dataJson ? JSON.parse(String(row.dataJson)) : {}; } catch { parsed = {}; }
  return {
    listId,
    studentName: String(row.studentName),
    data: row.dataJson ? normaliseStudentProfile(parsed) : emptyStudentProfile(),
    lockedAt: row.profileLockedAt ? Number(row.profileLockedAt) : null,
    updatedAt: row.profileUpdatedAt ? Number(row.profileUpdatedAt) : null,
  };
}

export async function saveProfile(listId: string, value: unknown, allowLocked = false) {
  const existing = await loadProfile(listId);
  if (!existing) return { error: "Student account not found.", status: 404 } as const;
  if (existing.lockedAt && !allowLocked) return { error: "This profile is locked. Only an administrator can change it.", status: 423 } as const;
  const data = normaliseStudentProfile(value);
  const encoded = JSON.stringify(data);
  if (encoded.length > 100_000) return { error: "The profile is too large.", status: 400 } as const;
  const now = Date.now();
  await getD1().prepare(`
    INSERT INTO student_profiles (list_id, data_json, locked_at, created_at, updated_at)
    VALUES (?, ?, NULL, ?, ?)
    ON CONFLICT(list_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(listId, encoded, now, now).run();
  return { data, lockedAt: existing.lockedAt, updatedAt: now };
}

export async function setProfileLocked(listId: string, locked: boolean) {
  const existing = await loadProfile(listId);
  if (!existing) return null;
  const now = Date.now();
  const lockedAt = locked ? now : null;
  await getD1().prepare(`
    INSERT INTO student_profiles (list_id, data_json, locked_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(list_id) DO UPDATE SET locked_at = excluded.locked_at, updated_at = excluded.updated_at
  `).bind(listId, JSON.stringify(existing.data), lockedAt, now, now).run();
  return { ...existing, lockedAt, updatedAt: now };
}

export async function listProfileDocuments(listId: string): Promise<ProfileDocument[]> {
  const result = await getD1().prepare(`
    SELECT id, document_name AS documentName, original_filename AS originalFilename,
           content_type AS contentType, size_bytes AS sizeBytes,
           requirement_id AS requirementId, review_status AS reviewStatus,
           rejection_reason AS rejectionReason, reviewed_at AS reviewedAt,
           uploaded_at AS uploadedAt
    FROM profile_documents WHERE list_id = ? ORDER BY uploaded_at DESC
  `).bind(listId).all();
  return result.results.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    documentName: String(row.documentName),
    originalFilename: String(row.originalFilename),
    contentType: String(row.contentType),
    sizeBytes: Number(row.sizeBytes),
    requirementId: row.requirementId ? String(row.requirementId) : null,
    reviewStatus: ["uploaded", "accepted", "rejected", "reupload_required"].includes(String(row.reviewStatus))
      ? String(row.reviewStatus) as ProfileDocument["reviewStatus"]
      : "uploaded",
    rejectionReason: row.rejectionReason ? String(row.rejectionReason) : null,
    reviewedAt: row.reviewedAt ? Number(row.reviewedAt) : null,
    uploadedAt: Number(row.uploadedAt),
  }));
}

export async function uploadProfileDocument(
  listId: string,
  documentNameValue: FormDataEntryValue | null,
  fileValue: FormDataEntryValue | null,
  allowLocked = false,
  requirementIdValue: FormDataEntryValue | null = null,
) {
  const profile = await loadProfile(listId);
  if (!profile) return { error: "Student account not found.", status: 404 } as const;
  if (profile.lockedAt && !allowLocked) return { error: "This profile is locked. Only an administrator can add documents.", status: 423 } as const;
  const requirementId = typeof requirementIdValue === "string" ? requirementIdValue.trim() : "";
  let requirementName = "";
  if (requirementId) {
    const requirement = await getD1().prepare(`
      SELECT r.document_name AS documentName
      FROM required_documents r
      JOIN preference_lists l ON COALESCE(l.master_id, 'builtin-up-private-mbbs-2026') = r.master_id
      WHERE r.id = ? AND l.id = ?
    `).bind(requirementId, listId).first();
    if (!requirement) return { error: "The selected document requirement is unavailable.", status: 400 } as const;
    requirementName = String(requirement.documentName);
  }
  const documentName = requirementName || (typeof documentNameValue === "string" ? documentNameValue.trim().replace(/[\r\n\t]+/gu, " ") : "");
  if (!documentName || documentName.length > 100) return { error: "Enter a document name of up to 100 characters.", status: 400 } as const;
  if (!(fileValue instanceof File) || fileValue.size === 0) return { error: "Choose a document to upload.", status: 400 } as const;
  if (fileValue.size > MAX_PROFILE_DOCUMENT_SIZE) return { error: "Each document must be 10 MB or smaller.", status: 413 } as const;
  if (!allowedTypes.has(fileValue.type)) return { error: "Upload a PDF, JPG, PNG, WebP, DOC or DOCX file.", status: 415 } as const;
  const previous = requirementId
    ? await getD1().prepare("SELECT id, object_key AS objectKey FROM profile_documents WHERE list_id = ? AND requirement_id = ? ORDER BY uploaded_at DESC").bind(listId, requirementId).all()
    : { results: [] as Record<string, unknown>[] };
  const count = await getD1().prepare("SELECT COUNT(*) AS count FROM profile_documents WHERE list_id = ?").bind(listId).first();
  if (Number(count?.count ?? 0) >= MAX_PROFILE_DOCUMENTS && !previous.results.length) return { error: "This profile already has the maximum of 20 documents.", status: 409 } as const;
  const id = previous.results.length ? String((previous.results[0] as Record<string, unknown>).id) : crypto.randomUUID();
  const safeName = fileValue.name.replace(/[^a-zA-Z0-9._-]+/gu, "-").slice(-120) || "document";
  const objectKey = `profiles/${listId}/${crypto.randomUUID()}-${safeName}`;
  const now = Date.now();
  await getR2().put(objectKey, fileValue.stream(), { httpMetadata: { contentType: fileValue.type } });
  try {
    if (previous.results.length) {
      const previousKeys = previous.results.map((row: Record<string, unknown>) => String(row.objectKey));
      await getD1().batch([
        getD1().prepare(`
          UPDATE profile_documents SET document_name = ?, original_filename = ?, object_key = ?,
            content_type = ?, size_bytes = ?, review_status = 'uploaded', rejection_reason = NULL,
            reviewed_at = NULL, uploaded_at = ? WHERE id = ? AND list_id = ?
        `).bind(documentName, fileValue.name.slice(0, 255), objectKey, fileValue.type, fileValue.size, now, id, listId),
        getD1().prepare("DELETE FROM profile_documents WHERE list_id = ? AND requirement_id = ? AND id <> ?").bind(listId, requirementId, id),
      ]);
      await getR2().delete(previousKeys);
    } else {
      const inserted = await getD1().prepare(`
        INSERT INTO profile_documents
          (id, list_id, document_name, original_filename, object_key, content_type, size_bytes,
           requirement_id, review_status, rejection_reason, reviewed_at, uploaded_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'uploaded', NULL, NULL, ?
        WHERE (SELECT COUNT(*) FROM profile_documents WHERE list_id = ?) < ?
      `).bind(id, listId, documentName, fileValue.name.slice(0, 255), objectKey, fileValue.type, fileValue.size, requirementId || null, now, listId, MAX_PROFILE_DOCUMENTS).run();
      if (!inserted.meta.changes) {
        await getR2().delete(objectKey);
        return { error: "This profile already has the maximum of 20 documents.", status: 409 } as const;
      }
    }
  } catch (error) {
    await getR2().delete(objectKey);
    throw error;
  }
  return {
    document: {
      id,
      documentName,
      originalFilename: fileValue.name,
      contentType: fileValue.type,
      sizeBytes: fileValue.size,
      requirementId: requirementId || null,
      reviewStatus: "uploaded" as const,
      rejectionReason: null,
      reviewedAt: null,
      uploadedAt: now,
    },
  };
}

export async function readProfileDocument(listId: string, documentId: string) {
  const metadata = await getD1().prepare(`
    SELECT document_name AS documentName, original_filename AS originalFilename,
           object_key AS objectKey, content_type AS contentType
    FROM profile_documents WHERE id = ? AND list_id = ?
  `).bind(documentId, listId).first();
  if (!metadata) return null;
  const object = await getR2().get(String(metadata.objectKey));
  if (!object) return null;
  return { metadata, object };
}

export async function removeProfileDocument(listId: string, documentId: string, allowLocked = false) {
  const profile = await loadProfile(listId);
  if (!profile) return { error: "Student account not found.", status: 404 } as const;
  if (profile.lockedAt && !allowLocked) return { error: "This profile is locked. Only an administrator can remove documents.", status: 423 } as const;
  const row = await getD1().prepare("SELECT object_key AS objectKey, document_name AS documentName FROM profile_documents WHERE id = ? AND list_id = ?").bind(documentId, listId).first();
  if (!row) return { error: "Document not found.", status: 404 } as const;
  await getR2().delete(String(row.objectKey));
  await getD1().prepare("DELETE FROM profile_documents WHERE id = ? AND list_id = ?").bind(documentId, listId).run();
  return { ok: true, documentName: String(row.documentName) };
}

export async function reviewProfileDocument(
  listId: string,
  documentId: string,
  status: ProfileDocument["reviewStatus"],
  reason: string,
) {
  if (!["uploaded", "accepted", "rejected", "reupload_required"].includes(status)) {
    return { error: "Choose a valid document status.", status: 400 } as const;
  }
  if ((status === "rejected" || status === "reupload_required") && !reason.trim()) {
    return { error: "Enter a reason so the student knows what to correct.", status: 400 } as const;
  }
  const reviewedAt = status === "uploaded" ? null : Date.now();
  const rejectionReason = status === "rejected" || status === "reupload_required" ? reason.trim().slice(0, 500) : null;
  const result = await getD1().prepare(`
    UPDATE profile_documents
    SET review_status = ?, rejection_reason = ?, reviewed_at = ?
    WHERE id = ? AND list_id = ?
  `).bind(status, rejectionReason, reviewedAt, documentId, listId).run();
  if (!result.meta.changes) return { error: "Document not found.", status: 404 } as const;
  return { ok: true, reviewStatus: status, rejectionReason, reviewedAt };
}

export function documentResponse(
  result: NonNullable<Awaited<ReturnType<typeof readProfileDocument>>>,
  disposition: "inline" | "attachment" = "inline",
) {
  const filename = String(result.metadata.originalFilename).replace(/[\r\n"]/gu, "_");
  const headers = new Headers();
  result.object.writeHttpMetadata(headers);
  headers.set("Content-Type", String(result.metadata.contentType));
  headers.set("Content-Disposition", `${disposition}; filename="${filename}"`);
  headers.set("Cache-Control", "private, no-store");
  if (result.object.etag) headers.set("ETag", result.object.etag);
  return new Response(result.object.body, { headers });
}
