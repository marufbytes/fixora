import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  if (existing.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
      select: {
        id: true,
        title: true,
        message: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ notification });
  } catch {
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  if (existing.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ message: "Notification deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
