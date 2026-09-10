export const COUNSELLORS = [
  {
    id: "vivek-singh-raghuvanshi",
    name: "Mr. Vivek Singh Raghuvanshi",
    title: "Senior Counsellor",
    specialities: ["BAMS", "AYUSH"],
    accent: "amber" as const,
  },
  {
    id: "shubham-aggarwal",
    name: "Mr. Shubham Aggarwal",
    title: "Senior Counsellor",
    specialities: ["MBBS", "BDS"],
    accent: "red" as const,
  },
  {
    id: "krishna-garg",
    name: "Mr. Krishna Garg",
    title: "Counsellor",
    specialities: ["Student Support", "Documentation"],
    accent: "blue" as const,
  },
  {
    id: "yashpreet-singh",
    name: "Mr. Yashpreet Singh",
    title: "Counsellor",
    specialities: ["Choice Filling", "Reporting Support"],
    accent: "emerald" as const,
  },
] as const;

export type CounsellorId = (typeof COUNSELLORS)[number]["id"];
export type CasePriority = "urgent" | "normal" | "low";
export type RoundStatus = "not_started" | "active" | "completed" | "needs_attention";
export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";
export type AllotmentDecision = "pending" | "freeze" | "float" | "slide" | "upgrade" | "report" | "withdraw";
export type FinanceStatus = "planned" | "due" | "paid" | "refunded" | "waived";
export type CommunicationChannel = "call" | "whatsapp" | "email" | "meeting" | "portal";

export type CounsellingRound = {
  id: string;
  name: string;
  status: RoundStatus;
  registrationDueAt: number | null;
  choiceDueAt: number | null;
  resultDueAt: number | null;
  reportingDueAt: number | null;
  notes: string;
};

export type CaseTask = {
  id: string;
  title: string;
  category: string;
  assigneeId: string;
  status: TaskStatus;
  dueAt: number | null;
  notes: string;
};

export type AllotmentRecord = {
  id: string;
  roundName: string;
  collegeName: string;
  course: string;
  quota: string;
  category: string;
  decision: AllotmentDecision;
  reportingAt: number | null;
  notes: string;
};

export type FinanceRecord = {
  id: string;
  label: string;
  amount: number;
  status: FinanceStatus;
  dueAt: number | null;
  paidAt: number | null;
  reference: string;
  notes: string;
};

export type CommunicationRecord = {
  id: string;
  channel: CommunicationChannel;
  direction: "outbound" | "inbound";
  counsellorId: string;
  subject: string;
  notes: string;
  contactedAt: number;
};

export type StudentCasework = {
  primaryCounsellorId: string;
  backupCounsellorId: string;
  priority: CasePriority;
  courses: string[];
  quotas: string[];
  tags: string[];
  nextAction: string;
  nextActionDueAt: number | null;
  internalNotes: string;
  studentInstructions: string;
  rounds: CounsellingRound[];
  tasks: CaseTask[];
  allotments: AllotmentRecord[];
  finances: FinanceRecord[];
  communications: CommunicationRecord[];
  updatedAt: number | null;
};

export type PortalAnnouncement = {
  id: string;
  masterId: string | null;
  title: string;
  body: string;
  priority: "info" | "important" | "urgent";
  dueAt: number | null;
  createdAt: number;
  updatedAt: number;
};

const validCounsellorIds = new Set<string>(COUNSELLORS.map((item) => item.id));

function cleanText(value: unknown, max = 1_500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanId(value: unknown) {
  const text = cleanText(value, 120);
  return text || crypto.randomUUID();
}

function cleanTimestamp(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : null;
}

function cleanTags(value: unknown, maximum = 12) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanText(item, 80)).filter(Boolean))].slice(0, maximum);
}

function parseArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? value as T : fallback;
}

export function emptyCasework(): StudentCasework {
  return {
    primaryCounsellorId: "",
    backupCounsellorId: "",
    priority: "normal",
    courses: [],
    quotas: [],
    tags: [],
    nextAction: "",
    nextActionDueAt: null,
    internalNotes: "",
    studentInstructions: "",
    rounds: [],
    tasks: [],
    allotments: [],
    finances: [],
    communications: [],
    updatedAt: null,
  };
}

export function normaliseCasework(value: unknown): StudentCasework {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const counsellor = (input: unknown) => validCounsellorIds.has(String(input)) ? String(input) : "";
  return {
    primaryCounsellorId: counsellor(source.primaryCounsellorId),
    backupCounsellorId: counsellor(source.backupCounsellorId),
    priority: oneOf(source.priority, ["urgent", "normal", "low"] as const, "normal"),
    courses: cleanTags(source.courses),
    quotas: cleanTags(source.quotas),
    tags: cleanTags(source.tags),
    nextAction: cleanText(source.nextAction, 240),
    nextActionDueAt: cleanTimestamp(source.nextActionDueAt),
    internalNotes: cleanText(source.internalNotes, 6_000),
    studentInstructions: cleanText(source.studentInstructions, 4_000),
    rounds: parseArray(source.rounds).slice(0, 30).map((item) => {
      const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        id: cleanId(row.id),
        name: cleanText(row.name, 140),
        status: oneOf(row.status, ["not_started", "active", "completed", "needs_attention"] as const, "not_started"),
        registrationDueAt: cleanTimestamp(row.registrationDueAt),
        choiceDueAt: cleanTimestamp(row.choiceDueAt),
        resultDueAt: cleanTimestamp(row.resultDueAt),
        reportingDueAt: cleanTimestamp(row.reportingDueAt),
        notes: cleanText(row.notes, 1_500),
      };
    }).filter((item) => item.name),
    tasks: parseArray(source.tasks).slice(0, 80).map((item) => {
      const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        id: cleanId(row.id),
        title: cleanText(row.title, 180),
        category: cleanText(row.category, 80) || "General",
        assigneeId: counsellor(row.assigneeId),
        status: oneOf(row.status, ["pending", "in_progress", "completed", "blocked"] as const, "pending"),
        dueAt: cleanTimestamp(row.dueAt),
        notes: cleanText(row.notes, 1_500),
      };
    }).filter((item) => item.title),
    allotments: parseArray(source.allotments).slice(0, 30).map((item) => {
      const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        id: cleanId(row.id),
        roundName: cleanText(row.roundName, 120),
        collegeName: cleanText(row.collegeName, 240),
        course: cleanText(row.course, 80),
        quota: cleanText(row.quota, 100),
        category: cleanText(row.category, 80),
        decision: oneOf(row.decision, ["pending", "freeze", "float", "slide", "upgrade", "report", "withdraw"] as const, "pending"),
        reportingAt: cleanTimestamp(row.reportingAt),
        notes: cleanText(row.notes, 1_500),
      };
    }).filter((item) => item.roundName || item.collegeName),
    finances: parseArray(source.finances).slice(0, 50).map((item) => {
      const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const amount = Number(row.amount);
      return {
        id: cleanId(row.id),
        label: cleanText(row.label, 160),
        amount: Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0,
        status: oneOf(row.status, ["planned", "due", "paid", "refunded", "waived"] as const, "planned"),
        dueAt: cleanTimestamp(row.dueAt),
        paidAt: cleanTimestamp(row.paidAt),
        reference: cleanText(row.reference, 140),
        notes: cleanText(row.notes, 1_500),
      };
    }).filter((item) => item.label),
    communications: parseArray(source.communications).slice(0, 100).map((item) => {
      const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        id: cleanId(row.id),
        channel: oneOf(row.channel, ["call", "whatsapp", "email", "meeting", "portal"] as const, "call"),
        direction: oneOf(row.direction, ["outbound", "inbound"] as const, "outbound"),
        counsellorId: counsellor(row.counsellorId),
        subject: cleanText(row.subject, 180),
        notes: cleanText(row.notes, 2_000),
        contactedAt: cleanTimestamp(row.contactedAt) ?? Date.now(),
      };
    }).filter((item) => item.subject || item.notes),
    updatedAt: cleanTimestamp(source.updatedAt),
  };
}

export function caseworkFromRow(row: Record<string, unknown> | null | undefined): StudentCasework {
  if (!row) return emptyCasework();
  return normaliseCasework({
    primaryCounsellorId: row.primaryCounsellorId,
    backupCounsellorId: row.backupCounsellorId,
    priority: row.priority,
    courses: parseArray(row.coursesJson),
    quotas: parseArray(row.quotasJson),
    tags: parseArray(row.tagsJson),
    nextAction: row.nextAction,
    nextActionDueAt: row.nextActionDueAt,
    internalNotes: row.internalNotes,
    studentInstructions: row.studentInstructions,
    rounds: parseArray(row.roundsJson),
    tasks: parseArray(row.tasksJson),
    allotments: parseArray(row.allotmentsJson),
    finances: parseArray(row.financesJson),
    communications: parseArray(row.communicationsJson),
    updatedAt: row.updatedAt,
  });
}

export function counsellorName(id: string) {
  return COUNSELLORS.find((item) => item.id === id)?.name ?? "Unassigned";
}
