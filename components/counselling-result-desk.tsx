"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Copy,
  DatabaseZap,
  ExternalLink,
  FileSearch,
  FileText,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  RESULT_AUTHORITIES,
  type CounsellingResult,
  type ResultAuthorityId,
  type ResultRelease,
} from "@/lib/counselling-results";

type AuthorityStatus = (typeof RESULT_AUTHORITIES)[number] & {
  resultCount: number;
  roundCount: number;
  lastVerifiedAt: number | null;
};

type ResultDeskData = {
  authorities: AuthorityStatus[];
  results: CounsellingResult[];
  releases: ResultRelease[];
  sync: {
    active: boolean;
    cadenceMinutes: number;
    lastVerifiedAt: number | null;
    monitoredAuthorities: number;
    sourcePolicy: "official-only";
  };
};

type ResultImportRow = {
  candidateIdentifier: string;
  identifierType: string;
  studentName: string;
  neetAir: string;
  collegeName: string;
  course: string;
  quota: string;
  allottedCategory: string;
  remark: string;
};

type Props = {
  onOpenDashboard: () => void;
  onOpenOperations: () => void;
  onLogout: () => void | Promise<void>;
};

const selectClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#cc0000] focus:ring-2 focus:ring-red-100";
const labelClass = "mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-slate-500";

const fieldOptions = [
  { key: "candidateIdentifier", label: "Candidate identifier", required: true },
  { key: "studentName", label: "Student name" },
  { key: "neetAir", label: "NEET AIR" },
  { key: "collegeName", label: "Allotted college" },
  { key: "course", label: "Course" },
  { key: "quota", label: "Quota" },
  { key: "allottedCategory", label: "Allotted category" },
  { key: "remark", label: "Remark / status" },
] as const;

function formatDate(value: number | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Awaiting verified release";
}

function titleCaseName(value: string) {
  return value.toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function congratulationMessage(result: CounsellingResult) {
  const student = result.studentName ? ` ${titleCaseName(result.studentName)}` : "";
  return `Congratulations${student}! You have been allotted ${result.collegeName} in ${result.roundName} Result.`;
}

function normaliseCell(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function uniqueHeaders(row: unknown[]) {
  const used = new Map<string, number>();
  return row.map((value, index) => {
    const base = normaliseCell(value) || `Column ${index + 1}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count ? `${base} (${count + 1})` : base;
  });
}

function autoColumn(columns: string[], pattern: RegExp) {
  return columns.find((column) => pattern.test(column)) ?? "";
}

export function CounsellingResultDesk({ onOpenDashboard, onOpenOperations, onLogout }: Props) {
  const [data, setData] = useState<ResultDeskData | null>(null);
  const [authority, setAuthority] = useState<"all" | ResultAuthorityId>("all");
  const [identifier, setIdentifier] = useState("");
  const [searchedIdentifier, setSearchedIdentifier] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importAuthority, setImportAuthority] = useState<ResultAuthorityId>("haryana");
  const [roundName, setRoundName] = useState("");
  const [resultTitle, setResultTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [identifierType, setIdentifierType] = useState("registration_number");
  const [fileName, setFileName] = useState("");
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfWarnings, setPdfWarnings] = useState<string[]>([]);
  const [readingPdf, setReadingPdf] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [sourceRows, setSourceRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const requestJson = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, { cache: "no-store", ...init });
    const result = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(result.error || "Something went wrong.");
    return result;
  }, []);

  const loadDesk = useCallback(async (queryAuthority: string, queryIdentifier = "") => {
    const result = await requestJson<ResultDeskData>(`/api/admin/results?authority=${encodeURIComponent(queryAuthority)}&identifier=${encodeURIComponent(queryIdentifier)}`);
    setData(result);
  }, [requestJson]);

  useEffect(() => {
    void loadDesk("all").catch((error) => toast.error(error instanceof Error ? error.message : "Couldn't load the Result Desk.")).finally(() => setLoading(false));
  }, [loadDesk]);

  const selectedAuthority = useMemo(
    () => RESULT_AUTHORITIES.find((item) => item.id === authority) ?? null,
    [authority],
  );

  async function searchResults() {
    const value = identifier.trim();
    if (!value) { toast.error("Enter an official candidate identifier first."); return; }
    setSearching(true);
    try {
      await loadDesk(authority, value);
      setSearchedIdentifier(value);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't search the official results.");
    } finally { setSearching(false); }
  }

  async function refreshImportedResults() {
    setRefreshing(true);
    try {
      await loadDesk(authority, searchedIdentifier);
      toast.success("Latest automatically imported result data loaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't refresh the result data.");
    } finally {
      setRefreshing(false);
    }
  }

  function prepareMatrix(matrix: unknown[][]) {
    if (matrix.length < 2) throw new Error("The selected file has no result rows.");
    const nextColumns = uniqueHeaders(matrix[0]);
    const nextRows = matrix.slice(1).map((row) => {
      const record: Record<string, string> = {};
      nextColumns.forEach((column, index) => { record[column] = normaliseCell(row[index]); });
      return record;
    }).filter((row) => Object.values(row).some(Boolean));
    if (!nextRows.length) throw new Error("The selected file has no result rows.");
    setColumns(nextColumns);
    setSourceRows(nextRows);
    setMapping({
      candidateIdentifier: autoColumn(nextColumns, /registration|application|candidate.*id|roll.*no|neet.*air|rank/i),
      studentName: autoColumn(nextColumns, /candidate.*name|student.*name|name/i),
      neetAir: autoColumn(nextColumns, /neet.*air|all india rank|^rank$/i),
      collegeName: autoColumn(nextColumns, /allotted.*college|institute|college/i),
      course: autoColumn(nextColumns, /course|programme/i),
      quota: autoColumn(nextColumns, /quota/i),
      allottedCategory: autoColumn(nextColumns, /allotted.*category|category/i),
      remark: autoColumn(nextColumns, /remark|status|result/i),
    });
  }

  async function chooseFile(file: File | null) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || file.type && file.type !== "application/pdf") { toast.error("Upload an original official PDF result file."); return; }
    setFileName(file.name);
    setColumns([]); setSourceRows([]); setPdfPageCount(0); setPdfWarnings([]); setReadingPdf(true);
    try {
      const { extractPdfResultTable } = await import("@/lib/pdf-result-parser");
      const extraction = await extractPdfResultTable(file);
      prepareMatrix(extraction.matrix);
      setPdfPageCount(extraction.pageCount);
      setPdfWarnings(extraction.warnings);
      toast.success(`${extraction.matrix.length - 1} result rows extracted for verification.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't read the result PDF.");
      setFileName(""); setPdfPageCount(0); setPdfWarnings([]);
    } finally {
      setReadingPdf(false);
    }
  }

  async function importResults() {
    if (!roundName.trim() || !sourceUrl.trim() || !mapping.candidateIdentifier || !sourceRows.length) {
      toast.error("Add the round, official source, result file and identifier mapping.");
      return;
    }
    const rows: ResultImportRow[] = sourceRows.map((row) => ({
      candidateIdentifier: row[mapping.candidateIdentifier] || "",
      identifierType,
      studentName: row[mapping.studentName] || "",
      neetAir: row[mapping.neetAir] || "",
      collegeName: row[mapping.collegeName] || "",
      course: row[mapping.course] || "",
      quota: row[mapping.quota] || "",
      allottedCategory: row[mapping.allottedCategory] || "",
      remark: row[mapping.remark] || "",
    })).filter((row) => row.candidateIdentifier.trim());
    if (!rows.length) { toast.error("No usable candidate identifiers were found."); return; }
    const identifiers = rows.map((row) => row.candidateIdentifier.toUpperCase().replace(/[^A-Z0-9]/g, ""));
    const duplicateCount = identifiers.length - new Set(identifiers).size;
    if (duplicateCount > 0) {
      toast.error(`${duplicateCount} duplicate candidate identifier${duplicateCount === 1 ? " was" : "s were"} detected. Check the PDF column mapping before importing.`);
      return;
    }
    setImporting(true);
    try {
      let imported = 0;
      for (let index = 0; index < rows.length; index += 150) {
        const chunk = rows.slice(index, index + 150);
        const result = await requestJson<{ imported: number }>("/api/admin/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authority: importAuthority,
            roundName: roundName.trim(),
            title: resultTitle.trim(),
            sourceUrl: sourceUrl.trim(),
            revisionNote: revisionNote.trim(),
            publishedAt: publishedAt ? Date.parse(publishedAt) : null,
            rows: chunk,
          }),
        });
        imported += result.imported;
      }
      await loadDesk("all");
      setImportOpen(false);
      setRoundName(""); setResultTitle(""); setRevisionNote(""); setPublishedAt("");
      setFileName(""); setPdfPageCount(0); setPdfWarnings([]); setColumns([]); setSourceRows([]); setMapping({});
      toast.success(`${imported.toLocaleString("en-IN")} verified result records imported.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't import the official results.");
    } finally { setImporting(false); }
  }

  async function deleteResult(result: CounsellingResult) {
    if (!window.confirm(`Delete the ${result.roundName} result for ${result.candidateIdentifier}?`)) return;
    try {
      await requestJson("/api/admin/results", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: result.id }) });
      await loadDesk(authority, searchedIdentifier);
      toast.success("Incorrect result record removed.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't remove the result record."); }
  }

  async function copyCongratulation(result: CounsellingResult) {
    try {
      await navigator.clipboard.writeText(congratulationMessage(result));
      toast.success("Congratulation message copied.");
    } catch {
      toast.error("Couldn't copy the message. Please select and copy it manually.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fee2e2_0,transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] text-[#172033]">
      <header className="sticky top-0 z-40 border-b border-white/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-[1700px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3"><Link href="/"><Image src="/vidyasaarthi-logo.jpeg" alt="VidyaSaarthi" width={58} height={58} priority unoptimized className="size-14 rounded-full border border-red-100 bg-white object-contain shadow-sm" /></Link><div><p className="flex items-center gap-2 text-xl font-black"><BadgeCheck className="size-5 text-[#cc0000]" /> Official Result Desk</p><p className="text-xs font-semibold text-slate-500">Verified round-wise allotment lookup</p></div></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onOpenDashboard}><LayoutDashboard /> Dashboard</Button><Button variant="outline" onClick={onOpenOperations}><ListChecks /> Command Centre</Button><Badge className="bg-slate-900 text-white"><ShieldCheck /> Admin only</Badge><Button variant="ghost" size="icon" onClick={() => void onLogout()} aria-label="Sign out"><LogOut /></Button></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1700px] space-y-6 px-4 py-6 sm:px-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#111b34] p-6 text-white shadow-[0_24px_70px_rgba(17,27,52,0.22)] sm:p-8">
          <div aria-hidden className="absolute -right-28 -top-44 size-[460px] rounded-full border-[78px] border-white/5" />
          <div aria-hidden className="absolute bottom-0 left-1/3 size-64 rounded-full bg-[#cc0000]/30 blur-3xl" />
          <div className="relative grid gap-7 xl:grid-cols-[0.9fr_1.1fr] xl:items-end">
            <div><p className="text-sm font-black uppercase tracking-[0.18em] text-red-200">MCC • Haryana • Uttar Pradesh</p><h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">Find every allotted seat in seconds.</h1><p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-300">Search all verified counselling rounds using the identifier published by the official authority. Public allotment results are collected from official sources and made searchable automatically.</p>{data?.sync.active && <div className="mt-5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-100"><span className="inline-flex items-center gap-2"><span className="size-2 animate-pulse rounded-full bg-emerald-400" /> Automatic official sync active</span><span className="text-slate-300">Checks every {data.sync.cadenceMinutes} minutes</span></div>}</div>
            <form className="rounded-2xl border border-white/10 bg-white/[0.09] p-4 backdrop-blur" onSubmit={(event) => { event.preventDefault(); void searchResults(); }}>
              <div className="grid gap-3 md:grid-cols-[210px_1fr_auto]"><select value={authority} onChange={(event) => setAuthority(event.target.value as typeof authority)} className="h-12 rounded-xl border border-white/15 bg-white px-3 font-bold text-slate-900"><option value="all">All counsellings</option>{RESULT_AUTHORITIES.map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}</select><Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="h-12 border-white/15 bg-white text-slate-900" placeholder={selectedAuthority?.identifierHint ?? "Application, registration, roll number or NEET AIR"} /><Button type="submit" className="h-12 bg-[#e00000] px-6 hover:bg-red-700" disabled={searching || !identifier.trim()}>{searching ? <Loader2 className="animate-spin" /> : <Search />} Check result</Button></div>
              <p className="mt-2 text-xs font-semibold text-slate-300">{selectedAuthority?.identifierLabel ?? "Searches application number, registration number, NEET roll number and NEET AIR across all imported official rounds."}</p>
            </form>
          </div>
        </section>

        {loading || !data ? <div className="grid min-h-[420px] place-items-center rounded-3xl border border-white bg-white/80"><span className="flex items-center gap-3 font-bold text-slate-500"><Loader2 className="animate-spin text-[#cc0000]" /> Loading verified results…</span></div> : <>
          <section className="grid gap-4 lg:grid-cols-3">{data.authorities.map((item) => { const releases = data.releases.filter((release) => release.authority === item.id); return <article key={item.id} className="overflow-hidden rounded-[1.6rem] border border-white bg-white shadow-[0_10px_35px_rgba(15,23,42,0.07)]"><div className={`h-1.5 ${item.accent === "red" ? "bg-red-600" : item.accent === "blue" ? "bg-blue-600" : "bg-emerald-600"}`} /><div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{item.shortName} results</p><h2 className="mt-1 text-lg font-black">{item.name}</h2></div><span className="grid size-11 place-items-center rounded-2xl bg-slate-100"><DatabaseZap className="size-5" /></span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-black">{item.resultCount.toLocaleString("en-IN")}</p><p className="text-xs font-bold text-slate-500">records</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-black">{item.roundCount}</p><p className="text-xs font-bold text-slate-500">rounds</p></div></div><p className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500"><RefreshCw className="size-3.5" /> Verified {formatDate(item.lastVerifiedAt)}</p>{releases[0] && <p className="mt-2 truncate text-sm font-bold">Latest: {releases[0].roundName}</p>}<div className="mt-4 flex gap-2"><Button size="sm" variant="outline" asChild><a href={item.officialPageUrl} target="_blank" rel="noreferrer">Official notices <ExternalLink /></a></Button><Button size="sm" variant="ghost" asChild><a href={item.officialResultUrl} target="_blank" rel="noreferrer">Result page <ArrowUpRight /></a></Button></div></div></article>; })}</section>

          <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="flex items-center gap-2 text-xl font-black"><FileSearch className="text-[#cc0000]" /> Search results</h2><p className="text-sm text-slate-500">{searchedIdentifier ? `Verified matches for ${searchedIdentifier}` : "Enter a candidate identifier to check every imported official round."}</p></div>{searchedIdentifier && <Badge variant="outline">{data.results.length} match{data.results.length === 1 ? "" : "es"}</Badge>}</div>
              {searchedIdentifier && data.results.length ? <div className="divide-y divide-slate-100">{data.results.map((result) => <article key={result.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge className="bg-[#172033] text-white">{RESULT_AUTHORITIES.find((item) => item.id === result.authority)?.shortName}</Badge><Badge variant="outline">{result.roundName}</Badge></div><h3 className="mt-3 text-xl font-black">{result.collegeName || "No college recorded in this official row"}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{[result.course, result.quota, result.allottedCategory].filter(Boolean).join(" • ") || "Course, quota and category not supplied"}</p></div><Button variant="ghost" size="icon" onClick={() => void deleteResult(result)} aria-label="Delete incorrect result"><Trash2 className="text-red-600" /></Button></div><div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3"><div><p className="text-xs font-black uppercase text-slate-400">Candidate</p><p className="mt-1 font-bold">{result.studentName || result.candidateIdentifier}</p></div><div><p className="text-xs font-black uppercase text-slate-400">Identifier</p><p className="mt-1 font-bold">{result.candidateIdentifier}</p></div><div><p className="text-xs font-black uppercase text-slate-400">NEET AIR</p><p className="mt-1 font-bold">{result.neetAir || "Not published"}</p></div></div>{result.remark && <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{result.remark}</p>}{result.collegeName && /allotted/i.test(result.remark) && <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-emerald-700">Ready congratulation message</p><p className="mt-2 text-sm font-semibold leading-6 text-emerald-950">{congratulationMessage(result)}</p></div><Button size="sm" variant="outline" className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100" onClick={() => void copyCongratulation(result)}><Copy /> Copy message</Button></div></div>}<div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>Verified {formatDate(result.verifiedAt)}</span><a className="inline-flex items-center gap-1 font-bold text-[#cc0000] hover:underline" href={result.sourceUrl} target="_blank" rel="noreferrer">Open official source <ExternalLink className="size-3" /></a></div></article>)}</div> : <div className="grid min-h-72 place-items-center p-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Search /></span><p className="mt-4 text-lg font-black">{searchedIdentifier ? "No verified record found" : "Ready to check official results"}</p><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">{searchedIdentifier ? "This does not automatically mean ‘not allotted’. The authority may not have published the result, or its verified file may not yet be imported. Check the official source before advising the student." : "Search by the exact registration number, application number, NEET roll number or NEET AIR used in the authority's public result."}</p></div></div>}
            </div>

            <aside className="space-y-5"><section className="rounded-[1.75rem] bg-gradient-to-br from-[#082f2b] via-[#0f4c45] to-[#111b34] p-6 text-white shadow-lg"><div className="flex items-start justify-between gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-white/15"><DatabaseZap /></span><Badge className="border border-emerald-300/20 bg-emerald-400/15 text-emerald-100"><span className="mr-1.5 size-2 rounded-full bg-emerald-400" /> Live</Badge></div><h2 className="mt-4 text-2xl font-black">Automatic result collection</h2><p className="mt-2 text-sm leading-6 text-emerald-50">Official MCC, Haryana and UP result pages are checked hourly. New public allotment PDFs are verified, imported and made searchable without a manual upload.</p><div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4"><p className="text-xs font-black uppercase tracking-[0.1em] text-emerald-200">Last verified import</p><p className="mt-1 text-sm font-bold">{formatDate(data.sync.lastVerifiedAt)}</p><p className="mt-2 text-xs text-slate-300">Official authority publications only • {data.sync.monitoredAuthorities} counsellings monitored</p></div><div className="mt-5 grid gap-2"><Button className="w-full bg-white text-[#0f4c45] hover:bg-emerald-50" onClick={() => void refreshImportedResults()} disabled={refreshing}>{refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh imported results</Button><Button variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white" onClick={() => setImportOpen((current) => !current)}><FileText /> {importOpen ? "Close manual fallback" : "Manual PDF fallback"}</Button></div></section>
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><h3 className="flex items-center gap-2 font-black"><CalendarDays className="size-5 text-[#cc0000]" /> Verified releases</h3><div className="mt-4 space-y-3">{data.releases.length ? data.releases.slice(0, 8).map((release) => <a key={release.id} href={release.sourceUrl} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-200 p-3 transition hover:border-red-200 hover:bg-red-50/40"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-black uppercase text-slate-400">{release.authority} • {release.roundName}</p><p className="mt-1 font-bold">{release.title}</p></div><ExternalLink className="size-4 shrink-0 text-slate-400" /></div><p className="mt-2 text-xs text-slate-500">Verified {formatDate(release.verifiedAt)}</p>{release.revisionNote && <p className="mt-1 text-xs text-slate-600">{release.revisionNote}</p>}</a>) : <p className="py-6 text-center text-sm text-slate-500">No result release has been imported yet.</p>}</div></section></aside>
          </section>

          {importOpen && <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#cc0000]">Manual administrator fallback</p><h2 className="mt-1 text-2xl font-black">Map an official result PDF</h2><p className="mt-1 text-sm text-slate-500">Use this only when an official public result has not yet been collected automatically. Original digital PDFs and HTTPS links on the selected authority's official domains are accepted.</p></div><Badge className="bg-emerald-50 text-emerald-700"><ShieldCheck /> Source validation on</Badge></div><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><label><span className={labelClass}>Counselling</span><select className={selectClass} value={importAuthority} onChange={(event) => { const next = event.target.value as ResultAuthorityId; setImportAuthority(next); setSourceUrl(RESULT_AUTHORITIES.find((item) => item.id === next)?.officialResultUrl ?? ""); setIdentifierType(next === "mcc" ? "neet_air" : "registration_number"); }}>{RESULT_AUTHORITIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span className={labelClass}>Round name *</span><Input value={roundName} onChange={(event) => setRoundName(event.target.value)} placeholder="Round 2 final allotment" /></label><label><span className={labelClass}>Result title</span><Input value={resultTitle} onChange={(event) => setResultTitle(event.target.value)} placeholder="Final seat allotment result" /></label><label><span className={labelClass}>Published date &amp; time</span><Input type="datetime-local" value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} /></label></div><div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.65fr]"><label><span className={labelClass}>Official source URL *</span><Input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https:// official authority result PDF" /></label><label><span className={labelClass}>Identifier type</span><select className={selectClass} value={identifierType} onChange={(event) => setIdentifierType(event.target.value)}><option value="registration_number">Registration number</option><option value="application_number">Application number</option><option value="neet_roll">NEET roll number</option><option value="neet_air">NEET AIR</option></select></label></div><label className="mt-4 block"><span className={labelClass}>Revision / verification note</span><Textarea rows={2} value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} placeholder="Example: Final result after grievance redressal; supersedes provisional allotment." /></label><div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">Official allotment-result PDF</p><p className="text-sm text-slate-500">Text-based .pdf • table headings and candidate rows are detected automatically</p>{pdfPageCount > 0 && <p className="mt-1 text-xs font-bold text-emerald-700">{pdfPageCount} page{pdfPageCount === 1 ? "" : "s"} processed • {sourceRows.length.toLocaleString("en-IN")} candidate rows detected</p>}</div><Button variant="outline" asChild><label className={`cursor-pointer ${readingPdf ? "pointer-events-none opacity-60" : ""}`}>{readingPdf ? <Loader2 className="animate-spin" /> : <UploadCloud />} {readingPdf ? "Reading PDF…" : fileName || "Choose PDF"}<input type="file" accept=".pdf,application/pdf" disabled={readingPdf} className="sr-only" onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)} /></label></Button></div>{pdfWarnings.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{pdfWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}</div>{columns.length > 0 && <><div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">Verify the detected mapping and sample rows against the official PDF before importing. Duplicate identifiers are blocked automatically.</div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{fieldOptions.map((field) => <label key={field.key}><span className={labelClass}>{field.label}{field.required ? " *" : ""}</span><select className={selectClass} value={mapping[field.key] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value }))}><option value="">Not supplied</option>{columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>)}</div><div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr>{columns.slice(0, 8).map((column) => <th key={column} className="whitespace-nowrap px-4 py-3 font-black">{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{sourceRows.slice(0, 6).map((row, rowIndex) => <tr key={rowIndex}>{columns.slice(0, 8).map((column) => <td key={column} className="max-w-72 truncate px-4 py-3">{row[column]}</td>)}</tr>)}</tbody></table></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-slate-500">{sourceRows.length.toLocaleString("en-IN")} PDF rows ready for verification</p><Button size="lg" onClick={() => void importResults()} disabled={importing || readingPdf || !mapping.candidateIdentifier || !roundName.trim() || !sourceUrl.trim()}>{importing ? <Loader2 className="animate-spin" /> : <DatabaseZap />} Verify and import results</Button></div></>}
          </section>}
        </>}
      </div>
    </main>
  );
}
