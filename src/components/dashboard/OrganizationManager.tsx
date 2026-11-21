"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Landmark, Loader2, MapPin, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";

export interface OrganizationItem {
  id: string;
  name: string;
  address: string | null;
  createdAt: string;
  _count: {
    buildings: number;
    members: number;
  };
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

export default function OrganizationManager({ organizations }: { organizations: OrganizationItem[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationItem | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const totalBuildings = organizations.reduce((sum, o) => sum + o._count.buildings, 0);
  const totalMembers = organizations.reduce((sum, o) => sum + o._count.members, 0);

  function openCreate() {
    setEditing(null);
    setName("");
    setAddress("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(org: OrganizationItem) {
    setEditing(org);
    setName(org.name);
    setAddress(org.address ?? "");
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
      const url = editing ? `/api/organizations/${editing.id}` : "/api/organizations";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save organization");
        setLoading(false);
        return;
      }

      setLoading(false);
      setModalOpen(false);
      setEditing(null);
      router.refresh();
    } catch {
      setError("Network error while saving organization");
      setLoading(false);
    }
  }

  async function handleDelete(org: OrganizationItem) {
    if (!window.confirm(`Delete organization "${org.name}"? Buildings linked to it will be unlinked.`)) {
      return;
    }

    setDeletingId(org.id);
    setError("");

    try {
      const res = await fetch(`/api/organizations/${org.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        window.alert(data.error || "Failed to delete organization");
        setDeletingId(null);
        return;
      }

      setDeletingId(null);
      router.refresh();
    } catch {
      window.alert("Network error while deleting organization");
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Organizations"
        subtitle="Manage your organization and its multi-branch properties."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> New Organization
          </button>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Organizations" value={organizations.length} hint="Active branches" icon={Landmark} />
        <StatCard
          label="Buildings"
          value={totalBuildings}
          hint="Properties across organizations"
          icon={Building2}
          tone="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Members"
          value={totalMembers}
          hint="Managers, technicians & residents"
          icon={Users}
          tone="bg-emerald-50 text-emerald-600"
        />
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">All Organizations</h2>
          <span className="text-xs text-slate-500">{organizations.length} total</span>
        </div>

        {organizations.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No organizations yet"
            description="Create your first organization or branch to group buildings, categories, and staff."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Organization</th>
                  <th className="px-4 py-2.5 font-medium">Address</th>
                  <th className="px-4 py-2.5 font-medium">Buildings</th>
                  <th className="px-4 py-2.5 font-medium">Members</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Landmark className="h-4 w-4" />
                        </span>
                        <span>{org.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {org.address ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {org.address}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                        {org._count.buildings} {org._count.buildings === 1 ? "building" : "buildings"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {org._count.members} {org._count.members === 1 ? "member" : "members"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(org)}
                          title="Edit organization"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(org)}
                          disabled={deletingId === org.id}
                          title="Delete organization"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === org.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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
              <h3 className="text-base font-semibold text-slate-900">
                {editing ? "Edit Organization" : "New Organization"}
              </h3>
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
                <label htmlFor="org-name" className="block text-sm font-medium text-slate-700">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="org-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fixora Properties — North Branch"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="org-address" className="block text-sm font-medium text-slate-700">
                  Address <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="org-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 120 Gulshan Avenue, Dhaka"
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Save Changes" : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
