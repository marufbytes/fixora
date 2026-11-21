import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  DoorOpen,
  Inbox,
  Landmark,
  Loader2,
  Plus,
  ShieldCheck,
  Siren,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
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
import {
  COMPLAINT_SUBMITTERS,
  ROLE_LABELS,
  complaintScope,
  requireRole,
  type Role,
} from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Dashboard" };

interface DashboardComplaintRow {
  id: string;
  title: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  createdAt: Date;
  unit: { unitNumber: string; building: { name: string } };
  aiAnalysis: { isDuplicate: boolean } | null;
}

const dashboardComplaintSelect = {
  id: true,
  title: true,
  priority: true,
  status: true,
  createdAt: true,
  unit: { select: { unitNumber: true, building: { select: { name: true } } } },
  aiAnalysis: { select: { isDuplicate: true } },
} as const;

const STATUS_BAR_COLORS: Record<ComplaintStatus, string> = {
  PENDING: "bg-amber-500",
  ASSIGNED: "bg-violet-500",
  IN_PROGRESS: "bg-blue-600",
  COMPLETED: "bg-emerald-500",
  CONFIRMED: "bg-teal-500",
};

const ROLE_SUBTITLES: Record<Role, string> = {
  RESIDENT: "Track your submitted maintenance requests and confirm completed repairs.",
  TECHNICIAN: "Manage your assigned maintenance tasks, update progress, and upload completion proof.",
  MANAGER: "Triage incoming complaints, dispatch technicians, and monitor building operations.",
  OWNER: "Executive overview of maintenance operations across your organizations and buildings.",
};

export default async function DashboardPage() {
  const user = await requireRole();
  const where = complaintScope(user);
  const firstName = user.name.split(" ")[0] || user.name;
  const canCreate = COMPLAINT_SUBMITTERS.includes(user.role);

  const [grouped, recent, urgentActive, awaitingConfirm, ownerCounts] = await Promise.all([
    prisma.complaint.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: dashboardComplaintSelect,
    }),
    prisma.complaint.findMany({
      where: {
        ...where,
        priority: { in: ["EMERGENCY", "HIGH"] },
        status: { notIn: ["COMPLETED", "CONFIRMED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: dashboardComplaintSelect,
    }),
    user.role === "RESIDENT"
      ? prisma.complaint.findMany({
          where: { residentId: user.id, status: "COMPLETED" },
          orderBy: { updatedAt: "desc" },
          take: 4,
          select: dashboardComplaintSelect,
        })
      : Promise.resolve([]),
    user.role === "OWNER"
      ? Promise.all([
          prisma.organization.count({ where: { ownerId: user.id } }),
          prisma.building.count({ where: { ownerId: user.id } }),
          prisma.unit.count({ where: { building: { ownerId: user.id } } }),
          prisma.user.count(),
        ])
      : Promise.resolve(null),
  ]);

  const counts: Record<ComplaintStatus, number> = {
    PENDING: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CONFIRMED: 0,
  };
  for (const g of grouped) {
    counts[g.status] = g._count._all;
  }

  const totalTickets = STATUS_ORDER.reduce((sum, s) => sum + counts[s], 0);
  const activeCount = counts.PENDING + counts.ASSIGNED + counts.IN_PROGRESS;
  const resolvedCount = counts.COMPLETED + counts.CONFIRMED;
  const urgentActiveCount = urgentActive.length;

  let stats: {
    label: string;
    value: number;
    hint: string;
    icon: LucideIcon;
    tone: string;
  }[] = [];

  if (user.role === "RESIDENT") {
    stats = [
      {
        label: "My Total Requests",
        value: totalTickets,
        hint: "All complaints submitted",
        icon: ClipboardList,
        tone: "bg-slate-100 text-slate-700",
      },
      {
        label: "Active Requests",
        value: activeCount,
        hint: `${counts.PENDING} pending · ${counts.ASSIGNED + counts.IN_PROGRESS} in work`,
        icon: Loader2,
        tone: "bg-blue-50 text-blue-600",
      },
      {
        label: "Awaiting Confirmation",
        value: counts.COMPLETED,
        hint: "Ready for your review",
        icon: Clock,
        tone: "bg-amber-50 text-amber-600",
      },
      {
        label: "Confirmed Resolved",
        value: counts.CONFIRMED,
        hint: "Verified & closed",
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-600",
      },
    ];
  } else if (user.role === "TECHNICIAN") {
    stats = [
      {
        label: "Assigned to Me",
        value: counts.ASSIGNED,
        hint: "Ready to start work",
        icon: Wrench,
        tone: "bg-violet-50 text-violet-600",
      },
      {
        label: "In Progress",
        value: counts.IN_PROGRESS,
        hint: "Currently being repaired",
        icon: Loader2,
        tone: "bg-blue-50 text-blue-600",
      },
      {
        label: "Completed Jobs",
        value: resolvedCount,
        hint: `${counts.CONFIRMED} confirmed by resident`,
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-600",
      },
      {
        label: "High / Emergency Active",
        value: urgentActiveCount,
        hint: "Urgent assigned tasks",
        icon: Siren,
        tone: "bg-red-50 text-red-600",
      },
    ];
  } else {
    stats = [
      {
        label: "Pending Triage",
        value: counts.PENDING,
        hint: "Awaiting technician dispatch",
        icon: Clock,
        tone: "bg-amber-50 text-amber-600",
      },
      {
        label: "Active Work",
        value: counts.ASSIGNED + counts.IN_PROGRESS,
        hint: `${counts.ASSIGNED} assigned · ${counts.IN_PROGRESS} in progress`,
        icon: Loader2,
        tone: "bg-blue-50 text-blue-600",
      },
      {
        label: "Resolved Tickets",
        value: resolvedCount,
        hint:
          totalTickets > 0
            ? `${Math.round((resolvedCount / totalTickets) * 100)}% resolution rate`
            : "No tickets yet",
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-600",
      },
      {
        label: "Emergency / High Active",
        value: urgentActiveCount,
        hint: "Requires priority attention",
        icon: Siren,
        tone: "bg-red-50 text-red-600",
      },
    ];
  }

  return (
    <div className="space-y-5">
      {/* Top Header Bar */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Welcome back, {firstName}
            </h1>
            <span className="rounded-md bg-[#2563EB] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{ROLE_SUBTITLES[user.role]}</p>
        </div>

        {canCreate ? (
          <Link
            href="/dashboard/complaints/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> New Complaint
          </Link>
        ) : (
          <Link
            href="/dashboard/complaints"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Wrench className="h-4 w-4" /> View Assigned Tasks
          </Link>
        )}
      </header>

      {/* Owner Portfolio Summary Strip */}
      {user.role === "OWNER" && ownerCounts && (
        <section className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:grid-cols-4">
          <Link
            href="/dashboard/organizations"
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Landmark className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Organizations</p>
              <p className="text-sm font-semibold text-slate-900">{ownerCounts[0]}</p>
            </div>
          </Link>
          <Link
            href="/dashboard/buildings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Buildings</p>
              <p className="text-sm font-semibold text-slate-900">{ownerCounts[1]}</p>
            </div>
          </Link>
          <Link
            href="/dashboard/buildings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DoorOpen className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Total Units</p>
              <p className="text-sm font-semibold text-slate-900">{ownerCounts[2]}</p>
            </div>
          </Link>
          <Link
            href="/dashboard/users"
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Users className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Total Users</p>
              <p className="text-sm font-semibold text-slate-900">{ownerCounts[3]}</p>
            </div>
          </Link>
        </section>
      )}

      {/* KPI Stat Cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </section>

      {/* Action / Attention Strip */}
      {user.role === "RESIDENT" ? (
        awaitingConfirm.length > 0 && (
          <section className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Repairs Awaiting Your Confirmation ({awaitingConfirm.length})
              </p>
              <span className="text-xs text-emerald-800">
                Click a ticket to review proof and confirm resolution
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {awaitingConfirm.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/complaints/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white px-3.5 py-2.5 shadow-sm hover:border-emerald-400"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatTicketId(c.id)} · {c.unit.building.name} (Unit {c.unit.unitNumber})
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white">
                    Confirm
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )
      ) : urgentActive.length === 0 ? (
        <section className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-xs font-medium text-emerald-900">
            All clear — no urgent active issues.
            <span className="ml-1 font-normal text-emerald-700">
              No high or emergency priority complaints are currently awaiting action.
            </span>
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-red-200 bg-red-50/60 p-4">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Urgent Attention Required ({urgentActive.length})
          </div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {urgentActive.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/complaints/${c.id}`}
                className="rounded-lg border border-red-100 bg-white p-3 shadow-sm transition-colors hover:border-red-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <PriorityBadge priority={c.priority} />
                  <span className="font-mono text-xs font-semibold text-blue-600">
                    {formatTicketId(c.id)}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-medium text-slate-900">{c.title}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {c.unit.building.name} · Unit {c.unit.unitNumber} · {STATUS_LABELS[c.status]}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Main Lower Section: 2/3 Recent Table + 1/3 Status Breakdown */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left 2/3: Recent Complaints Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {user.role === "RESIDENT"
                ? "My Recent Requests"
                : user.role === "TECHNICIAN"
                  ? "My Recent Assigned Tasks"
                  : "Recent Complaints"}
            </h2>
            <Link
              href="/dashboard/complaints"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Inbox className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">No complaints yet</h3>
              <p className="mt-1 max-w-xs text-xs text-slate-500">
                {user.role === "TECHNICIAN"
                  ? "Tasks assigned to you by a manager will appear here."
                  : "Submitted maintenance requests will appear here in real time."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Ticket</th>
                    <th className="px-4 py-2.5 font-medium">Building &amp; Unit</th>
                    <th className="px-4 py-2.5 font-medium">Issue Title</th>
                    <th className="px-4 py-2.5 font-medium">Priority</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <Link
                          href={`/dashboard/complaints/${c.id}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {formatTicketId(c.id)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {c.unit.building.name}{" "}
                        <span className="text-slate-400">· {c.unit.unitNumber}</span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/dashboard/complaints/${c.id}`}
                            className="truncate font-medium text-slate-900 hover:text-blue-600"
                          >
                            {c.title}
                          </Link>
                          {c.aiAnalysis?.isDuplicate && (
                            <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              Dup
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {formatDate(c.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1/3: Status Breakdown Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Status Breakdown</h2>
            <span className="text-xs text-slate-500">{totalTickets} total</span>
          </div>

          <ul className="mt-4 space-y-4">
            {STATUS_ORDER.map((s) => {
              const count = counts[s];
              const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
              return (
                <li key={s}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{STATUS_LABELS[s]}</span>
                    <span className="text-slate-500">
                      <strong className="font-semibold text-slate-900">{count}</strong> · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${STATUS_BAR_COLORS[s]}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {totalTickets === 0 && (
            <p className="mt-5 text-center text-xs text-slate-400">
              No ticket activity recorded yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
