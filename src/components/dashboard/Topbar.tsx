import Link from "next/link";
import { Bell, Search } from "lucide-react";
import LogoutButton from "@/components/dashboard/LogoutButton";
import { ROLE_LABELS, type SessionUser } from "@/lib/rbac";

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

export default function Topbar({
  user,
  unreadCount = 0,
}: {
  user: SessionUser;
  unreadCount?: number;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 print:hidden">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          disabled
          placeholder="Search (coming soon)"
          aria-label="Search"
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/notifications"
          aria-label={
            unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"
          }
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#2563EB] px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2 border-l border-slate-200 pl-3 hover:opacity-90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {getInitials(user.name)}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-blue-600">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </Link>
        <span className="md:hidden">
          <LogoutButton variant="light" />
        </span>
      </div>
    </header>
  );
}
