"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Download,
  FileArchive,
  FileText,
  FolderLock,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  MessageCircleQuestion,
  Plus,
  Printer,
  Save,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentChecklistItem } from "@/lib/counselling-types";
import { PROFILE_SECTIONS, profileCompletion, type ProfileSubject, type StudentProfileData } from "@/lib/student-profile";

type ProfileDocument = {
  id: string;
  requirementId: string | null;
  documentName: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  reviewStatus: "uploaded" | "accepted" | "rejected" | "reupload_required";
  rejectionReason: string | null;
  reviewedAt: number | null;
  uploadedAt: number;
};

type ProfileRecord = {
  listId: string;
  studentName: string;
  data: StudentProfileData;
  lockedAt: number | null;
  updatedAt: number | null;
};

type ListSummary = {
  id: string;
  studentName: string;
  masterId: string;
  collegeCount: number;
  lockedAt: number | null;
  hasStudentPassword: boolean;
};

type MasterSummary = {
  id: string;
  title: string;
  collegeCount: number;
};

type ProfileManagerProps = {
  role: "admin" | "student";
  initialListId?: string;
  onChoiceFilling: () => void;
  onOpenDashboard?: () => void;
  onOpenQuestions?: () => void;
  onLogout: () => void | Promise<void>;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function requestError(value: unknown) {
  return value instanceof Error ? value.message : "Something went wrong.";
}

function SubjectEditor({
  title,
  subjects,
  disabled,
  onChange,
}: {
  title: string;
  subjects: ProfileSubject[];
  disabled: boolean;
  onChange: (subjects: ProfileSubject[]) => void;
}) {
  function update(index: number, key: "name" | "maxMarks" | "obtained", value: string) {
    onChange(subjects.map((subject, subjectIndex) => subjectIndex === index ? { ...subject, [key]: value } : subject));
  }

  function add(group: "other" | "additional") {
    onChange([...subjects, { name: "", maxMarks: "100", obtained: "", group }]);
  }

  function remove(index: number) {
    onChange(subjects.filter((_, subjectIndex) => subjectIndex !== index));
  }

  const totals = subjects.reduce((value, subject) => ({
    maximum: value.maximum + (Number(subject.maxMarks) || 0),
    obtained: value.obtained + (Number(subject.obtained) || 0),
  }), { maximum: 0, obtained: 0 });
  const percentage = totals.maximum ? (totals.obtained / totals.maximum) * 100 : 0;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800 px-4 py-3 text-white">
        <div><h3 className="font-extrabold">{title} subjects & marks</h3><p className="text-xs text-slate-300">Every listed subject needs maximum and obtained marks.</p></div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => add("other")}>+ Other main</Button>
          <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => add("additional")}>+ Additional</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[#dcebf5] text-xs uppercase tracking-wide text-slate-700"><tr><th className="px-4 py-3 text-left">Subject</th><th className="w-44 px-4 py-3 text-left">Max marks</th><th className="w-44 px-4 py-3 text-left">Obtained</th><th className="w-20 px-4 py-3 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {subjects.map((subject, index) => (
              <tr key={`${subject.group}-${index}-${subject.name}`}>
                <td className="px-4 py-3">
                  {subject.group === "main" ? <span className="font-semibold">{subject.name}</span> : <Input aria-label={`${title} subject name`} value={subject.name} disabled={disabled} onChange={(event) => update(index, "name", event.target.value)} placeholder={subject.group === "other" ? "Other main subject" : "Additional subject"} />}
                  <Badge variant="outline" className="ml-2 capitalize">{subject.group}</Badge>
                </td>
                <td className="px-4 py-3"><Input type="number" min="1" value={subject.maxMarks} disabled={disabled} onChange={(event) => update(index, "maxMarks", event.target.value)} /></td>
                <td className="px-4 py-3"><Input type="number" min="0" max={subject.maxMarks || undefined} value={subject.obtained} disabled={disabled} onChange={(event) => update(index, "obtained", event.target.value)} /></td>
                <td className="px-4 py-3 text-right">{subject.group !== "main" && <Button type="button" size="icon-sm" variant="ghost" disabled={disabled} onClick={() => remove(index)} aria-label={`Remove ${subject.name || "subject"}`}><Trash2 className="text-red-600" /></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 bg-slate-50 p-4 text-sm font-bold sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-3"><span className="text-slate-500">Maximum</span><span className="float-right">{totals.maximum}</span></div>
        <div className="rounded-xl border bg-white p-3"><span className="text-slate-500">Obtained</span><span className="float-right">{totals.obtained}</span></div>
        <div className="rounded-xl border bg-white p-3"><span className="text-slate-500">Percentage</span><span className="float-right">{percentage.toFixed(2)}%</span></div>
      </div>
    </div>
  );
}

export function StudentProfileManager({ role, initialListId, onChoiceFilling, onOpenDashboard, onOpenQuestions, onLogout }: ProfileManagerProps) {
  const isAdmin = role === "admin";
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [masters, setMasters] = useState<MasterSummary[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [documents, setDocuments] = useState<ProfileDocument[]>([]);
  const [checklist, setChecklist] = useState<DocumentChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [changingLock, setChangingLock] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [documentName, setDocumentName] = useState("");
  const [requirementId, setRequirementId] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPin, setCreatePin] = useState("");
  const [createMasterId, setCreateMasterId] = useState("");
  const [creating, setCreating] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [settingPin, setSettingPin] = useState(false);
  const [reviewDocument, setReviewDocument] = useState<ProfileDocument | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ProfileDocument["reviewStatus"]>("accepted");
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [deleteProfileOpen, setDeleteProfileOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingProfile, setDeletingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiBase = isAdmin
    ? (selectedListId ? `/api/lists/${selectedListId}/profile` : "")
    : "/api/student/profile";
  const studentReadOnly = !isAdmin && Boolean(profile?.lockedAt);

  const fetchJson = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, { cache: "no-store", ...init });
    const data = await response.json() as T & { error?: string; missing?: string[]; invalid?: string[] };
    if (!response.ok) {
      const details = [...(data.missing ?? []), ...(data.invalid ?? [])];
      if (details.length) setIssues(details);
      throw new Error(data.error || "Something went wrong.");
    }
    return data;
  }, []);

  const loadProfile = useCallback(async (base: string) => {
    if (!base) return;
    setLoading(true);
    setIssues([]);
    try {
      const data = await fetchJson<{ profile: ProfileRecord; documents: ProfileDocument[]; checklist: DocumentChecklistItem[] }>(base);
      setProfile(data.profile);
      setDocuments(data.documents);
      setChecklist(data.checklist);
      setDirty(false);
    } catch (error) {
      toast.error(requestError(error));
    } finally {
      setLoading(false);
    }
  }, [fetchJson]);

  useEffect(() => {
    if (!isAdmin) {
      // The session-bound student profile is loaded once when this workspace opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadProfile("/api/student/profile");
      return;
    }
    void Promise.all([
      fetchJson<{ lists: ListSummary[] }>("/api/lists"),
      fetchJson<{ masters: MasterSummary[] }>("/api/masters"),
    ])
      .then(([listData, masterData]) => {
        setLists(listData.lists);
        setMasters(masterData.masters);
        setCreateMasterId((current) => current || masterData.masters[0]?.id || "");
        setSelectedListId((current) => current || listData.lists.find((list) => list.id === initialListId)?.id || listData.lists[0]?.id || "");
        if (!listData.lists.length) setLoading(false);
      })
      .catch((error) => { toast.error(requestError(error)); setLoading(false); });
  }, [fetchJson, initialListId, isAdmin, loadProfile]);

  useEffect(() => {
    if (isAdmin && selectedListId) {
      // The selected admin profile is refreshed after an explicit student selection.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadProfile(`/api/lists/${selectedListId}/profile`);
    }
  }, [isAdmin, loadProfile, selectedListId]);

  async function createStudent() {
    const studentName = createName.trim();
    if (!studentName) {
      toast.error("Enter the student's full name.");
      return;
    }
    if (!/^\d{4}$/u.test(createPin)) {
      toast.error("Set a 4-digit student login PIN.");
      return;
    }
    if (!createMasterId) {
      toast.error("Select the counselling master for this student.");
      return;
    }
    setCreating(true);
    try {
      const result = await fetchJson<{ list: ListSummary }>("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          studentPassword: createPin,
          masterId: createMasterId,
          mode: "master",
        }),
      });
      setLists((current) => [result.list, ...current]);
      setLoading(true);
      setSelectedListId(result.list.id);
      setCreateOpen(false);
      setCreateName("");
      setCreatePin("");
      toast.success("Student profile created. Share the name and PIN privately with the student.");
    } catch (error) {
      toast.error(requestError(error));
    } finally {
      setCreating(false);
    }
  }

  async function setStudentPin() {
    if (!selectedListId || !/^\d{4}$/u.test(newPin)) {
      toast.error("Enter a 4-digit student login PIN.");
      return;
    }
    setSettingPin(true);
    try {
      await fetchJson<{ ok: boolean }>(`/api/lists/${selectedListId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPin }),
      });
      setLists((current) => current.map((item) => item.id === selectedListId ? { ...item, hasStudentPassword: true } : item));
      setNewPin("");
      setPinOpen(false);
      toast.success("Student PIN updated. Their previous session has been signed out.");
    } catch (error) {
      toast.error(requestError(error));
    } finally {
      setSettingPin(false);
    }
  }

  function setField(key: string, value: string) {
    setProfile((current) => current ? { ...current, data: { ...current.data, fields: { ...current.data.fields, [key]: value } } } : current);
    setDirty(true);
    setIssues([]);
  }

  function setSubjects(level: "class10Subjects" | "class12Subjects", subjects: ProfileSubject[]) {
    setProfile((current) => current ? { ...current, data: { ...current.data, [level]: subjects } } : current);
    setDirty(true);
    setIssues([]);
  }

  async function saveProfile() {
    if (!profile || !apiBase || studentReadOnly) return false;
    setSaving(true);
    try {
      const result = await fetchJson<{ profile: { lockedAt: number | null; updatedAt: number } }>(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: profile.data }),
      });
      setProfile((current) => current ? { ...current, lockedAt: result.profile.lockedAt, updatedAt: result.profile.updatedAt } : current);
      setDirty(false);
      toast.success("Private profile draft saved.");
      return true;
    } catch (error) {
      toast.error(requestError(error));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function changeLock(locked: boolean) {
    if (!profile || !apiBase) return;
    setChangingLock(true);
    try {
      if (locked && dirty && !(await saveProfile())) return;
      const result = await fetchJson<{ profile: ProfileRecord }>(`${apiBase}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked }),
      });
      setProfile((current) => current ? { ...current, lockedAt: result.profile.lockedAt, updatedAt: result.profile.updatedAt } : current);
      setLockOpen(false);
      setIssues([]);
      toast.success(locked ? "Profile locked. Only an administrator can change it now." : "Profile unlocked for student editing.");
    } catch (error) {
      toast.error(requestError(error));
    } finally {
      setChangingLock(false);
    }
  }

  async function uploadDocument() {
    const selectedRequirement = checklist.find((item) => item.id === requirementId);
    if (!apiBase || (!documentName.trim() && !selectedRequirement) || !documentFile) {
      toast.error("Name the document and choose a file.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("documentName", selectedRequirement?.documentName ?? documentName.trim());
      if (selectedRequirement) formData.set("requirementId", selectedRequirement.id);
      formData.set("file", documentFile);
      await fetchJson<{ document: ProfileDocument }>(`${apiBase}/documents`, { method: "POST", body: formData });
      setDocumentName("");
      setRequirementId("");
      setDocumentFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadProfile(apiBase);
      toast.success("Document uploaded to the private profile.");
    } catch (error) {
      toast.error(requestError(error));
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(document: ProfileDocument) {
    if (!apiBase || !window.confirm(`Remove “${document.documentName}” from this profile?`)) return;
    try {
      await fetchJson<{ ok: boolean }>(`${apiBase}/documents/${document.id}`, { method: "DELETE" });
      await loadProfile(apiBase);
      toast.success("Document removed.");
    } catch (error) {
      toast.error(requestError(error));
    }
  }

  async function saveDocumentReview() {
    if (!apiBase || !reviewDocument) return;
    if (["rejected", "reupload_required"].includes(reviewStatus) && !rejectionReason.trim()) {
      toast.error("Add a reason so the student knows what to correct.");
      return;
    }
    setReviewing(true);
    try {
      await fetchJson<{ document: ProfileDocument }>(`${apiBase}/documents/${reviewDocument.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewStatus, rejectionReason: rejectionReason.trim() }),
      });
      setReviewDocument(null);
      setRejectionReason("");
      await loadProfile(apiBase);
      toast.success("Document review saved.");
    } catch (error) {
      toast.error(requestError(error));
    } finally {
      setReviewing(false);
    }
  }

  async function deleteStudentProfile() {
    if (!isAdmin || !selectedListId) return;
    setDeletingProfile(true);
    try {
      await fetchJson<{ ok: boolean; deletedDocumentCount: number }>(`/api/lists/${selectedListId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const remaining = lists.filter((item) => item.id !== selectedListId);
      setLists(remaining);
      setSelectedListId(remaining[0]?.id ?? "");
      if (!remaining.length) {
        setProfile(null);
        setDocuments([]);
        setChecklist([]);
        setLoading(false);
      }
      setDeleteProfileOpen(false);
      setDeletePassword("");
      toast.success("Student profile, choices and uploaded documents deleted.");
    } catch (error) {
      toast.error(requestError(error));
    } finally {
      setDeletingProfile(false);
    }
  }

  const completion = useMemo(() => profile ? profileCompletion(profile.data) : 0, [profile]);
  const selectedStudent = isAdmin ? lists.find((list) => list.id === selectedListId) ?? null : null;

  return (
    <main className="min-h-screen bg-[#f3f6fa] text-[#172033]">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Homepage"><Image src="/vidyasaarthi-logo.jpeg" alt="VidyaSaarthi" width={58} height={58} priority unoptimized className="size-14 rounded-full border border-red-100 bg-white object-contain p-0.5 shadow-sm" /></Link>
            <div><p className="text-lg font-black sm:text-xl">Student Profile Desk</p><p className="text-xs font-semibold text-slate-500">VidyaSaarthi • Private counselling records</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenDashboard && <Button variant="outline" onClick={() => { if (!dirty || window.confirm("Discard unsaved profile changes?")) onOpenDashboard(); }}><LayoutDashboard /> Dashboard</Button>}
            <Button variant="outline" onClick={() => { if (!dirty || window.confirm("Discard unsaved profile changes?")) onChoiceFilling(); }}><ArrowLeft /> Choice Filling</Button>
            {isAdmin && onOpenQuestions && <Button variant="outline" onClick={() => { if (!dirty || window.confirm("Discard unsaved profile changes?")) onOpenQuestions(); }}><MessageCircleQuestion /> Question Inbox</Button>}
            <Badge className={isAdmin ? "bg-slate-900 text-white" : "bg-red-50 text-red-700"}>{isAdmin ? <ShieldCheck /> : <UserRound />}{isAdmin ? "Admin view" : "Student view"}</Badge>
            <Button variant="ghost" size="icon" onClick={() => void onLogout()} aria-label="Sign out"><LogOut /></Button>
          </div>
        </div>
      </header>

      {profile && <section className="print-only print-document" aria-label={`${profile.studentName} complete profile summary`}>
        <h1 className="print-student-name">{profile.studentName} — Complete Student Summary</h1>
        <p><strong>Profile:</strong> {completion}% complete • {profile.lockedAt ? `Locked ${new Date(profile.lockedAt).toLocaleString("en-IN")}` : "Draft"}</p>
        {PROFILE_SECTIONS.map((section) => <div key={section.title} className="print-profile-section"><h2>{section.title}</h2><table className="print-table"><tbody>{section.fields.map((field) => <tr key={field.key}><th>{field.label}</th><td>{profile.data.fields[field.key] || "—"}</td></tr>)}</tbody></table></div>)}
        {[{ title: "Class 10 Subjects", subjects: profile.data.class10Subjects }, { title: "Class 12 Subjects", subjects: profile.data.class12Subjects }].map((group) => <div key={group.title} className="print-profile-section"><h2>{group.title}</h2><table className="print-table"><thead><tr><th>Subject</th><th>Maximum</th><th>Obtained</th></tr></thead><tbody>{group.subjects.map((subject, index) => <tr key={`${group.title}-${index}`}><td>{subject.name}</td><td>{subject.maxMarks}</td><td>{subject.obtained}</td></tr>)}</tbody></table></div>)}
        <div className="print-profile-section"><h2>Documents</h2><table className="print-table"><thead><tr><th>Document</th><th>File</th><th>Review status</th></tr></thead><tbody>{documents.map((document) => <tr key={document.id}><td>{document.documentName}</td><td>{document.originalFilename}</td><td>{document.reviewStatus.replaceAll("_", " ")}{document.rejectionReason ? ` — ${document.rejectionReason}` : ""}</td></tr>)}</tbody></table></div>
      </section>}

      <div className="no-print mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        {isAdmin && (
          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div><p className="font-extrabold">Student profile administration</p><p className="text-sm text-slate-500">Add students, assign their login PIN and privately manage every profile.</p></div>
              <div className="ml-auto flex w-full flex-wrap items-center gap-2 lg:w-auto">
                <select value={selectedListId} onChange={(event) => { if (!dirty || window.confirm("Discard unsaved profile changes?")) setSelectedListId(event.target.value); }} className="h-11 min-w-64 flex-1 rounded-xl border border-slate-300 bg-white px-3 font-semibold outline-none focus:border-[#cc0000] lg:flex-none"><option value="">Select student</option>{lists.map((list) => <option key={list.id} value={list.id}>{list.studentName}</option>)}</select>
                <Button variant="outline" disabled={!selectedListId} onClick={() => setPinOpen(true)}><KeyRound /> Set PIN</Button>
                <Button variant="outline" disabled={!selectedListId || !profile} onClick={() => window.print()}><Printer /> Summary PDF</Button>
                <Button variant="outline" className="text-red-700" disabled={!selectedListId} onClick={() => setDeleteProfileOpen(true)}><Trash2 /> Delete Profile</Button>
                <Button className="bg-[#cc0000] hover:bg-[#a90000]" disabled={!masters.length} onClick={() => { setCreateMasterId(lists.find((list) => list.id === selectedListId)?.masterId || masters[0]?.id || ""); setCreateOpen(true); }}><Plus /> Add Student</Button>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className="grid min-h-[60vh] place-items-center"><div className="text-center"><Loader2 className="mx-auto size-8 animate-spin text-[#cc0000]" /><p className="mt-3 text-sm text-slate-500">Opening private profile…</p></div></div>
        ) : !profile ? (
          <div className="grid min-h-[50vh] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white text-center"><div><UserRound className="mx-auto size-10 text-slate-300" /><p className="mt-3 font-bold">No student profile selected</p></div></div>
        ) : (
          <>
            <section className="mb-5 overflow-hidden rounded-3xl bg-[#172033] p-5 text-white shadow-xl sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#cde3f1]">Private student profile</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{profile.studentName}</h1><p className="mt-2 text-sm text-slate-300">One secure account for profile documents and choice filling.</p></div>
                <div className="flex items-center gap-4"><div className="text-right"><p className="text-2xl font-black">{completion}%</p><p className="text-xs text-slate-300">profile completed</p></div>{profile.lockedAt ? <Badge className="border border-emerald-400/30 bg-emerald-400/15 text-emerald-100"><LockKeyhole /> Locked</Badge> : <Badge className="border border-amber-400/30 bg-amber-400/15 text-amber-100"><Save /> Draft</Badge>}</div>
              </div>
            </section>

            {issues.length > 0 && <Alert variant="destructive" className="mb-5 bg-white"><AlertTitle>Complete or correct these fields before locking</AlertTitle><AlertDescription><ul className="mt-2 grid list-disc gap-1 pl-5 sm:grid-cols-2">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></AlertDescription></Alert>}

            {!isAdmin && profile.lockedAt && <Alert className="mb-5 border-emerald-200 bg-emerald-50 text-emerald-950"><CheckCircle2 /><AlertTitle>Profile locked successfully</AlertTitle><AlertDescription>Your information and documents are read-only. Contact the administrator if anything needs to change.</AlertDescription></Alert>}

            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-black">Student identity</h2><p className="mt-1 text-sm text-slate-500">The name is controlled by the administrator and is also used for portal login.</p><div className="mt-4"><label className="mb-1.5 block text-sm font-bold">Full Name <span className="text-red-600">*</span></label><Input value={profile.studentName} disabled className="h-11 bg-slate-50 font-semibold disabled:opacity-100" /></div></section>

              {PROFILE_SECTIONS.map((section) => (
                <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="border-b border-slate-200 pb-3"><h2 className="text-xl font-black text-[#cc0000]">{section.title}</h2>{section.description && <p className="mt-1 text-sm text-slate-500">{section.description}</p>}</div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {section.fields.map((field) => (
                      <div key={field.key}>
                        <label htmlFor={`profile-${field.key}`} className="mb-1.5 block text-sm font-bold">{field.label} <span className="text-red-600">*</span></label>
                        {field.type === "select" ? (
                          <select id={`profile-${field.key}`} value={profile.data.fields[field.key] ?? ""} disabled={studentReadOnly} onChange={(event) => setField(field.key, event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none transition focus:border-[#cc0000] focus:ring-2 focus:ring-red-100 disabled:bg-slate-50 disabled:opacity-100"><option value="">Select</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                        ) : (
                          <Input id={`profile-${field.key}`} type={field.type ?? "text"} value={profile.data.fields[field.key] ?? ""} disabled={studentReadOnly} onChange={(event) => setField(field.key, event.target.value)} placeholder={field.placeholder} className="h-11 disabled:opacity-100" />
                        )}
                      </div>
                    ))}
                  </div>
                  {section.title.startsWith("4.") && <SubjectEditor title="Class 10" subjects={profile.data.class10Subjects} disabled={studentReadOnly} onChange={(subjects) => setSubjects("class10Subjects", subjects)} />}
                  {section.title.startsWith("6.") && <SubjectEditor title="Class 12" subjects={profile.data.class12Subjects} disabled={studentReadOnly} onChange={(subjects) => setSubjects("class12Subjects", subjects)} />}
                </section>
              ))}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4"><div><div className="flex items-center gap-2"><FolderLock className="size-5 text-[#cc0000]" /><h2 className="text-xl font-black">Private counselling documents</h2></div><p className="mt-1 text-sm text-slate-500">Name each file before uploading. PDFs, images and Word documents are accepted, up to 10 MB each.</p></div><Badge variant="outline">{documents.length} / 20 documents</Badge></div>
                {checklist.length > 0 && <div className="mt-5"><div className="mb-3"><h3 className="font-black">Required checklist</h3><p className="text-sm text-slate-500">Your profile can be locked only after every required document is accepted by the administrator.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{checklist.map((item) => {
                  const classes = item.status === "accepted" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : item.status === "uploaded" ? "border-blue-200 bg-blue-50 text-blue-800" : item.status === "missing" ? "border-slate-200 bg-slate-50 text-slate-700" : "border-red-200 bg-red-50 text-red-800";
                  return <article key={item.id} className={`rounded-xl border p-4 ${classes}`}><div className="flex items-start gap-2">{item.status === "accepted" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <CircleAlert className="mt-0.5 size-5 shrink-0" />}<div className="min-w-0"><p className="font-black">{item.documentName}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide">{item.status.replaceAll("_", " ")}</p>{item.originalFilename && <p className="mt-1 truncate text-xs">{item.originalFilename}</p>}{item.rejectionReason && <p className="mt-2 text-sm font-semibold">Reason: {item.rejectionReason}</p>}</div></div></article>;
                })}</div></div>}
                <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                  <div><label htmlFor="document-requirement" className="mb-1.5 block text-sm font-bold">Checklist item</label><select id="document-requirement" value={requirementId} disabled={studentReadOnly || documents.length >= 20} onChange={(event) => { setRequirementId(event.target.value); if (event.target.value) setDocumentName(""); }} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Other document</option>{checklist.map((item) => <option key={item.id} value={item.id}>{item.documentName} — {item.status.replaceAll("_", " ")}</option>)}</select></div>
                  <div><label htmlFor="document-name" className="mb-1.5 block text-sm font-bold">Document name</label><Input id="document-name" value={requirementId ? checklist.find((item) => item.id === requirementId)?.documentName ?? "" : documentName} disabled={studentReadOnly || documents.length >= 20 || Boolean(requirementId)} onChange={(event) => setDocumentName(event.target.value)} placeholder="Example: 12th Marksheet" /></div>
                  <div><label htmlFor="document-file" className="mb-1.5 block text-sm font-bold">Choose document</label><Input ref={fileRef} id="document-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" disabled={studentReadOnly || documents.length >= 20} onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} /></div>
                  <Button className="self-end" disabled={studentReadOnly || uploading || documents.length >= 20 || (!documentName.trim() && !requirementId) || !documentFile} onClick={() => void uploadDocument()}>{uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload</Button>
                </div>
                {isAdmin && documents.length > 0 && <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" asChild><a href={`${apiBase}/documents/download`}><FileArchive /> Download all as ZIP</a></Button><Button variant="outline" onClick={() => window.print()}><Printer /> Complete summary PDF</Button></div>}
                <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
                  {documents.length ? documents.map((document) => (
                    <div key={document.id} className="flex flex-wrap items-center gap-3 bg-white p-4">
                      <span className="grid size-10 place-items-center rounded-xl bg-[#eef5fa] text-[#172033]"><FileText /></span>
                      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold">{document.documentName}</p><Badge variant="outline" className={document.reviewStatus === "accepted" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : document.reviewStatus === "uploaded" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-red-200 bg-red-50 text-red-700"}>{document.reviewStatus.replaceAll("_", " ")}</Badge></div><p className="truncate text-xs text-slate-500">{document.originalFilename} • {formatBytes(document.sizeBytes)} • {new Date(document.uploadedAt).toLocaleDateString("en-IN")}</p>{document.rejectionReason && <p className="mt-1 text-xs font-semibold text-red-700">Reason: {document.rejectionReason}</p>}</div>
                      <Button variant="outline" size="sm" asChild><a href={`${apiBase}/documents/${document.id}`} target="_blank" rel="noreferrer">View</a></Button>
                      {isAdmin && <Button variant="outline" size="sm" asChild><a href={`${apiBase}/documents/${document.id}?download=1`}><Download /> Download</a></Button>}
                      {isAdmin && <Button variant="outline" size="sm" onClick={() => { setReviewDocument(document); setReviewStatus(document.reviewStatus === "uploaded" ? "accepted" : document.reviewStatus); setRejectionReason(document.rejectionReason ?? ""); }}>Review</Button>}
                      <Button variant="ghost" size="icon-sm" disabled={studentReadOnly} onClick={() => void deleteDocument(document)} aria-label={`Delete ${document.documentName}`}><Trash2 className="text-red-600" /></Button>
                    </div>
                  )) : <div className="p-8 text-center text-sm text-slate-500"><FileText className="mx-auto mb-2 size-8 text-slate-300" />No documents uploaded yet.</div>}
                </div>
              </section>
            </div>

            <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
              <p className="px-2 text-sm text-slate-500">{dirty ? "You have unsaved profile changes." : profile.updatedAt ? `Saved ${new Date(profile.updatedAt).toLocaleString("en-IN")}` : "Start filling the profile, then save a draft."}</p>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void saveProfile()} disabled={!dirty || saving || studentReadOnly}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save draft</Button>
                {isAdmin && profile.lockedAt && <Button onClick={() => void changeLock(false)} disabled={changingLock}><UnlockKeyhole /> Unlock for student</Button>}
                {!profile.lockedAt && <Button className="bg-[#cc0000] hover:bg-[#a90000]" onClick={() => setLockOpen(true)} disabled={changingLock}><LockKeyhole /> Lock completed profile</Button>}
              </div>
            </div>
          </>
        )}
      </div>

      {isAdmin && (
        <>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setCreateName(""); setCreatePin(""); } }}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add new student profile</DialogTitle>
                <DialogDescription>Create one private student account for both Profile and Choice Filling. Only an administrator can assign or change the login PIN.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <div>
                  <label htmlFor="profile-new-student-name" className="mb-1.5 block text-sm font-bold">Student full name</label>
                  <Input id="profile-new-student-name" autoFocus value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Enter the name used for login" />
                </div>
                <div>
                  <label htmlFor="profile-new-student-pin" className="mb-1.5 block text-sm font-bold">4-digit login PIN</label>
                  <Input id="profile-new-student-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={createPin} onChange={(event) => setCreatePin(event.target.value.replace(/\D/g, ""))} onKeyDown={(event) => { if (event.key === "Enter") void createStudent(); }} placeholder="••••" />
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">Share the exact student name and PIN privately. The student cannot change this PIN.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Assigned counselling master</label>
                  <Select value={createMasterId} onValueChange={setCreateMasterId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select counselling" /></SelectTrigger>
                    <SelectContent>{masters.map((master) => <SelectItem key={master.id} value={master.id}>{master.title} • {master.collegeCount} colleges</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm leading-6 text-slate-700">The selected master order will become the student&apos;s initial preference list. They can then complete their profile, upload documents and arrange choices using the same login.</div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button className="bg-[#cc0000] hover:bg-[#a90000]" onClick={() => void createStudent()} disabled={creating || !createName.trim() || createPin.length !== 4 || !createMasterId}>{creating ? <Loader2 className="animate-spin" /> : <Plus />} Create Student</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={pinOpen} onOpenChange={(open) => { setPinOpen(open); if (!open) setNewPin(""); }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader><DialogTitle>Set student login PIN</DialogTitle><DialogDescription>Assign a new 4-digit PIN for {selectedStudent?.studentName || "the selected student"}. The old PIN cannot be viewed, and the student&apos;s current session will be signed out.</DialogDescription></DialogHeader>
              <div><label htmlFor="profile-student-pin" className="mb-1.5 block text-sm font-bold">New 4-digit PIN</label><Input id="profile-student-pin" type="password" inputMode="numeric" autoComplete="new-password" autoFocus maxLength={4} value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ""))} onKeyDown={(event) => { if (event.key === "Enter") void setStudentPin(); }} placeholder="••••" /></div>
              <DialogFooter><Button variant="outline" onClick={() => setPinOpen(false)}>Cancel</Button><Button onClick={() => void setStudentPin()} disabled={settingPin || newPin.length !== 4}>{settingPin ? <Loader2 className="animate-spin" /> : <KeyRound />} Save PIN</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={Boolean(reviewDocument)} onOpenChange={(open) => { if (!open) { setReviewDocument(null); setRejectionReason(""); } }}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Review uploaded document</DialogTitle><DialogDescription>{reviewDocument?.documentName} • Set the status the student will see.</DialogDescription></DialogHeader>
              <div className="space-y-4"><div><label className="mb-1.5 block text-sm font-bold">Review status</label><select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ProfileDocument["reviewStatus"])} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"><option value="uploaded">Uploaded — pending review</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="reupload_required">Re-upload required</option></select></div><div><label className="mb-1.5 block text-sm font-bold">Reason or instruction</label><Input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Required for rejected or re-upload status" /></div></div>
              <DialogFooter><Button variant="outline" onClick={() => setReviewDocument(null)}>Cancel</Button><Button onClick={() => void saveDocumentReview()} disabled={reviewing}>{reviewing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Save review</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteProfileOpen} onOpenChange={(open) => { setDeleteProfileOpen(open); if (!open) setDeletePassword(""); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Delete {selectedStudent?.studentName || "student profile"}?</DialogTitle><DialogDescription>This permanently deletes the private profile, preference choices, login, progress and every uploaded document. This cannot be undone.</DialogDescription></DialogHeader>
              {(Boolean(profile?.lockedAt) || Boolean(selectedStudent?.lockedAt)) && <div><label htmlFor="delete-profile-password" className="mb-1.5 block text-sm font-bold">Admin password required for locked profile</label><Input id="delete-profile-password" type="password" inputMode="numeric" maxLength={4} autoFocus value={deletePassword} onChange={(event) => setDeletePassword(event.target.value.replace(/\D/g, ""))} placeholder="••••" /></div>}
              <DialogFooter><Button variant="outline" onClick={() => setDeleteProfileOpen(false)}>Cancel</Button><Button variant="destructive" onClick={() => void deleteStudentProfile()} disabled={deletingProfile || ((Boolean(profile?.lockedAt) || Boolean(selectedStudent?.lockedAt)) && deletePassword.length !== 4)}>{deletingProfile ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete everything</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      <AlertDialog open={lockOpen} onOpenChange={setLockOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Lock this student profile?</AlertDialogTitle><AlertDialogDescription>Every required field and every subject mark must be complete. After a student locks the profile, only an administrator can edit it, add or remove documents, or unlock it.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => void changeLock(true)} disabled={changingLock}>{changingLock ? "Checking…" : "Save and lock profile"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
