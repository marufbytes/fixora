"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ClipboardList,
  DoorOpen,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";

export interface BuildingOrganizationOption {
  id: string;
  name: string;
}

export interface BuildingItem {
  id: string;
  name: string;
  address: string;
  totalFloors: number;
  organizationId: string | null;
  organizationName: string | null;
  unitsCount: number;
  openComplaintsCount: number;
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

export default function BuildingManager({
  buildings,
  organizations,
}: {
  buildings: BuildingItem[];
  organizations: BuildingOrganizationOption[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BuildingItem | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [totalFloors, setTotalFloors] = useState("1");
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const totalUnits = buildings.reduce((sum, b) => sum + b.unitsCount, 0);
  const totalOpenComplaints = buildings.reduce((sum, b) => sum + b.openComplaintsCount, 0);

  function openCreate() {
    setEditing(null);
    setName("");
    setAddress("");
    setTotalFloors("1");
    setOrganizationId(organizations[0]?.id ?? "");
    setError("");
    setModalOpen(true);
  }

  function openEdit(b: BuildingItem) {
    setEditing(b);
    setName(b.name);
    setAddress(b.address);
    setTotalFloors(String(b.totalFloors));
    setOrganizationId(b.organizationId ?? "");
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
      const url = editing ? `/api/buildings/${editing.id}` : "/api/buildings";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          totalFloors: Number(totalFloors) || 1,
          organizationId: organizationId || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save building");
        setLoading(false);
        return;
      }

      setLoading(false);
      setModalOpen(false);
      setEditing(null);
      router.refresh();
    } catch {
      setError("Network error while saving building");
      setLoading(false);
    }
  }

  async function handleDelete(b: BuildingItem) {
    if (!window.confirm(`Delete building "${b.name}" and its units?`)) {
      return;
    }

    setDeletingId(b.id);
    try {
      const res = await fetch(`/api/buildings/${b.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        window.alert(data.error || "Failed to delete building");
        setDeletingId(null);
        return;
      }

      setDeletingId(null);
      router.refresh();
    } catch {
      window.alert("Network error while deleting building");
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Buildings"
        subtitle="Manage properties, floors, and units across your organization."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Building
          </button>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Buildings" value={buildings.length} hint="Managed properties" icon={Building2} />
        <StatCard
          label="Total Units"
          value={totalUnits}
          hint="Across all buildings"
          icon={DoorOpen}
          tone="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Open Complaints"
          value={totalOpenComplaints}
          hint="Active maintenance tickets"
          icon={ClipboardList}
          tone="bg-amber-50 text-amber-600"
        />
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Property Directory</h2>
          <span className="text-xs text-slate-500">{buildings.length} total</span>
        </div>

        {buildings.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No buildings yet"
            description="Add your first building to configure floors and units."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Building</th>
                  <th className="px-4 py-2.5 font-medium">Organization</th>
                  <th className="px-4 py-2.5 font-medium">Address</th>
                  <th className="px-4 py-2.5 font-medium">Floors</th>
                  <th className="px-4 py-2.5 font-medium">Units</th>
                  <th className="px-4 py-2.5 font-medium">Open Complaints</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buildings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/buildings/${b.id}`}
                        className="inline-flex items-center gap-2.5 text-blue-600 hover:underline"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span>{b.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {b.organizationName ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {b.organizationName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{b.address}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        {b.totalFloors}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/buildings/${b.id}`}
                        className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
                      >
                        {b.unitsCount} {b.unitsCount === 1 ? "unit" : "units"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          b.openComplaintsCount > 0
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {b.openComplaintsCount} open
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(b)}
                          title="Edit building"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b)}
                          disabled={deletingId === b.id}
                          title="Delete building"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === b.id ? (
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
                {editing ? "Edit Building" : "Add Building"}
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
                <label htmlFor="b-name" className="block text-sm font-medium text-slate-700">
                  Building Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="b-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Skyline Tower A"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="b-address" className="block text-sm font-medium text-slate-700">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="b-address"
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Plot 45, Road 11, Banani"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="b-floors" className="block text-sm font-medium text-slate-700">
                    Total Floors <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="b-floors"
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={totalFloors}
                    onChange={(e) => setTotalFloors(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="b-org" className="block text-sm font-medium text-slate-700">
                    Organization
                  </label>
                  <select
                    id="b-org"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">No organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                  {editing ? "Save Changes" : "Create Building"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
