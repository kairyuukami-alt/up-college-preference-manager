"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Banknote,
  BellRing,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  Loader2,
  LockKeyhole,
  LogOut,
  Megaphone,
  MessageCircleQuestion,
  Target,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { counsellorName, type StudentCasework } from "@/lib/case-management";
import { COUNSELLING_STAGES, type DocumentChecklistItem, type StageStatus } from "@/lib/counselling-types";

type Progress = {
  studentName: string;
  profileCompletion: number;
  profileLockedAt: number | null;
  acceptedDocuments: number;
  requiredDocuments: number;
  choiceLockedAt: number | null;
  collegeCount: number;
  status: Record<string, unknown> & { adminInstructions?: string };
  checklist: DocumentChecklistItem[];
  casework: StudentCasework;
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    priority: "info" | "important" | "urgent";
    dueAt: number | null;
    createdAt: number;
  }>;
  latestQuestion: null | {
    id: string;
    topic: string;
    status: string;
    priority: string;
    replyNotes: string | null;
    repliedAt: number | null;
    createdAt: number;
  };
};

const statusLabels: Record<StageStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Needs attention",
};

const statusClasses: Record<StageStatus, string> = {
  not_started: "border-slate-200 bg-slate-50 text-slate-600",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
};

const checklistClasses: Record<DocumentChecklistItem["status"], string> = {
  missing: "border-slate-200 bg-slate-50 text-slate-600",
  uploaded: "border-blue-200 bg-blue-50 text-blue-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  reupload_required: "border-amber-200 bg-amber-50 text-amber-800",
};

const announcementClasses = {
  info: "border-blue-200 bg-blue-50 text-blue-950",
  important: "border-amber-200 bg-amber-50 text-amber-950",
  urgent: "border-red-200 bg-red-50 text-red-950",
};

const taskStatusClasses = {
  pending: "bg-amber-50 text-amber-800",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  blocked: "bg-red-50 text-red-700",
};

function formatDate(value: number | null) {
  return value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not set";
}

export function StudentProgressDashboard({
  onOpenChoices,
  onOpenProfile,
  onLogout,
}: {
  onOpenChoices: () => void;
  onOpenProfile: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/student/progress", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { progress?: Progress; error?: string };
        if (!response.ok || !data.progress) throw new Error(data.error || "Couldn't load your progress.");
        setProgress(data.progress);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Couldn't load your progress."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-[#f4f7fb]"><Loader2 className="size-9 animate-spin text-[#cc0000]" /></main>;
  }

  if (!progress) {
    return <main className="grid min-h-screen place-items-center bg-[#f4f7fb] p-6 text-center"><div><CircleAlert className="mx-auto size-10 text-red-500" /><h1 className="mt-3 text-xl font-black">Progress unavailable</h1><Button className="mt-5" variant="outline" onClick={() => void onLogout()}><LogOut /> Sign out</Button></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#172033]">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex min-h-20 max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3"><Image src="/vidyasaarthi-logo.jpeg" alt="VidyaSaarthi" width={56} height={56} priority unoptimized className="size-13 rounded-full border border-red-100 bg-white object-contain" /><div><p className="text-xl font-black">My Counselling Dashboard</p><p className="text-xs font-semibold text-slate-500">VidyaSaarthi • {progress.studentName}</p></div></Link>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onOpenChoices}><ListOrdered /> Choice Filling</Button><Button onClick={onOpenProfile}><UserRound /> My Profile</Button><Button variant="ghost" size="icon" onClick={() => void onLogout()} aria-label="Sign out"><LogOut /></Button></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-6">
        <section className="overflow-hidden rounded-3xl bg-[#172033] p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-5"><div><p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-[#ccdfed]"><LayoutDashboard className="size-4" /> Your private workspace</p><h1 className="mt-2 text-3xl font-black">Welcome, {progress.studentName}</h1><p className="mt-2 text-sm text-slate-300">See your profile, documents, choices and counselling progress in one place.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center"><p className="text-4xl font-black">{progress.profileCompletion}%</p><p className="text-xs text-slate-300">profile completed</p></div></div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border bg-white p-5 shadow-sm"><UserRound className="size-6 text-[#cc0000]" /><p className="mt-4 text-2xl font-black">{progress.profileCompletion}%</p><p className="text-sm font-semibold text-slate-500">Profile completion</p><Badge className={`mt-3 ${progress.profileLockedAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{progress.profileLockedAt ? <LockKeyhole /> : <FileClock />}{progress.profileLockedAt ? "Locked" : "Draft"}</Badge></article>
          <article className="rounded-2xl border bg-white p-5 shadow-sm"><FileCheck2 className="size-6 text-[#cc0000]" /><p className="mt-4 text-2xl font-black">{progress.acceptedDocuments}/{progress.requiredDocuments}</p><p className="text-sm font-semibold text-slate-500">Required documents accepted</p></article>
          <article className="rounded-2xl border bg-white p-5 shadow-sm"><ListOrdered className="size-6 text-[#cc0000]" /><p className="mt-4 text-2xl font-black">{progress.collegeCount}</p><p className="text-sm font-semibold text-slate-500">Colleges in preference list</p><Badge className={`mt-3 ${progress.choiceLockedAt ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{progress.choiceLockedAt ? "Locked" : "Editable"}</Badge></article>
          <article className="rounded-2xl border bg-white p-5 shadow-sm"><MessageCircleQuestion className="size-6 text-[#cc0000]" /><p className="mt-4 text-xl font-black">{progress.latestQuestion ? (progress.latestQuestion.status === "replied" ? "Replied" : "Awaiting reply") : "No question"}</p><p className="text-sm font-semibold text-slate-500">Latest counselling question</p></article>
        </section>

        {progress.announcements.length > 0 && <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-[#cc0000]"><BellRing /></span><div><h2 className="text-xl font-black">Latest VidyaSaarthi notices</h2><p className="mt-1 text-sm text-slate-500">Instructions and updates selected for your counselling.</p></div></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{progress.announcements.map((item) => <article key={item.id} className={`rounded-2xl border p-4 ${announcementClasses[item.priority] ?? announcementClasses.important}`}><div className="flex items-start gap-3"><Megaphone className="mt-0.5 size-5 shrink-0" /><div><div className="flex flex-wrap items-center gap-2"><p className="font-black">{item.title}</p><Badge variant="outline" className="capitalize">{item.priority}</Badge></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.body}</p><p className="mt-3 text-xs font-bold opacity-70">Posted {formatDate(item.createdAt)}</p></div></div></article>)}</div></section>}

        {progress.status.adminInstructions && <section className="rounded-2xl border border-red-100 bg-red-50 p-5"><h2 className="font-black text-red-900">Important instructions from your counsellor</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-950">{progress.status.adminInstructions}</p></section>}

        <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><UserRoundCheck className="text-[#cc0000]" /> My counselling team</h2><div className="mt-5 rounded-2xl bg-[#172033] p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ccdfed]">Primary counsellor</p><p className="mt-2 text-xl font-black">{progress.casework.primaryCounsellorId ? counsellorName(progress.casework.primaryCounsellorId) : "Assignment pending"}</p>{progress.casework.backupCounsellorId && <p className="mt-2 text-sm text-slate-300">Support: {counsellorName(progress.casework.backupCounsellorId)}</p>}</div>{progress.casework.courses.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{progress.casework.courses.map((course) => <Badge key={course} variant="outline">{course}</Badge>)}</div>}</div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><Target className="text-[#cc0000]" /> Your next action</h2>{progress.casework.nextAction ? <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-5"><p className="font-black text-red-950">{progress.casework.nextAction}</p><p className="mt-2 text-sm font-semibold text-red-700">Complete as advised by your counsellor</p></div> : <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No next action has been assigned.</p>}{progress.casework.studentInstructions && <div className="mt-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Counsellor instructions</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{progress.casework.studentInstructions}</p></div>}</div>
        </section>

        {(progress.casework.rounds.length > 0 || progress.casework.tasks.length > 0) && <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><Target className="text-[#cc0000]" /> My counselling rounds</h2><div className="mt-4 space-y-3">{progress.casework.rounds.map((round) => <article key={round.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{round.name}</p><Badge variant="outline" className="capitalize">{round.status.replaceAll("_", " ")}</Badge></div>{round.notes && <p className="mt-3 text-sm leading-6 text-slate-600">{round.notes}</p>}</article>)}</div></div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><ListChecks className="text-[#cc0000]" /> My action checklist</h2><div className="mt-4 space-y-3">{progress.casework.tasks.map((task) => <article key={task.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black">{task.title}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{task.category}</p></div><Badge className={taskStatusClasses[task.status]}>{task.status.replaceAll("_", " ")}</Badge></div>{task.notes && <p className="mt-2 text-sm leading-6 text-slate-600">{task.notes}</p>}</article>)}</div></div>
        </section>}

        {(progress.casework.allotments.length > 0 || progress.casework.finances.length > 0) && <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><ClipboardCheck className="text-[#cc0000]" /> Allotment record</h2><div className="mt-4 space-y-3">{progress.casework.allotments.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{item.collegeName || "College pending"}</p><Badge variant="outline" className="capitalize">{item.decision}</Badge></div><p className="mt-1 text-sm text-slate-600">{[item.roundName, item.course, item.quota, item.category].filter(Boolean).join(" • ")}</p>{item.notes && <p className="mt-2 text-sm leading-6 text-slate-600">{item.notes}</p>}</article>)}</div></div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><Banknote className="text-[#cc0000]" /> Fees &amp; payments</h2><div className="mt-4 space-y-3">{progress.casework.finances.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{item.label}</p><Badge variant="outline" className="capitalize">{item.status}</Badge></div><p className="mt-2 text-lg font-black">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.amount)}</p>{item.reference && <p className="mt-2 text-xs text-slate-500">Reference: {item.reference}</p>}{item.notes && <p className="mt-2 text-sm leading-6 text-slate-600">{item.notes}</p>}</article>)}</div></div>
        </section>}

        <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><ClipboardCheck className="text-[#cc0000]" /> Counselling status</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{COUNSELLING_STAGES.map((stage) => { const status = String(progress.status[stage.key] ?? "not_started") as StageStatus; return <div key={stage.key} className={`rounded-xl border p-4 ${statusClasses[status] ?? statusClasses.not_started}`}><p className="text-xs font-bold uppercase tracking-wide opacity-70">{stage.label}</p><p className="mt-1 font-black">{statusLabels[status] ?? statusLabels.not_started}</p></div>; })}</div></section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-black"><FileCheck2 className="text-[#cc0000]" /> Document checklist</h2><p className="mt-1 text-sm text-slate-500">Every required item must be accepted before you can lock the profile.</p></div><Button variant="outline" onClick={onOpenProfile}>Open profile & documents</Button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{progress.checklist.length ? progress.checklist.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${checklistClasses[item.status]}`}><div className="flex items-start gap-2">{item.status === "accepted" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <CircleAlert className="mt-0.5 size-5 shrink-0" />}<div><p className="font-black">{item.documentName}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide">{item.status.replaceAll("_", " ")}</p>{item.rejectionReason && <p className="mt-2 text-sm">Reason: {item.rejectionReason}</p>}</div></div></article>) : <p className="text-sm text-slate-500">No required document checklist has been configured for this counselling.</p>}</div></section>

        {progress.latestQuestion && <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-xl font-black"><MessageCircleQuestion className="text-[#cc0000]" /> Latest question</h2><div className="mt-4 rounded-xl bg-slate-50 p-4"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{progress.latestQuestion.topic}</p><Badge variant="outline" className="capitalize">{progress.latestQuestion.priority}</Badge><Badge className={progress.latestQuestion.status === "replied" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}>{progress.latestQuestion.status}</Badge></div><p className="mt-1 text-xs text-slate-500">Asked {formatDate(progress.latestQuestion.createdAt)}</p>{progress.latestQuestion.replyNotes && <div className="mt-4 border-l-4 border-[#cc0000] pl-4"><p className="text-xs font-bold uppercase text-slate-500">Counsellor reply</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{progress.latestQuestion.replyNotes}</p></div>}</div></section>}
      </div>
    </main>
  );
}
