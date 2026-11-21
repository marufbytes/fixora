import type { Metadata } from "next";
import ComplaintList, {
  type CategoryFilterOption,
  type ComplaintListItem,
} from "@/components/dashboard/ComplaintList";
import { COMPLAINT_SUBMITTERS, complaintScope, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Complaints" };

export default async function ComplaintsPage() {
  const user = await requireRole();

  const [rows, categoryRows] = await Promise.all([
    prisma.complaint.findMany({
      where: complaintScope(user),
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        createdAt: true,
        categoryId: true,
        category: { select: { name: true } },
        unit: { select: { unitNumber: true, building: { select: { name: true } } } },
        technician: { select: { name: true } },
        aiAnalysis: { select: { isDuplicate: true, suggestedCategory: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const complaints: ComplaintListItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    priority: r.priority,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    buildingName: r.unit.building.name,
    unitNumber: r.unit.unitNumber,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? r.aiAnalysis?.suggestedCategory ?? "Uncategorized",
    technicianName: r.technician?.name ?? null,
    isDuplicate: r.aiAnalysis?.isDuplicate ?? false,
    commentsCount: r._count.comments,
  }));

  const categories: CategoryFilterOption[] = categoryRows;

  return (
    <ComplaintList
      complaints={complaints}
      categories={categories}
      role={user.role}
      canCreate={COMPLAINT_SUBMITTERS.includes(user.role)}
    />
  );
}
