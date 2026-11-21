import type { Metadata } from "next";
import UserManager, { type BuildingUnitOption } from "@/components/dashboard/UserManager";
import { STAFF_ROLES, requireRole } from "@/lib/rbac";
import { listOrganizationOptions, listUsers } from "@/lib/user-queries";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const user = await requireRole(STAFF_ROLES);

  const [users, organizations, buildingRows] = await Promise.all([
    listUsers(),
    listOrganizationOptions(user),
    prisma.building.findMany({
      where: user.role === "OWNER" ? { ownerId: user.id } : {},
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        units: {
          orderBy: [{ floor: "asc" }, { unitNumber: "asc" }],
          select: { id: true, unitNumber: true, floor: true },
        },
      },
    }),
  ]);

  const buildings: BuildingUnitOption[] = buildingRows;

  return (
    <UserManager
      users={users}
      buildings={buildings}
      organizations={organizations}
      currentUserId={user.id}
      currentRole={user.role}
    />
  );
}
