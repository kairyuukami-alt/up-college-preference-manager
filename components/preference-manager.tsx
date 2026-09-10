"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  GripVertical,
  History,
  Info,
  KeyRound,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  LockKeyhole,
  LogOut,
  MessageCircleQuestion,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  sourceFilename: string;
  collegeCount: number;
  columns: string[];
  collegeNameKey: string;
  preferenceKey: string | null;
  builtin: boolean;
  updatedAt: number | null;
};

type ListSummary = {
  id: string;
  studentName: string;
  masterId: string;
  collegeCount: number;
  lockedAt: number | null;
  hasStudentPassword: boolean;
  createdAt: number;
  updatedAt: number;
};

type ListDetail = ListSummary & { collegeIds: number[] };

type PreferenceVersion = {
  id: string;
  studentName: string;
  collegeIds: number[];
  actorRole: string;
  createdAt: number;
};

type ParsedSheet = {
  columns: string[];
  rows: Record<string, MasterValue>[];
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatValue(value: MasterValue | undefined, column = "") {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return /fee|total|hostel|security|deposit|amount|charge|tuition|cost/i.test(column)
      ? currency.format(value)
      : value.toLocaleString("en-IN");
  }
  return value;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function normaliseExcelCell(value: unknown): MasterValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value).trim();
}

function uniqueHeaders(values: unknown[]) {
  const counts = new Map<string, number>();
  return values.map((value, index) => {
    const base = String(value ?? "").trim() || `Column ${index + 1}`;
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

export function PreferenceManager({ initialListId, onLogout, onOpenDashboard, onOpenProfiles, onOpenQuestions }: { initialListId?: string; onLogout: () => void | Promise<void>; onOpenDashboard: () => void; onOpenProfiles: () => void; onOpenQuestions: () => void }) {
  const [masters, setMasters] = useState<MasterSummary[]>([]);
  const [activeMasterId, setActiveMasterId] = useState("");
  const [masterColleges, setMasterColleges] = useState<MasterCollege[]>([]);
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [collegeIds, setCollegeIds] = useState<number[]>([]);
  const [lockedAt, setLockedAt] = useState<number | null>(null);
  const [listSearch, setListSearch] = useState("");
  const [collegeSearch, setCollegeSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createMode, setCreateMode] = useState<"master" | "blank">("master");
  const [creating, setCreating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingList, setDeletingList] = useState(false);
  const [masterDeleteOpen, setMasterDeleteOpen] = useState(false);
  const [deletingMaster, setDeletingMaster] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [changingLock, setChangingLock] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [studentPassword, setStudentPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicatePassword, setDuplicatePassword] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [detailCollege, setDetailCollege] = useState<MasterCollege | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [parsedSheet, setParsedSheet] = useState<ParsedSheet | null>(null);
  const [collegeNameKey, setCollegeNameKey] = useState("");
  const [preferenceKey, setPreferenceKey] = useState("");
  const [parsingFile, setParsingFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<PreferenceVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  const activeMaster = masters.find((master) => master.id === activeMasterId) ?? null;
  const isLocked = Boolean(lockedAt);

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const data = (await response.json()) as T & { error?: string };
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  async function loadMaster(id: string) {
    setLoadingMaster(true);
    try {
      const data = await requestJson<{ master: MasterSummary; colleges: MasterCollege[] }>(`/api/masters/${id}`);
      setActiveMasterId(id);
      setMasterColleges(data.colleges);
      return data;
    } finally {
      setLoadingMaster(false);
    }
  }

  async function loadListDetail(id: string) {
    setLoadingList(true);
    try {
      const data = await requestJson<{ list: ListDetail }>(`/api/lists/${id}`);
      setActiveId(id);
      setStudentName(data.list.studentName);
      setCollegeIds(data.list.collegeIds);
      setLockedAt(data.list.lockedAt ? Number(data.list.lockedAt) : null);
      setDirty(false);
      return data.list;
    } finally {
      setLoadingList(false);
    }
  }

  async function loadInitialData() {
    setLoading(true);
    try {
      const [masterData, listData] = await Promise.all([
        requestJson<{ masters: MasterSummary[] }>("/api/masters"),
        requestJson<{ lists: ListSummary[] }>("/api/lists"),
      ]);
      setMasters(masterData.masters);
      setLists(listData.lists);
      const firstList = listData.lists.find((list) => list.id === initialListId) ?? listData.lists[0];
      const initialMasterId = firstList?.masterId || masterData.masters[0]?.id;
      if (initialMasterId) await loadMaster(initialMasterId);
      if (firstList) await loadListDetail(firstList.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load the portal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial hydration runs once; later refreshes are triggered after explicit mutations.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialListId]);

  async function openList(id: string, checkUnsaved = true) {
    if (checkUnsaved && dirty && !window.confirm("Discard the unsaved changes in the current list?")) return;
    try {
      const list = await loadListDetail(id);
      if (list.masterId !== activeMasterId) await loadMaster(list.masterId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't open this list.");
    }
  }

  async function switchMaster(id: string) {
    if (id === activeMasterId) return;
    if (dirty && !window.confirm("Discard the unsaved changes in the current list?")) return;
    try {
      await loadMaster(id);
      const firstList = lists.find((list) => list.masterId === id);
      if (firstList) {
        await loadListDetail(firstList.id);
      } else {
        setActiveId(null);
        setStudentName("");
        setCollegeIds([]);
        setLockedAt(null);
        setDirty(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't switch counselling lists.");
    }
  }

  async function createList() {
    if (!createName.trim()) {
      toast.error("Enter the student's name.");
      return;
    }
    if (!/^\d{4}$/u.test(createPassword)) {
      toast.error("Set a 4-digit student login PIN.");
      return;
    }
    if (!activeMasterId) return;
    const newStudentName = createName.trim();
    setCreating(true);
    try {
      const data = await requestJson<{ list: ListSummary }>("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName: newStudentName, studentPassword: createPassword, masterId: activeMasterId, mode: createMode }),
      });
      setLists((current) => [data.list, ...current]);
      setCreateOpen(false);
      setCreateName("");
      setCreatePassword("");
      setCreateMode("master");
      await loadListDetail(data.list.id);
      toast.success("Student account created. Share its name and PIN privately.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create the list.");
    } finally {
      setCreating(false);
    }
  }

  async function setListPassword() {
    if (!activeId || !/^\d{4}$/u.test(studentPassword)) {
      toast.error("Enter a 4-digit student login PIN.");
      return;
    }
    setSettingPassword(true);
    try {
      await requestJson<{ ok: boolean }>(`/api/lists/${activeId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: studentPassword }),
      });
      setLists((current) => current.map((item) => item.id === activeId ? {
        ...item,
        hasStudentPassword: true,
      } : item));
      setStudentPassword("");
      setPasswordOpen(false);
      toast.success("Student PIN saved. The student's previous session has been signed out.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the student PIN.");
    } finally {
      setSettingPassword(false);
    }
  }

  async function saveList() {
    if (!activeId || isLocked) return false;
    if (!studentName.trim()) {
      toast.error("Student name cannot be empty.");
      return false;
    }
    setSaving(true);
    try {
      const data = await requestJson<{ list: ListSummary }>(`/api/lists/${activeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName: studentName.trim(), collegeIds }),
      });
      setStudentName(data.list.studentName);
      setLists((current) => current.map((item) => item.id === activeId ? { ...item, ...data.list } : item));
      setDirty(false);
      toast.success("Preference list saved.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the list.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function duplicateList() {
    if (!activeId || !/^\d{4}$/u.test(duplicatePassword)) {
      toast.error("Set a 4-digit PIN for the duplicate account.");
      return;
    }
    const duplicateName = `${studentName.trim()} – Copy`;
    setDuplicating(true);
    try {
      const data = await requestJson<{ list: ListSummary }>("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName: duplicateName, studentPassword: duplicatePassword, masterId: activeMasterId, collegeIds }),
      });
      setLists((current) => [data.list, ...current]);
      await loadListDetail(data.list.id);
      setDuplicatePassword("");
      setDuplicateOpen(false);
      toast.success("Duplicate student account created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't duplicate the list.");
    } finally {
      setDuplicating(false);
    }
  }

  async function deleteList() {
    if (!activeId) return;
    setDeletingList(true);
    try {
      await requestJson<{ ok: boolean }>(`/api/lists/${activeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const remaining = lists.filter((item) => item.id !== activeId);
      setLists(remaining);
      const next = remaining.find((item) => item.masterId === activeMasterId);
      if (next) await loadListDetail(next.id);
      else {
        setActiveId(null);
        setStudentName("");
        setCollegeIds([]);
        setLockedAt(null);
      }
      setDirty(false);
      setDeleteOpen(false);
      setDeletePassword("");
      toast.success("Student profile, choices and uploaded documents deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the list.");
    } finally {
      setDeletingList(false);
    }
  }

  async function openHistory() {
    if (!activeId) return;
    setHistoryOpen(true);
    setLoadingVersions(true);
    try {
      const data = await requestJson<{ versions: PreferenceVersion[] }>(`/api/lists/${activeId}/versions`);
      setVersions(data.versions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load preference history.");
    } finally {
      setLoadingVersions(false);
    }
  }

  async function restoreVersion(version: PreferenceVersion) {
    if (!activeId || isLocked) return;
    setRestoringVersion(version.id);
    try {
      await requestJson<{ ok: boolean }>(`/api/lists/${activeId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: version.id }),
      });
      await loadListDetail(activeId);
      setHistoryOpen(false);
      toast.success("Previous preference order restored.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't restore this version.");
    } finally {
      setRestoringVersion(null);
    }
  }

  async function lockList() {
    if (!activeId || dirty) return;
    setChangingLock(true);
    try {
      const data = await requestJson<{ lockedAt: number }>(`/api/lists/${activeId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock" }),
      });
      setLockedAt(data.lockedAt);
      setLists((current) => current.map((list) => list.id === activeId ? { ...list, lockedAt: data.lockedAt } : list));
      setLockOpen(false);
      toast.success("Preference list locked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't lock the list.");
    } finally {
      setChangingLock(false);
    }
  }

  async function unlockList() {
    if (!activeId) return;
    setChangingLock(true);
    try {
      await requestJson<{ lockedAt: null }>(`/api/lists/${activeId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock", password: unlockPassword }),
      });
      setLockedAt(null);
      setLists((current) => current.map((list) => list.id === activeId ? { ...list, lockedAt: null } : list));
      setUnlockPassword("");
      setUnlockOpen(false);
      toast.success("Preference list unlocked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't unlock the list.");
    } finally {
      setChangingLock(false);
    }
  }

  function markEditableChange(action: () => void) {
    if (isLocked) return;
    action();
    setDirty(true);
  }

  function addCollege(id: number) {
    if (!activeId || collegeIds.includes(id)) return;
    markEditableChange(() => setCollegeIds((current) => [...current, id]));
  }

  function removeCollege(id: number) {
    markEditableChange(() => setCollegeIds((current) => current.filter((collegeId) => collegeId !== id)));
  }

  function moveCollege(id: number, offset: number) {
    const from = collegeIds.indexOf(id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= collegeIds.length) return;
    moveToPosition(id, to);
  }

  function moveToPosition(id: number, targetIndex: number) {
    if (isLocked) return;
    setCollegeIds((current) => {
      const from = current.indexOf(id);
      if (from < 0 || from === targetIndex) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(targetIndex, 0, id);
      return next;
    });
    setDirty(true);
  }

  async function parseSheet(file: File, sheet: string) {
    setParsingFile(true);
    try {
      const excel = await import("read-excel-file");
      const matrix = await excel.default(file, { sheet });
      if (matrix.length < 2) throw new Error("The selected sheet has no college rows.");
      const columns = uniqueHeaders(matrix[0]);
      const rows = matrix.slice(1).map((row) => {
        const record: Record<string, MasterValue> = {};
        columns.forEach((column, index) => { record[column] = normaliseExcelCell(row[index]); });
        return record;
      }).filter((row) => Object.values(row).some((value) => value !== null && value !== ""));
      if (!rows.length) throw new Error("The selected sheet has no college rows.");
      const detectedName = columns.find((column) => /college.*name|name.*college|institute.*name/i.test(column))
        ?? columns.find((column) => /college|institute/i.test(column))
        ?? columns[0];
      const detectedPreference = columns.find((column) => /preference|choice.*order|order/i.test(column)) ?? "";
      setParsedSheet({ columns, rows });
      setCollegeNameKey(detectedName);
      setPreferenceKey(detectedPreference);
    } finally {
      setParsingFile(false);
    }
  }

  async function chooseWorkbook(file: File | null) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      toast.error("Please upload an .xlsx Excel workbook.");
      return;
    }
    setUploadFile(file);
    setUploadTitle(file.name.replace(/\.xlsx$/i, ""));
    setParsedSheet(null);
    setParsingFile(true);
    try {
      const excel = await import("read-excel-file");
      const names = await excel.readSheetNames(file);
      if (!names.length) throw new Error("No worksheets were found in this workbook.");
      setSheetNames(names);
      setSelectedSheet(names[0]);
      await parseSheet(file, names[0]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't read the workbook.");
    } finally {
      setParsingFile(false);
    }
  }

  async function changeSheet(sheet: string) {
    if (!uploadFile) return;
    setSelectedSheet(sheet);
    try {
      await parseSheet(uploadFile, sheet);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't read this worksheet.");
    }
  }

  async function uploadMaster() {
    if (!uploadFile || !parsedSheet || !uploadTitle.trim() || !collegeNameKey) {
      toast.error("Complete the workbook details before importing.");
      return;
    }
    setUploading(true);
    try {
      const data = await requestJson<{ master: MasterSummary }>("/api/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          sourceFilename: uploadFile.name,
          columns: parsedSheet.columns,
          collegeNameKey,
          preferenceKey: preferenceKey || null,
          rows: parsedSheet.rows,
        }),
      });
      setMasters((current) => current.length ? [current[0], data.master, ...current.slice(1)] : [data.master]);
      await loadMaster(data.master.id);
      setActiveId(null);
      setStudentName("");
      setCollegeIds([]);
      setLockedAt(null);
      setDirty(false);
      resetUploadDialog();
      setUploadOpen(false);
      toast.success(`${data.master.title} imported with ${data.master.collegeCount} colleges.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't import the workbook.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteMaster() {
    if (!activeMaster || activeMaster.builtin) return;
    setDeletingMaster(true);
    try {
      await requestJson<{ ok: boolean }>(`/api/masters/${activeMaster.id}`, { method: "DELETE" });
      const remaining = masters.filter((master) => master.id !== activeMaster.id);
      setMasters(remaining);
      setLists((current) => current.filter((list) => list.masterId !== activeMaster.id));
      setActiveId(null);
      setStudentName("");
      setCollegeIds([]);
      setLockedAt(null);
      setDirty(false);
      setMasterDeleteOpen(false);
      const fallback = remaining[0];
      if (fallback) await loadMaster(fallback.id);
      else {
        setActiveMasterId("");
        setMasterColleges([]);
      }
      toast.success("Uploaded counselling list deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the uploaded counselling list.");
    } finally {
      setDeletingMaster(false);
    }
  }

  function resetUploadDialog() {
    setUploadFile(null);
    setUploadTitle("");
    setSheetNames([]);
    setSelectedSheet("");
    setParsedSheet(null);
    setCollegeNameKey("");
    setPreferenceKey("");
  }

  function downloadCsv() {
    if (!activeMaster) return;
    const masterMap = new Map(masterColleges.map((college) => [college.id, college]));
    const rows = collegeIds.map((id) => masterMap.get(id)).filter((college): college is MasterCollege => Boolean(college));
    const header = ["Preference", ...activeMaster.columns];
    const csv = [
      header.map(csvCell).join(","),
      ...rows.map((college, index) => [index + 1, ...activeMaster.columns.map((column) => college.data[column])].map(csvCell).join(",")),
    ].join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${studentName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "student"}-preference-list.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function printPdf() {
    if (dirty) {
      const saved = await saveList();
      if (!saved) return;
    }
    window.print();
  }

  const selectedIds = useMemo(() => new Set(collegeIds), [collegeIds]);
  const masterMap = useMemo(() => new Map(masterColleges.map((college) => [college.id, college])), [masterColleges]);
  const activeColleges = useMemo(
    () => collegeIds.map((id) => masterMap.get(id)).filter((college): college is MasterCollege => Boolean(college)),
    [collegeIds, masterMap],
  );
  const officialNameKey = activeMaster?.columns.find((column) =>
    /official.*(?:college|institute).*name|(?:college|institute).*name.*official/i.test(column),
  ) ?? activeMaster?.collegeNameKey ?? "";
  const secondaryColumns = activeMaster?.columns.filter((column) => column !== activeMaster.collegeNameKey && column !== activeMaster.preferenceKey).slice(0, 3) ?? [];
  const visibleLists = lists.filter((list) => list.masterId === activeMasterId && list.studentName.toLowerCase().includes(listSearch.toLowerCase()));
  const visibleColleges = masterColleges.filter((college) => {
    const query = collegeSearch.trim().toLowerCase();
    return !query || Object.values(college.data).some((value) => String(value ?? "").toLowerCase().includes(query));
  });

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#172033]">
      <header className="no-print border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#cc0000] focus-visible:ring-offset-2" aria-label="Return to VidyaSaarthi portal homepage">
            <Image src="/vidyasaarthi-logo.jpeg" alt="VidyaSaarthi logo" width={52} height={52} priority unoptimized className="size-12 rounded-full border border-red-100 bg-white object-contain shadow-sm" />
            <div>
              <p className="text-lg font-extrabold leading-tight tracking-tight">Counselling Preference Desk</p>
              <p className="text-xs font-medium text-slate-500">VidyaSaarthi • Choice Filling Portal</p>
            </div>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge className="border-slate-200 bg-slate-100 text-slate-700"><ShieldCheck /> Admin</Badge>
            <Button variant="outline" size="sm" onClick={() => { if (!dirty || window.confirm("Discard unsaved choice-filling changes?")) onOpenDashboard(); }}><LayoutDashboard /> Dashboard</Button>
            <Button variant="outline" size="sm" onClick={() => { if (!dirty || window.confirm("Discard unsaved choice-filling changes?")) onOpenProfiles(); }}><UsersRound /> Student Profiles</Button>
            <Button variant="outline" size="sm" onClick={() => { if (!dirty || window.confirm("Discard unsaved choice-filling changes?")) onOpenQuestions(); }}><MessageCircleQuestion /> Question Inbox</Button>
            {masters.length > 0 && (
              <Select value={activeMasterId} onValueChange={(value) => void switchMaster(value)}>
                <SelectTrigger className="w-[230px] bg-white"><SelectValue placeholder="Select counselling" /></SelectTrigger>
                <SelectContent>
                  {masters.map((master) => <SelectItem key={master.id} value={master.id}>{master.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}><Upload /> Import Excel</Button>
            {activeMaster && !activeMaster.builtin && (
              <Button variant="outline" size="icon-sm" onClick={() => setMasterDeleteOpen(true)} className="text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700" aria-label={`Delete uploaded counselling list ${activeMaster.title}`} title="Delete uploaded counselling list"><Trash2 /></Button>
            )}
            {activeId && (
              <>
                {isLocked ? <Badge className="border-red-200 bg-red-50 text-red-700"><LockKeyhole /> Locked</Badge> : dirty ? <Badge className="border-amber-200 bg-amber-50 text-amber-800">Unsaved changes</Badge> : <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700"><Check /> Saved</Badge>}
                <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}><KeyRound /> Set student PIN</Button>
                <Button variant="outline" size="sm" onClick={() => setDuplicateOpen(true)}><Copy /> Duplicate</Button>
                <Button variant="outline" size="sm" onClick={() => void openHistory()}><History /> History</Button>
                <Button variant="outline" size="sm" onClick={downloadCsv}><Download /> CSV</Button>
                <Button variant="outline" size="sm" onClick={() => void printPdf()} disabled={saving || loadingList}><Printer /> Print / PDF</Button>
                {isLocked ? (
                  <Button size="sm" onClick={() => setUnlockOpen(true)}><UnlockKeyhole /> Unlock</Button>
                ) : (
                  <Button size="sm" onClick={saveList} disabled={saving || !dirty}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save list</Button>
                )}
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => void onLogout()}><LogOut /> Sign out</Button>
          </div>
        </div>
      </header>

      {activeId && (
        <section className="print-only print-document" aria-label={`${studentName} preference list`}>
          <h1 className="print-student-name">{studentName}</h1>
          <table className="print-table">
            <thead><tr><th>Preference</th><th>Official College Name</th></tr></thead>
            <tbody>
              {activeColleges.map((college, index) => (
                <tr key={college.id}>
                  <td>{index + 1}</td>
                  <td>{String(college.data[officialNameKey] ?? college.name)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="no-print mx-auto grid max-w-[1800px] gap-4 p-4 lg:grid-cols-[270px_minmax(0,1fr)_430px] lg:p-5">
        <aside className="no-print overflow-hidden rounded-2xl bg-[#172033] text-white shadow-lg shadow-slate-300/40">
          <div className="border-b border-white/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-bold">Student accounts</p>
                <p className="text-xs text-slate-300">{visibleLists.length} in {activeMaster?.title ?? "this counselling"}</p>
              </div>
              <Button size="icon-sm" onClick={() => setCreateOpen(true)} disabled={!activeMasterId} className="bg-[#cc0000] hover:bg-[#b00000]" aria-label="Add a new student account"><Plus /></Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={listSearch} onChange={(event) => setListSearch(event.target.value)} placeholder="Search student" className="border-white/10 bg-white/10 pl-9 text-white placeholder:text-slate-400 focus-visible:border-white/30" />
            </div>
          </div>
          <div className="max-h-[calc(100vh-185px)] min-h-40 overflow-y-auto p-2 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-300"><Loader2 className="size-4 animate-spin" /> Loading lists</div>
            ) : visibleLists.length ? visibleLists.map((list) => (
              <button key={list.id} onClick={() => void openList(list.id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${activeId === list.id ? "bg-white text-[#172033] shadow" : "text-slate-100 hover:bg-white/10"}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${activeId === list.id ? "bg-[#ccdfed] text-[#172033]" : "bg-white/10"}`}>{list.studentName.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-semibold">{list.studentName}{list.lockedAt && <LockKeyhole className="size-3 shrink-0 text-[#cc0000]" />}</span>
                  <span className={`flex items-center gap-1 text-xs ${activeId === list.id ? "text-slate-500" : "text-slate-400"}`}>{Number(list.collegeCount)} colleges <span aria-hidden>•</span> {list.hasStudentPassword ? "PIN set" : "PIN needed"}</span>
                </span>
              </button>
            )) : (
              <div className="p-6 text-center text-sm text-slate-300"><UsersRound className="mx-auto mb-3 size-7 opacity-70" />{listSearch ? "No matching student" : "Create the first student list"}</div>
            )}
          </div>
        </aside>

        <section className="no-print overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><Building2 className="size-5 text-[#cc0000]" /><h2 className="text-lg font-extrabold">{activeMaster?.title ?? "College master"}</h2></div>
                <p className="mt-1 text-sm text-slate-500">{activeMaster ? `${activeMaster.collegeCount} colleges • ${activeMaster.sourceFilename}` : "Select or import a counselling list"}</p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input value={collegeSearch} onChange={(event) => setCollegeSearch(event.target.value)} placeholder="Search all columns" className="pl-9" />
                </div>
                <Button variant="outline" size="icon" onClick={() => setUploadOpen(true)} aria-label="Import a counselling Excel list"><FileUp /></Button>
              </div>
            </div>
          </div>
          <div className="max-h-[calc(100vh-190px)] overflow-auto scrollbar-thin">
            {loadingMaster ? (
              <div className="grid min-h-80 place-items-center text-sm text-slate-500"><span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Opening counselling list</span></div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50">
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>{activeMaster?.collegeNameKey ?? "College"}</TableHead>
                    {secondaryColumns.map((column, index) => <TableHead key={column} className={index > 0 ? "hidden 2xl:table-cell" : "hidden xl:table-cell"}>{column}</TableHead>)}
                    <TableHead className="w-24 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleColleges.map((college) => {
                    const selected = selectedIds.has(college.id);
                    return (
                      <TableRow key={college.id} className={selected ? "bg-[#ccdfed]/25" : undefined}>
                        <TableCell className="font-semibold text-slate-400">{college.position}</TableCell>
                        <TableCell>
                          <button onClick={() => setDetailCollege(college)} className="group max-w-md text-left">
                            <span className="block font-semibold leading-5 text-slate-900 group-hover:text-[#cc0000]">{college.name}</span>
                            <span className="mt-1 block text-xs text-slate-500 xl:hidden">{secondaryColumns.slice(0, 2).map((column) => formatValue(college.data[column], column)).join(" • ")}</span>
                          </button>
                        </TableCell>
                        {secondaryColumns.map((column, index) => <TableCell key={column} className={`${index > 0 ? "hidden 2xl:table-cell" : "hidden xl:table-cell"} max-w-48 truncate`}>{formatValue(college.data[column], column)}</TableCell>)}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => setDetailCollege(college)} aria-label={`View ${college.name} details`}><Info /></Button>
                            <Button size="sm" variant={selected ? "secondary" : "outline"} disabled={!activeId || isLocked || selected} onClick={() => addCollege(college.id)}>{isLocked ? <><LockKeyhole /> Locked</> : selected ? <><Check /> Added</> : <><Plus /> Add</>}</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </section>

        <section className="print-area overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!activeId ? (
            <div className="grid min-h-[65vh] place-items-center p-8 text-center">
              <div className="max-w-sm">
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-[#ccdfed] text-[#172033]"><FileSpreadsheet className="size-8" /></div>
                <h2 className="text-xl font-extrabold">Add the first student</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Create a private profile, assign a login PIN and connect the student to this counselling master.</p>
                <Button className="mt-5" onClick={() => setCreateOpen(true)} disabled={!activeMasterId}><Plus /> Add student</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2"><ListOrdered className="size-5 text-[#cc0000]" /><h2 className="text-lg font-extrabold">Preference order</h2></div>
                  {isLocked && <Badge className="border-red-200 bg-red-50 text-red-700"><ShieldCheck /> Locked</Badge>}
                </div>
                <div className="mt-3">
                  <label htmlFor="student-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Student name</label>
                  <Input id="student-name" value={studentName} disabled={isLocked} onChange={(event) => markEditableChange(() => setStudentName(event.target.value))} className="h-11 text-base font-semibold disabled:opacity-100" />
                </div>
                {isLocked && <div className="no-print mt-3 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><span>This list is locked. Enter the password to unlock editing.</span></div>}
                <div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-500">{collegeIds.length} colleges selected</span>{loadingList && <span className="no-print flex items-center gap-1 text-slate-500"><Loader2 className="size-3 animate-spin" /> Opening</span>}</div>
              </div>
              <div className="print-list max-h-[calc(100vh-325px)] overflow-y-auto p-3 scrollbar-thin">
                {activeColleges.length ? activeColleges.map((college, index) => (
                  <article key={college.id} draggable={!isLocked} onDragStart={() => setDraggedId(college.id)} onDragOver={(event) => { if (!isLocked) event.preventDefault(); }} onDrop={() => { if (!isLocked && draggedId !== null) moveToPosition(draggedId, index); setDraggedId(null); }} className="print-item mb-2 grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-slate-300">
                    <div className="no-print flex flex-col items-center">
                      <GripVertical className={`size-4 ${isLocked ? "text-slate-200" : "cursor-grab text-slate-300"}`} />
                      <select value={index + 1} disabled={isLocked} onChange={(event) => moveToPosition(college.id, Number(event.target.value) - 1)} aria-label={`Move ${college.name} to preference position`} className="mt-1 size-8 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm font-extrabold outline-none focus:border-[#cc0000] disabled:opacity-60">
                        {collegeIds.map((_, position) => <option key={position} value={position + 1}>{position + 1}</option>)}
                      </select>
                    </div>
                    <div className="hidden print:block text-center text-lg font-bold">{index + 1}</div>
                    <button className="min-w-0 text-left" onClick={() => setDetailCollege(college)}>
                      <span className="block text-sm font-bold leading-5 text-slate-900">{college.name}</span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{secondaryColumns.slice(0, 2).map((column) => `${column}: ${formatValue(college.data[column], column)}`).join(" • ")}</span>
                    </button>
                    <div className="no-print flex flex-col gap-1">
                      <Button variant="ghost" size="icon-xs" disabled={isLocked || index === 0} onClick={() => moveCollege(college.id, -1)} aria-label={`Move ${college.name} up`}><ArrowUp /></Button>
                      <Button variant="ghost" size="icon-xs" disabled={isLocked || index === collegeIds.length - 1} onClick={() => moveCollege(college.id, 1)} aria-label={`Move ${college.name} down`}><ArrowDown /></Button>
                      <Button variant="ghost" size="icon-xs" disabled={isLocked} onClick={() => removeCollege(college.id)} className="text-red-600 hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${college.name}`}><X /></Button>
                    </div>
                  </article>
                )) : (
                  <div className="grid min-h-56 place-items-center p-8 text-center"><div><ListOrdered className="mx-auto mb-3 size-8 text-slate-300" /><p className="font-semibold">No colleges selected</p><p className="mt-1 text-sm text-slate-500">Use Add in the college master to build this list.</p></div></div>
                )}
              </div>
              <div className="no-print border-t border-slate-200 p-3">
                {isLocked ? (
                  <div className="flex gap-2"><Button className="flex-1" onClick={() => setUnlockOpen(true)}><UnlockKeyhole /> Unlock with password</Button><Button variant="outline" size="icon" onClick={() => setDeleteOpen(true)} aria-label="Delete locked student profile"><Trash2 className="text-red-600" /></Button></div>
                ) : (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={saveList} disabled={saving || !dirty}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save list</Button>
                    <Button variant="outline" onClick={() => setLockOpen(true)} disabled={dirty} title={dirty ? "Save the list before locking" : "Lock preference list"}><LockKeyhole /> Lock</Button>
                    <Button variant="outline" size="icon" onClick={() => setDeleteOpen(true)} aria-label="Delete student list"><Trash2 /></Button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add new student</DialogTitle><DialogDescription>Create the student&apos;s private profile and preference list under {activeMaster?.title ?? "the selected counselling"}. Only an administrator can set or change the login PIN.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-1">
            <div><label htmlFor="new-student-name" className="mb-1.5 block text-sm font-semibold">Student name</label><Input id="new-student-name" autoFocus value={createName} onChange={(event) => setCreateName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createList(); }} placeholder="Enter full name" /></div>
            <div><label htmlFor="new-student-password" className="mb-1.5 block text-sm font-semibold">Student login PIN</label><Input id="new-student-password" type="password" inputMode="numeric" autoComplete="new-password" minLength={4} maxLength={4} value={createPassword} onChange={(event) => setCreatePassword(event.target.value.replace(/\D/g, ""))} placeholder="4-digit PIN" /><p className="mt-1.5 text-xs text-slate-500">The student will use their exact name and this PIN for both Profile and Choice Filling.</p></div>
            <RadioGroup value={createMode} onValueChange={(value) => setCreateMode(value as "master" | "blank")}>
              <label htmlFor="mode-master" className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${createMode === "master" ? "border-[#cc0000] bg-red-50/50" : "border-slate-200"}`}><RadioGroupItem id="mode-master" value="master" className="mt-0.5" /><span><span className="block font-semibold">Copy the master order</span><span className="mt-1 block text-sm text-slate-500">Start with all {activeMaster?.collegeCount ?? 0} colleges in the uploaded order.</span></span></label>
              <label htmlFor="mode-blank" className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${createMode === "blank" ? "border-[#cc0000] bg-red-50/50" : "border-slate-200"}`}><RadioGroupItem id="mode-blank" value="blank" className="mt-0.5" /><span><span className="block font-semibold">Start blank</span><span className="mt-1 block text-sm text-slate-500">Add only the colleges required for this student.</span></span></label>
            </RadioGroup>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={createList} disabled={creating || !createName.trim() || createPassword.length !== 4}>{creating ? <Loader2 className="animate-spin" /> : <Plus />} Create student</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={(open) => { setPasswordOpen(open); if (!open) setStudentPassword(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Set student PIN</DialogTitle><DialogDescription>Only an administrator can set or change {studentName || "the student"}&apos;s login PIN. The existing PIN cannot be displayed.</DialogDescription></DialogHeader>
          <div><label htmlFor="student-access-password" className="mb-1.5 block text-sm font-semibold">New 4-digit PIN</label><Input id="student-access-password" type="password" inputMode="numeric" autoComplete="new-password" autoFocus maxLength={4} value={studentPassword} onChange={(event) => setStudentPassword(event.target.value.replace(/\D/g, ""))} onKeyDown={(event) => { if (event.key === "Enter") void setListPassword(); }} placeholder="••••" /><p className="mt-2 text-xs leading-5 text-slate-500">Changing it signs out the student&apos;s current session.</p></div>
          <DialogFooter><Button variant="outline" onClick={() => setPasswordOpen(false)}>Cancel</Button><Button onClick={setListPassword} disabled={settingPassword || studentPassword.length !== 4}>{settingPassword ? <Loader2 className="animate-spin" /> : <KeyRound />} Save PIN</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={duplicateOpen} onOpenChange={(open) => { setDuplicateOpen(open); if (!open) setDuplicatePassword(""); }}>
        <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Duplicate student account</DialogTitle><DialogDescription>The preference order will be copied into a new account named {studentName || "Student"} – Copy. Set its login PIN now.</DialogDescription></DialogHeader><div><label htmlFor="duplicate-student-password" className="mb-1.5 block text-sm font-semibold">New account PIN</label><Input id="duplicate-student-password" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={duplicatePassword} onChange={(event) => setDuplicatePassword(event.target.value.replace(/\D/g, ""))} placeholder="4-digit PIN" /></div><DialogFooter><Button variant="outline" onClick={() => setDuplicateOpen(false)}>Cancel</Button><Button onClick={duplicateList} disabled={duplicating || duplicatePassword.length !== 4}>{duplicating ? <Loader2 className="animate-spin" /> : <Copy />} Create duplicate</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) resetUploadDialog(); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Import counselling list from Excel</DialogTitle><DialogDescription>Upload an .xlsx workbook, select the college-name column, and save it as a reusable counselling master.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-[#cc0000] hover:bg-red-50/30">
              <FileUp className="mb-2 size-7 text-[#cc0000]" /><span className="font-semibold">{uploadFile?.name ?? "Choose Excel workbook"}</span><span className="mt-1 text-sm text-slate-500">.xlsx files • up to 2,000 rows</span>
              <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => void chooseWorkbook(event.target.files?.[0] ?? null)} />
            </label>
            {parsingFile && <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Reading workbook</div>}
            {parsedSheet && (
              <>
                <div><label htmlFor="master-title" className="mb-1.5 block text-sm font-semibold">Counselling list name</label><Input id="master-title" value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Example: Haryana MBBS Round 1" /></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {sheetNames.length > 1 && <div><label className="mb-1.5 block text-sm font-semibold">Worksheet</label><Select value={selectedSheet} onValueChange={(value) => void changeSheet(value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{sheetNames.map((sheet) => <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>)}</SelectContent></Select></div>}
                  <div><label className="mb-1.5 block text-sm font-semibold">College name column</label><Select value={collegeNameKey} onValueChange={setCollegeNameKey}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{parsedSheet.columns.map((column) => <SelectItem key={column} value={column}>{column}</SelectItem>)}</SelectContent></Select></div>
                  <div><label className="mb-1.5 block text-sm font-semibold">Initial order column</label><Select value={preferenceKey || "__sheet_order__"} onValueChange={(value) => setPreferenceKey(value === "__sheet_order__" ? "" : value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__sheet_order__">Use sheet row order</SelectItem>{parsedSheet.columns.map((column) => <SelectItem key={column} value={column}>{column}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200"><div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold">Preview • {parsedSheet.rows.length} rows</div><div className="max-h-48 overflow-auto"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>{collegeNameKey || "College"}</TableHead></TableRow></TableHeader><TableBody>{parsedSheet.rows.slice(0, 5).map((row, index) => <TableRow key={index}><TableCell>{index + 1}</TableCell><TableCell>{formatValue(row[collegeNameKey])}</TableCell></TableRow>)}</TableBody></Table></div></div>
              </>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button><Button onClick={uploadMaster} disabled={!parsedSheet || uploading || parsingFile}>{uploading ? <Loader2 className="animate-spin" /> : <Upload />} Import counselling list</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailCollege)} onOpenChange={(open) => { if (!open) setDetailCollege(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {detailCollege && activeMaster && (
            <>
              <DialogHeader><DialogTitle className="pr-6 text-xl leading-7">{detailCollege.name}</DialogTitle><DialogDescription>{activeMaster.title} • Master position {detailCollege.position}</DialogDescription></DialogHeader>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{activeMaster.columns.filter((column) => column !== activeMaster.collegeNameKey).map((column) => <div key={column} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{column}</p><p className="mt-1 whitespace-pre-wrap text-sm font-bold text-slate-900">{formatValue(detailCollege.data[column], column)}</p></div>)}</div>
              <DialogFooter><Button variant="outline" onClick={() => setDetailCollege(null)}>Close</Button><Button disabled={!activeId || isLocked || selectedIds.has(detailCollege.id)} onClick={() => { addCollege(detailCollege.id); setDetailCollege(null); }}>{isLocked ? <LockKeyhole /> : selectedIds.has(detailCollege.id) ? <Check /> : <Plus />}{isLocked ? "List locked" : selectedIds.has(detailCollege.id) ? "Already added" : "Add to preference list"}</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={lockOpen} onOpenChange={setLockOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Lock {studentName}&apos;s preference list?</AlertDialogTitle><AlertDialogDescription>After locking, the student name, college selection, order and deletion controls will be disabled. A password will be required to unlock it.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={lockList} disabled={changingLock}>{changingLock ? "Locking…" : "Lock list"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Dialog open={unlockOpen} onOpenChange={(open) => { setUnlockOpen(open); if (!open) setUnlockPassword(""); }}>
        <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Unlock preference list</DialogTitle><DialogDescription>Enter the portal password to enable editing.</DialogDescription></DialogHeader><div><label htmlFor="unlock-password" className="mb-1.5 block text-sm font-semibold">Password</label><Input id="unlock-password" type="password" inputMode="numeric" autoFocus maxLength={4} value={unlockPassword} onChange={(event) => setUnlockPassword(event.target.value.replace(/\D/g, ""))} onKeyDown={(event) => { if (event.key === "Enter") void unlockList(); }} placeholder="••••" /></div><DialogFooter><Button variant="outline" onClick={() => setUnlockOpen(false)}>Cancel</Button><Button onClick={unlockList} disabled={changingLock || unlockPassword.length !== 4}>{changingLock ? <Loader2 className="animate-spin" /> : <UnlockKeyhole />} Unlock</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Preference-list history</DialogTitle><DialogDescription>Every saved order is preserved before the next edit. Restore any previous order while the current list is unlocked.</DialogDescription></DialogHeader>{loadingVersions ? <div className="grid min-h-40 place-items-center"><Loader2 className="animate-spin text-[#cc0000]" /></div> : versions.length ? <div className="space-y-2">{versions.map((version) => <div key={version.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4"><History className="size-5 text-slate-400" /><div className="min-w-0 flex-1"><p className="font-bold">{version.collegeIds.length} colleges</p><p className="text-xs text-slate-500">Saved by {version.actorRole} • {new Date(version.createdAt).toLocaleString("en-IN")}</p></div><Button variant="outline" size="sm" disabled={isLocked || restoringVersion !== null} onClick={() => void restoreVersion(version)}>{restoringVersion === version.id ? <Loader2 className="animate-spin" /> : <RotateCcw />} Restore</Button></div>)}</div> : <div className="py-10 text-center text-sm text-slate-500">No earlier saved version exists yet.</div>}<DialogFooter><Button variant="outline" onClick={() => setHistoryOpen(false)}>Close</Button></DialogFooter></DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeletePassword(""); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {studentName || "this student profile"}?</AlertDialogTitle><AlertDialogDescription>This permanently removes the student login, private profile, preference choices, progress and every uploaded document. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><div><label htmlFor="delete-locked-profile-password" className="mb-1.5 block text-sm font-semibold">Admin password</label><Input id="delete-locked-profile-password" type="password" inputMode="numeric" autoFocus maxLength={4} value={deletePassword} onChange={(event) => setDeletePassword(event.target.value.replace(/\D/g, ""))} placeholder="••••" /><p className="mt-1.5 text-xs text-slate-500">Required whenever the student&apos;s choices or profile are locked.</p></div><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void deleteList()} disabled={deletingList || deletePassword.length !== 4}>{deletingList ? "Deleting…" : "Delete everything"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={masterDeleteOpen} onOpenChange={setMasterDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {activeMaster?.title || "this uploaded counselling list"}?</AlertDialogTitle><AlertDialogDescription>This removes the uploaded Excel master and its college data. The built-in UP list stays protected. If any student preference lists use this upload, delete those lists first.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={deleteMaster} disabled={deletingMaster}>{deletingMaster ? "Deleting…" : "Delete uploaded list"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
