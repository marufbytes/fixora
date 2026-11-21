"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  DoorOpen,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";

export interface UnitItem {
  id: string;
  floor: string;
  unitNumber: string;
  residentsCount: number;
  complaintsCount: number;
}

export interface BuildingSummary {
  id: string;
  name: string;
  address: string;
  totalFloors: number;
  organizationName: string | null;
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

export default function UnitManager({
  building,
  units,
}: {
  building: BuildingSummary;
  units: UnitItem[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [editing, setEditing] = useState<UnitItem | null>(null);
  const [floor, setFloor] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [bulkUnits, setBulkUnits] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const totalResidents = units.reduce((sum, u) => sum + u.residentsCount, 0);
  const totalComplaints = units.reduce((sum, u) => sum + u.complaintsCount, 0);

  function openCreate(initialMode: "single" | "bulk" = "single") {
    setEditing(null);
    setMode(initialMode);
    setFloor("1");
    setUnitNumber("");
    setBulkUnits("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(u: UnitItem) {
    setEditing(u);
    setMode("single");
    setFloor(u.floor);
    setUnitNumber(u.unitNumber);
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
      if (editing) {
        const res = await fetch(`/api/units/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ floor, unitNumber }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to update unit");
          setLoading(false);
          return;
        }
      } else {
        const payload =
          mode === "single"
            ? { floor, unitNumber }
            : { floor, unitNumbers: bulkUnits };

        const res = await fetch(`/api/buildings/${building.id}/units`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to add unit(s)");
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      setModalOpen(false);
      setEditing(null);
      router.refresh();
    } catch {
      setError("Network error while saving unit(s)");
      setLoading(false);
    }
  }

  async function handleDelete(u: UnitItem) {
    if (!window.confirm(`Delete unit "${u.unitNumber}" on floor ${u.floor}?`)) {
      return;
    }

    setDeletingId(u.id);
    try {
      const res = await fetch(`/api/units/${u.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        window.alert(data.error || "Failed to delete unit");
        setDeletingId(null);
        return;
      }

      setDeletingId(null);
      router.refresh();
    } catch {
      window.alert("Network error while deleting unit");
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title={building.name}
        subtitle={`${building.address}${building.organizationName ? ` · ${building.organizationName}` : ""}`}
        action={
          <>
            <Link
              href="/dashboard/buildings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Buildings
            </Link>
            <button
              type="button"
              onClick={() => openCreate("single")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Add Unit
            </button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="Total Floors" value={building.totalFloors} icon={Layers} />
        <StatCard
          label="Total Units"
          value={units.length}
          icon={DoorOpen}
          tone="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Assigned Residents"
          value={totalResidents}
          icon={Users}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Total Complaints"
          value={totalComplaints}
          icon={ClipboardList}
          tone="bg-amber-50 text-amber-600"
        />
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Floors &amp; Units</h2>
          <button
            type="button"
            onClick={() => openCreate("bulk")}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            + Bulk add units for a floor
          </button>
        </div>

        {units.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No units configured yet"
            description="Click '+ Add Unit' to create a single unit or bulk-add an entire floor at once."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Floor</th>
                  <th className="px-4 py-2.5 font-medium">Unit Number</th>
                  <th className="px-4 py-2.5 font-medium">Assigned Residents</th>
                  <th className="px-4 py-2.5 font-medium">Complaints</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-700">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        Floor {u.floor}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{u.unitNumber}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {u.residentsCount} {u.residentsCount === 1 ? "resident" : "residents"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {u.complaintsCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          title="Edit unit"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          disabled={deletingId === u.id}
                          title="Delete unit"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === u.id ? (
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
                {editing ? `Edit Unit ${editing.unitNumber}` : "Add Unit"}
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
              {!editing && (
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setMode("single")}
                    className={`rounded-md py-1.5 transition-colors ${
                      mode === "single" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Single Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("bulk")}
                    className={`rounded-md py-1.5 transition-colors ${
                      mode === "bulk" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Bulk Add
                  </button>
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="space-y-1.5">
                <label htmlFor="u-floor" className="block text-sm font-medium text-slate-700">
                  Floor <span className="text-red-500">*</span>
                </label>
                <input
                  id="u-floor"
                  type="text"
                  required
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="e.g. 3 or G"
                  className={inputClass}
                />
              </div>

              {mode === "single" || editing ? (
                <div className="space-y-1.5">
                  <label htmlFor="u-number" className="block text-sm font-medium text-slate-700">
                    Unit Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="u-number"
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="e.g. 3A or 301"
                    className={inputClass}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label htmlFor="u-bulk" className="block text-sm font-medium text-slate-700">
                    Unit Numbers (comma-separated) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="u-bulk"
                    type="text"
                    required
                    value={bulkUnits}
                    onChange={(e) => setBulkUnits(e.target.value)}
                    placeholder="e.g. 3A, 3B, 3C, 3D"
                    className={inputClass}
                  />
                  <p className="text-xs text-slate-500">
                    All listed units will be created on Floor {floor || "—"}. Duplicate unit numbers are prevented.
                  </p>
                </div>
              )}

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
                  {editing ? "Save Changes" : mode === "single" ? "Add Unit" : "Create Units"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
