import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { complaintDetailSelect } from "@/app/api/complaints/[id]/route";
import ComplaintDetailWorkspace, {
  type CategoryOption,
  type TechnicianOption,
  type WorkspaceComplaint,
  type WorkspaceDuplicateSummary,
} from "@/components/dashboard/ComplaintDetailWorkspace";
import { STAFF_ROLES, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Ticket Details" };

export default async function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole();
  const { id } = await params;

  const row = await prisma.complaint.findUnique({
    where: { id },
    select: complaintDetailSelect,
  });

  if (!row) notFound();

  const allowed =
    user.role === "RESIDENT"
      ? row.residentId === user.id
      : user.role === "TECHNICIAN"
        ? row.technicianId === user.id
        : true;

  if (!allowed) redirect("/dashboard/complaints");

  const isStaff = STAFF_ROLES.includes(user.role);

  const [duplicateRow, techRows, activeTechCounts, categoryRows] = await Promise.all([
    row.aiAnalysis?.duplicateOfId
      ? prisma.complaint.findUnique({
          where: { id: row.aiAnalysis.duplicateOfId },
          select: { id: true, title: true, status: true, createdAt: true },
        })
      : Promise.resolve(null),
    isStaff
      ? prisma.user.findMany({
          where: { role: "TECHNICIAN" },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    isStaff
      ? prisma.complaint.groupBy({
          by: ["technicianId"],
          where: {
            technicianId: { not: null },
            status: { notIn: ["COMPLETED", "CONFIRMED"] },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    isStaff
      ? prisma.category.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const activeByTech = new Map<string, number>();
  for (const g of activeTechCounts) {
    if (g.technicianId) activeByTech.set(g.technicianId, g._count._all);
  }

  const technicians: TechnicianOption[] = techRows.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    activeCount: activeByTech.get(t.id) ?? 0,
  }));

  const categories: CategoryOption[] = categoryRows;

  const duplicateComplaint: WorkspaceDuplicateSummary | null = duplicateRow
    ? {
        id: duplicateRow.id,
        title: duplicateRow.title,
        status: duplicateRow.status,
        createdAt: duplicateRow.createdAt.toISOString(),
      }
    : null;

  const complaint: WorkspaceComplaint = {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    imageUrl: row.imageUrl,
    residentId: row.residentId,
    technicianId: row.technicianId,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? row.aiAnalysis?.suggestedCategory ?? "Uncategorized",
    buildingName: row.unit.building.name,
    buildingAddress: row.unit.building.address,
    unitNumber: row.unit.unitNumber,
    unitFloor: row.unit.floor,
    resident: row.resident,
    technician: row.technician,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    aiAnalysis: row.aiAnalysis
      ? {
          suggestedCategory: row.aiAnalysis.suggestedCategory,
          suggestedPriority: row.aiAnalysis.suggestedPriority,
          issueSummary: row.aiAnalysis.issueSummary,
          assignedTeam: row.aiAnalysis.assignedTeam,
          suggestedResponse: row.aiAnalysis.suggestedResponse,
          troubleshootingSteps: row.aiAnalysis.troubleshootingSteps,
          isDuplicate: row.aiAnalysis.isDuplicate,
          duplicateOfId: row.aiAnalysis.duplicateOfId,
        }
      : null,
    attachments: row.attachments.map((a) => ({
      id: a.id,
      url: a.url,
      fileName: a.fileName,
      type: a.type,
      createdAt: a.createdAt.toISOString(),
      uploadedByName: a.uploadedBy.name,
    })),
    comments: row.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      authorId: c.author.id,
      authorName: c.author.name,
      authorRole: c.author.role,
    })),
    statusHistory: row.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
      changedByName: h.changedBy.name,
      changedByRole: h.changedBy.role,
    })),
  };

  return (
    <ComplaintDetailWorkspace
      complaint={complaint}
      duplicateComplaint={duplicateComplaint}
      technicians={technicians}
      categories={categories}
      viewer={{ id: user.id, name: user.name, role: user.role }}
    />
  );
}
