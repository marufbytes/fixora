import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import UnitManager, { type BuildingSummary, type UnitItem } from "@/components/dashboard/UnitManager";
import { STAFF_ROLES, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Building Details" };

export default async function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(STAFF_ROLES);
  const { id } = await params;

  const row = await prisma.building.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      totalFloors: true,
      ownerId: true,
      organization: { select: { name: true } },
      units: {
        orderBy: [{ floor: "asc" }, { unitNumber: "asc" }],
        select: {
          id: true,
          floor: true,
          unitNumber: true,
          _count: { select: { residents: true, complaints: true } },
        },
      },
    },
  });

  if (!row) notFound();
  if (user.role === "OWNER" && row.ownerId !== user.id) redirect("/dashboard/buildings");

  const building: BuildingSummary = {
    id: row.id,
    name: row.name,
    address: row.address,
    totalFloors: row.totalFloors,
    organizationName: row.organization?.name ?? null,
  };

  const units: UnitItem[] = row.units.map((u) => ({
    id: u.id,
    floor: u.floor,
    unitNumber: u.unitNumber,
    residentsCount: u._count.residents,
    complaintsCount: u._count.complaints,
  }));

  return <UnitManager building={building} units={units} />;
}
