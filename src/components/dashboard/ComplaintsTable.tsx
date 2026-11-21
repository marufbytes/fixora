import Link from "next/link";
import { ClipboardList } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import {
  PriorityBadge,
  StatusBadge,
  formatDate,
  formatTicketId,
  type ComplaintPriority,
  type ComplaintStatus,
} from "@/components/ui/Badges";

export interface ComplaintRow {
  id: string;
  title: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  createdAt: Date;
  unit: { unitNumber: string; building: { name: string } };
}

/** Prisma `select` matching ComplaintRow. */
export const complaintRowSelect = {
  id: true,
  title: true,
  priority: true,
  status: true,
  createdAt: true,
  unit: { select: { unitNumber: true, building: { select: { name: true } } } },
};

export default function ComplaintsTable({ rows, emptyTitle, emptyText }: { rows: ComplaintRow[]; emptyTitle: string; emptyText: string }) {
  if (rows.length === 0) {
    return <EmptyState icon={ClipboardList} title={emptyTitle} description={emptyText} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Ticket</th>
            <th className="px-4 py-2.5 font-medium">Building &amp; Unit</th>
            <th className="px-4 py-2.5 font-medium">Issue</th>
            <th className="px-4 py-2.5 font-medium">Priority</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                <Link href={`/dashboard/complaints/${c.id}`} className="text-blue-600 hover:underline">
                  {formatTicketId(c.id)}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-700">
                {c.unit.building.name} <span className="text-slate-400">· {c.unit.unitNumber}</span>
              </td>
              <td className="max-w-[240px] truncate px-4 py-3 font-medium text-slate-900">{c.title}</td>
              <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
              <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
