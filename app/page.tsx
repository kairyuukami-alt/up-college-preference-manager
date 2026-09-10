import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  FileCheck2,
  FileSpreadsheet,
  FolderLock,
  GraduationCap,
  KeyRound,
  ListOrdered,
  LockKeyhole,
  MessageCircleQuestion,
  ShieldCheck,
  Sparkles,
  UserRound,
  UserRoundCheck,
} from "lucide-react";

const features = [
  {
    icon: ListOrdered,
    title: "Smart choice filling",
    description:
      "Search the active college master, build a preference order, save progress and create a clear final list.",
    accent: "bg-red-50 text-[#cf1017]",
  },
  {
    icon: UserRoundCheck,
    title: "Complete student profile",
    description:
      "Keep personal, academic, family, address and bank details together in one structured private profile.",
    accent: "bg-blue-50 text-[#2563eb]",
  },
  {
    icon: FolderLock,
    title: "Private document vault",
    description:
      "Upload and label up to 20 counselling documents, securely organised beside the student record.",
    accent: "bg-amber-50 text-[#c47a06]",
  },
  {
    icon: LockKeyhole,
    title: "Lock and finalise",
    description:
      "Students can lock completed choices and profiles. Only the administrator can reopen them for changes.",
    accent: "bg-emerald-50 text-[#07845d]",
  },
  {
    icon: FileSpreadsheet,
    title: "Counselling master control",
    description:
      "Admins can upload an Excel master, select the worksheet and map the official college-name column.",
    accent: "bg-violet-50 text-[#7c3aed]",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by role",
    description:
      "Each student sees only their own information. Admin access stays separate for oversight and support.",
    accent: "bg-slate-100 text-[#172033]",
  },
];

const steps = [
  {
    number: "01",
    title: "Admin creates access",
    description: "The administrator creates the student account and assigns the secure login PIN.",
    icon: KeyRound,
  },
  {
    number: "02",
    title: "Student completes records",
    description: "The student fills their profile, uploads documents and arranges counselling choices.",
    icon: GraduationCap,
  },
  {
    number: "03",
    title: "Review, lock and print",
    description: "The final order is locked and an official-college-name PDF can be printed for submission.",
    icon: FileCheck2,
  },
];

function Brand() {
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="VidyaSaarthi home">
      <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-white shadow-[0_5px_18px_rgba(204,0,0,0.14)] ring-1 ring-red-100 sm:size-14">
        <Image
          src="/vidyasaarthi-brand-logo.png"
          alt="VidyaSaarthi logo"
          fill
          priority
          sizes="56px"
          className="object-contain p-0.5"
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-serif text-[1.35rem] font-black leading-none tracking-[-0.02em] text-[#c90008] sm:text-[1.55rem]">
          VIDYASAARTHI
        </span>
        <span className="mt-1 hidden text-[11px] font-semibold tracking-[0.02em] text-slate-500 sm:block">
          Your choices. Our guidance. Your future.
        </span>
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#111b34]">
      <header className="relative z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:h-[88px] sm:px-8 lg:px-12">
          <Brand />

          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-[14px] font-bold text-slate-600 lg:flex">
            <a href="#features" className="transition hover:text-[#cf1017]">What you can do</a>
            <a href="#process" className="transition hover:text-[#cf1017]">How it works</a>
            <a href="#security" className="transition hover:text-[#cf1017]">Privacy &amp; control</a>
            <Link href="/ask" className="transition hover:text-[#cf1017]">Ask a doubt</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              href="/portal?mode=student"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-[13px] font-extrabold text-[#172033] shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md sm:px-5 sm:text-[14px]"
            >
              <UserRound className="size-4" strokeWidth={2.25} />
              <span className="hidden sm:inline">Student Login</span>
              <span className="sm:hidden">Student</span>
            </Link>
            <Link
              href="/portal?mode=admin"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#cf1017] px-3.5 text-[13px] font-extrabold text-white shadow-[0_8px_22px_rgba(207,16,23,0.24)] transition hover:-translate-y-0.5 hover:bg-[#b50008] hover:shadow-[0_12px_28px_rgba(207,16,23,0.3)] sm:px-5 sm:text-[14px]"
            >
              <ShieldCheck className="size-4" strokeWidth={2.25} />
              <span className="hidden sm:inline">Admin Login</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-slate-200 bg-[#fbfcfe]">
        <div className="pointer-events-none absolute -left-36 top-24 size-[420px] rounded-full bg-red-100/50 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-[45%] bg-[radial-gradient(circle_at_70%_28%,rgba(207,16,23,0.12),transparent_46%)]" />
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:min-h-[690px] lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-16">
          <div className="relative z-10 max-w-[680px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-100 bg-white px-3.5 py-2 text-[12px] font-black uppercase tracking-[0.12em] text-[#cf1017] shadow-sm sm:text-[13px]">
              <Sparkles className="size-4" />
              One secure counselling workspace
            </div>
            <h1 className="max-w-[650px] text-[clamp(2.7rem,5.4vw,5.5rem)] font-black leading-[0.98] tracking-[-0.055em] text-[#101a33]">
              Every student choice, <span className="text-[#cf1017]">handled with clarity.</span>
            </h1>
            <p className="mt-7 max-w-[620px] text-[16px] leading-7 text-slate-600 sm:text-[18px] sm:leading-8">
              Build accurate college preference lists, complete counselling profiles, store documents and lock final records—all with private student access and complete admin control.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/portal?mode=student"
                className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-[#cf1017] px-7 text-[15px] font-black text-white shadow-[0_14px_32px_rgba(207,16,23,0.27)] transition hover:-translate-y-0.5 hover:bg-[#b50008]"
              >
                Open Student Portal
                <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/ask"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-7 text-[15px] font-black text-[#172033] shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
              >
                <MessageCircleQuestion className="size-4.5 text-[#cf1017]" />
                Ask a Counselling Doubt
                <ChevronRight className="size-4.5" />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[13px] font-bold text-slate-600">
              {["Student-wise privacy", "Admin-managed access", "Lockable final records"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[700px] lg:mr-0">
            <div className="absolute -right-8 -top-8 size-48 rounded-full border-[36px] border-red-100/70" />
            <div className="absolute -left-4 bottom-12 grid grid-cols-5 gap-2 opacity-40" aria-hidden="true">
              {Array.from({ length: 20 }).map((_, index) => (
                <span key={index} className="size-1.5 rounded-full bg-[#cf1017]" />
              ))}
            </div>

            <div className="relative min-h-[520px] overflow-hidden rounded-[2.25rem] bg-[#e7edf5] shadow-[0_28px_80px_rgba(23,32,51,0.18)] ring-1 ring-slate-200 sm:min-h-[590px]">
              <div className="absolute inset-x-0 bottom-0 h-[72%] bg-[linear-gradient(135deg,#cf1017_0%,#e5383f_55%,#f6c3c6_100%)]" />
              <div className="absolute -left-[18%] bottom-[7%] h-[62%] w-[83%] rounded-[50%] bg-white/95" />
              <Image
                src="/vidyasaarthi-counsellor.png"
                alt="VidyaSaarthi counsellor"
                fill
                priority
                sizes="(max-width: 1024px) 92vw, 50vw"
                className="relative z-[2] object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 z-[3] h-36 bg-gradient-to-t from-[#111b34]/70 to-transparent" />
              <div className="absolute bottom-7 left-7 z-[4] text-white sm:bottom-9 sm:left-9">
                <p className="text-[12px] font-black uppercase tracking-[0.16em] text-red-100">Expert counselling support</p>
                <p className="mt-1 text-xl font-black sm:text-2xl">Guidance at every decision</p>
              </div>
            </div>

            <div className="absolute -left-3 top-8 z-10 w-[230px] rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_16px_40px_rgba(23,32,51,0.14)] backdrop-blur sm:-left-12 sm:top-14 sm:w-[255px] sm:p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-red-50 text-[#cf1017]">
                  <ListOrdered className="size-5" />
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">Saved</span>
              </div>
              <p className="mt-4 text-[15px] font-black text-[#172033]">Choice filling progress</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-3/4 rounded-full bg-[#cf1017]" />
              </div>
              <div className="mt-3 flex justify-between text-[11px] font-bold text-slate-500">
                <span>Arrange &amp; review</span>
                <span>75%</span>
              </div>
            </div>

            <div className="absolute -bottom-6 right-3 z-10 w-[245px] rounded-2xl border border-white/80 bg-[#111b34]/95 p-5 text-white shadow-[0_18px_45px_rgba(17,27,52,0.28)] backdrop-blur sm:-right-7 sm:bottom-10 sm:w-[275px]">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-red-300">
                  <FolderLock className="size-5.5" />
                </span>
                <div>
                  <p className="text-[14px] font-black">Private student record</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-300">Profile, choices &amp; documents</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 bg-[#f7f9fc] py-20 sm:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="max-w-[720px]">
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#cf1017]">Built for complete counselling management</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] text-[#101a33] sm:text-5xl">
              One professional workspace for every major task.
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-slate-600">
              From the first student login to the final locked PDF, each part of the counselling workflow stays organised and connected.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map(({ icon: Icon, title, description, accent }) => (
              <article
                key={title}
                className="group rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_8px_26px_rgba(15,23,42,0.045)] transition duration-300 hover:-translate-y-1 hover:border-red-100 hover:shadow-[0_18px_45px_rgba(15,23,42,0.09)] sm:p-7"
              >
                <span className={`grid size-12 place-items-center rounded-2xl ${accent}`}>
                  <Icon className="size-5.5" strokeWidth={2.1} />
                </span>
                <h3 className="mt-6 text-xl font-black tracking-[-0.02em] text-[#172033]">{title}</h3>
                <p className="mt-3 text-[14px] leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="scroll-mt-24 bg-white py-20 sm:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-14 px-5 sm:px-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-start lg:px-12">
          <div className="lg:sticky lg:top-28">
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#cf1017]">A simpler student journey</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] text-[#101a33] sm:text-5xl">
              Clear steps. Fewer mistakes. Better control.
            </h2>
            <p className="mt-5 max-w-[560px] text-[16px] leading-7 text-slate-600">
              Students work inside one account for both profile completion and choice filling, while the administrator manages access and oversight.
            </p>
            <Link
              href="/portal?mode=student"
              className="group mt-8 inline-flex items-center gap-2 text-[14px] font-black text-[#cf1017]"
            >
              Continue to student login
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="space-y-4">
            {steps.map(({ number, title, description, icon: Icon }) => (
              <article key={number} className="grid gap-5 rounded-[1.5rem] border border-slate-200 bg-[#fbfcfe] p-6 sm:grid-cols-[76px_1fr_auto] sm:items-center sm:p-7">
                <div className="grid size-[68px] place-items-center rounded-2xl bg-[#111b34] text-lg font-black text-white shadow-lg shadow-slate-900/10">
                  {number}
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-[-0.02em] text-[#172033]">{title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-slate-600">{description}</p>
                </div>
                <span className="hidden size-12 place-items-center rounded-2xl bg-red-50 text-[#cf1017] sm:grid">
                  <Icon className="size-5.5" />
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="scroll-mt-24 px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
        <div className="relative mx-auto max-w-[1344px] overflow-hidden rounded-[2rem] bg-[#111b34] px-6 py-12 text-white shadow-[0_28px_80px_rgba(17,27,52,0.22)] sm:px-10 sm:py-14 lg:px-14">
          <div className="pointer-events-none absolute -right-24 -top-32 size-[430px] rounded-full border-[72px] border-white/5" />
          <div className="pointer-events-none absolute bottom-0 left-[38%] size-56 rounded-full bg-[#cf1017]/20 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-[12px] font-black uppercase tracking-[0.13em] text-red-200">
                <BadgeCheck className="size-4" />
                Privacy designed into the workflow
              </span>
              <h2 className="mt-5 max-w-[720px] text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
                Students focus on their future. Admins keep the process secure.
              </h2>
              <p className="mt-5 max-w-[720px] text-[15px] leading-7 text-slate-300 sm:text-[16px]">
                Student accounts cannot browse other student lists. PIN setup, profile visibility, Excel master management and locked-record changes remain under administrator authority.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                "Private profile and document access",
                "Separate student and admin entry",
                "Locked records require admin action",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-4 text-[13px] font-bold text-slate-100 backdrop-blur">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[#fbfcfe]">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center px-5 py-16 text-center sm:px-8 sm:py-20">
          <span className="grid size-14 place-items-center rounded-2xl bg-red-50 text-[#cf1017]">
            <GraduationCap className="size-7" />
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-[-0.035em] text-[#101a33] sm:text-4xl">Ready to continue your counselling work?</h2>
          <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-slate-600">Use the login created by your administrator to open your private profile and choice-filling workspace.</p>
          <div className="mt-7 grid w-full max-w-[700px] gap-3 sm:grid-cols-3">
            <Link href="/portal?mode=student" className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-xl bg-[#cf1017] px-5 text-[14px] font-black text-white shadow-lg shadow-red-900/15 transition hover:-translate-y-0.5 hover:bg-[#b50008]">
              Student Login <ArrowRight className="size-4" />
            </Link>
            <Link href="/portal?mode=admin" className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-[14px] font-black text-[#172033] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              Admin Login <ShieldCheck className="size-4" />
            </Link>
            <Link href="/ask" className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-[14px] font-black text-[#b50008] shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100">
              Ask a Doubt <MessageCircleQuestion className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <Brand />
          <div className="text-[12px] font-semibold leading-5 text-slate-500 md:text-right">
            <p>Secure counselling choice filling and student profile management.</p>
            <p className="mt-1">© {new Date().getFullYear()} VidyaSaarthi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
