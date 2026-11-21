import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/dashboard/LogoutButton";
import SidebarNav from "@/components/dashboard/SidebarNav";
import Topbar, { getInitials } from "@/components/dashboard/Topbar";
import { ROLE_LABELS, getNavForRole, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireRole();
  const sections = getNavForRole(user.role);
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <aside className="hidden w-60 shrink-0 flex-col bg-[#0F172A] md:flex print:hidden">
        <Link href="/dashboard" className="flex h-14 items-center gap-3 border-b border-slate-800 px-5">
          <Image src="/logo.jpg" alt="" width={28} height={28} className="h-7 w-7 rounded-md object-cover" />
          <span className="text-base font-semibold tracking-tight text-white">Fixora</span>
        </Link>

        <SidebarNav sections={sections} />

        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {getInitials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <span className="mt-0.5 inline-block rounded bg-blue-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} unreadCount={unreadCount} />
        <div className="shrink-0 border-b border-slate-200 bg-white md:hidden print:hidden">
          <SidebarNav sections={sections} variant="bar" />
        </div>
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-screen bg-[#F8FAFC]" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
