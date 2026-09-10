export const COUNSELLING_STAGES = [
  { key: "registrationStatus", column: "registration_status", label: "Registration" },
  { key: "verificationStatus", column: "verification_status", label: "Verification" },
  { key: "choiceFillingStatus", column: "choice_filling_status", label: "Choice Filling" },
  { key: "allotmentStatus", column: "allotment_status", label: "Allotment" },
  { key: "reportingStatus", column: "reporting_status", label: "Reporting" },
  { key: "admissionStatus", column: "admission_status", label: "Admission" },
] as const;

export const STAGE_STATUSES = ["not_started", "in_progress", "completed", "blocked"] as const;
export type StageStatus = typeof STAGE_STATUSES[number];
export type ActorRole = "admin" | "student";

export type DocumentRequirement = {
  id: string;
  masterId: string;
  documentName: string;
  createdAt: number;
};

export type DocumentChecklistItem = DocumentRequirement & {
  status: "missing" | "uploaded" | "accepted" | "rejected" | "reupload_required";
  documentId: string | null;
  originalFilename: string | null;
  rejectionReason: string | null;
  uploadedAt: number | null;
};
