import type { Metadata } from "next";
import OrganizationManager, { type OrganizationItem } from "@/components/dashboard/OrganizationManager";
import { OWNER_ONLY, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Organizations" };

export default async function OrganizationsPage() {
  const user = await requireRole(OWNER_ONLY);

  const rows = await prisma.organization.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      address: true,
      createdAt: true,
      _count: { select: { buildings: true, members: true } },
    },
  });

  const organizations: OrganizationItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    createdAt: row.createdAt.toISOString(),
    _count: row._count,
  }));

  return <OrganizationManager organizations={organizations} />;
}
