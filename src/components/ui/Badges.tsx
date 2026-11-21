export type ComplaintStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CONFIRMED";
export type ComplaintPriority = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

export const STATUS_ORDER: ComplaintStatus[] = ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CONFIRMED"];

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CONFIRMED: "Confirmed",
};

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  ASSIGNED: "bg-violet-50 text-violet-700 ring-violet-600/20",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CONFIRMED: "bg-teal-50 text-teal-700 ring-teal-600/20",
};

const PRIORITY_STYLES: Record<ComplaintPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 ring-slate-500/20",
  MEDIUM: "bg-sky-50 text-sky-700 ring-sky-600/20",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-600/20",
  EMERGENCY: "bg-red-50 text-red-700 ring-red-600/20",
};

const pill = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return <span className={`${pill} ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: ComplaintPriority }) {
  return (
    <span className={`${pill} ${PRIORITY_STYLES[priority]}`}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

export function formatTicketId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

export function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
