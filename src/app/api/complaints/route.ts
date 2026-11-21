import { NextResponse } from "next/server";
import { analyzeComplaint, type TriagePriority } from "@/lib/ai";
import { COMPLAINT_SUBMITTERS, complaintScope, getSessionUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { ComplaintPriority, ComplaintStatus } from "@/components/ui/Badges";

const VALID_STATUSES: readonly ComplaintStatus[] = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CONFIRMED",
];
const VALID_PRIORITIES: readonly ComplaintPriority[] = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"];

export const complaintListSelect = {
  id: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  imageUrl: true,
  residentId: true,
  technicianId: true,
  buildingId: true,
  unitId: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  unit: {
    select: {
      id: true,
      floor: true,
      unitNumber: true,
      building: { select: { id: true, name: true } },
    },
  },
  category: { select: { id: true, name: true } },
  resident: { select: { id: true, name: true } },
  technician: { select: { id: true, name: true } },
  aiAnalysis: {
    select: {
      id: true,
      suggestedCategory: true,
      suggestedPriority: true,
      issueSummary: true,
      assignedTeam: true,
      isDuplicate: true,
      duplicateOfId: true,
    },
  },
  _count: { select: { comments: true } },
} as const;

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status")?.trim();
  const priorityParam = searchParams.get("priority")?.trim();
  const categoryIdParam = searchParams.get("categoryId")?.trim();
  const searchParam = searchParams.get("search")?.trim();

  const where: Record<string, unknown> = { ...complaintScope(user) };

  if (statusParam && VALID_STATUSES.includes(statusParam as ComplaintStatus)) {
    where.status = statusParam;
  }
  if (priorityParam && VALID_PRIORITIES.includes(priorityParam as ComplaintPriority)) {
    where.priority = priorityParam;
  }
  if (categoryIdParam) {
    where.categoryId = categoryIdParam;
  }
  if (searchParam) {
    where.OR = [
      { title: { contains: searchParam, mode: "insensitive" } },
      { description: { contains: searchParam, mode: "insensitive" } },
    ];
  }

  const complaints = await prisma.complaint.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: complaintListSelect,
  });

  return NextResponse.json({ complaints });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!COMPLAINT_SUBMITTERS.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    let unitId = typeof body?.unitId === "string" && body.unitId.trim() ? body.unitId.trim() : "";
    let categoryId =
      typeof body?.categoryId === "string" && body.categoryId.trim() && body.categoryId !== "AUTO"
        ? body.categoryId.trim()
        : null;
    const imageUrl =
      typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;
    const fileName =
      typeof body?.fileName === "string" && body.fileName.trim() ? body.fileName.trim() : null;
    const explicitPriority =
      (user.role === "MANAGER" || user.role === "OWNER") &&
      typeof body?.priority === "string" &&
      VALID_PRIORITIES.includes(body.priority as ComplaintPriority)
        ? (body.priority as TriagePriority)
        : null;

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    if (!unitId && user.role === "RESIDENT") {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { unitId: true },
      });
      if (dbUser?.unitId) {
        unitId = dbUser.unitId;
      }
    }

    if (!unitId) {
      return NextResponse.json({ error: "Please select a building unit" }, { status: 400 });
    }

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true, unitNumber: true, buildingId: true, building: { select: { name: true } } },
    });
    if (!unit) {
      return NextResponse.json({ error: "Selected unit was not found" }, { status: 404 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [categories, recentOpen] = await Promise.all([
      prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.complaint.findMany({
        where: {
          unit: { buildingId: unit.buildingId },
          status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
          createdAt: { gte: sevenDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          description: true,
          unit: { select: { unitNumber: true } },
        },
      }),
    ]);

    const ai = await analyzeComplaint({
      title,
      description,
      categories,
      recentComplaints: recentOpen.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        unitNumber: r.unit.unitNumber,
      })),
    });

    if (!categoryId) {
      const matched = categories.find(
        (c) => c.name.toLowerCase() === ai.suggestedCategory.toLowerCase(),
      );
      if (matched) {
        categoryId = matched.id;
      }
    }

    const finalPriority: TriagePriority = explicitPriority ?? ai.suggestedPriority;

    const created = await prisma.complaint.create({
      data: {
        title,
        description,
        priority: finalPriority,
        status: "PENDING",
        imageUrl,
        residentId: user.id,
        buildingId: unit.buildingId,
        unitId: unit.id,
        categoryId,
        aiAnalysis: {
          create: {
            suggestedCategory: ai.suggestedCategory,
            suggestedPriority: ai.suggestedPriority,
            issueSummary: ai.issueSummary,
            assignedTeam: ai.assignedTeam,
            suggestedResponse: ai.suggestedResponse,
            troubleshootingSteps: ai.troubleshootingSteps,
            isDuplicate: ai.isDuplicate,
            duplicateOfId: ai.duplicateOfId,
          },
        },
        statusHistory: {
          create: {
            toStatus: "PENDING",
            changedById: user.id,
            note: "Complaint submitted",
          },
        },
        ...(imageUrl
          ? {
              attachments: {
                create: {
                  url: imageUrl,
                  fileName,
                  type: "ISSUE",
                  uploadedById: user.id,
                },
              },
            }
          : {}),
      },
      select: complaintListSelect,
    });

    const staffUsers = await prisma.user.findMany({
      where: { role: { in: ["MANAGER", "OWNER"] } },
      select: { id: true },
    });

    const recipients = staffUsers.filter((s) => s.id !== user.id);
    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.id,
          title: `New ${finalPriority} Complaint · Unit ${unit.unitNumber}`,
          message: `${user.name} reported "${title}" in ${unit.building.name} (Unit ${unit.unitNumber}).`,
          link: `/dashboard/complaints/${created.id}`,
        })),
      });
    }

    return NextResponse.json({ complaint: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit complaint" }, { status: 500 });
  }
}
