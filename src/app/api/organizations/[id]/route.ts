import { NextResponse } from "next/server";
import { getSessionUser, OWNER_ONLY } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!OWNER_ONLY.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden: OWNER role required" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }
  if (existing.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden: You do not own this organization" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const address =
      body?.address === null
        ? null
        : typeof body?.address === "string"
          ? body.address.trim() || null
          : undefined;

    if (!name) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        name,
        ...(address !== undefined ? { address } : {}),
      },
      select: {
        id: true,
        name: true,
        address: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { buildings: true, members: true } },
      },
    });

    return NextResponse.json({ organization });
  } catch {
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!OWNER_ONLY.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden: OWNER role required" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }
  if (existing.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden: You do not own this organization" }, { status: 403 });
  }

  try {
    await prisma.organization.delete({ where: { id } });
    return NextResponse.json({ message: "Organization deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 });
  }
}
