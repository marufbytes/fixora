"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Loader2, Pencil, Plus, Sparkles, Tags, Trash2, X } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

export interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
  organizationName: string | null;
  complaintsCount: number;
}

export interface CategoryOrganizationOption {
  id: string;
  name: string;
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

export default function CategoryManager({
  categories,
  organizations,
}: {
  categories: CategoryItem[];
  organizations: CategoryOrganizationOption[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setOrganizationId(organizations[0]?.id ?? "");
    setError("");
    setModalOpen(true);
  }

  function openEdit(c: CategoryItem) {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setOrganizationId(c.organizationId ?? "");
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setModalOpen(false);
    setEditing(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(editing ? `/api/categories/${editing.id}` : "/api/categories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, organizationId: organizationId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save category");
        setLoading(false);
        return;
      }
      setLoading(false);
      setModalOpen(false);
      setEditing(null);
      router.refresh();
    } catch {
      setError("Network error while saving category");
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    setNotice("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedDefaults: true, organizationId: organizations[0]?.id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error || "Failed to seed categories");
      } else {
        setNotice(`${data.createdCount} added, ${data.skippedCount} already existed.`);
        router.refresh();
      }
    } catch {
      setNotice("Network error while seeding categories");
    }
    setSeeding(false);
  }

  async function handleDelete(c: CategoryItem) {
    const extra = c.complaintsCount > 0 ? ` ${c.complaintsCount} linked complaint(s) will become uncategorized.` : "";
    if (!window.confirm(`Delete category "${c.name}"?${extra}`)) return;
    setDeletingId(c.id);
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) window.alert(data.error || "Failed to delete category");
      else router.refresh();
    } catch {
      window.alert("Network error while deleting category");
    }
    setDeletingId(null);
  }

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Maintenance categories used to classify and route complaints."
        action={
          <>
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Seed Default Categories
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Add Category
            </button>
          </>
        }
      />

      {notice && (
        <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</p>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">All Categories</h2>
          <span className="text-xs text-slate-500">{categories.length} total</span>
        </div>

        {categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Add a category or seed the standard maintenance set with one click."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium">Organization</th>
                  <th className="px-4 py-2.5 font-medium">Complaints</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <span className="inline-flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Tags className="h-4 w-4" />
                        </span>
                        {c.name}
                      </span>
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-slate-600">
                      {c.description ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.organizationName ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          <Landmark className="h-3 w-3" /> {c.organizationName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Global</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                        {c.complaintsCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          title="Edit category"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          title="Delete category"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">{editing ? "Edit Category" : "Add Category"}</h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              {error && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <div className="space-y-1.5">
                <label htmlFor="c-name" className="block text-sm font-medium text-slate-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Plumbing" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="c-desc" className="block text-sm font-medium text-slate-700">Description</label>
                <input id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="c-org" className="block text-sm font-medium text-slate-700">Organization</label>
                <select id="c-org" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className={inputClass}>
                  <option value="">Global (no organization)</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} disabled={loading} className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
