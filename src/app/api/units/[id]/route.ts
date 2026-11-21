import { NextResponse } from "next/server";
import { getSessionUser, STAFF_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.unit.findUnique({
    where: { id },
    select: { id: true, buildingId: true, building: { select: { ownerId: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }
  if (user.role === "OWNER" && existing.building.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const floor = typeof body?.floor === "string" || typeof body?.floor === "number" ? String(body.floor).trim() : "";
    const unitNumber = typeof body?.unitNumber === "string" ? body.unitNumber.trim() : "";

    if (!floor || !unitNumber) {
      return NextResponse.json({ error: "Floor and unit number are required" }, { status: 400 });
    }

    const duplicate = await prisma.unit.findFirst({
      where: {
        buildingId: existing.buildingId,
        id: { not: id },
        unitNumber: { equals: unitNumber, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: `Unit ${unitNumber} already exists in this building` }, { status: 409 });
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: { floor, unitNumber },
      select: {
        id: true,
        floor: true,
        unitNumber: true,
        createdAt: true,
        _count: { select: { residents: true, complaints: true } },
      },
    });

    return NextResponse.json({ unit });
  } catch {
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
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
  const existing = await prisma.unit.findUnique({
    where: { id },
    select: { id: true, building: { select: { ownerId: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }
  if (user.role === "OWNER" && existing.building.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.unit.delete({ where: { id } });
    return NextResponse.json({ message: "Unit deleted" });
  } catch {
    return NextResponse.json(
      { error: "Cannot delete unit while complaints are linked to it" },
      { status: 400 },
    );
  }
}
