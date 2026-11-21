import type { Metadata } from "next";
import BuildingManager, {
  type BuildingItem,
  type BuildingOrganizationOption,
} from "@/components/dashboard/BuildingManager";
import { STAFF_ROLES, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Buildings" };

export default async function BuildingsPage() {
  const user = await requireRole(STAFF_ROLES);

  let buildingWhere: Record<string, unknown> = {};
  let orgWhere: Record<string, unknown> = {};

  if (user.role === "OWNER") {
    buildingWhere = { ownerId: user.id };
    orgWhere = { ownerId: user.id };
  } else {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });
    if (dbUser?.organizationId) {
      buildingWhere = { organizationId: dbUser.organizationId };
      orgWhere = { id: dbUser.organizationId };
    }
  }

  const [buildingRows, orgRows] = await Promise.all([
    prisma.building.findMany({
      where: buildingWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        address: true,
        totalFloors: true,
        organizationId: true,
        organization: { select: { name: true } },
        _count: { select: { units: true } },
        units: {
          select: {
            _count: {
              select: {
                complaints: {
                  where: { status: { notIn: ["COMPLETED", "CONFIRMED"] } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.organization.findMany({
      where: orgWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const buildings: BuildingItem[] = buildingRows.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    totalFloors: b.totalFloors,
    organizationId: b.organizationId,
    organizationName: b.organization?.name ?? null,
    unitsCount: b._count.units,
    openComplaintsCount: b.units.reduce((sum, u) => sum + u._count.complaints, 0),
  }));

  const organizations: BuildingOrganizationOption[] = orgRows.map((o) => ({
    id: o.id,
    name: o.name,
  }));

  return <BuildingManager buildings={buildings} organizations={organizations} />;
}
