"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, MessageCircleQuestion, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SubmittedQuestion = {
  studentName: string;
  whatsappNumber: string;
  topic: string;
};

export function CounsellingQuestionForm() {
  const [studentName, setStudentName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [priority, setPriority] = useState<"urgent" | "normal" | "low">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedQuestion | null>(null);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, whatsappNumber, topic, question, priority }),
      });
      const data = await response.json() as {
        error?: string;
        question?: SubmittedQuestion;
      };
      if (!response.ok || !data.question) throw new Error(data.error || "Your question could not be submitted.");
      setSubmitted(data.question);
      setStudentName("");
      setWhatsappNumber("");
      setTopic("");
      setQuestion("");
      setPriority("normal");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your question could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="grid min-h-[520px] place-items-center p-6 text-center sm:p-10">
        <div className="max-w-md">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="size-8" />
          </span>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.14em] text-[#cc0000]">Question received</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#101a33]">Thank you, {submitted.studentName}.</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            The VidyaSaarthi counselling team will review your <strong>{submitted.topic}</strong> question and reply on WhatsApp at <strong>{submitted.whatsappNumber}</strong>.
          </p>
          <Button type="button" variant="outline" className="mt-7" onClick={() => setSubmitted(null)}>
            <RotateCcw /> Ask another question
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submitQuestion} className="p-6 sm:p-9">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-[#cc0000]">
          <MessageCircleQuestion className="size-6" />
        </span>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[#cc0000]">Counselling help desk</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#101a33] sm:text-4xl">Ask your counselling doubt</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
            You do not need a registered student account. Enter your details below and our team will reply to the WhatsApp number you provide.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="question-student-name" className="mb-2 block text-sm font-extrabold text-[#172033]">Student name <span className="text-[#cc0000]">*</span></label>
          <Input
            id="question-student-name"
            name="studentName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            placeholder="Enter full name"
            className="h-12 rounded-xl bg-white"
          />
        </div>
        <div>
          <label htmlFor="question-whatsapp" className="mb-2 block text-sm font-extrabold text-[#172033]">WhatsApp number <span className="text-[#cc0000]">*</span></label>
          <Input
            id="question-whatsapp"
            name="whatsappNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={20}
            value={whatsappNumber}
            onChange={(event) => setWhatsappNumber(event.target.value)}
            placeholder="Example: +91 98765 43210"
            className="h-12 rounded-xl bg-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="question-topic" className="mb-2 block text-sm font-extrabold text-[#172033]">Counselling topic <span className="text-[#cc0000]">*</span></label>
          <Input
            id="question-topic"
            name="topic"
            required
            minLength={2}
            maxLength={80}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Example: UP NEET counselling, choice filling, documents or reporting"
            className="h-12 rounded-xl bg-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="question-priority" className="mb-2 block text-sm font-extrabold text-[#172033]">Priority <span className="text-[#cc0000]">*</span></label>
          <select id="question-priority" value={priority} onChange={(event) => setPriority(event.target.value as "urgent" | "normal" | "low")} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-semibold outline-none transition focus:border-[#cc0000] focus:ring-2 focus:ring-red-100">
            <option value="urgent">Urgent — action is time-sensitive</option>
            <option value="normal">Normal — regular counselling guidance</option>
            <option value="low">Low — general information</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-4">
            <label htmlFor="question-details" className="text-sm font-extrabold text-[#172033]">Your question <span className="text-[#cc0000]">*</span></label>
            <span className="text-xs font-semibold text-slate-400">{question.length} / 2,000</span>
          </div>
          <Textarea
            id="question-details"
            name="question"
            required
            minLength={10}
            maxLength={2_000}
            rows={7}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Write your counselling question with the important details…"
            className="min-h-44 resize-y rounded-xl bg-white text-base leading-7"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-blue-100 bg-[#f2f7fb] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex max-w-xl items-start gap-2 text-sm leading-6 text-slate-600">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#172033]" />
          Your question and contact number are visible only inside the administrator inbox, are used to reply to your query, and are automatically deleted after seven days.
        </p>
        <Button type="submit" className="h-12 shrink-0 bg-[#cc0000] px-6 font-black hover:bg-[#a90000]" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <Send />}
          {submitting ? "Submitting…" : "Submit question"}
          {!submitting && <ArrowRight />}
        </Button>
      </div>
    </form>
  );
}
