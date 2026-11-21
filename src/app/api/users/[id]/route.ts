import { NextResponse } from "next/server";
import { getSessionUser, isRole, STAFF_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!STAFF_ROLES.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.role === "MANAGER" && target.role === "OWNER") {
    return NextResponse.json({ error: "Managers cannot edit Owner accounts" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data: {
      name?: string;
      phone?: string | null;
      role?: "RESIDENT" | "MANAGER" | "TECHNICIAN" | "OWNER";
      organizationId?: string | null;
      unitId?: string | null;
    } = {};

    if (body?.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      data.name = name;
    }
    if (body?.phone !== undefined) {
      data.phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    }
    if (body?.role !== undefined) {
      if (!isRole(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      if (target.id === user.id && body.role !== target.role) {
        return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
      }
      if (user.role === "MANAGER" && body.role === "OWNER") {
        return NextResponse.json({ error: "Managers cannot assign the Owner role" }, { status: 403 });
      }
      data.role = body.role;
    }
    if (body?.organizationId !== undefined) {
      const organizationId = typeof body.organizationId === "string" && body.organizationId.trim() ? body.organizationId.trim() : null;
      if (organizationId) {
        const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
        if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 400 });
      }
      data.organizationId = organizationId;
    }
    if (body?.unitId !== undefined) {
      const unitId = typeof body.unitId === "string" && body.unitId.trim() ? body.unitId.trim() : null;
      if (unitId) {
        const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true } });
        if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 400 });
      }
      data.unitId = unitId;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, phone: true, organizationId: true, unitId: true },
    });
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!STAFF_ROLES.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === user.id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.role === "MANAGER" && target.role !== "RESIDENT" && target.role !== "TECHNICIAN") {
    return NextResponse.json({ error: "Managers can only delete residents and technicians" }, { status: 403 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted" });
  } catch {
    return NextResponse.json(
      { error: "Cannot delete this user because they have linked complaints or buildings" },
      { status: 400 },
    );
  }
}
