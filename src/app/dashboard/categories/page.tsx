import type { Metadata } from "next";
import CategoryManager, { type CategoryItem } from "@/components/dashboard/CategoryManager";
import { STAFF_ROLES, requireRole } from "@/lib/rbac";
import { listOrganizationOptions } from "@/lib/user-queries";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const user = await requireRole(STAFF_ROLES);

  const [rows, organizations] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        organizationId: true,
        organization: { select: { name: true } },
        _count: { select: { complaints: true } },
      },
    }),
    listOrganizationOptions(user),
  ]);

  const categories: CategoryItem[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    organizationId: c.organizationId,
    organizationName: c.organization?.name ?? null,
    complaintsCount: c._count.complaints,
  }));

  return <CategoryManager categories={categories} organizations={organizations} />;
}
