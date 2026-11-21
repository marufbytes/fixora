import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { ROLES, ROLE_LABELS, isRole, type Role } from "@/lib/roles";

export { ROLES, ROLE_LABELS, isRole };
export type { Role };

export const STAFF_ROLES: readonly Role[] = ["OWNER", "MANAGER"];
export const OWNER_ONLY: readonly Role[] = ["OWNER"];
export const COMPLAINT_SUBMITTERS: readonly Role[] = ["RESIDENT", "MANAGER", "OWNER"];

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Returns the signed-in user from the NextAuth JWT session, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string | null; email?: string | null; role?: unknown } | undefined;
  if (!user?.id || !isRole(user.role)) return null;
  return { id: user.id, name: user.name ?? user.email ?? "User", email: user.email ?? "", role: user.role };
}

/**
 * Server-side route guard. Signed-out users go to /login;
 * signed-in users without an allowed role go back to /dashboard.
 */
export async function requireRole(allowed: readonly Role[] = ROLES): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!allowed.includes(user.role)) redirect("/dashboard");
  return user;
}

/** Prisma `where` clause limiting complaints to what the role may see. */
export function complaintScope(user: SessionUser): Record<string, string> {
  if (user.role === "RESIDENT") return { residentId: user.id };
  if (user.role === "TECHNICIAN") return { technicianId: user.id };
  return {};
}

export type NavIconName =
  | "dashboard"
  | "complaints"
  | "newComplaint"
  | "notifications"
  | "organizations"
  | "buildings"
  | "users"
  | "categories"
  | "reports"
  | "settings";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconName;
  roles: readonly Role[];
}

export interface NavSection {
  title: string;
  items: Omit<NavItem, "roles">[];
}

const NAV_CONFIG: { title: string; items: NavItem[] }[] = [
  {
    title: "GENERAL",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard", roles: ROLES },
      { label: "Complaints", href: "/dashboard/complaints", icon: "complaints", roles: ROLES },
      { label: "New Complaint", href: "/dashboard/complaints/new", icon: "newComplaint", roles: COMPLAINT_SUBMITTERS },
      { label: "Notifications", href: "/dashboard/notifications", icon: "notifications", roles: ROLES },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { label: "Organizations", href: "/dashboard/organizations", icon: "organizations", roles: OWNER_ONLY },
      { label: "Buildings", href: "/dashboard/buildings", icon: "buildings", roles: STAFF_ROLES },
      { label: "Users", href: "/dashboard/users", icon: "users", roles: STAFF_ROLES },
      { label: "Categories", href: "/dashboard/categories", icon: "categories", roles: STAFF_ROLES },
      { label: "Reports", href: "/dashboard/reports", icon: "reports", roles: STAFF_ROLES },
    ],
  },
  {
    title: "ACCOUNT",
    items: [{ label: "Settings", href: "/dashboard/settings", icon: "settings", roles: ROLES }],
  },
];

/** Navigation visible to a role (serializable, safe to pass to client components). */
export function getNavForRole(role: Role): NavSection[] {
  return NAV_CONFIG.map((section) => ({
    title: section.title,
    items: section.items
      .filter((item) => item.roles.includes(role))
      .map(({ label, href, icon }) => ({ label, href, icon })),
  })).filter((section) => section.items.length > 0);
}
