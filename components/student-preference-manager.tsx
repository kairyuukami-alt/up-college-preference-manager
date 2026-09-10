"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  GraduationCap,
  GripVertical,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  LockKeyhole,
  LogOut,
  Plus,
  Printer,
  UserRound,
  Save,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MasterValue = string | number | boolean | null;
type MasterCollege = {
  id: number;
  position: number;
  name: string;
  data: Record<string, MasterValue>;
};
type MasterSummary = {
  id: string;
  title: string;
  collegeCount: number;
  columns: string[];
  collegeNameKey: string;
  preferenceKey: string | null;
};
type StudentList = {
  id: string;
  studentName: string;
  masterId: string;
  lockedAt: number | null;
  updatedAt: number;
  collegeIds: number[];
};

export function StudentPreferenceManager({ onLogout, onOpenDashboard, onOpenProfile }: { onLogout: () => void | Promise<void>; onOpenDashboard: () => void; onOpenProfile: () => void }) {
  const [list, setList] = useState<StudentList | null>(null);
  const [master, setMaster] = useState<MasterSummary | null>(null);
  const [colleges, setColleges] = useState<MasterCollege[]>([]);
  const [collegeIds, setCollegeIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const isLocked = Boolean(list?.lockedAt);

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const data = (await response.json()) as T & { error?: string };
    if (response.status === 401) {
      await onLogout();
      throw new Error("Your session expired. Please sign in again.");
    }
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  useEffect(() => {
    void requestJson<{ list: StudentList; master: MasterSummary; colleges: MasterCollege[] }>("/api/student/list")
      .then((data) => {
        setList(data.list);
        setMaster(data.master);
        setColleges(data.colleges);
        setCollegeIds(data.list.collegeIds);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Couldn't open your list."))
      .finally(() => setLoading(false));
    // The session-bound list is fetched once when this private workspace opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedIds = useMemo(() => new Set(collegeIds), [collegeIds]);
  const collegeMap = useMemo(() => new Map(colleges.map((college) => [college.id, college])), [colleges]);
  const selectedColleges = useMemo(
    () => collegeIds.map((id) => collegeMap.get(id)).filter((college): college is MasterCollege => Boolean(college)),
    [collegeIds, collegeMap],
  );
  const visibleColleges = useMemo(() => {
    const query = search.trim().toLowerCase();
    return colleges.filter((college) => !query || Object.values(college.data).some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [colleges, search]);
  const officialNameKey = master?.columns.find((column) =>
    /official.*(?:college|institute).*name|(?:college|institute).*name.*official/i.test(column),
  ) ?? master?.collegeNameKey ?? "";

  function edit(action: () => void) {
    if (isLocked) return;
    action();
    setDirty(true);
  }

  function addCollege(id: number) {
    if (selectedIds.has(id)) return;
    edit(() => setCollegeIds((current) => [...current, id]));
  }

  function removeCollege(id: number) {
    edit(() => setCollegeIds((current) => current.filter((collegeId) => collegeId !== id)));
  }

  function moveTo(id: number, target: number) {
    if (isLocked) return;
    setCollegeIds((current) => {
      const from = current.indexOf(id);
      if (from < 0 || from === target || target < 0 || target >= current.length) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(target, 0, id);
      return next;
    });
    setDirty(true);
  }

  async function saveList() {
    if (!list || isLocked) return false;
    setSaving(true);
    try {
      const data = await requestJson<{ updatedAt: number }>("/api/student/list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collegeIds }),
      });
      setList((current) => current ? { ...current, updatedAt: data.updatedAt } : current);
      setDirty(false);
      toast.success("Your preference list has been saved.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save your list.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function printPdf() {
    if (dirty) {
      const saved = await saveList();
      if (!saved) return;
    }
    window.print();
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-[#f4f7fb]"><div className="text-center"><Loader2 className="mx-auto size-9 animate-spin text-[#cc0000]" /><p className="mt-3 text-sm font-semibold text-slate-500">Opening your private preference list</p></div></main>;
  }

  if (!list || !master) {
    return <main className="grid min-h-screen place-items-center bg-[#f4f7fb] p-6 text-center"><div><h1 className="text-xl font-extrabold">Preference list unavailable</h1><p className="mt-2 text-sm text-slate-500">Please contact the administrator.</p><Button className="mt-5" variant="outline" onClick={() => void onLogout()}><LogOut /> Sign out</Button></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#172033]">
      <header className="no-print border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#cc0000] focus-visible:ring-offset-2">
            <Image src="/vidyasaarthi-logo.jpeg" alt="VidyaSaarthi logo" width={52} height={52} priority unoptimized className="size-12 rounded-full border border-red-100 bg-white object-contain shadow-sm" />
            <div><p className="text-lg font-extrabold leading-tight">My Preference List</p><p className="text-xs font-medium text-slate-500">VidyaSaarthi • Student Workspace</p></div>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { if (!dirty || window.confirm("Discard unsaved choice-filling changes?")) onOpenDashboard(); }}><LayoutDashboard /> Dashboard</Button>
            <Button size="sm" variant="outline" onClick={() => { if (!dirty || window.confirm("Discard unsaved choice-filling changes?")) onOpenProfile(); }}><UserRound /> Student Profile</Button>
            {isLocked ? <Badge className="border-red-200 bg-red-50 text-red-700"><LockKeyhole /> Locked</Badge> : dirty ? <Badge className="border-amber-200 bg-amber-50 text-amber-800">Unsaved changes</Badge> : <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700"><Check /> Saved</Badge>}
            <Button size="sm" variant="outline" onClick={() => void printPdf()} disabled={saving}><Printer /> Print / PDF</Button>
            {!isLocked && <Button size="sm" onClick={() => void saveList()} disabled={saving || !dirty}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save my list</Button>}
            <Button size="sm" variant="ghost" onClick={() => void onLogout()}><LogOut /> Sign out</Button>
          </div>
        </div>
      </header>

      <section className="print-only print-document" aria-label={`${list.studentName} preference list`}>
        <h1 className="print-student-name">{list.studentName}</h1>
        <table className="print-table">
          <thead><tr><th>Preference</th><th>Official College Name</th></tr></thead>
          <tbody>{selectedColleges.map((college, index) => <tr key={college.id}><td>{index + 1}</td><td>{String(college.data[officialNameKey] ?? college.name)}</td></tr>)}</tbody>
        </table>
      </section>

      <div className="no-print mx-auto max-w-[1500px] p-4 sm:p-6">
        <section className="mb-4 overflow-hidden rounded-2xl bg-[#172033] p-5 text-white shadow-lg sm:flex sm:items-center sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ccdfed]">Signed in as student</p><h1 className="mt-1 text-2xl font-black">{list.studentName}</h1><p className="mt-1 text-sm text-slate-300">{master.title}</p></div>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 sm:mt-0"><GraduationCap className="size-6 text-[#ccdfed]" /><div><p className="text-2xl font-black leading-none">{collegeIds.length}</p><p className="mt-1 text-xs text-slate-300">colleges selected</p></div></div>
        </section>

        {isLocked && <div className="mb-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><div><p className="font-bold">This list is locked and read-only.</p><p className="mt-1">You can review and print it. Contact the administrator if a change is required.</p></div></div>}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.9fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-extrabold">College master</h2><p className="mt-1 text-xs text-slate-500">Search and add colleges to your list</p></div><Badge variant="secondary">{visibleColleges.length} shown</Badge></div><div className="relative mt-3"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search college or details" /></div></div>
            <div className="max-h-[calc(100vh-315px)] min-h-80 overflow-y-auto p-2 scrollbar-thin">
              {visibleColleges.map((college) => {
                const selected = selectedIds.has(college.id);
                return <article key={college.id} className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-sm font-extrabold text-slate-600">{college.position}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold leading-5">{college.name}</p></div><Button size="sm" variant={selected ? "secondary" : "outline"} disabled={isLocked || selected} onClick={() => addCollege(college.id)}>{selected ? <Check /> : <Plus />}{selected ? "Added" : "Add"}</Button></article>;
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 className="flex items-center gap-2 font-extrabold"><ListOrdered className="size-5 text-[#cc0000]" /> My preference order</h2><p className="mt-1 text-xs text-slate-500">Drag or use arrows to reorder</p></div><Badge variant="secondary">{collegeIds.length}</Badge></div>
            <div className="max-h-[calc(100vh-315px)] min-h-80 overflow-y-auto p-3 scrollbar-thin">
              {selectedColleges.length ? selectedColleges.map((college, index) => (
                <article key={college.id} draggable={!isLocked} onDragStart={() => setDraggedId(college.id)} onDragOver={(event) => { if (!isLocked) event.preventDefault(); }} onDrop={() => { if (draggedId !== null) moveTo(draggedId, index); setDraggedId(null); }} className="mb-2 grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-slate-200 p-2.5 shadow-sm">
                  <div className="flex flex-col items-center"><GripVertical className={`size-4 ${isLocked ? "text-slate-200" : "cursor-grab text-slate-300"}`} /><span className="mt-1 grid size-7 place-items-center rounded-lg bg-[#ccdfed] text-xs font-black">{index + 1}</span></div>
                  <p className="min-w-0 text-sm font-bold leading-5">{college.name}</p>
                  <div className="flex flex-col gap-1"><Button variant="ghost" size="icon-xs" disabled={isLocked || index === 0} onClick={() => moveTo(college.id, index - 1)} aria-label={`Move ${college.name} up`}><ArrowUp /></Button><Button variant="ghost" size="icon-xs" disabled={isLocked || index === collegeIds.length - 1} onClick={() => moveTo(college.id, index + 1)} aria-label={`Move ${college.name} down`}><ArrowDown /></Button><Button variant="ghost" size="icon-xs" disabled={isLocked} onClick={() => removeCollege(college.id)} className="text-red-600 hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${college.name}`}><X /></Button></div>
                </article>
              )) : <div className="grid min-h-72 place-items-center p-8 text-center"><div><ListOrdered className="mx-auto size-9 text-slate-300" /><p className="mt-3 font-bold">No colleges selected</p><p className="mt-1 text-sm text-slate-500">Add colleges from the master list.</p></div></div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
