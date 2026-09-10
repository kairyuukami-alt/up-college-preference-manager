"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  Loader2,
  LogOut,
  Megaphone,
  MessageCircle,
  PhoneCall,
  Plus,
  Save,
  Search,
  Sparkles,
  Target,
  Trash2,
  UserRoundCog,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  COUNSELLORS,
  counsellorName,
  emptyCasework,
  type AllotmentRecord,
  type CaseTask,
  type CommunicationRecord,
  type CounsellingRound,
  type FinanceRecord,
  type PortalAnnouncement,
  type StudentCasework,
} from "@/lib/case-management";

type OperationsStudent = {
  id: string;
  studentName: string;
  masterId: string;
  masterTitle: string;
  mobile: string;
  email: string;
  choiceLockedAt: number | null;
  profileLockedAt: number | null;
  collegeCount: number;
  updatedAt: number;
  casework: StudentCasework;
};

type OperationsData = {
  team: typeof COUNSELLORS;
  masters: Array<{ id: string; title: string }>;
  students: OperationsStudent[];
  announcements: PortalAnnouncement[];
  metrics: {
    activeCases: number;
    urgentCases: number;
    unassignedCases: number;
    overdueTasks: number;
    duePayments: number;
    reportingSoon: number;
    activeRounds: number;
  };
  workload: Array<{ counsellorId: string; studentCount: number; openTasks: number }>;
};

type Props = {
  onOpenDashboard: () => void;
  onOpenChoice: (listId?: string) => void;
  onOpenProfile: (listId?: string) => void;
  onOpenQuestions: () => void;
  onLogout: () => void | Promise<void>;
};

const inputClass = "h-11 rounded-xl border-slate-200 bg-white";
const selectClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#cc0000] focus:ring-2 focus:ring-red-100";
const labelClass = "mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-slate-500";

const WHATSAPP_TEMPLATES = [
  "Hello, this is a reminder from VidyaSaarthi about your next counselling action. Please check your dashboard and complete it before the deadline.",
  "Hello, please review the pending documents shown in your VidyaSaarthi profile and upload the required clear copies.",
  "Hello, your choice list is ready for review. Please check the order carefully before final locking.",
  "Hello, please check your allotment and reporting details. Keep originals, photocopies and the required fee ready before reporting.",
] as const;

const priorityClasses = {
  urgent: "border-red-200 bg-red-50 text-red-700",
  normal: "border-blue-200 bg-blue-50 text-blue-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
};

function formatDate(value: number | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not scheduled";
}

function dateTimeValue(value: number | null) {
  if (!value) return "";
  const date = new Date(value - new Date(value).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function parseDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const blob = new Blob([`﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function newRound(): CounsellingRound {
  return { id: crypto.randomUUID(), name: "", status: "not_started", registrationDueAt: null, choiceDueAt: null, resultDueAt: null, reportingDueAt: null, notes: "" };
}

function newTask(primaryCounsellorId = ""): CaseTask {
  return { id: crypto.randomUUID(), title: "", category: "General", assigneeId: primaryCounsellorId, status: "pending", dueAt: null, notes: "" };
}

function newAllotment(): AllotmentRecord {
  return { id: crypto.randomUUID(), roundName: "", collegeName: "", course: "", quota: "", category: "", decision: "pending", reportingAt: null, notes: "" };
}

function newFinance(): FinanceRecord {
  return { id: crypto.randomUUID(), label: "", amount: 0, status: "planned", dueAt: null, paidAt: null, reference: "", notes: "" };
}

function newCommunication(primaryCounsellorId = ""): CommunicationRecord {
  return { id: crypto.randomUUID(), channel: "call", direction: "outbound", counsellorId: primaryCounsellorId, subject: "", notes: "", contactedAt: Date.now() };
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof ClipboardList; title: string; detail: string }) {
  return <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm"><Icon className="size-5" /></span><p className="mt-3 font-black text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div></div>;
}

function CounsellorSelect({ value, onChange, allowEmpty = true }: { value: string; onChange: (value: string) => void; allowEmpty?: boolean }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>{allowEmpty && <option value="">Unassigned</option>}{COUNSELLORS.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.specialities.join(" / ")}</option>)}</select>;
}

export function CounsellingOperationsCenter({ onOpenDashboard, onOpenChoice, onOpenProfile, onOpenQuestions, onLogout }: Props) {
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [masterId, setMasterId] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<StudentCasework>(emptyCasework());
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState<PortalAnnouncement["priority"]>("important");
  const [announcementMasterId, setAnnouncementMasterId] = useState("");
  const [announcementDueAt, setAnnouncementDueAt] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState(WHATSAPP_TEMPLATES[0]);

  const requestJson = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, { cache: "no-store", ...init });
    const result = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(result.error || "Something went wrong.");
    return result;
  }, []);

  const loadOperations = useCallback(async (filter: string, preferredId?: string) => {
    setLoading(true);
    try {
      const result = await requestJson<OperationsData>(`/api/admin/operations?masterId=${encodeURIComponent(filter)}`);
      setData(result);
      const nextId = result.students.some((student) => student.id === preferredId) ? preferredId! : result.students[0]?.id ?? "";
      setSelectedId(nextId);
      setDraft(result.students.find((student) => student.id === nextId)?.casework ?? emptyCasework());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't open counselling operations.");
    } finally {
      setLoading(false);
    }
  }, [requestJson]);

  useEffect(() => {
    // Server-backed case files are reloaded when the counselling filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOperations(masterId, selectedId);
    // selectedId is intentionally not a dependency: changing students should not refetch the whole operations dataset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOperations, masterId]);

  const selectedStudent = useMemo(() => data?.students.find((student) => student.id === selectedId) ?? null, [data, selectedId]);
  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.students ?? []).filter((student) => !query || [student.studentName, student.masterTitle, counsellorName(student.casework.primaryCounsellorId), ...student.casework.tags, ...student.casework.courses].some((value) => value.toLowerCase().includes(query)));
  }, [data, search]);

  function chooseStudent(student: OperationsStudent) {
    setSelectedId(student.id);
    setDraft(structuredClone(student.casework));
  }

  function updateDraft<K extends keyof StudentCasework>(key: K, value: StudentCasework[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateItem<K extends "rounds" | "tasks" | "allotments" | "finances" | "communications">(
    collection: K,
    id: string,
    patch: Partial<StudentCasework[K][number]>,
  ) {
    setDraft((current) => ({ ...current, [collection]: current[collection].map((item) => item.id === id ? { ...item, ...patch } : item) as StudentCasework[K] }));
  }

  function removeItem<K extends "rounds" | "tasks" | "allotments" | "finances" | "communications">(collection: K, id: string) {
    setDraft((current) => ({ ...current, [collection]: current[collection].filter((item) => item.id !== id) as StudentCasework[K] }));
  }

  async function saveCasework() {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      const result = await requestJson<{ casework: StudentCasework }>("/api/admin/operations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: selectedStudent.id, casework: draft }),
      });
      setDraft(result.casework);
      setData((current) => current ? { ...current, students: current.students.map((student) => student.id === selectedStudent.id ? { ...student, casework: result.casework } : student) } : current);
      toast.success(`${selectedStudent.studentName}'s counselling case file is saved.`);
      await loadOperations(masterId, selectedStudent.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save this case file.");
    } finally {
      setSaving(false);
    }
  }

  async function addAnnouncement() {
    if (!announcementTitle.trim() || !announcementBody.trim()) return;
    setSaving(true);
    try {
      await requestJson("/api/admin/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: announcementTitle, body: announcementBody, priority: announcementPriority, masterId: announcementMasterId || null, dueAt: parseDate(announcementDueAt) }),
      });
      setAnnouncementTitle(""); setAnnouncementBody(""); setAnnouncementDueAt("");
      await loadOperations(masterId, selectedId);
      toast.success("Student announcement published.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't publish the announcement.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!window.confirm("Remove this announcement from student dashboards?")) return;
    try {
      await requestJson("/api/admin/operations", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setData((current) => current ? { ...current, announcements: current.announcements.filter((item) => item.id !== id) } : current);
      toast.success("Announcement removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove the announcement.");
    }
  }

  function exportOperations() {
    if (!data) return;
    const rows: unknown[][] = [["Student", "Counselling", "Primary counsellor", "Priority", "Courses", "Quotas", "Next action", "Next action due", "Open tasks", "Active rounds", "Pending payments", "Allotments", "Choice status", "Profile status"]];
    for (const student of data.students) rows.push([
      student.studentName,
      student.masterTitle,
      counsellorName(student.casework.primaryCounsellorId),
      student.casework.priority,
      student.casework.courses.join("; "),
      student.casework.quotas.join("; "),
      student.casework.nextAction,
      formatDate(student.casework.nextActionDueAt),
      student.casework.tasks.filter((item) => item.status !== "completed").length,
      student.casework.rounds.filter((item) => item.status === "active").length,
      student.casework.finances.filter((item) => ["planned", "due"].includes(item.status)).length,
      student.casework.allotments.length,
      student.choiceLockedAt ? "Locked" : "Editable",
      student.profileLockedAt ? "Locked" : "Draft",
    ]);
    downloadCsv("vidyasaarthi-counselling-operations.csv", rows);
  }

  const whatsappUrl = selectedStudent?.mobile
    ? `https://wa.me/${selectedStudent.mobile.length === 10 ? `91${selectedStudent.mobile}` : selectedStudent.mobile}?text=${encodeURIComponent(whatsappTemplate)}`
    : "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff1f2_0,transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] text-[#172033]">
      <header className="sticky top-0 z-40 border-b border-white/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-[1800px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3"><Link href="/"><Image src="/vidyasaarthi-logo.jpeg" alt="VidyaSaarthi" width={58} height={58} priority unoptimized className="size-14 rounded-full border border-red-100 bg-white object-contain shadow-sm" /></Link><div><p className="flex items-center gap-2 text-xl font-black"><Sparkles className="size-5 text-[#cc0000]" /> Counselling Command Centre</p><p className="text-xs font-semibold text-slate-500">Cases, rounds, tasks, allotments, finances and communication</p></div></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onOpenDashboard}><LayoutDashboard /> Dashboard</Button><Button variant="outline" onClick={() => onOpenChoice()}><ListOrdered /> Choices</Button><Button variant="outline" onClick={() => onOpenProfile()}><UsersRound /> Profiles</Button><Button variant="outline" onClick={onOpenQuestions}><MessageCircle /> Questions</Button><Button variant="outline" onClick={exportOperations}><Download /> Export</Button><Button variant="ghost" size="icon" onClick={() => void onLogout()} aria-label="Sign out"><LogOut /></Button></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 sm:px-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#111b34] p-6 text-white shadow-[0_24px_70px_rgba(17,27,52,0.22)] sm:p-8">
          <div aria-hidden className="absolute -right-24 -top-40 size-[440px] rounded-full border-[74px] border-white/5" />
          <div aria-hidden className="absolute bottom-0 left-1/3 size-72 rounded-full bg-[#cc0000]/25 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-6"><div className="max-w-3xl"><p className="text-sm font-black uppercase tracking-[0.18em] text-red-200">Complete counselling operations</p><h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">Every case. Every deadline. One clear view.</h1><p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-300">Assign experts, manage every counselling round, track student actions and record allotment, fee and communication history from one working surface.</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-4 backdrop-blur"><p className="text-xs font-bold uppercase tracking-wide text-slate-300">Today&apos;s focus</p><p className="mt-1 text-2xl font-black">{data?.metrics.overdueTasks ?? 0} overdue tasks</p></div></div>
        </section>

        {loading || !data ? <div className="grid min-h-[520px] place-items-center rounded-3xl border border-white bg-white/80 shadow-sm"><span className="flex items-center gap-3 font-bold text-slate-500"><Loader2 className="size-6 animate-spin text-[#cc0000]" /> Loading counselling operations…</span></div> : <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
            {[
              { label: "Student cases", value: data.metrics.activeCases, Icon: GraduationCap, style: "bg-blue-50 text-blue-700" },
              { label: "Urgent cases", value: data.metrics.urgentCases, Icon: AlertTriangle, style: "bg-red-50 text-red-700" },
              { label: "Unassigned", value: data.metrics.unassignedCases, Icon: UserRoundCog, style: "bg-amber-50 text-amber-800" },
              { label: "Overdue tasks", value: data.metrics.overdueTasks, Icon: ListChecks, style: "bg-violet-50 text-violet-700" },
              { label: "Payments due", value: data.metrics.duePayments, Icon: CircleDollarSign, style: "bg-orange-50 text-orange-700" },
              { label: "Reporting soon", value: data.metrics.reportingSoon, Icon: CalendarClock, style: "bg-emerald-50 text-emerald-700" },
              { label: "Active rounds", value: data.metrics.activeRounds, Icon: Target, style: "bg-cyan-50 text-cyan-700" },
            ].map(({ label, value, Icon, style }) => <article key={label} className="rounded-2xl border border-white bg-white/90 p-4 shadow-[0_8px_26px_rgba(15,23,42,0.05)]"><span className={`grid size-10 place-items-center rounded-xl ${style}`}><Icon className="size-5" /></span><p className="mt-3 text-3xl font-black tracking-tight">{value}</p><p className="mt-0.5 text-sm font-bold text-slate-500">{label}</p></article>)}
          </section>

          <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#cc0000]">Your counselling team</p><h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">Specialists assigned by course and stage</h2></div><Badge variant="outline" className="h-8 rounded-full px-3">Live workload</Badge></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{COUNSELLORS.map((counsellor) => { const load = data.workload.find((item) => item.counsellorId === counsellor.id); const colors = counsellor.accent === "red" ? "from-red-50 to-white border-red-100 text-red-700" : counsellor.accent === "amber" ? "from-amber-50 to-white border-amber-100 text-amber-800" : counsellor.accent === "blue" ? "from-blue-50 to-white border-blue-100 text-blue-700" : "from-emerald-50 to-white border-emerald-100 text-emerald-700"; return <article key={counsellor.id} className={`rounded-2xl border bg-gradient-to-br p-5 ${colors}`}><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white/80 shadow-sm"><UserRoundCog className="size-5" /></span><span className="text-right text-xs font-black">{load?.studentCount ?? 0} cases<br /><span className="font-semibold opacity-70">{load?.openTasks ?? 0} open tasks</span></span></div><h3 className="mt-4 text-base font-black text-[#172033]">{counsellor.name}</h3><p className="mt-1 text-xs font-bold uppercase tracking-wide opacity-80">{counsellor.title}</p><div className="mt-3 flex flex-wrap gap-1.5">{counsellor.specialities.map((item) => <span key={item} className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold shadow-sm">{item}</span>)}</div></article>; })}</div></section>

          <section className="grid min-h-[820px] gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#111b34] text-white shadow-xl">
              <div className="border-b border-white/10 p-5"><div className="flex items-center justify-between"><div><p className="text-lg font-black">Student case files</p><p className="text-xs text-slate-400">{visibleStudents.length} visible records</p></div><UsersRound className="text-red-300" /></div><div className="relative mt-4"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cases" className="h-11 border-white/10 bg-white/10 pl-10 text-white placeholder:text-slate-400" /></div><select value={masterId} onChange={(event) => setMasterId(event.target.value)} className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-[#202b44] px-3 text-sm font-bold text-white"><option value="all">All counsellings</option>{data.masters.map((master) => <option key={master.id} value={master.id}>{master.title}</option>)}</select></div>
              <div className="max-h-[690px] divide-y divide-white/10 overflow-auto">{visibleStudents.length ? visibleStudents.map((student) => <button type="button" key={student.id} onClick={() => chooseStudent(student)} className={`w-full px-5 py-4 text-left transition ${selectedId === student.id ? "bg-[#cc0000]" : "hover:bg-white/[0.07]"}`}><div className="flex items-start gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl font-black ${selectedId === student.id ? "bg-white text-[#cc0000]" : "bg-white/10 text-white"}`}>{student.studentName.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate font-black">{student.studentName}</span><span className={`mt-0.5 block truncate text-xs ${selectedId === student.id ? "text-red-100" : "text-slate-400"}`}>{student.masterTitle}</span><span className="mt-2 flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${selectedId === student.id ? "bg-white/20" : priorityClasses[student.casework.priority]}`}>{student.casework.priority}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold">{student.casework.tasks.filter((item) => item.status !== "completed").length} tasks</span></span></span><ChevronRight className="mt-2 size-4 shrink-0 opacity-60" /></div></button>) : <p className="p-8 text-center text-sm text-slate-400">No student matches this filter.</p>}</div>
            </aside>

            {selectedStudent ? <section className="min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-300/30">
              <div className="border-b border-slate-200 bg-gradient-to-r from-white via-white to-red-50/60 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black tracking-[-0.035em]">{selectedStudent.studentName}</h2><Badge className={priorityClasses[draft.priority]}>{draft.priority} priority</Badge></div><p className="mt-1 text-sm font-semibold text-slate-500">{selectedStudent.masterTitle} • {selectedStudent.collegeCount} choices • {counsellorName(draft.primaryCounsellorId)}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => onOpenProfile(selectedStudent.id)}><FileText /> Profile</Button><Button variant="outline" onClick={() => onOpenChoice(selectedStudent.id)}><ListOrdered /> Choices</Button><Button onClick={() => void saveCasework()} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save case file</Button></div></div></div>

              <Tabs defaultValue="overview" className="gap-0">
                <div className="overflow-x-auto border-b border-slate-200 px-4 pt-2 sm:px-6"><TabsList variant="line" className="h-12 min-w-max gap-2"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="rounds">Rounds</TabsTrigger><TabsTrigger value="tasks">Tasks</TabsTrigger><TabsTrigger value="allotments">Allotments</TabsTrigger><TabsTrigger value="finances">Fees &amp; payments</TabsTrigger><TabsTrigger value="communications">Communication</TabsTrigger></TabsList></div>

                <TabsContent value="overview" className="space-y-6 p-5 sm:p-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label><span className={labelClass}>Primary counsellor</span><CounsellorSelect value={draft.primaryCounsellorId} onChange={(value) => updateDraft("primaryCounsellorId", value)} /></label><label><span className={labelClass}>Backup counsellor</span><CounsellorSelect value={draft.backupCounsellorId} onChange={(value) => updateDraft("backupCounsellorId", value)} /></label><label><span className={labelClass}>Case priority</span><select value={draft.priority} onChange={(event) => updateDraft("priority", event.target.value as StudentCasework["priority"])} className={selectClass}><option value="urgent">Urgent</option><option value="normal">Normal</option><option value="low">Low</option></select></label></div>
                  <div className="grid gap-4 md:grid-cols-3"><label><span className={labelClass}>Courses</span><Input className={inputClass} value={draft.courses.join(", ")} onChange={(event) => updateDraft("courses", event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12))} placeholder="MBBS, BDS, BAMS" /></label><label><span className={labelClass}>Quotas</span><Input className={inputClass} value={draft.quotas.join(", ")} onChange={(event) => updateDraft("quotas", event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12))} placeholder="State, All India, Management" /></label><label><span className={labelClass}>Tags</span><Input className={inputClass} value={draft.tags.join(", ")} onChange={(event) => updateDraft("tags", event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12))} placeholder="NRI, domicile pending" /></label></div>
                  <div className="grid gap-4 md:grid-cols-[1fr_280px]"><label><span className={labelClass}>Next best action</span><Input className={inputClass} value={draft.nextAction} onChange={(event) => updateDraft("nextAction", event.target.value)} placeholder="Example: Finalise MCC Round 2 choices" /></label><label><span className={labelClass}>Action deadline</span><Input type="datetime-local" className={inputClass} value={dateTimeValue(draft.nextActionDueAt)} onChange={(event) => updateDraft("nextActionDueAt", parseDate(event.target.value))} /></label></div>
                  <div className="grid gap-4 xl:grid-cols-2"><label><span className={labelClass}>Instructions visible to student</span><Textarea rows={7} value={draft.studentInstructions} onChange={(event) => updateDraft("studentInstructions", event.target.value)} placeholder="Write the exact action the student should take next…" /></label><label><span className={labelClass}>Internal counsellor notes</span><Textarea rows={7} value={draft.internalNotes} onChange={(event) => updateDraft("internalNotes", event.target.value)} placeholder="Private planning notes, risk flags and follow-up context…" /></label></div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: "Profile", value: selectedStudent.profileLockedAt ? "Locked" : "In progress" }, { label: "Choice list", value: selectedStudent.choiceLockedAt ? "Locked" : "Editable" }, { label: "Mobile", value: selectedStudent.mobile || "Not entered" }, { label: "Last case update", value: formatDate(draft.updatedAt) }].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{item.label}</p><p className="mt-1 break-words font-black">{item.value}</p></div>)}</div>
                </TabsContent>

                <TabsContent value="rounds" className="space-y-4 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black">Round-by-round tracker</h3><p className="text-sm text-slate-500">Registration, choice, result and reporting milestones for every round.</p></div><Button onClick={() => updateDraft("rounds", [...draft.rounds, newRound()])}><Plus /> Add round</Button></div>{draft.rounds.length ? draft.rounds.map((round) => <article key={round.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="grid gap-3 lg:grid-cols-[1.2fr_220px_auto]"><Input className={inputClass} value={round.name} onChange={(event) => updateItem("rounds", round.id, { name: event.target.value })} placeholder="MCC Round 2" /><select className={selectClass} value={round.status} onChange={(event) => updateItem("rounds", round.id, { status: event.target.value as CounsellingRound["status"] })}><option value="not_started">Not started</option><option value="active">Active</option><option value="completed">Completed</option><option value="needs_attention">Needs attention</option></select><Button variant="ghost" size="icon" onClick={() => removeItem("rounds", round.id)}><Trash2 className="text-red-600" /></Button></div><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([['registrationDueAt','Registration due'],['choiceDueAt','Choice due'],['resultDueAt','Result date'],['reportingDueAt','Reporting due']] as const).map(([key,label]) => <label key={key}><span className={labelClass}>{label}</span><Input type="datetime-local" className={inputClass} value={dateTimeValue(round[key])} onChange={(event) => updateItem("rounds", round.id, { [key]: parseDate(event.target.value) })} /></label>)}</div><Textarea className="mt-3" rows={2} value={round.notes} onChange={(event) => updateItem("rounds", round.id, { notes: event.target.value })} placeholder="Round-specific notes, documents or actions…" /></article>) : <EmptyState icon={Target} title="No rounds added" detail="Add the student's counselling rounds to track each milestone." />}</TabsContent>

                <TabsContent value="tasks" className="space-y-4 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black">Action and follow-up tasks</h3><p className="text-sm text-slate-500">Assign ownership, deadlines and completion status.</p></div><Button onClick={() => updateDraft("tasks", [...draft.tasks, newTask(draft.primaryCounsellorId)])}><Plus /> Add task</Button></div>{draft.tasks.length ? draft.tasks.map((task) => <article key={task.id} className={`rounded-2xl border p-4 ${task.status === "completed" ? "border-emerald-200 bg-emerald-50/60" : task.status === "blocked" ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-slate-50/70"}`}><div className="grid gap-3 lg:grid-cols-[1.2fr_180px_190px_auto]"><Input className={inputClass} value={task.title} onChange={(event) => updateItem("tasks", task.id, { title: event.target.value })} placeholder="Verify domicile certificate" /><Input className={inputClass} value={task.category} onChange={(event) => updateItem("tasks", task.id, { category: event.target.value })} placeholder="Category" /><select className={selectClass} value={task.status} onChange={(event) => updateItem("tasks", task.id, { status: event.target.value as CaseTask["status"] })}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="blocked">Blocked</option></select><Button variant="ghost" size="icon" onClick={() => removeItem("tasks", task.id)}><Trash2 className="text-red-600" /></Button></div><div className="mt-3 grid gap-3 md:grid-cols-[1fr_280px]"><label><span className={labelClass}>Assigned to</span><CounsellorSelect value={task.assigneeId} onChange={(value) => updateItem("tasks", task.id, { assigneeId: value })} /></label><label><span className={labelClass}>Due date</span><Input type="datetime-local" className={inputClass} value={dateTimeValue(task.dueAt)} onChange={(event) => updateItem("tasks", task.id, { dueAt: parseDate(event.target.value) })} /></label></div><Textarea className="mt-3" rows={2} value={task.notes} onChange={(event) => updateItem("tasks", task.id, { notes: event.target.value })} placeholder="Checklist or follow-up notes…" /></article>) : <EmptyState icon={ListChecks} title="No tasks added" detail="Create actions for students and counsellors, then track completion." />}</TabsContent>

                <TabsContent value="allotments" className="space-y-4 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black">Allotment decision desk</h3><p className="text-sm text-slate-500">Record seats, compare options and document freeze, float, slide or upgrade decisions.</p></div><Button onClick={() => updateDraft("allotments", [...draft.allotments, newAllotment()])}><Plus /> Add allotment</Button></div>{draft.allotments.length ? draft.allotments.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_1fr_170px_170px]"><Input className={inputClass} value={item.roundName} onChange={(event) => updateItem("allotments", item.id, { roundName: event.target.value })} placeholder="Round 1" /><Input className={inputClass} value={item.collegeName} onChange={(event) => updateItem("allotments", item.id, { collegeName: event.target.value })} placeholder="Allotted college" /><Input className={inputClass} value={item.course} onChange={(event) => updateItem("allotments", item.id, { course: event.target.value })} placeholder="Course" /><Input className={inputClass} value={item.quota} onChange={(event) => updateItem("allotments", item.id, { quota: event.target.value })} placeholder="Quota" /></div><div className="mt-3 grid gap-3 md:grid-cols-[180px_220px_1fr_auto]"><Input className={inputClass} value={item.category} onChange={(event) => updateItem("allotments", item.id, { category: event.target.value })} placeholder="Category" /><select className={selectClass} value={item.decision} onChange={(event) => updateItem("allotments", item.id, { decision: event.target.value as AllotmentRecord["decision"] })}><option value="pending">Decision pending</option><option value="freeze">Freeze</option><option value="float">Float</option><option value="slide">Slide</option><option value="upgrade">Upgrade</option><option value="report">Report / accept</option><option value="withdraw">Withdraw</option></select><Input type="datetime-local" className={inputClass} value={dateTimeValue(item.reportingAt)} onChange={(event) => updateItem("allotments", item.id, { reportingAt: parseDate(event.target.value) })} /><Button variant="ghost" size="icon" onClick={() => removeItem("allotments", item.id)}><Trash2 className="text-red-600" /></Button></div><Textarea className="mt-3" rows={2} value={item.notes} onChange={(event) => updateItem("allotments", item.id, { notes: event.target.value })} placeholder="Comparison, decision reason and reporting requirements…" /></article>) : <EmptyState icon={ArrowLeftRight} title="No allotments recorded" detail="Add an allotted seat when a result is released and track the decision." />}</TabsContent>

                <TabsContent value="finances" className="space-y-4 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black">Fee and payment tracker</h3><p className="text-sm text-slate-500">Keep counselling, security, tuition and reporting payments organised.</p></div><Button onClick={() => updateDraft("finances", [...draft.finances, newFinance()])}><Plus /> Add payment</Button></div>{draft.finances.length ? draft.finances.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_180px_auto]"><Input className={inputClass} value={item.label} onChange={(event) => updateItem("finances", item.id, { label: event.target.value })} placeholder="MCC refundable security deposit" /><Input className={inputClass} type="number" min="0" step="0.01" value={item.amount || ""} onChange={(event) => updateItem("finances", item.id, { amount: Number(event.target.value) || 0 })} placeholder="Amount ₹" /><select className={selectClass} value={item.status} onChange={(event) => updateItem("finances", item.id, { status: event.target.value as FinanceRecord["status"] })}><option value="planned">Planned</option><option value="due">Due</option><option value="paid">Paid</option><option value="refunded">Refunded</option><option value="waived">Waived</option></select><Button variant="ghost" size="icon" onClick={() => removeItem("finances", item.id)}><Trash2 className="text-red-600" /></Button></div><div className="mt-3 grid gap-3 md:grid-cols-3"><label><span className={labelClass}>Due at</span><Input type="datetime-local" className={inputClass} value={dateTimeValue(item.dueAt)} onChange={(event) => updateItem("finances", item.id, { dueAt: parseDate(event.target.value) })} /></label><label><span className={labelClass}>Paid at</span><Input type="datetime-local" className={inputClass} value={dateTimeValue(item.paidAt)} onChange={(event) => updateItem("finances", item.id, { paidAt: parseDate(event.target.value) })} /></label><label><span className={labelClass}>Receipt / reference</span><Input className={inputClass} value={item.reference} onChange={(event) => updateItem("finances", item.id, { reference: event.target.value })} placeholder="Transaction or receipt number" /></label></div><Textarea className="mt-3" rows={2} value={item.notes} onChange={(event) => updateItem("finances", item.id, { notes: event.target.value })} placeholder="Refund rules or payment notes…" /></article>) : <EmptyState icon={WalletCards} title="No payments recorded" detail="Add upcoming and completed counselling-related payments." />}</TabsContent>

                <TabsContent value="communications" className="space-y-5 p-5 sm:p-6"><div className="grid gap-4 xl:grid-cols-[1fr_360px]"><div><h3 className="text-xl font-black">Communication history</h3><p className="text-sm text-slate-500">Log calls, WhatsApp, email, meetings and portal instructions.</p></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-emerald-700">Ready-made WhatsApp message</p><select className={`${selectClass} mt-2`} value={whatsappTemplate} onChange={(event) => setWhatsappTemplate(event.target.value as typeof whatsappTemplate)}>{WHATSAPP_TEMPLATES.map((template, index) => <option key={template} value={template}>Template {index + 1}</option>)}</select><Button className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700" disabled={!whatsappUrl} asChild={Boolean(whatsappUrl)}>{whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle /> Open WhatsApp</a> : <><MessageCircle /> Mobile number missing</>}</Button></div></div><div className="flex justify-end"><Button onClick={() => updateDraft("communications", [newCommunication(draft.primaryCounsellorId), ...draft.communications])}><Plus /> Log contact</Button></div>{draft.communications.length ? draft.communications.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[160px_160px_1fr_auto]"><select className={selectClass} value={item.channel} onChange={(event) => updateItem("communications", item.id, { channel: event.target.value as CommunicationRecord["channel"] })}><option value="call">Phone call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="portal">Portal note</option></select><select className={selectClass} value={item.direction} onChange={(event) => updateItem("communications", item.id, { direction: event.target.value as CommunicationRecord["direction"] })}><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select><Input className={inputClass} value={item.subject} onChange={(event) => updateItem("communications", item.id, { subject: event.target.value })} placeholder="Subject" /><Button variant="ghost" size="icon" onClick={() => removeItem("communications", item.id)}><Trash2 className="text-red-600" /></Button></div><div className="mt-3 grid gap-3 md:grid-cols-[1fr_280px]"><label><span className={labelClass}>Counsellor</span><CounsellorSelect value={item.counsellorId} onChange={(value) => updateItem("communications", item.id, { counsellorId: value })} /></label><label><span className={labelClass}>Contact date &amp; time</span><Input type="datetime-local" className={inputClass} value={dateTimeValue(item.contactedAt)} onChange={(event) => updateItem("communications", item.id, { contactedAt: parseDate(event.target.value) ?? Date.now() })} /></label></div><Textarea className="mt-3" rows={3} value={item.notes} onChange={(event) => updateItem("communications", item.id, { notes: event.target.value })} placeholder="Discussion, advice given and agreed next step…" /></article>) : <EmptyState icon={PhoneCall} title="No communication logged" detail="Record every important student or guardian interaction." />}</TabsContent>
              </Tabs>
            </section> : <div className="grid place-items-center rounded-[1.75rem] border border-slate-200 bg-white"><EmptyState icon={UsersRound} title="No student selected" detail="Choose a student case file from the left." /></div>}
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-[#cc0000]"><Megaphone /></span><div><h2 className="text-xl font-black">Student announcements</h2><p className="text-sm text-slate-500">Publish a general or counselling-specific instruction to student dashboards.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label><span className={labelClass}>Title</span><Input className={inputClass} value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} placeholder="Important instruction" /></label><label><span className={labelClass}>Visible to</span><select className={selectClass} value={announcementMasterId} onChange={(event) => setAnnouncementMasterId(event.target.value)}><option value="">All students</option>{data.masters.map((master) => <option key={master.id} value={master.id}>{master.title}</option>)}</select></label><label><span className={labelClass}>Priority</span><select className={selectClass} value={announcementPriority} onChange={(event) => setAnnouncementPriority(event.target.value as PortalAnnouncement["priority"])}><option value="info">Information</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label><label><span className={labelClass}>Optional due date</span><Input className={inputClass} type="datetime-local" value={announcementDueAt} onChange={(event) => setAnnouncementDueAt(event.target.value)} /></label></div><label className="mt-3 block"><span className={labelClass}>Message</span><Textarea rows={4} value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} placeholder="Write the exact instruction students should follow…" /></label><Button className="mt-3" disabled={saving || !announcementTitle.trim() || !announcementBody.trim()} onClick={() => void addAnnouncement()}>{saving ? <Loader2 className="animate-spin" /> : <BellRing />} Publish announcement</Button></div>
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5 sm:p-6"><h2 className="text-xl font-black">Published student notices</h2><p className="text-sm text-slate-500">Current announcements across all selected counsellings.</p></div><div className="max-h-[430px] divide-y overflow-auto">{data.announcements.length ? data.announcements.map((item) => <article key={item.id} className="p-5"><div className="flex items-start gap-3"><span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${item.priority === "urgent" ? "bg-red-50 text-red-700" : item.priority === "important" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700"}`}><Megaphone className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{item.title}</p><Badge variant="outline" className="capitalize">{item.priority}</Badge></div><p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p><p className="mt-2 text-xs font-semibold text-slate-400">{item.masterId ? data.masters.find((master) => master.id === item.masterId)?.title ?? "Counselling" : "All students"}{item.dueAt ? ` • Due ${formatDate(item.dueAt)}` : ""}</p></div><Button variant="ghost" size="icon" onClick={() => void deleteAnnouncement(item.id)}><Trash2 className="text-red-600" /></Button></div></article>) : <p className="p-10 text-center text-sm text-slate-500">No announcement has been published.</p>}</div></div>
          </section>

          <section className="grid gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 sm:p-6">{[{ Icon: ClipboardList, title: "Case files", detail: "Courses, quotas, priority, notes and next action" }, { Icon: Target, title: "Round tracker", detail: "Registration through reporting for every round" }, { Icon: Banknote, title: "Financial control", detail: "Upcoming, paid and refundable amounts" }, { Icon: MessageCircle, title: "Communication record", detail: "Calls, WhatsApp, meetings and portal guidance" }].map(({ Icon, title, detail }) => <div key={title} className="flex gap-3 rounded-2xl bg-slate-50 p-4"><Icon className="mt-0.5 size-5 shrink-0 text-[#cc0000]" /><div><p className="font-black">{title}</p><p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p></div></div>)}</section>
        </>}
      </div>
    </main>
  );
}
