import { NextResponse } from "next/server";
import { getSessionUser, STAFF_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatTicketId } from "@/components/ui/Badges";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      residentId: true,
      technicianId: true,
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  }

  const hasAccess =
    STAFF_ROLES.includes(user.role) ||
    (user.role === "RESIDENT" && complaint.residentId === user.id) ||
    (user.role === "TECHNICIAN" && complaint.technicianId === user.id);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Comment content cannot be empty" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        complaintId: complaint.id,
        authorId: user.id,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, name: true, role: true } },
      },
    });

    const staffUsers = await prisma.user.findMany({
      where: { role: { in: ["MANAGER", "OWNER"] } },
      select: { id: true },
    });

    const recipients = new Set<string>();
    if (complaint.residentId !== user.id) recipients.add(complaint.residentId);
    if (complaint.technicianId && complaint.technicianId !== user.id) {
      recipients.add(complaint.technicianId);
    }
    for (const s of staffUsers) {
      if (s.id !== user.id) recipients.add(s.id);
    }

    if (recipients.size > 0) {
      const ticketCode = formatTicketId(complaint.id);
      const preview = content.length > 90 ? `${content.slice(0, 90)}...` : content;
      await prisma.notification.createMany({
        data: Array.from(recipients).map((uid) => ({
          userId: uid,
          title: `New Comment on ${ticketCode}`,
          message: `${user.name} commented on "${complaint.title}": "${preview}"`,
          link: `/dashboard/complaints/${complaint.id}`,
        })),
      });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
