import { NextResponse } from "next/server";
import { getSessionUser, STAFF_ROLES, type SessionUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  formatTicketId,
  STATUS_LABELS,
  type ComplaintPriority,
  type ComplaintStatus,
} from "@/components/ui/Badges";

const VALID_STATUSES: readonly ComplaintStatus[] = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CONFIRMED",
];
const VALID_PRIORITIES: readonly ComplaintPriority[] = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"];

export const complaintDetailSelect = {
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
      building: { select: { id: true, name: true, address: true } },
    },
  },
  category: { select: { id: true, name: true } },
  resident: { select: { id: true, name: true, email: true, phone: true } },
  technician: { select: { id: true, name: true, email: true, phone: true } },
  aiAnalysis: {
    select: {
      id: true,
      suggestedCategory: true,
      suggestedPriority: true,
      issueSummary: true,
      assignedTeam: true,
      suggestedResponse: true,
      troubleshootingSteps: true,
      isDuplicate: true,
      duplicateOfId: true,
      createdAt: true,
    },
  },
  attachments: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      url: true,
      fileName: true,
      type: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
    },
  },
  assignments: {
    orderBy: { assignedAt: "desc" as const },
    select: {
      id: true,
      notes: true,
      assignedAt: true,
      technician: { select: { id: true, name: true, email: true } },
      assignedBy: { select: { id: true, name: true } },
    },
  },
  comments: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, role: true } },
    },
  },
  statusHistory: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
      changedBy: { select: { id: true, name: true, role: true } },
    },
  },
} as const;

function canAccessTicket(
  user: SessionUser,
  complaint: { residentId: string; technicianId: string | null },
): boolean {
  if (STAFF_ROLES.includes(user.role)) return true;
  if (user.role === "RESIDENT") return complaint.residentId === user.id;
  if (user.role === "TECHNICIAN") return complaint.technicianId === user.id;
  return false;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    select: complaintDetailSelect,
  });

  if (!complaint) {
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  }

  if (!canAccessTicket(user, complaint)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let duplicateComplaint: {
    id: string;
    title: string;
    status: ComplaintStatus;
    createdAt: Date;
  } | null = null;

  if (complaint.aiAnalysis?.duplicateOfId) {
    duplicateComplaint = await prisma.complaint.findUnique({
      where: { id: complaint.aiAnalysis.duplicateOfId },
      select: { id: true, title: true, status: true, createdAt: true },
    });
  }

  return NextResponse.json({ complaint, duplicateComplaint });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.complaint.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      categoryId: true,
      residentId: true,
      technicianId: true,
      unit: { select: { unitNumber: true, building: { select: { name: true } } } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  }

  if (!canAccessTicket(user, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "";
    const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null;
    const ticketCode = formatTicketId(existing.id);
    const link = `/dashboard/complaints/${existing.id}`;

    if (action === "ASSIGN") {
      if (!STAFF_ROLES.includes(user.role)) {
        return NextResponse.json({ error: "Forbidden: Manager or Owner role required" }, { status: 403 });
      }
      const technicianId = typeof body?.technicianId === "string" ? body.technicianId.trim() : "";
      if (!technicianId) {
        return NextResponse.json({ error: "Please select a technician" }, { status: 400 });
      }

      const tech = await prisma.user.findUnique({
        where: { id: technicianId },
        select: { id: true, name: true, role: true },
      });
      if (!tech || tech.role !== "TECHNICIAN") {
        return NextResponse.json({ error: "Selected user is not a valid technician" }, { status: 400 });
      }

      const nextStatus: ComplaintStatus =
        existing.status === "PENDING" || existing.technicianId !== tech.id ? "ASSIGNED" : existing.status;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.assignment.create({
          data: {
            complaintId: existing.id,
            technicianId: tech.id,
            assignedById: user.id,
            notes: note,
          },
        });

        await tx.statusHistory.create({
          data: {
            complaintId: existing.id,
            fromStatus: existing.status,
            toStatus: nextStatus,
            note: note ? `Assigned to ${tech.name}: ${note}` : `Assigned to ${tech.name}`,
            changedById: user.id,
          },
        });

        const notifications: { userId: string; title: string; message: string; link: string }[] = [];
        if (tech.id !== user.id) {
          notifications.push({
            userId: tech.id,
            title: `New Task Assigned (${ticketCode})`,
            message: `${user.name} assigned you to "${existing.title}" in ${existing.unit.building.name} (Unit ${existing.unit.unitNumber}).`,
            link,
          });
        }
        if (existing.residentId !== user.id) {
          notifications.push({
            userId: existing.residentId,
            title: `Technician Assigned (${ticketCode})`,
            message: `${tech.name} has been assigned to your complaint "${existing.title}".`,
            link,
          });
        }
        if (notifications.length > 0) {
          await tx.notification.createMany({ data: notifications });
        }

        return tx.complaint.update({
          where: { id: existing.id },
          data: {
            technicianId: tech.id,
            status: nextStatus,
          },
          select: complaintDetailSelect,
        });
      });

      return NextResponse.json({ complaint: updated });
    }

    if (action === "UPDATE_META") {
      if (!STAFF_ROLES.includes(user.role)) {
        return NextResponse.json({ error: "Forbidden: Manager or Owner role required" }, { status: 403 });
      }

      const nextPriority: ComplaintPriority =
        typeof body?.priority === "string" && VALID_PRIORITIES.includes(body.priority as ComplaintPriority)
          ? (body.priority as ComplaintPriority)
          : existing.priority;

      const nextStatus: ComplaintStatus =
        typeof body?.status === "string" && VALID_STATUSES.includes(body.status as ComplaintStatus)
          ? (body.status as ComplaintStatus)
          : existing.status;

      const nextCategoryId =
        body?.categoryId === null || body?.categoryId === ""
          ? null
          : typeof body?.categoryId === "string"
            ? body.categoryId.trim()
            : existing.categoryId;

      const statusChanged = nextStatus !== existing.status;

      const updated = await prisma.$transaction(async (tx) => {
        if (statusChanged || note) {
          await tx.statusHistory.create({
            data: {
              complaintId: existing.id,
              fromStatus: existing.status,
              toStatus: nextStatus,
              note: note ?? `Ticket details updated by ${user.name}`,
              changedById: user.id,
            },
          });
        }

        if (statusChanged) {
          const targets = new Set<string>();
          if (existing.residentId !== user.id) targets.add(existing.residentId);
          if (existing.technicianId && existing.technicianId !== user.id) targets.add(existing.technicianId);

          if (targets.size > 0) {
            await tx.notification.createMany({
              data: Array.from(targets).map((uid) => ({
                userId: uid,
                title: `Ticket Status Updated (${ticketCode})`,
                message: `Status of "${existing.title}" is now ${STATUS_LABELS[nextStatus]}.`,
                link,
              })),
            });
          }
        }

        return tx.complaint.update({
          where: { id: existing.id },
          data: {
            priority: nextPriority,
            status: nextStatus,
            categoryId: nextCategoryId,
          },
          select: complaintDetailSelect,
        });
      });

      return NextResponse.json({ complaint: updated });
    }

    if (action === "START_WORK") {
      const canAct =
        STAFF_ROLES.includes(user.role) ||
        (user.role === "TECHNICIAN" && existing.technicianId === user.id);
      if (!canAct) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status !== "ASSIGNED") {
        return NextResponse.json(
          { error: "Work can only be started on an ASSIGNED ticket" },
          { status: 400 },
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.statusHistory.create({
          data: {
            complaintId: existing.id,
            fromStatus: existing.status,
            toStatus: "IN_PROGRESS",
            note: note ?? `${user.name} started maintenance work`,
            changedById: user.id,
          },
        });

        if (existing.residentId !== user.id) {
          await tx.notification.create({
            data: {
              userId: existing.residentId,
              title: `Work Started (${ticketCode})`,
              message: `${user.name} has started working on "${existing.title}".`,
              link,
            },
          });
        }

        return tx.complaint.update({
          where: { id: existing.id },
          data: { status: "IN_PROGRESS" },
          select: complaintDetailSelect,
        });
      });

      return NextResponse.json({ complaint: updated });
    }

    if (action === "COMPLETE_WORK") {
      const canAct =
        STAFF_ROLES.includes(user.role) ||
        (user.role === "TECHNICIAN" && existing.technicianId === user.id);
      if (!canAct) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status !== "IN_PROGRESS" && existing.status !== "ASSIGNED") {
        return NextResponse.json(
          { error: "Ticket must be Assigned or In Progress to mark completed" },
          { status: 400 },
        );
      }

      const completionImageUrl =
        typeof body?.completionImageUrl === "string" && body.completionImageUrl.trim()
          ? body.completionImageUrl.trim()
          : null;
      const completionFileName =
        typeof body?.completionFileName === "string" && body.completionFileName.trim()
          ? body.completionFileName.trim()
          : null;

      const staffUsers = await prisma.user.findMany({
        where: { role: { in: ["MANAGER", "OWNER"] } },
        select: { id: true },
      });

      const updated = await prisma.$transaction(async (tx) => {
        if (completionImageUrl) {
          await tx.attachment.create({
            data: {
              complaintId: existing.id,
              url: completionImageUrl,
              fileName: completionFileName,
              type: "COMPLETION",
              uploadedById: user.id,
            },
          });
        }

        await tx.statusHistory.create({
          data: {
            complaintId: existing.id,
            fromStatus: existing.status,
            toStatus: "COMPLETED",
            note: note ?? `Marked completed by ${user.name}`,
            changedById: user.id,
          },
        });

        const recipients = new Set<string>();
        if (existing.residentId !== user.id) recipients.add(existing.residentId);
        for (const s of staffUsers) {
          if (s.id !== user.id) recipients.add(s.id);
        }

        if (recipients.size > 0) {
          await tx.notification.createMany({
            data: Array.from(recipients).map((uid) => ({
              userId: uid,
              title: `Repair Completed (${ticketCode})`,
              message: `${user.name} marked "${existing.title}" as completed. Please review and confirm resolution.`,
              link,
            })),
          });
        }

        return tx.complaint.update({
          where: { id: existing.id },
          data: { status: "COMPLETED" },
          select: complaintDetailSelect,
        });
      });

      return NextResponse.json({ complaint: updated });
    }

    if (action === "CONFIRM_RESOLUTION") {
      const canAct =
        (user.role === "RESIDENT" && existing.residentId === user.id) ||
        STAFF_ROLES.includes(user.role);
      if (!canAct) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status !== "COMPLETED") {
        return NextResponse.json(
          { error: "Only COMPLETED tickets can be confirmed" },
          { status: 400 },
        );
      }

      const staffUsers = await prisma.user.findMany({
        where: { role: { in: ["MANAGER", "OWNER"] } },
        select: { id: true },
      });

      const updated = await prisma.$transaction(async (tx) => {
        await tx.statusHistory.create({
          data: {
            complaintId: existing.id,
            fromStatus: existing.status,
            toStatus: "CONFIRMED",
            note: note ?? `Resolution confirmed by ${user.name}`,
            changedById: user.id,
          },
        });

        const recipients = new Set<string>();
        if (existing.technicianId && existing.technicianId !== user.id) {
          recipients.add(existing.technicianId);
        }
        for (const s of staffUsers) {
          if (s.id !== user.id) recipients.add(s.id);
        }

        if (recipients.size > 0) {
          await tx.notification.createMany({
            data: Array.from(recipients).map((uid) => ({
              userId: uid,
              title: `Resolution Confirmed (${ticketCode})`,
              message: `${user.name} confirmed that "${existing.title}" has been resolved.`,
              link,
            })),
          });
        }

        return tx.complaint.update({
          where: { id: existing.id },
          data: { status: "CONFIRMED" },
          select: complaintDetailSelect,
        });
      });

      return NextResponse.json({ complaint: updated });
    }

    return NextResponse.json({ error: "Unsupported workflow action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to update complaint" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.complaint.findUnique({
    where: { id },
    select: { id: true, status: true, residentId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  }

  const allowedRole =
    STAFF_ROLES.includes(user.role) ||
    (user.role === "RESIDENT" && existing.residentId === user.id);

  if (!allowedRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.status !== "PENDING") {
    return NextResponse.json(
      { error: "Only PENDING complaints can be deleted" },
      { status: 400 },
    );
  }

  try {
    await prisma.complaint.delete({ where: { id } });
    return NextResponse.json({ message: "Complaint deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete complaint" }, { status: 500 });
  }
}
