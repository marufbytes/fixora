import { NextResponse } from "next/server";
import { getSessionUser, STAFF_ROLES, type SessionUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

async function canAccessBuilding(user: SessionUser, building: { ownerId: string; organizationId: string | null }) {
  if (user.role === "OWNER") {
    return building.ownerId === user.id;
  }
  if (user.role === "MANAGER") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });
    if (dbUser?.organizationId && building.organizationId) {
      return dbUser.organizationId === building.organizationId;
    }
    return true;
  }
  return false;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const building = await prisma.building.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      totalFloors: true,
      organizationId: true,
      ownerId: true,
      createdAt: true,
      organization: { select: { id: true, name: true } },
      units: {
        orderBy: [{ floor: "asc" }, { unitNumber: "asc" }],
        select: {
          id: true,
          floor: true,
          unitNumber: true,
          createdAt: true,
          _count: { select: { residents: true, complaints: true } },
        },
      },
    },
  });

  if (!building) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }

  if (STAFF_ROLES.includes(user.role) && !(await canAccessBuilding(user, building))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ building });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.building.findUnique({
    where: { id },
    select: { id: true, ownerId: true, organizationId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }
  if (!(await canAccessBuilding(user, existing))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    const totalFloorsRaw = Number(body?.totalFloors ?? 1);
    const totalFloors = Number.isInteger(totalFloorsRaw) && totalFloorsRaw >= 1 ? totalFloorsRaw : 1;
    const organizationId =
      body?.organizationId === null
        ? null
        : typeof body?.organizationId === "string"
          ? body.organizationId.trim() || null
          : undefined;

    if (!name || !address) {
      return NextResponse.json({ error: "Building name and address are required" }, { status: 400 });
    }

    const building = await prisma.building.update({
      where: { id },
      data: {
        name,
        address,
        totalFloors,
        ...(organizationId !== undefined ? { organizationId } : {}),
      },
      select: {
        id: true,
        name: true,
        address: true,
        totalFloors: true,
        organizationId: true,
        ownerId: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
        _count: { select: { units: true, complaints: true } },
      },
    });

    return NextResponse.json({ building });
  } catch {
    return NextResponse.json({ error: "Failed to update building" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.building.findUnique({
    where: { id },
    select: { id: true, ownerId: true, organizationId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }
  if (!(await canAccessBuilding(user, existing))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.building.delete({ where: { id } });
    return NextResponse.json({ message: "Building deleted" });
  } catch {
    return NextResponse.json(
      { error: "Cannot delete building with active complaints linked to its units" },
      { status: 400 },
    );
  }
}
