import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/rbac";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  organizationId: string | null;
  organizationName: string | null;
  unitId: string | null;
  unitNumber: string | null;
  buildingId: string | null;
  buildingName: string | null;
  submittedCount: number;
  assignedCount: number;
  activeAssignedCount: number;
  createdAt: string;
}

/** Selection that never includes the password hash. */
const userListSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  organizationId: true,
  organization: { select: { name: true } },
  unitId: true,
  unit: { select: { id: true, unitNumber: true, floor: true, building: { select: { id: true, name: true } } } },
  createdAt: true,
  _count: { select: { submittedComplaints: true, assignedComplaints: true } },
} as const;

/** Lists users (optionally by role) with technician workload counts. */
export async function listUsers(role?: Role): Promise<UserListItem[]> {
  const rows = await prisma.user.findMany({
    where: role ? { role } : {},
    orderBy: { createdAt: "desc" },
    take: 500,
    select: userListSelect,
  });

  const technicianIds = rows.filter((r) => r.role === "TECHNICIAN").map((r) => r.id);
  const activeGroups = technicianIds.length
    ? await prisma.complaint.groupBy({
        by: ["technicianId"],
        where: { technicianId: { in: technicianIds }, status: { notIn: ["COMPLETED", "CONFIRMED"] } },
        _count: { _all: true },
      })
    : [];
  const activeByTechnician = new Map<string, number>();
  for (const g of activeGroups) {
    if (g.technicianId) activeByTechnician.set(g.technicianId, g._count._all);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    organizationId: r.organizationId,
    organizationName: r.organization?.name ?? null,
    unitId: r.unitId,
    unitNumber: r.unit?.unitNumber ?? null,
    buildingId: r.unit?.building.id ?? null,
    buildingName: r.unit?.building.name ?? null,
    submittedCount: r._count.submittedComplaints,
    assignedCount: r._count.assignedComplaints,
    activeAssignedCount: activeByTechnician.get(r.id) ?? 0,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Organizations a staff user may attach categories/users to. */
export async function listOrganizationOptions(user: { id: string; role: Role }) {
  if (user.role === "OWNER") {
    return prisma.organization.findMany({ where: { ownerId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  }
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { organizationId: true } });
  if (!dbUser?.organizationId) return [];
  return prisma.organization.findMany({ where: { id: dbUser.organizationId }, select: { id: true, name: true } });
}
