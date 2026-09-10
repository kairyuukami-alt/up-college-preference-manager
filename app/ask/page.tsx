import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, MessageCircleQuestion } from "lucide-react";

import { CounsellingQuestionForm } from "@/components/counselling-question-form";

export const metadata: Metadata = {
  title: "Ask a Counselling Doubt | VidyaSaarthi",
  description: "Ask VidyaSaarthi a counselling question and receive the response on WhatsApp.",
};

export default function AskQuestionPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7fb] px-4 py-6 text-[#172033] sm:px-6 sm:py-10">
      <div aria-hidden className="absolute -left-32 top-24 size-96 rounded-full bg-[#ccdfed]/80 blur-3xl" />
      <div aria-hidden className="absolute -right-24 bottom-0 size-96 rounded-full bg-red-100/70 blur-3xl" />
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-[#cc0000]">
            <ArrowLeft className="size-4" /> Back to homepage
          </Link>
          <Link href="/portal?mode=student" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-[#cc0000]">
            <LockKeyhole className="size-4" /> Registered student login
          </Link>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/90 bg-white shadow-[0_28px_80px_rgba(23,32,51,0.14)]">
          <div className="grid lg:grid-cols-[0.38fr_0.62fr]">
            <aside className="relative overflow-hidden bg-[#111b34] p-7 text-white sm:p-10">
              <div aria-hidden className="absolute -right-20 -top-20 size-64 rounded-full border-[38px] border-white/5" />
              <div className="relative">
                <Link href="/" aria-label="VidyaSaarthi homepage">
                  <Image src="/vidyasaarthi-logo.jpeg" alt="VidyaSaarthi" width={92} height={92} priority unoptimized className="size-20 rounded-full bg-white object-contain p-1 shadow-xl" />
                </Link>
                <p className="mt-8 text-sm font-black uppercase tracking-[0.18em] text-[#ccdfed]">VidyaSaarthi support</p>
                <h2 className="mt-3 text-3xl font-black leading-tight">One clear answer can simplify your next step.</h2>
                <p className="mt-4 text-[15px] leading-7 text-slate-300">Ask about registration, eligibility, choice filling, documents, fees, allotment or reporting.</p>
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                  <MessageCircleQuestion className="size-6 text-red-300" />
                  <p className="mt-3 font-extrabold">Open to every student</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">Registered and unregistered students can both send a question.</p>
                </div>
              </div>
            </aside>
            <CounsellingQuestionForm />
          </div>
        </div>
      </div>
    </main>
  );
}
