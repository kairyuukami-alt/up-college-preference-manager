"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, GraduationCap, Loader2, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { PreferenceManager } from "@/components/preference-manager";
import { StudentDirectory } from "@/components/student-directory";
import { AdminDashboard } from "@/components/admin-dashboard";
import { CounsellingQuestionInbox } from "@/components/counselling-question-inbox";
import { CounsellingResultDesk } from "@/components/counselling-result-desk";
import { CounsellingOperationsCenter } from "@/components/counselling-operations-center";
import { StudentPreferenceManager } from "@/components/student-preference-manager";
import { StudentProgressDashboard } from "@/components/student-progress-dashboard";
import { StudentProfileManager } from "@/components/student-profile-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Session =
  | { authenticated: false }
  | { authenticated: true; role: "admin"; expiresAt: number }
  | { authenticated: true; role: "student"; studentName: string; expiresAt: number };

export function PortalEntry() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<"admin-dashboard" | "student-dashboard" | "choice" | "profile" | "questions" | "operations" | "results" | "directory">("admin-dashboard");
  const [focusListId, setFocusListId] = useState<string | undefined>();
  const [adminPassword, setAdminPassword] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [submitting, setSubmitting] = useState<"admin" | "student" | null>(null);
  const studentNameRef = useRef<HTMLInputElement>(null);
  const adminPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as Session & { error?: string };
        if (!response.ok) throw new Error(data.error || "Couldn't check your session.");
        setSession(data);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Couldn't open the portal.");
        setSession({ authenticated: false });
      });
  }, []);

  useEffect(() => {
    if (!session || session.authenticated) return;
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode !== "admin" && requestedMode !== "student") return;
    const frame = window.requestAnimationFrame(() => {
      if (requestedMode === "admin") adminPasswordRef.current?.focus();
      else studentNameRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [session]);

  async function signIn(role: "admin" | "student") {
    setSubmitting(role);
    try {
      const response = await fetch(`/api/auth/${role}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(role === "admin"
          ? { password: adminPassword }
          : { studentName: studentName.trim(), password: studentPassword }),
      });
      const data = await response.json() as Session & { error?: string };
      if (!response.ok) throw new Error(data.error || "Sign in failed.");
      setSession(data);
      setView(role === "admin" ? "admin-dashboard" : "student-dashboard");
      setFocusListId(undefined);
      setAdminPassword("");
      setStudentPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setSubmitting(null);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } finally {
      setSession({ authenticated: false });
      setView("admin-dashboard");
      setFocusListId(undefined);
      setAdminPassword("");
      setStudentPassword("");
    }
  }

  if (session?.authenticated && session.role === "admin") {
    if (view === "admin-dashboard" || view === "student-dashboard") {
      return <AdminDashboard
        onOpenDirectory={() => setView("directory")}
        onOpenOperations={() => setView("operations")}
        onOpenChoice={(id) => { setFocusListId(id); setView("choice"); }}
        onOpenProfile={(id) => { setFocusListId(id); setView("profile"); }}
        onOpenQuestions={() => setView("questions")}
        onOpenResults={() => setView("results")}
        onLogout={logout}
      />;
    }
    if (view === "directory") {
      return <StudentDirectory onBack={() => setView("admin-dashboard")} onChoice={(id) => { setFocusListId(id); setView("choice"); }} onProfile={(id) => { setFocusListId(id); setView("profile"); }} onResults={() => setView("results")} />;
    }
    if (view === "operations") {
      return <CounsellingOperationsCenter
        onOpenDashboard={() => setView("admin-dashboard")}
        onOpenChoice={(id) => { setFocusListId(id); setView("choice"); }}
        onOpenProfile={(id) => { setFocusListId(id); setView("profile"); }}
        onOpenQuestions={() => setView("questions")}
        onLogout={logout}
      />;
    }
    if (view === "questions") {
      return <CounsellingQuestionInbox onChoiceFilling={() => { setFocusListId(undefined); setView("choice"); }} onOpenProfiles={() => { setFocusListId(undefined); setView("profile"); }} onOpenDashboard={() => setView("admin-dashboard")} onLogout={logout} />;
    }
    if (view === "results") {
      return <CounsellingResultDesk onOpenDashboard={() => setView("admin-dashboard")} onOpenOperations={() => setView("operations")} onLogout={logout} />;
    }
    return view === "profile"
      ? <StudentProfileManager role="admin" initialListId={focusListId} onChoiceFilling={() => setView("choice")} onOpenDashboard={() => setView("admin-dashboard")} onOpenQuestions={() => setView("questions")} onLogout={logout} />
      : <PreferenceManager initialListId={focusListId} onOpenDashboard={() => setView("admin-dashboard")} onOpenProfiles={() => setView("profile")} onOpenQuestions={() => setView("questions")} onLogout={logout} />;
  }
  if (session?.authenticated && session.role === "student") {
    if (view === "student-dashboard" || view === "admin-dashboard" || view === "questions") {
      return <StudentProgressDashboard onOpenChoices={() => setView("choice")} onOpenProfile={() => setView("profile")} onLogout={logout} />;
    }
    return view === "profile"
      ? <StudentProfileManager role="student" onChoiceFilling={() => setView("choice")} onOpenDashboard={() => setView("student-dashboard")} onLogout={logout} />
      : <StudentPreferenceManager onOpenDashboard={() => setView("student-dashboard")} onOpenProfile={() => setView("profile")} onLogout={logout} />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7fb] px-4 py-8 text-[#172033] sm:px-6 lg:py-12">
      <div aria-hidden className="absolute -left-32 top-20 size-96 rounded-full bg-[#ccdfed]/70 blur-3xl" />
      <div aria-hidden className="absolute -right-24 bottom-0 size-96 rounded-full bg-red-100/70 blur-3xl" />
      <div className="relative mx-auto max-w-5xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#cc0000]"><ArrowLeft className="size-4" /> Back to homepage</Link>
        <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl shadow-slate-300/50">
          <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
            <section className="relative overflow-hidden bg-[#172033] p-7 text-white sm:p-10">
              <div aria-hidden className="absolute -right-20 -top-20 size-64 rounded-full border-[36px] border-white/5" />
              <div className="relative">
                <Image src="/vidyasaarthi-logo.jpeg" alt="VidyaSaarthi logo" width={92} height={92} priority unoptimized className="size-20 rounded-full bg-white object-contain p-1 shadow-lg" />
                <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-[#ccdfed]">Secure student workspace</p>
                <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">One login.<br />Choices and profile.</h1>
                <p className="mt-4 max-w-sm leading-7 text-slate-300">Use the student name and PIN supplied by the administrator to open your own preference list and private counselling profile.</p>
                <div className="mt-8 space-y-3 text-sm text-slate-200">
                  <p className="flex items-center gap-3"><ShieldCheck className="size-5 text-[#ccdfed]" /> Students can access only their own record</p>
                  <p className="flex items-center gap-3"><LockKeyhole className="size-5 text-[#ccdfed]" /> Locked profiles require administrator changes</p>
                </div>
              </div>
            </section>

            <section className="p-6 sm:p-9">
              {!session ? (
                <div className="grid min-h-[440px] place-items-center"><Loader2 className="size-8 animate-spin text-[#cc0000]" /></div>
              ) : (
                <>
                  <div><p className="text-sm font-bold text-[#cc0000]">VidyaSaarthi Counselling Portal</p><h2 className="mt-1 text-2xl font-black">Sign in securely</h2><p className="mt-2 text-sm leading-6 text-slate-500">Student login PINs are created and managed only by the administrator.</p></div>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <form className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5" onSubmit={(event) => { event.preventDefault(); void signIn("student"); }}>
                      <span className="grid size-11 place-items-center rounded-xl bg-[#ccdfed] text-[#172033]"><GraduationCap /></span>
                      <h3 className="mt-4 text-lg font-extrabold">Student access</h3><p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">Open your choice filling and private profile.</p>
                      <label htmlFor="student-login-name" className="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-500">Full name</label>
                      <Input ref={studentNameRef} id="student-login-name" autoComplete="name" value={studentName} onChange={(event) => setStudentName(event.target.value)} className="mt-1.5 bg-white" placeholder="As entered by admin" />
                      <label htmlFor="student-login-password" className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Student PIN</label>
                      <Input id="student-login-password" type="password" inputMode="numeric" autoComplete="current-password" minLength={4} maxLength={32} value={studentPassword} onChange={(event) => setStudentPassword(event.target.value)} className="mt-1.5 bg-white" placeholder="PIN from admin" />
                      <Button type="submit" className="mt-4 w-full" disabled={submitting !== null || !studentName.trim() || studentPassword.length < 4}>{submitting === "student" ? <Loader2 className="animate-spin" /> : <UserRound />} Student sign in</Button>
                    </form>

                    <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={(event) => { event.preventDefault(); void signIn("admin"); }}>
                      <span className="grid size-11 place-items-center rounded-xl bg-red-50 text-[#cc0000]"><ShieldCheck /></span>
                      <h3 className="mt-4 text-lg font-extrabold">Administrator</h3><p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">Add students and manage their PINs, profiles, documents and counsellings.</p>
                      <label htmlFor="admin-login-password" className="mt-5 block text-xs font-bold uppercase tracking-wide text-slate-500">Admin password</label>
                      <Input ref={adminPasswordRef} id="admin-login-password" type="password" inputMode="numeric" autoComplete="current-password" maxLength={4} value={adminPassword} onChange={(event) => setAdminPassword(event.target.value.replace(/\D/g, ""))} className="mt-1.5" placeholder="••••" />
                      <Button type="submit" variant="outline" className="mt-4 w-full border-slate-300" disabled={submitting !== null || adminPassword.length !== 4}>{submitting === "admin" ? <Loader2 className="animate-spin" /> : <LockKeyhole />} Admin sign in</Button>
                    </form>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
