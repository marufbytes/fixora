"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import type { UserListItem } from "@/lib/user-queries";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export interface BuildingUnitOption {
  id: string;
  name: string;
  units: { id: string; unitNumber: string; floor: string }[];
}

export interface UserOrganizationOption {
  id: string;
  name: string;
}

const ROLE_TABS: ("ALL" | Role)[] = ["ALL", "RESIDENT", "TECHNICIAN", "MANAGER", "OWNER"];

const ROLE_STYLES: Record<Role, string> = {
  RESIDENT: "bg-blue-50 text-blue-700",
  TECHNICIAN: "bg-amber-50 text-amber-700",
  MANAGER: "bg-violet-50 text-violet-700",
  OWNER: "bg-emerald-50 text-emerald-700",
};

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

export default function UserManager({
  users,
  buildings,
  organizations,
  currentUserId,
  currentRole,
}: {
  users: UserListItem[];
  buildings: BuildingUnitOption[];
  organizations: UserOrganizationOption[];
  currentUserId: string;
  currentRole: Role;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"ALL" | Role>("ALL");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "RESIDENT" as Role,
    organizationId: "",
    buildingId: "",
    unitId: "",
  });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const assignableRoles = (["RESIDENT", "TECHNICIAN", "MANAGER", "OWNER"] as Role[]).filter(
    (r) => currentRole === "OWNER" || r !== "OWNER",
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (tab === "ALL" || u.role === tab) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
  }, [users, tab, query]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: users.length };
    for (const u of users) map[u.role] = (map[u.role] ?? 0) + 1;
    return map;
  }, [users]);

  const unitsForBuilding = buildings.find((b) => b.id === form.buildingId)?.units ?? [];

  function canManage(u: UserListItem) {
    return currentRole === "OWNER" || u.role !== "OWNER";
  }
  function canDelete(u: UserListItem) {
    if (u.id === currentUserId) return false;
    return currentRole === "OWNER" || u.role === "RESIDENT" || u.role === "TECHNICIAN";
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", phone: "", role: "RESIDENT", organizationId: organizations[0]?.id ?? "", buildingId: "", unitId: "" });
    setError("");
    setModalOpen(true);
  }

  function openEdit(u: UserListItem) {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      phone: u.phone ?? "",
      role: u.role,
      organizationId: u.organizationId ?? "",
      buildingId: u.buildingId ?? "",
      unitId: u.unitId ?? "",
    });
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

    const unitId = form.role === "RESIDENT" ? form.unitId || null : null;
    const payload = editing
      ? { name: form.name, phone: form.phone, role: form.role, organizationId: form.organizationId || null, unitId }
      : {
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          role: form.role,
          organizationId: form.organizationId || null,
          unitId,
        };

    try {
      const res = await fetch(editing ? `/api/users/${editing.id}` : "/api/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save user");
        setLoading(false);
        return;
      }
      setLoading(false);
      setModalOpen(false);
      setEditing(null);
      router.refresh();
    } catch {
      setError("Network error while saving user");
      setLoading(false);
    }
  }

  async function handleDelete(u: UserListItem) {
    if (!window.confirm(`Delete user "${u.name}" (${u.email})? This cannot be undone.`)) return;
    setDeletingId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) window.alert(data.error || "Failed to delete user");
      else router.refresh();
    } catch {
      window.alert("Network error while deleting user");
    }
    setDeletingId(null);
  }

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Residents, technicians, managers and owners in your organization."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
        }
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {ROLE_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t ? "bg-[#2563EB] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t === "ALL" ? "All" : ROLE_LABELS[t]} <span className="opacity-70">({counts[t] ?? 0})</span>
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              aria-label="Search users"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Try another role tab or search term, or add a new user." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name &amp; Email</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Phone</th>
                  <th className="px-4 py-2.5 font-medium">Unit / Workload</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {u.name} {u.id === currentUserId && <span className="text-xs font-normal text-slate-400">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.phone ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.role === "RESIDENT" ? (
                        u.unitNumber ? (
                          <span>
                            {u.buildingName} <span className="text-slate-400">· Unit {u.unitNumber}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No unit assigned</span>
                        )
                      ) : u.role === "TECHNICIAN" ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            u.activeAssignedCount > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {u.activeAssignedCount} active {u.activeAssignedCount === 1 ? "task" : "tasks"}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {canManage(u) && (
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            title="Edit user"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete(u) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            disabled={deletingId === u.id}
                            title="Delete user"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            {deletingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">{editing ? "Edit User" : "Add User"}</h3>
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="u-name" className="block text-sm font-medium text-slate-700">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input id="u-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="u-phone" className="block text-sm font-medium text-slate-700">Phone</label>
                  <input id="u-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" className={inputClass} />
                </div>
              </div>

              {!editing && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="u-email" className="block text-sm font-medium text-slate-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input id="u-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="u-pass" className="block text-sm font-medium text-slate-700">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input id="u-pass" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" className={inputClass} />
                  </div>
                </div>
              )}
              {editing && <p className="text-xs text-slate-500">Email: {editing.email} (cannot be changed here)</p>}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="u-role" className="block text-sm font-medium text-slate-700">Role</label>
                  <select
                    id="u-role"
                    value={form.role}
                    disabled={editing?.id === currentUserId}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className={inputClass}
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="u-org" className="block text-sm font-medium text-slate-700">Organization</label>
                  <select id="u-org" value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })} className={inputClass}>
                    <option value="">None</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {form.role === "RESIDENT" && (
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="u-building" className="block text-sm font-medium text-slate-700">Building</label>
                    <select
                      id="u-building"
                      value={form.buildingId}
                      onChange={(e) => setForm({ ...form, buildingId: e.target.value, unitId: "" })}
                      className={inputClass}
                    >
                      <option value="">Select building</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="u-unit" className="block text-sm font-medium text-slate-700">Unit</label>
                    <select
                      id="u-unit"
                      value={form.unitId}
                      disabled={!form.buildingId}
                      onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">{form.buildingId ? "Select unit" : "Choose building first"}</option>
                      {unitsForBuilding.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.unitNumber} (Floor {u.floor})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} disabled={loading} className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
