"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileImage,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Play,
  Send,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Trash2,
  UploadCloud,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import {
  PriorityBadge,
  STATUS_LABELS,
  STATUS_ORDER,
  StatusBadge,
  formatDate,
  formatTicketId,
  type ComplaintPriority,
  type ComplaintStatus,
} from "@/components/ui/Badges";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export interface WorkspaceAttachment {
  id: string;
  url: string;
  fileName: string | null;
  type: "ISSUE" | "COMPLETION";
  createdAt: string;
  uploadedByName: string;
}

export interface WorkspaceComment {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
}

export interface WorkspaceStatusHistory {
  id: string;
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  note: string | null;
  createdAt: string;
  changedByName: string;
  changedByRole: Role;
}

export interface WorkspaceAIAnalysis {
  suggestedCategory: string | null;
  suggestedPriority: ComplaintPriority | null;
  issueSummary: string | null;
  assignedTeam: string | null;
  suggestedResponse: string | null;
  troubleshootingSteps: string[];
  isDuplicate: boolean;
  duplicateOfId: string | null;
}

export interface WorkspaceDuplicateSummary {
  id: string;
  title: string;
  status: ComplaintStatus;
  createdAt: string;
}

export interface WorkspaceComplaint {
  id: string;
  title: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  imageUrl: string | null;
  residentId: string;
  technicianId: string | null;
  categoryId: string | null;
  categoryName: string;
  buildingName: string;
  buildingAddress: string;
  unitNumber: string;
  unitFloor: string;
  resident: { id: string; name: string; email: string; phone: string | null };
  technician: { id: string; name: string; email: string; phone: string | null } | null;
  createdAt: string;
  updatedAt: string;
  aiAnalysis: WorkspaceAIAnalysis | null;
  attachments: WorkspaceAttachment[];
  comments: WorkspaceComment[];
  statusHistory: WorkspaceStatusHistory[];
}

export interface TechnicianOption {
  id: string;
  name: string;
  email: string;
  activeCount: number;
}

export interface CategoryOption {
  id: string;
  name: string;
}

const PRIORITIES: readonly ComplaintPriority[] = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ComplaintDetailWorkspace({
  complaint,
  duplicateComplaint,
  technicians,
  categories,
  viewer,
}: {
  complaint: WorkspaceComplaint;
  duplicateComplaint: WorkspaceDuplicateSummary | null;
  technicians: TechnicianOption[];
  categories: CategoryOption[];
  viewer: { id: string; name: string; role: Role };
}) {
  const router = useRouter();
  const completionFileRef = useRef<HTMLInputElement>(null);

  const isStaff = viewer.role === "MANAGER" || viewer.role === "OWNER";
  const isAssignedTech = viewer.role === "TECHNICIAN" && complaint.technicianId === viewer.id;
  const isOwningResident = viewer.role === "RESIDENT" && complaint.residentId === viewer.id;
  const canDelete = complaint.status === "PENDING" && (isStaff || isOwningResident);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<{ url: string; label: string } | null>(null);

  // Assign technician state (Manager / Owner)
  const [selectedTechId, setSelectedTechId] = useState(complaint.technicianId ?? (technicians[0]?.id ?? ""));
  const [assignNote, setAssignNote] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Override metadata state (Manager / Owner)
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [metaPriority, setMetaPriority] = useState<ComplaintPriority>(complaint.priority);
  const [metaCategoryId, setMetaCategoryId] = useState<string>(complaint.categoryId ?? "");
  const [metaStatus, setMetaStatus] = useState<ComplaintStatus>(complaint.status);
  const [metaNote, setMetaNote] = useState("");
  const [updatingMeta, setUpdatingMeta] = useState(false);

  // Technician work progress state
  const [techNote, setTechNote] = useState("");
  const [completionImageUrl, setCompletionImageUrl] = useState<string | null>(null);
  const [completionFileName, setCompletionFileName] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [updatingWork, setUpdatingWork] = useState(false);

  // Resident confirmation state
  const [confirmNote, setConfirmNote] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Delete & error state
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [commentError, setCommentError] = useState("");

  // Build Issue & Completion photo lists (including legacy complaint.imageUrl if not in attachments)
  const issuePhotos: WorkspaceAttachment[] = complaint.attachments.filter((a) => a.type === "ISSUE");
  if (complaint.imageUrl && !issuePhotos.some((a) => a.url === complaint.imageUrl)) {
    issuePhotos.unshift({
      id: "primary-issue-photo",
      url: complaint.imageUrl,
      fileName: "Issue Photo",
      type: "ISSUE",
      createdAt: complaint.createdAt,
      uploadedByName: complaint.resident.name,
    });
  }
  const completionPhotos: WorkspaceAttachment[] = complaint.attachments.filter(
    (a) => a.type === "COMPLETION",
  );

  const currentStep = STATUS_ORDER.indexOf(complaint.status);

  async function runWorkflowPatch(payload: Record<string, unknown>, setBusy: (v: boolean) => void) {
    setActionError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/complaints/${complaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to update complaint");
        setBusy(false);
        return false;
      }
      setBusy(false);
      router.refresh();
      return true;
    } catch {
      setActionError("Network error while updating ticket");
      setBusy(false);
      return false;
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTechId) {
      setActionError("Please select a technician");
      return;
    }
    const ok = await runWorkflowPatch(
      { action: "ASSIGN", technicianId: selectedTechId, note: assignNote },
      setAssigning,
    );
    if (ok) setAssignNote("");
  }

  async function handleUpdateMeta(e: React.FormEvent) {
    e.preventDefault();
    const ok = await runWorkflowPatch(
      {
        action: "UPDATE_META",
        priority: metaPriority,
        categoryId: metaCategoryId || null,
        status: metaStatus,
        note: metaNote,
      },
      setUpdatingMeta,
    );
    if (ok) {
      setMetaNote("");
      setOverrideOpen(false);
    }
  }

  async function handleStartWork() {
    await runWorkflowPatch({ action: "START_WORK" }, setUpdatingWork);
  }

  async function handleUploadProof(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionError("");
    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to upload completion photo");
      } else {
        setCompletionImageUrl(data.url);
        setCompletionFileName(data.fileName);
      }
    } catch {
      setActionError("Network error while uploading completion photo");
    } finally {
      setUploadingProof(false);
      if (completionFileRef.current) completionFileRef.current.value = "";
    }
  }

  async function handleCompleteWork(e: React.FormEvent) {
    e.preventDefault();
    const ok = await runWorkflowPatch(
      {
        action: "COMPLETE_WORK",
        note: techNote,
        completionImageUrl,
        completionFileName,
      },
      setUpdatingWork,
    );
    if (ok) {
      setTechNote("");
      setCompletionImageUrl(null);
      setCompletionFileName(null);
    }
  }

  async function handleConfirmResolution(e: React.FormEvent) {
    e.preventDefault();
    const ok = await runWorkflowPatch(
      { action: "CONFIRM_RESOLUTION", note: confirmNote },
      setConfirming,
    );
    if (ok) setConfirmNote("");
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentError("");
    setPostingComment(true);
    try {
      const res = await fetch(`/api/complaints/${complaint.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommentError(data.error || "Failed to post comment");
        setPostingComment(false);
        return;
      }
      setCommentText("");
      setPostingComment(false);
      router.refresh();
    } catch {
      setCommentError("Network error while posting comment");
      setPostingComment(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete pending complaint "${complaint.title}"? This action cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/complaints/${complaint.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || "Failed to delete complaint");
        setDeleting(false);
        return;
      }
      router.push("/dashboard/complaints");
      router.refresh();
    } catch {
      window.alert("Network error while deleting complaint");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/complaints"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Complaints
            </Link>
            <span className="font-mono text-xs font-semibold text-blue-600">
              {formatTicketId(complaint.id)}
            </span>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>
          <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">{complaint.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              {complaint.buildingName} · Unit {complaint.unitNumber} (Floor {complaint.unitFloor})
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
              <Tags className="h-3.5 w-3.5" />
              {complaint.categoryName}
            </span>
          </div>
        </div>

        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete Ticket
          </button>
        )}
      </header>

      {/* Progress Step Bar */}
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <ol className="grid grid-cols-5 gap-2">
          {STATUS_ORDER.map((step, index) => {
            const done = index <= currentStep;
            return (
              <li key={step} className="flex flex-col items-center text-center">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    done ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className={`mt-1.5 text-xs ${done ? "font-medium text-slate-900" : "text-slate-400"}`}>
                  {STATUS_LABELS[step]}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 2-Column Main Workspace */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left 2/3 Column */}
        <div className="space-y-5 lg:col-span-2">
          {/* 1. Conditional Duplicate Warning Banner */}
          {complaint.aiAnalysis?.isDuplicate && complaint.aiAnalysis.duplicateOfId && (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Potential Duplicate Complaint Detected by Fixora AI
                  </p>
                  <p className="mt-0.5 text-xs text-amber-800">
                    {duplicateComplaint
                      ? `Matches active ticket ${formatTicketId(duplicateComplaint.id)} ("${duplicateComplaint.title}") reported on ${formatDate(duplicateComplaint.createdAt)}.`
                      : `Matches existing ticket ${formatTicketId(complaint.aiAnalysis.duplicateOfId)} in the same building.`}
                  </p>
                </div>
              </div>
              <Link
                href={`/dashboard/complaints/${complaint.aiAnalysis.duplicateOfId}`}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                View Original ({formatTicketId(complaint.aiAnalysis.duplicateOfId)})
              </Link>
            </div>
          )}

          {/* 2. Issue Overview & Photos Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900">Issue Overview &amp; Resident Info</h2>
              <span className="text-xs text-slate-500">Submitted {formatDateTime(complaint.createdAt)}</span>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {complaint.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Reported by:</span>{" "}
                <strong className="font-medium text-slate-900">{complaint.resident.name}</strong>
              </div>
              <a
                href={`mailto:${complaint.resident.email}`}
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                <Mail className="h-3.5 w-3.5" /> {complaint.resident.email}
              </a>
              {complaint.resident.phone && (
                <span className="inline-flex items-center gap-1 text-slate-700">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {complaint.resident.phone}
                </span>
              )}
            </div>

            {/* Visual Photo Galleries */}
            {(issuePhotos.length > 0 || completionPhotos.length > 0) && (
              <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <FileImage className="h-3.5 w-3.5 text-blue-600" />
                    Issue Photos ({issuePhotos.length})
                  </h3>
                  {issuePhotos.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">No issue photos attached.</p>
                  ) : (
                    <div className="mt-2.5 flex flex-wrap gap-2.5">
                      {issuePhotos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              url: photo.url,
                              label: `${photo.fileName ?? "Issue Photo"} · Uploaded by ${photo.uploadedByName}`,
                            })
                          }
                          className="group relative h-24 w-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={photo.fileName ?? "Issue photo"}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Completion Proof Photos ({completionPhotos.length})
                  </h3>
                  {completionPhotos.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">No completion proof uploaded yet.</p>
                  ) : (
                    <div className="mt-2.5 flex flex-wrap gap-2.5">
                      {completionPhotos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              url: photo.url,
                              label: `${photo.fileName ?? "Completion Proof"} · Uploaded by ${photo.uploadedByName}`,
                            })
                          }
                          className="group relative h-24 w-28 overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={photo.fileName ?? "Completion photo"}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 3. AI Triage & Troubleshooting Card */}
          <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-950">
                <Sparkles className="h-4 w-4 text-blue-600" />
                AI Maintenance Triage &amp; Troubleshooting
              </h2>
              {complaint.aiAnalysis?.assignedTeam && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {complaint.aiAnalysis.assignedTeam}
                </span>
              )}
            </div>

            {!complaint.aiAnalysis ? (
              <p className="mt-2 text-xs text-slate-500">
                No AI triage analysis was recorded for this complaint.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-blue-100 bg-white p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Suggested Category
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {complaint.aiAnalysis.suggestedCategory ?? "General Maintenance"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-white p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Suggested Priority
                    </p>
                    <div className="mt-1">
                      {complaint.aiAnalysis.suggestedPriority ? (
                        <PriorityBadge priority={complaint.aiAnalysis.suggestedPriority} />
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-white p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Assigned Trade Team
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                      {complaint.aiAnalysis.assignedTeam ?? "General Maintenance Team"}
                    </p>
                  </div>
                </div>

                {complaint.aiAnalysis.issueSummary && (
                  <div className="rounded-lg border border-blue-100 bg-white p-3.5">
                    <p className="text-xs font-semibold text-slate-700">Executive Issue Summary</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {complaint.aiAnalysis.issueSummary}
                    </p>
                  </div>
                )}

                {complaint.aiAnalysis.troubleshootingSteps.length > 0 && (
                  <div className="rounded-lg border border-blue-100 bg-white p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <Wrench className="h-3.5 w-3.5 text-blue-600" />
                      Technician Troubleshooting Checklist
                    </p>
                    <ol className="mt-2.5 space-y-2">
                      {complaint.aiAnalysis.troubleshootingSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">
                            {idx + 1}
                          </span>
                          <span className="pt-0.5 leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {complaint.aiAnalysis.suggestedResponse && (
                  <div className="rounded-lg border border-blue-100 bg-white/80 p-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Suggested Resident Response: </span>
                    {complaint.aiAnalysis.suggestedResponse}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 4. Comments & Discussion Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                Comments &amp; Discussion ({complaint.comments.length})
              </h2>
            </div>

            {complaint.comments.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500">
                No comments yet. Start a conversation with the resident, technician, or manager below.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {complaint.comments.map((c) => {
                  const isSelf = c.authorId === viewer.id;
                  return (
                    <li
                      key={c.id}
                      className={`rounded-lg border p-3.5 ${
                        isSelf ? "border-blue-100 bg-blue-50/40" : "border-slate-200 bg-slate-50/60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">{c.authorName}</span>
                          <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                            {ROLE_LABELS[c.authorRole]}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{formatDateTime(c.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{c.content}</p>
                    </li>
                  );
                })}
              </ul>
            )}

            <form onSubmit={handlePostComment} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {commentError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
                  {commentError}
                </p>
              )}
              <textarea
                rows={2}
                required
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment or update for this ticket..."
                aria-label="Comment content"
                className={`${inputClass} py-2`}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={postingComment || !commentText.trim()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {postingComment ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Post Comment
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right 1/3 Column */}
        <aside className="space-y-5">
          {actionError && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {actionError}
            </p>
          )}

          {/* 1A. Manager / Owner Action Card */}
          {isStaff && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UserCheck className="h-4 w-4 text-blue-600" />
                Assign / Dispatch Technician
              </h2>

              <form onSubmit={handleAssign} className="mt-3 space-y-3">
                <div className="space-y-1">
                  <label htmlFor="assign-tech" className="block text-xs font-medium text-slate-700">
                    Technician
                  </label>
                  <select
                    id="assign-tech"
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    className={`${inputClass} h-9 text-xs`}
                  >
                    <option value="">Select technician...</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.activeCount} active {t.activeCount === 1 ? "job" : "jobs"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="assign-note" className="block text-xs font-medium text-slate-700">
                    Dispatch Note <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="assign-note"
                    type="text"
                    value={assignNote}
                    onChange={(e) => setAssignNote(e.target.value)}
                    placeholder="Instructions for technician..."
                    className={`${inputClass} h-9 text-xs`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={assigning || !selectedTechId}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {assigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {complaint.technicianId ? "Reassign Technician" : "Assign Technician"}
                </button>
              </form>

              {/* Collapsible Override Meta Controls */}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setOverrideOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                    Override Priority / Category / Status
                  </span>
                  {overrideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {overrideOpen && (
                  <form onSubmit={handleUpdateMeta} className="mt-3 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="meta-priority" className="block text-[11px] font-medium text-slate-600">
                          Priority
                        </label>
                        <select
                          id="meta-priority"
                          value={metaPriority}
                          onChange={(e) => setMetaPriority(e.target.value as ComplaintPriority)}
                          className={`${inputClass} mt-1 h-8 text-xs`}
                        >
                          {PRIORITIES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="meta-status" className="block text-[11px] font-medium text-slate-600">
                          Status
                        </label>
                        <select
                          id="meta-status"
                          value={metaStatus}
                          onChange={(e) => setMetaStatus(e.target.value as ComplaintStatus)}
                          className={`${inputClass} mt-1 h-8 text-xs`}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="meta-cat" className="block text-[11px] font-medium text-slate-600">
                        Category
                      </label>
                      <select
                        id="meta-cat"
                        value={metaCategoryId}
                        onChange={(e) => setMetaCategoryId(e.target.value)}
                        className={`${inputClass} mt-1 h-8 text-xs`}
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={metaNote}
                        onChange={(e) => setMetaNote(e.target.value)}
                        placeholder="Audit note (optional)"
                        aria-label="Override audit note"
                        className={`${inputClass} h-8 text-xs`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updatingMeta}
                      className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {updatingMeta && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Save Overrides
                    </button>
                  </form>
                )}
              </div>
            </section>
          )}

          {/* 1B. Technician Progress Action Card */}
          {(isAssignedTech || (isStaff && (complaint.status === "ASSIGNED" || complaint.status === "IN_PROGRESS"))) && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Wrench className="h-4 w-4 text-blue-600" />
                Technician Job Actions
              </h2>

              {complaint.status === "ASSIGNED" && (
                <div className="mt-3 space-y-2.5">
                  <p className="text-xs text-slate-600">
                    Ready to begin inspection and repair on this ticket?
                  </p>
                  <button
                    type="button"
                    onClick={handleStartWork}
                    disabled={updatingWork}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {updatingWork ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start Work
                  </button>
                </div>
              )}

              {complaint.status === "IN_PROGRESS" && (
                <form onSubmit={handleCompleteWork} className="mt-3 space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="complete-note" className="block text-xs font-medium text-slate-700">
                      Resolution Summary
                    </label>
                    <textarea
                      id="complete-note"
                      rows={2}
                      value={techNote}
                      onChange={(e) => setTechNote(e.target.value)}
                      placeholder="Describe the repair work completed..."
                      className={`${inputClass} py-1.5 text-xs`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs font-medium text-slate-700">
                      Completion Proof Photo <span className="text-slate-400">(optional)</span>
                    </span>
                    {completionImageUrl ? (
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={completionImageUrl}
                            alt="Completion preview"
                            className="h-10 w-10 rounded object-cover"
                          />
                          <span className="truncate text-xs font-medium text-emerald-900">
                            {completionFileName ?? "Proof photo"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCompletionImageUrl(null);
                            setCompletionFileName(null);
                          }}
                          className="rounded p-1 text-slate-500 hover:bg-white hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600">
                        {uploadingProof ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-4 w-4 text-slate-400" />
                            Upload Completion Photo
                          </>
                        )}
                        <input
                          ref={completionFileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingProof || updatingWork}
                          onChange={handleUploadProof}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={updatingWork || uploadingProof}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {updatingWork ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Mark Completed
                  </button>
                </form>
              )}

              {complaint.status !== "ASSIGNED" && complaint.status !== "IN_PROGRESS" && (
                <p className="mt-2 text-xs text-slate-500">
                  This ticket is currently <strong>{STATUS_LABELS[complaint.status]}</strong>.
                </p>
              )}
            </section>
          )}

          {/* 1C. Resident Confirmation / Status Summary Card */}
          {viewer.role === "RESIDENT" && (
            <section
              className={`rounded-xl border p-5 shadow-sm ${
                complaint.status === "COMPLETED"
                  ? "border-emerald-300 bg-emerald-50/70"
                  : "border-slate-200 bg-white"
              }`}
            >
              {complaint.status === "COMPLETED" ? (
                <form onSubmit={handleConfirmResolution} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Confirm Issue Resolved
                  </div>
                  <p className="text-xs text-emerald-800">
                    The technician marked this repair as completed. Please confirm if the issue is resolved to your satisfaction.
                  </p>
                  <input
                    type="text"
                    value={confirmNote}
                    onChange={(e) => setConfirmNote(e.target.value)}
                    placeholder="Optional feedback note..."
                    aria-label="Confirmation note"
                    className={`${inputClass} h-9 text-xs`}
                  />
                  <button
                    type="submit"
                    disabled={confirming}
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {confirming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirm Issue Resolved
                  </button>
                </form>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-slate-900">Your Request Status</h2>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {complaint.status === "PENDING" &&
                      "Your request is in the queue and awaiting technician assignment by the building manager."}
                    {complaint.status === "ASSIGNED" &&
                      `${complaint.technician?.name ?? "A technician"} has been assigned and will begin work shortly.`}
                    {complaint.status === "IN_PROGRESS" &&
                      `${complaint.technician?.name ?? "Your assigned technician"} is actively working on this issue.`}
                    {complaint.status === "CONFIRMED" &&
                      "You have confirmed that this maintenance request is resolved."}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* 2. Assigned Technician & Metadata Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Assigned Technician &amp; Metadata</h2>
            <dl className="mt-3 space-y-2.5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Technician</dt>
                <dd className="text-right font-medium text-slate-900">
                  {complaint.technician ? complaint.technician.name : "Unassigned"}
                </dd>
              </div>
              {complaint.technician && (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Tech Email</dt>
                    <dd className="truncate text-right text-slate-700">{complaint.technician.email}</dd>
                  </div>
                  {complaint.technician.phone && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Tech Phone</dt>
                      <dd className="text-right text-slate-700">{complaint.technician.phone}</dd>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between gap-3 border-t border-slate-100 pt-2">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-right text-slate-700">{formatDateTime(complaint.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Last Updated</dt>
                <dd className="text-right text-slate-700">{formatDateTime(complaint.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          {/* 3. Status History Timeline Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Clock className="h-4 w-4 text-slate-400" />
              Status History Timeline
            </h2>

            {complaint.statusHistory.length === 0 ? (
              <p className="mt-3 text-xs text-slate-400">No status history recorded yet.</p>
            ) : (
              <ol className="relative mt-4 space-y-4 border-l-2 border-slate-200 pl-4">
                {complaint.statusHistory.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#2563EB] ring-4 ring-white" />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={h.toStatus} />
                      <span className="text-[11px] text-slate-400">{formatDateTime(h.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-800">
                      {h.changedByName}{" "}
                      <span className="font-normal text-slate-500">({ROLE_LABELS[h.changedByRole]})</span>
                    </p>
                    {h.note && <p className="mt-0.5 text-xs text-slate-600">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      {/* Photo Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="truncate text-xs font-medium text-slate-700">{lightboxImage.label}</p>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                aria-label="Close preview"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-center bg-slate-950 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage.url}
                alt={lightboxImage.label}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
