"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardList, Eye, Plus, Search } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import {
  PriorityBadge,
  StatusBadge,
  STATUS_LABELS,
  STATUS_ORDER,
  formatDate,
  formatTicketId,
  type ComplaintPriority,
  type ComplaintStatus,
} from "@/components/ui/Badges";
import type { Role } from "@/lib/roles";

export interface ComplaintListItem {
  id: string;
  title: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  createdAt: string;
  buildingName: string;
  unitNumber: string;
  categoryId: string | null;
  categoryName: string;
  technicianName: string | null;
  isDuplicate: boolean;
  commentsCount: number;
}

export interface CategoryFilterOption {
  id: string;
  name: string;
}

const ROLE_COPY: Record<Role, { title: string; subtitle: string; empty: string }> = {
  RESIDENT: {
    title: "My Maintenance Requests",
    subtitle: "Track the maintenance complaints you have submitted.",
    empty: "You haven't submitted any maintenance requests yet.",
  },
  TECHNICIAN: {
    title: "My Assigned Tasks",
    subtitle: "Maintenance tasks assigned to you for inspection and repair.",
    empty: "No maintenance tasks have been assigned to you yet.",
  },
  MANAGER: {
    title: "Maintenance Queue",
    subtitle: "Review, prioritize, and assign incoming resident complaints.",
    empty: "No complaints match the current filters.",
  },
  OWNER: {
    title: "Maintenance Queue",
    subtitle: "Monitor and manage maintenance complaints across your properties.",
    empty: "No complaints match the current filters.",
  },
};

const PRIORITIES: readonly ComplaintPriority[] = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"];

export default function ComplaintList({
  complaints,
  categories,
  role,
  canCreate,
}: {
  complaints: ComplaintListItem[];
  categories: CategoryFilterOption[];
  role: Role;
  canCreate: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const copy = ROLE_COPY[role];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && c.priority !== priorityFilter) return false;
      if (categoryFilter !== "ALL" && c.categoryId !== categoryFilter) return false;
      if (q) {
        const hay = `${c.title} ${c.description} ${c.buildingName} ${c.unitNumber} ${c.categoryName} ${formatTicketId(c.id)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [complaints, search, statusFilter, priorityFilter, categoryFilter]);

  return (
    <>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        action={
          canCreate ? (
            <Link
              href="/dashboard/complaints/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> New Complaint
            </Link>
          ) : undefined
        }
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket ID, title, building, or unit..."
              aria-label="Search tickets"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Status filter"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="ALL">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Priority filter"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="ALL">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Category filter"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="ALL">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No tickets found" description={copy.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ticket</th>
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="px-4 py-2.5 font-medium">Building &amp; Unit</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Technician</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      <Link href={`/dashboard/complaints/${c.id}`} className="font-semibold text-blue-600 hover:underline">
                        {formatTicketId(c.id)}
                      </Link>
                    </td>
                    <td className="max-w-[240px] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/complaints/${c.id}`}
                          className="truncate font-medium text-slate-900 hover:text-blue-600"
                        >
                          {c.title}
                        </Link>
                        {c.isDuplicate && (
                          <span
                            title="Flagged as potential duplicate by AI Triage"
                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20"
                          >
                            <AlertTriangle className="h-3 w-3" /> Duplicate
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {c.buildingName} <span className="text-slate-400">· Unit {c.unitNumber}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {c.categoryName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {c.technicianName ?? <span className="text-xs text-slate-400">Unassigned</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/complaints/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
