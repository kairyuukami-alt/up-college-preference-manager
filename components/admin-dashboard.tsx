"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSpreadsheet,
  FileSearch,
  FileWarning,
  FolderOpen,
  History,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  LockOpen,
  LogOut,
  MessageCircleQuestion,
  Plus,
  Printer,
  ShieldCheck,
  Trash2,
  UserRoundX,
  UsersRound,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";

import { OfficialCounsellingSchedules } from "@/components/official-counselling-schedules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { COUNSELLING_STAGES, STAGE_STATUSES, type StageStatus } from "@/lib/counselling-types";

type StudentStatus = Record<(typeof COUNSELLING_STAGES)[number]["key"], StageStatus> & { adminInstructions: string };
type DashboardStudent = {
  id: string;
  studentName: string;
  masterId: string;
  masterTitle: string;
  profileCompletion: number;
  profileComplete: boolean;
  profileLockedAt: number | null;
  choiceLockedAt: number | null;
  collegeCount: number;
  requiredDocuments: number;
  acceptedDocuments: number;
  missingDocuments: number;
  missingDocumentNames: string[];
  status: StudentStatus;
  updatedAt: number;
};
type DashboardData = {
  masters: { id: string; title: string }[];
  metrics: { totalStudents: number; incompleteProfiles: number; missingDocuments: number; unlockedChoices: number; unansweredQuestions: number };
  students: DashboardStudent[];
  deadlines: { id: string; masterId: string; masterTitle: string; title: string; dueAt: number; notes: string | null }[];
  requirements: { id: string; masterId: string; documentName: string }[];
  audit: { id: string; listId: string | null; studentName: string | null; actorRole: string; eventType: string; details: Record<string, unknown>; createdAt: number }[];
};

type AdminDashboardProps = {
  onOpenDirectory: () => void;
  onOpenOperations: () => void;
  onOpenChoice: (listId?: string) => void;
  onOpenProfile: (listId?: string) => void;
  onOpenQuestions: () => void;
  onOpenResults: () => void;
  onLogout: () => void | Promise<void>;
};

const statusLabels: Record<StageStatus, string> = { not_started: "Not started", in_progress: "In progress", completed: "Completed", blocked: "Needs attention" };
const statusClasses: Record<StageStatus, string> = { not_started: "bg-slate-100 text-slate-600", in_progress: "bg-blue-50 text-blue-700", completed: "bg-emerald-50 text-emerald-700", blocked: "bg-red-50 text-red-700" };

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function escapeXml(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminDashboard({ onOpenDirectory, onOpenOperations, onOpenChoice, onOpenProfile, onOpenQuestions, onOpenResults, onLogout }: AdminDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [masterId, setMasterId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<DashboardStudent | null>(null);
  const [statusDraft, setStatusDraft] = useState<StudentStatus | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [requirementName, setRequirementName] = useState("");
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [deadlineTitle, setDeadlineTitle] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [deadlineNotes, setDeadlineNotes] = useState("");
  const [mutating, setMutating] = useState(false);

  const requestJson = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, { cache: "no-store", ...init });
    const result = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(result.error || "Something went wrong.");
    return result;
  }, []);

  const loadDashboard = useCallback(async (filter: string) => {
    setLoading(true);
    try {
      setData(await requestJson<DashboardData>(`/api/admin/dashboard?masterId=${encodeURIComponent(filter)}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, [requestJson]);

  useEffect(() => {
    // Refresh the server-backed operational summary whenever its counselling filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard(masterId);
  }, [loadDashboard, masterId]);

  async function addRequirement() {
    if (masterId === "all" || !requirementName.trim()) return;
    setMutating(true);
    try {
      await requestJson(`/api/masters/${masterId}/requirements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentName: requirementName }) });
      setRequirementName("");
      await loadDashboard(masterId);
      toast.success("Required document added.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't add the document."); }
    finally { setMutating(false); }
  }

  async function removeRequirement(requirementId: string) {
    if (masterId === "all" || !window.confirm("Remove this required document from the counselling checklist?")) return;
    setMutating(true);
    try {
      await requestJson(`/api/masters/${masterId}/requirements`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requirementId }) });
      await loadDashboard(masterId);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't remove the document."); }
    finally { setMutating(false); }
  }

  async function addDeadline() {
    const dueAt = Date.parse(deadlineAt);
    if (masterId === "all" || !deadlineTitle.trim() || !Number.isFinite(dueAt)) return;
    setMutating(true);
    try {
      await requestJson(`/api/masters/${masterId}/deadlines`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: deadlineTitle, dueAt, notes: deadlineNotes }) });
      setDeadlineOpen(false); setDeadlineTitle(""); setDeadlineAt(""); setDeadlineNotes("");
      await loadDashboard(masterId);
      toast.success("Counselling deadline added.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't add the deadline."); }
    finally { setMutating(false); }
  }

  async function removeDeadline(deadlineId: string, deadlineMasterId: string) {
    if (!window.confirm("Delete this counselling deadline?")) return;
    setMutating(true);
    try {
      await requestJson(`/api/masters/${deadlineMasterId}/deadlines`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deadlineId }) });
      await loadDashboard(masterId);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't remove the deadline."); }
    finally { setMutating(false); }
  }

  async function saveStatus() {
    if (!selectedStudent || !statusDraft) return;
    setSavingStatus(true);
    try {
      await requestJson(`/api/lists/${selectedStudent.id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(statusDraft) });
      setSelectedStudent(null); setStatusDraft(null);
      await loadDashboard(masterId);
      toast.success("Student counselling progress updated.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't update progress."); }
    finally { setSavingStatus(false); }
  }

  function exportMissingDocuments() {
    if (!data) return;
    const rows = data.students.flatMap((student) => student.missingDocumentNames.map((documentName) => [student.studentName, student.masterTitle, documentName, student.acceptedDocuments, student.requiredDocuments]));
    const csv = ["Student,Counselling,Missing document,Accepted count,Required count", ...rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\r\n");
    downloadBlob(`\ufeff${csv}`, "text/csv;charset=utf-8", "missing-document-report.csv");
  }

  function exportExcel() {
    if (!data) return;
    const headers = ["Student", "Counselling", "Profile %", "Profile", "Choices", "Colleges", "Required Documents", "Accepted Documents", ...COUNSELLING_STAGES.map((stage) => stage.label)];
    const rows = data.students.map((student) => [student.studentName, student.masterTitle, student.profileCompletion, student.profileComplete ? "Complete" : "Incomplete", student.choiceLockedAt ? "Locked" : "Unlocked", student.collegeCount, student.requiredDocuments, student.acceptedDocuments, ...COUNSELLING_STAGES.map((stage) => statusLabels[student.status[stage.key]])]);
    const xmlRows = [headers, ...rows].map((row) => `<Row>${row.map((value) => `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${escapeXml(value)}</Data></Cell>`).join("")}</Row>`).join("");
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Students"><Table>${xmlRows}</Table></Worksheet></Workbook>`;
    downloadBlob(xml, "application/vnd.ms-excel", "counselling-students.xls");
  }

  const currentRequirements = useMemo(() => data?.requirements.filter((item) => item.masterId === masterId) ?? [], [data, masterId]);
  const attention = data?.students.filter((student) => !student.profileComplete || student.missingDocuments > 0 || !student.choiceLockedAt || COUNSELLING_STAGES.some((stage) => student.status[stage.key] === "blocked")) ?? [];

  return (
    <main className="min-h-screen bg-[#f3f6fa] text-[#172033]">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-[1700px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3"><Link href="/"><Image src="/vidyasaarthi-logo.jpeg" alt="VidyaSaarthi" width={58} height={58} priority unoptimized className="size-14 rounded-full border border-red-100 object-contain" /></Link><div><p className="text-xl font-black">Administrator Dashboard</p><p className="text-xs font-semibold text-slate-500">VidyaSaarthi • Counselling operations</p></div></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onOpenDirectory}><UsersRound /> Student Directory</Button><Button onClick={onOpenOperations}><UserRoundCog /> Command Centre</Button><Button variant="outline" onClick={onOpenResults}><FileSearch /> Result Desk</Button><Button variant="outline" onClick={() => onOpenChoice()}><ListOrdered /> Choice Filling</Button><Button variant="outline" onClick={() => onOpenProfile()}><UsersRound /> Profiles</Button><Button variant="outline" onClick={onOpenQuestions}><MessageCircleQuestion /> Questions</Button><Badge className="bg-slate-900 text-white"><ShieldCheck /> Admin</Badge><Button variant="ghost" size="icon" onClick={() => void onLogout()}><LogOut /></Button></div>
        </div>
      </header>

      <section className="print-only print-document"><h1 className="print-student-name">VidyaSaarthi Activity History</h1><table className="print-table"><thead><tr><th>Date</th><th>Student</th><th>Action</th><th>By</th></tr></thead><tbody>{data?.audit.map((event) => <tr key={event.id}><td>{formatDate(event.createdAt)}</td><td>{event.studentName ?? "General"}</td><td>{event.eventType.replaceAll("_", " ")}</td><td>{event.actorRole}</td></tr>)}</tbody></table></section>

      <div className="no-print mx-auto max-w-[1700px] space-y-5 px-4 py-6 sm:px-6">
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div><h1 className="flex items-center gap-2 text-2xl font-black"><LayoutDashboard className="text-[#cc0000]" /> Operations overview</h1><p className="mt-1 text-sm text-slate-500">See every student who needs counselling attention.</p></div><select value={masterId} onChange={(event) => setMasterId(event.target.value)} className="ml-auto h-11 min-w-64 rounded-xl border border-slate-300 bg-white px-3 font-bold"><option value="all">All counsellings</option>{data?.masters.map((master) => <option key={master.id} value={master.id}>{master.title}</option>)}</select></section>

        {loading || !data ? <div className="grid min-h-96 place-items-center rounded-3xl bg-white"><Loader2 className="size-8 animate-spin text-[#cc0000]" /></div> : <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Total students", value: data.metrics.totalStudents, Icon: UsersRound, accent: "bg-blue-50 text-blue-700" },
              { label: "Incomplete profiles", value: data.metrics.incompleteProfiles, Icon: UserRoundX, accent: "bg-amber-50 text-amber-700" },
              { label: "Missing documents", value: data.metrics.missingDocuments, Icon: FileWarning, accent: "bg-red-50 text-red-700" },
              { label: "Unlocked choices", value: data.metrics.unlockedChoices, Icon: LockOpen, accent: "bg-violet-50 text-violet-700" },
              { label: "Unanswered questions", value: data.metrics.unansweredQuestions, Icon: MessageCircleQuestion, accent: "bg-emerald-50 text-emerald-700" },
            ].map(({ label, value, Icon, accent }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className={`grid size-10 place-items-center rounded-xl ${accent}`}><Icon className="size-5" /></span><p className="mt-4 text-3xl font-black">{value}</p><p className="mt-1 text-sm font-bold text-slate-500">{label}</p></article>)}
          </section>

          <OfficialCounsellingSchedules />

          <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="text-xl font-black">Students requiring attention</h2><p className="text-sm text-slate-500">Open the exact choice list or profile in one click.</p></div><Badge variant="outline">{attention.length} students</Badge></div><div className="max-h-[650px] overflow-auto divide-y">{attention.length ? attention.map((student) => <article key={student.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black">{student.studentName}</h3><p className="text-xs font-semibold text-slate-500">{student.masterTitle}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => onOpenChoice(student.id)}><ListOrdered /> Choices</Button><Button size="sm" variant="outline" onClick={() => onOpenProfile(student.id)}><FolderOpen /> Profile</Button><Button size="sm" onClick={() => { setSelectedStudent(student); setStatusDraft({ ...student.status }); }}><ClipboardCheck /> Update status</Button></div></div><div className="mt-4 flex flex-wrap gap-2"><Badge className={student.profileComplete ? statusClasses.completed : statusClasses.blocked}>Profile {student.profileCompletion}%</Badge><Badge className={student.missingDocuments ? statusClasses.blocked : statusClasses.completed}>{student.acceptedDocuments}/{student.requiredDocuments} documents</Badge><Badge className={student.choiceLockedAt ? statusClasses.completed : statusClasses.in_progress}>{student.choiceLockedAt ? `Choices locked ${formatDate(student.choiceLockedAt)}` : "Choices unlocked"}</Badge></div><div className="mt-3 grid grid-cols-3 gap-1 sm:grid-cols-6">{COUNSELLING_STAGES.map((stage) => <span key={stage.key} title={`${stage.label}: ${statusLabels[student.status[stage.key]]}`} className={`rounded-lg px-2 py-2 text-center text-[11px] font-bold ${statusClasses[student.status[stage.key]]}`}>{stage.label}</span>)}</div></article>) : <div className="p-12 text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-500" /><p className="mt-3 font-black">No students need attention</p></div>}</div></div>

            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-black">Private student reminders</h2><p className="text-xs text-slate-500">Extra instructions visible only to assigned students</p></div><Button size="sm" disabled={masterId === "all"} onClick={() => setDeadlineOpen(true)}><Plus /> Add</Button></div><div className="mt-4 space-y-2">{data.deadlines.length ? data.deadlines.map((deadline) => <div key={deadline.id} className="rounded-xl border border-slate-200 p-3"><div className="flex gap-2"><CalendarClock className="mt-0.5 size-4 text-[#cc0000]" /><div className="min-w-0 flex-1"><p className="font-bold">{deadline.title}</p><p className="text-xs text-slate-500">{deadline.masterTitle} • {formatDate(Number(deadline.dueAt))}</p>{deadline.notes && <p className="mt-1 text-xs text-slate-600">{deadline.notes}</p>}</div><Button variant="ghost" size="icon-xs" onClick={() => void removeDeadline(deadline.id, deadline.masterId)}><Trash2 className="text-red-600" /></Button></div></div>) : <p className="py-6 text-center text-sm text-slate-500">No private reminder has been added.</p>}</div></section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Required document checklist</h2><p className="mt-1 text-xs text-slate-500">Select one counselling above to manage its checklist.</p>{masterId !== "all" && <><div className="mt-4 flex gap-2"><Input value={requirementName} onChange={(event) => setRequirementName(event.target.value)} placeholder="Example: 12th Marksheet" /><Button onClick={() => void addRequirement()} disabled={mutating || !requirementName.trim()}><Plus /></Button></div><div className="mt-3 space-y-2">{currentRequirements.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold"><span className="flex-1">{item.documentName}</span><Button variant="ghost" size="icon-xs" onClick={() => void removeRequirement(item.id)}><Trash2 className="text-red-600" /></Button></div>)}</div></>}</section>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Exports</h2><div className="mt-4 grid gap-2"><Button variant="outline" onClick={exportMissingDocuments}><FileWarning /> Missing-document report</Button><Button variant="outline" onClick={exportExcel}><FileSpreadsheet /> Counselling student Excel</Button><Button variant="outline" onClick={() => window.print()}><Printer /> Printable activity history</Button></div></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b p-5"><h2 className="flex items-center gap-2 font-black"><History className="text-[#cc0000]" /> Recent activity</h2></div><div className="max-h-72 divide-y overflow-auto">{data.audit.map((event) => <div key={event.id} className="flex items-start gap-3 p-4"><Clock3 className="mt-0.5 size-4 text-slate-400" /><div><p className="text-sm font-bold capitalize">{event.eventType.replaceAll("_", " ")}</p><p className="text-xs text-slate-500">{event.studentName ?? "Portal"} • {event.actorRole} • {formatDate(event.createdAt)}</p></div></div>)}</div></div></section>
        </>}
      </div>

      <Dialog open={Boolean(selectedStudent)} onOpenChange={(open) => { if (!open) { setSelectedStudent(null); setStatusDraft(null); } }}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Update counselling status</DialogTitle><DialogDescription>{selectedStudent?.studentName} • Set each stage and add instructions visible to the student.</DialogDescription></DialogHeader>{statusDraft && <div className="grid gap-4 sm:grid-cols-2">{COUNSELLING_STAGES.map((stage) => <div key={stage.key}><label className="mb-1.5 block text-sm font-bold">{stage.label}</label><select value={statusDraft[stage.key]} onChange={(event) => setStatusDraft((current) => current ? { ...current, [stage.key]: event.target.value as StageStatus } : current)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-semibold">{STAGE_STATUSES.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></div>)}<div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-bold">Important instructions</label><Textarea value={statusDraft.adminInstructions} onChange={(event) => setStatusDraft((current) => current ? { ...current, adminInstructions: event.target.value } : current)} rows={5} placeholder="Instructions, reminders or next steps for this student" /></div></div>}<DialogFooter><Button variant="outline" onClick={() => setSelectedStudent(null)}>Cancel</Button><Button onClick={() => void saveStatus()} disabled={savingStatus}>{savingStatus ? <Loader2 className="animate-spin" /> : <ClipboardCheck />} Save progress</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={deadlineOpen} onOpenChange={setDeadlineOpen}><DialogContent><DialogHeader><DialogTitle>Add counselling deadline</DialogTitle><DialogDescription>This reminder will be visible to students assigned to the selected counselling.</DialogDescription></DialogHeader><div className="space-y-4"><div><label className="mb-1.5 block text-sm font-bold">Deadline title</label><Input value={deadlineTitle} onChange={(event) => setDeadlineTitle(event.target.value)} placeholder="Example: Choice locking closes" /></div><div><label className="mb-1.5 block text-sm font-bold">Date and time</label><Input type="datetime-local" value={deadlineAt} onChange={(event) => setDeadlineAt(event.target.value)} /></div><div><label className="mb-1.5 block text-sm font-bold">Reminder notes</label><Textarea value={deadlineNotes} onChange={(event) => setDeadlineNotes(event.target.value)} rows={3} /></div></div><DialogFooter><Button variant="outline" onClick={() => setDeadlineOpen(false)}>Cancel</Button><Button onClick={() => void addDeadline()} disabled={mutating || !deadlineTitle.trim() || !deadlineAt}><CalendarClock /> Add deadline</Button></DialogFooter></DialogContent></Dialog>
    </main>
  );
}
