"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  CirclePlus,
  Landmark,
  LayoutDashboard,
  Settings,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { NavIconName, NavSection } from "@/lib/rbac";

const ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  complaints: ClipboardList,
  newComplaint: CirclePlus,
  notifications: Bell,
  organizations: Landmark,
  buildings: Building2,
  users: Users,
  categories: Tags,
  reports: BarChart3,
  settings: Settings,
};

export default function SidebarNav({
  sections,
  variant = "sidebar",
}: {
  sections: NavSection[];
  variant?: "sidebar" | "bar";
}) {
  const pathname = usePathname();

  // The most specific matching link wins, so "/complaints/new" doesn't also highlight "/complaints".
  const activeHref = sections
    .flatMap((s) => s.items)
    .map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (variant === "bar") {
    return (
      <nav className="flex gap-1 overflow-x-auto px-3 py-2" aria-label="Main">
        {sections.flatMap((s) => s.items).map((item) => {
          const Icon = ICONS[item.icon];
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-slate-500">{section.title}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-blue-500" />}
                    <Icon className={`h-4 w-4 ${active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
