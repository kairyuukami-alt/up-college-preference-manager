"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Inbox,
  ListOrdered,
  Loader2,
  LogOut,
  MessageCircle,
  Printer,
  RefreshCw,
  Search,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CounsellingQuestion = {
  id: string;
  studentName: string;
  whatsappNumber: string;
  topic: string;
  question: string;
  priority: "urgent" | "normal" | "low";
  assignedCounsellor: string | null;
  replyNotes: string | null;
  repliedAt: number | null;
  status: "open" | "replied";
  createdAt: number;
  updatedAt: number;
};

type QuestionInboxProps = {
  onChoiceFilling: () => void;
  onOpenProfiles: () => void;
  onOpenDashboard: () => void;
  onLogout: () => void | Promise<void>;
};

const RESPONSE_TEMPLATES = [
  { label: "General acknowledgement", text: "Thank you for contacting VidyaSaarthi. We have reviewed your counselling question. " },
  { label: "Documents required", text: "Thank you for contacting VidyaSaarthi. Please keep the required original documents and clear scanned copies ready. " },
  { label: "Choice filling review", text: "Thank you for contacting VidyaSaarthi. We recommend reviewing your preference order carefully before locking it. " },
  { label: "Reporting guidance", text: "Thank you for contacting VidyaSaarthi. Please verify the official reporting schedule, fee and document requirements before visiting the college. " },
] as const;

function whatsappLink(item: CounsellingQuestion, template: string) {
  const number = item.whatsappNumber.length === 10 ? `91${item.whatsappNumber}` : item.whatsappNumber;
  const message = `Hello ${item.studentName},\n\n${template || RESPONSE_TEMPLATES[0].text}\n\nRegarding: ${item.topic}\n\n${item.replyNotes || ""}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function CounsellingQuestionInbox({ onChoiceFilling, onOpenProfiles, onOpenDashboard, onLogout }: QuestionInboxProps) {
  const [questions, setQuestions] = useState<CounsellingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteQuestion, setDeleteQuestion] = useState<CounsellingQuestion | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "replied">("open");
  const [drafts, setDrafts] = useState<Record<string, { priority: CounsellingQuestion["priority"]; assignedCounsellor: string; replyNotes: string; template: string }>>({});

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { cache: "no-store", ...init });
    const data = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  async function loadQuestions() {
    setLoading(true);
    try {
      const data = await requestJson<{ questions: CounsellingQuestion[] }>("/api/questions");
      setQuestions(data.questions);
      setDrafts(Object.fromEntries(data.questions.map((item) => [item.id, {
        priority: item.priority,
        assignedCounsellor: item.assignedCounsellor ?? "",
        replyNotes: item.replyNotes ?? "",
        template: RESPONSE_TEMPLATES[0].text,
      }])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load the question inbox.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The admin-only API verifies the active portal session before returning records.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadQuestions();
    // loadQuestions is intentionally scoped to the initial inbox hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateQuestion(item: CounsellingQuestion, changes: Partial<CounsellingQuestion>) {
    setUpdatingId(item.id);
    try {
      const draft = drafts[item.id];
      const data = await requestJson<Pick<CounsellingQuestion, "status" | "priority" | "assignedCounsellor" | "replyNotes" | "repliedAt" | "updatedAt">>(`/api/questions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: changes.status ?? item.status,
          priority: changes.priority ?? draft?.priority ?? item.priority,
          assignedCounsellor: changes.assignedCounsellor ?? draft?.assignedCounsellor ?? item.assignedCounsellor,
          replyNotes: changes.replyNotes ?? draft?.replyNotes ?? item.replyNotes,
        }),
      });
      setQuestions((current) => current.map((question) => question.id === item.id
        ? { ...question, ...data }
        : question));
      toast.success(changes.status === "replied" ? "Reply details saved and question marked as replied." : "Question details saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update this question.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeQuestion() {
    if (!deleteQuestion) return;
    setUpdatingId(deleteQuestion.id);
    try {
      await requestJson<{ ok: boolean }>(`/api/questions/${deleteQuestion.id}`, { method: "DELETE" });
      setQuestions((current) => current.filter((question) => question.id !== deleteQuestion.id));
      setDeleteQuestion(null);
      toast.success("Question deleted from the inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete this question.");
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = useMemo(() => ({
    all: questions.length,
    open: questions.filter((item) => item.status === "open").length,
    replied: questions.filter((item) => item.status === "replied").length,
  }), [questions]);
  const visibleQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return questions.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      return !query || [item.studentName, item.whatsappNumber, item.topic, item.question]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [filter, questions, search]);

  return (
    <main className="min-h-screen bg-[#f3f6fa] text-[#172033]">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Homepage">
              <Image src="/vidyasaarthi-logo.jpeg" alt="VidyaSaarthi" width={58} height={58} priority unoptimized className="size-14 rounded-full border border-red-100 bg-white object-contain p-0.5 shadow-sm" />
            </Link>
            <div>
              <p className="text-lg font-black sm:text-xl">Counselling Question Inbox</p>
              <p className="text-xs font-semibold text-slate-500">VidyaSaarthi • Administrator only</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={onOpenDashboard}><LayoutDashboard /> Dashboard</Button>
            <Button variant="outline" onClick={onChoiceFilling}><ListOrdered /> Choice Filling</Button>
            <Button variant="outline" onClick={onOpenProfiles}><UsersRound /> Student Profiles</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer /> Print history</Button>
            <Badge className="bg-slate-900 text-white"><ShieldCheck /> Admin view</Badge>
            <Button variant="ghost" size="icon" onClick={() => void onLogout()} aria-label="Sign out"><LogOut /></Button>
          </div>
        </div>
      </header>

      <section className="print-only print-document" aria-label="Counselling question history">
        <h1 className="print-student-name">Counselling Question History</h1>
        <table className="print-table">
          <thead><tr><th>Date</th><th>Student</th><th>Topic and question</th><th>Status</th></tr></thead>
          <tbody>{visibleQuestions.map((item) => <tr key={item.id}><td>{formatDate(item.createdAt)}</td><td>{item.studentName}<br />{item.whatsappNumber}</td><td><strong>{item.topic}</strong><br />{item.question}<br />{item.replyNotes && <>Reply: {item.replyNotes}</>}</td><td>{item.priority} / {item.status}{item.repliedAt ? <><br />{formatDate(item.repliedAt)}</> : null}</td></tr>)}</tbody>
        </table>
      </section>

      <div className="no-print mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        <section className="overflow-hidden rounded-[1.75rem] bg-[#111b34] p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#ccdfed]">Private support desk</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Student counselling questions</h1>
              <p className="mt-3 text-[15px] leading-7 text-slate-300">Questions submitted from the public help form appear only here. Reply through the student&apos;s WhatsApp number; every question is automatically deleted seven days after submission.</p>
            </div>
            <div className="grid min-w-[260px] grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white/10 p-3 text-center"><p className="text-2xl font-black">{counts.all}</p><p className="mt-1 text-xs font-semibold text-slate-300">All</p></div>
              <div className="rounded-2xl bg-red-500/20 p-3 text-center"><p className="text-2xl font-black">{counts.open}</p><p className="mt-1 text-xs font-semibold text-red-100">Open</p></div>
              <div className="rounded-2xl bg-emerald-400/15 p-3 text-center"><p className="text-2xl font-black">{counts.replied}</p><p className="mt-1 text-xs font-semibold text-emerald-100">Replied</p></div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, WhatsApp number, topic or question" className="h-11 rounded-xl pl-10" />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["open", "replied", "all"] as const).map((value) => (
                <Button key={value} type="button" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)} className={filter === value ? "bg-[#cc0000] hover:bg-[#a90000]" : ""}>
                  {value === "open" ? <Clock3 /> : value === "replied" ? <CheckCircle2 /> : <Inbox />}
                  {value[0].toUpperCase() + value.slice(1)} ({counts[value]})
                </Button>
              ))}
              <Button type="button" variant="ghost" size="icon" onClick={() => void loadQuestions()} disabled={loading} aria-label="Refresh question inbox">
                <RefreshCw className={loading ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-5 space-y-4" aria-live="polite">
          {loading ? (
            <div className="grid min-h-80 place-items-center rounded-3xl border border-slate-200 bg-white text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-2"><Loader2 className="size-5 animate-spin text-[#cc0000]" /> Opening question inbox…</span>
            </div>
          ) : visibleQuestions.length ? visibleQuestions.map((item) => (
            <article key={item.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${item.status === "open" ? "border-red-100" : "border-slate-200"}`}>
              <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#eef5fa] font-black text-[#172033]">{item.studentName.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <h2 className="text-lg font-black tracking-[-0.02em]">{item.studentName}</h2>
                      <p className="text-xs font-semibold text-slate-500">Submitted {formatDate(item.createdAt)}</p>
                    </div>
                    <Badge className={item.status === "open" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                      {item.status === "open" ? <Clock3 /> : <CheckCircle2 />}{item.status === "open" ? "Awaiting reply" : "Replied"}
                    </Badge>
                    <Badge className={item.priority === "urgent" ? "border-red-200 bg-red-600 text-white" : item.priority === "low" ? "border-slate-200 bg-slate-100 text-slate-700" : "border-amber-200 bg-amber-50 text-amber-800"}>{item.priority}</Badge>
                  </div>
                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#cc0000]">{item.topic}</p>
                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{item.question}</p>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600"><MessageCircle className="size-4 text-emerald-600" /> WhatsApp: {item.whatsappNumber}</p>
                  {item.repliedAt && <p className="mt-2 text-xs font-semibold text-emerald-700">Reply recorded {formatDate(item.repliedAt)}</p>}
                </div>
                <div className="flex flex-row flex-wrap gap-2 lg:w-72 lg:flex-col lg:justify-center">
                  <select value={drafts[item.id]?.priority ?? item.priority} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], priority: event.target.value as CounsellingQuestion["priority"] } }))} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold">
                    <option value="urgent">Urgent priority</option><option value="normal">Normal priority</option><option value="low">Low priority</option>
                  </select>
                  <Input value={drafts[item.id]?.assignedCounsellor ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], assignedCounsellor: event.target.value } }))} placeholder="Assign counsellor" className="h-10" />
                  <select value={drafts[item.id]?.template ?? RESPONSE_TEMPLATES[0].text} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], template: event.target.value } }))} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold">
                    {RESPONSE_TEMPLATES.map((template) => <option key={template.label} value={template.text}>{template.label}</option>)}
                  </select>
                  <Textarea value={drafts[item.id]?.replyNotes ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], replyNotes: event.target.value } }))} placeholder="Private reply notes or final response" rows={3} className="min-h-24" />
                  <Button asChild className="bg-[#128c4a] hover:bg-[#0f7b40]">
                    <a href={whatsappLink({ ...item, replyNotes: drafts[item.id]?.replyNotes ?? item.replyNotes }, drafts[item.id]?.template ?? RESPONSE_TEMPLATES[0].text)} target="_blank" rel="noreferrer"><MessageCircle /> Reply on WhatsApp</a>
                  </Button>
                  <Button variant="outline" disabled={updatingId === item.id} onClick={() => void updateQuestion(item, { status: item.status === "open" ? "replied" : "open" })}>
                    {updatingId === item.id ? <Loader2 className="animate-spin" /> : item.status === "open" ? <CheckCircle2 /> : <Clock3 />}
                    {item.status === "open" ? "Save & mark replied" : "Move back to open"}
                  </Button>
                  <Button variant="outline" disabled={updatingId === item.id} onClick={() => void updateQuestion(item, {})}><Save /> Save assignment & notes</Button>
                  <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={updatingId === item.id} onClick={() => setDeleteQuestion(item)}><Trash2 /> Delete</Button>
                </div>
              </div>
            </article>
          )) : (
            <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="max-w-sm"><UserRound className="mx-auto size-10 text-slate-300" /><h2 className="mt-4 text-xl font-black">No questions found</h2><p className="mt-2 text-sm leading-6 text-slate-500">New questions will appear here after a student submits the public counselling help form.</p></div>
            </div>
          )}
        </section>
      </div>

      <AlertDialog open={Boolean(deleteQuestion)} onOpenChange={(open) => { if (!open) setDeleteQuestion(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this counselling question?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes {deleteQuestion?.studentName}&apos;s question from the admin inbox.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep question</AlertDialogCancel>
            <AlertDialogAction onClick={() => void removeQuestion()} disabled={updatingId === deleteQuestion?.id} className="bg-red-600 hover:bg-red-700">Delete question</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
