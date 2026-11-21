"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  GitCompare,
  Loader2,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  Wrench,
  X,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

export interface ComplaintBuildingOption {
  id: string;
  name: string;
  units: { id: string; unitNumber: string; floor: string }[];
}

export interface ComplaintCategoryOption {
  id: string;
  name: string;
}

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

export default function NewComplaintForm({
  buildings,
  categories,
  defaultBuildingId,
  defaultUnitId,
}: {
  buildings: ComplaintBuildingOption[];
  categories: ComplaintCategoryOption[];
  defaultBuildingId: string;
  defaultUnitId: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [buildingId, setBuildingId] = useState(defaultBuildingId || (buildings[0]?.id ?? ""));
  const [unitId, setUnitId] = useState(defaultUnitId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("AUTO");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const availableUnits = buildings.find((b) => b.id === buildingId)?.units ?? [];

  function handleBuildingChange(nextBuildingId: string) {
    setBuildingId(nextBuildingId);
    const firstUnit = buildings.find((b) => b.id === nextBuildingId)?.units[0]?.id ?? "";
    setUnitId(firstUnit);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to upload image");
        setUploading(false);
        return;
      }

      setImageUrl(data.url);
      setFileName(data.fileName);
    } catch {
      setError("Network error while uploading image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage() {
    setImageUrl(null);
    setFileName(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!unitId) {
      setError("Please select a building and unit.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          unitId,
          categoryId: categoryId === "AUTO" ? null : categoryId,
          imageUrl,
          fileName,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data?.complaint?.id) {
        setError(data.error || "Failed to submit complaint");
        setSubmitting(false);
        return;
      }

      router.push(`/dashboard/complaints/${data.complaint.id}`);
      router.refresh();
    } catch {
      setError("Network error while submitting complaint");
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Submit Maintenance Complaint"
        subtitle="Describe the issue in English or Bangla — Fixora AI will triage priority, category, and duplicates automatically."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
        >
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="c-building" className="block text-sm font-medium text-slate-700">
                Building <span className="text-red-500">*</span>
              </label>
              <select
                id="c-building"
                required
                value={buildingId}
                onChange={(e) => handleBuildingChange(e.target.value)}
                className={`${fieldClass} h-10`}
              >
                <option value="">Select building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="c-unit" className="block text-sm font-medium text-slate-700">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                id="c-unit"
                required
                disabled={!buildingId}
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className={`${fieldClass} h-10 disabled:bg-slate-50`}
              >
                <option value="">{buildingId ? "Select unit" : "Choose building first"}</option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.unitNumber} (Floor {u.floor})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="c-title" className="block text-sm font-medium text-slate-700">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                id="c-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Water leaking from bathroom pipe / বাথরুমের পাইপ থেকে পানি পড়ছে"
                className={`${fieldClass} h-10`}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="c-category" className="block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                id="c-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`${fieldClass} h-10`}
              >
                <option value="AUTO">✨ Auto-detect with AI</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="c-desc" className="block text-sm font-medium text-slate-700">
              Detailed Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="c-desc"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, where the issue is located, and how urgent it is (English or বাংলা supported)..."
              className={`${fieldClass} py-2`}
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-700">
              Issue Photo <span className="text-xs font-normal text-slate-400">(optional · JPG, PNG, WEBP up to 5MB)</span>
            </span>

            {imageUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Uploaded issue preview"
                    className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{fileName ?? "Uploaded photo"}</p>
                    <p className="text-xs text-emerald-600">Attached to ticket</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition-colors hover:border-blue-500 hover:bg-blue-50/40">
                {uploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Uploading photo...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-6 w-6 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Click to upload a photo</span>
                    <span className="text-xs text-slate-500">Helps technicians diagnose the problem faster</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading || submitting}
                  onChange={handleFileSelect}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <Link
              href="/dashboard/complaints"
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Submit Complaint
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Sparkles className="h-4 w-4 text-blue-600" />
              What happens after you submit?
            </div>
            <ul className="mt-3.5 space-y-3 text-xs text-slate-700">
              <li className="flex items-start gap-2.5">
                <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span>
                  <strong className="font-semibold text-slate-900">Auto-Categorization:</strong> Fixora AI reads your English or Bangla description and routes it to the right trade team.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span>
                  <strong className="font-semibold text-slate-900">Priority Detection:</strong> Emergency hazards (gas leak, pipe burst, electrical short, stuck lift) are escalated immediately.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <GitCompare className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span>
                  <strong className="font-semibold text-slate-900">Duplicate Check:</strong> Compares against active tickets in the same building from the last 7 days.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span>
                  <strong className="font-semibold text-slate-900">Instant Manager Alert:</strong> Building managers are notified and receive AI troubleshooting steps for the technician.
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
