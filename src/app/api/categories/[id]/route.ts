import { NextResponse } from "next/server";
import { getSessionUser, STAFF_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!STAFF_ROLES.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true, organizationId: true } });
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description =
      body?.description === null ? null : typeof body?.description === "string" ? body.description.trim() || null : undefined;
    const organizationId =
      body?.organizationId === null
        ? null
        : typeof body?.organizationId === "string"
          ? body.organizationId.trim() || null
          : undefined;

    if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });

    if (organizationId) {
      const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { ownerId: true } });
      if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      if (user.role === "OWNER" && org.ownerId !== user.id) {
        return NextResponse.json({ error: "Forbidden: You do not own this organization" }, { status: 403 });
      }
    }

    const targetOrg = organizationId === undefined ? existing.organizationId : organizationId;
    const duplicate = await prisma.category.findFirst({
      where: { id: { not: id }, organizationId: targetOrg, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ error: `Category "${name}" already exists` }, { status: 400 });

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        ...(description !== undefined ? { description } : {}),
        ...(organizationId !== undefined ? { organizationId } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        organizationId: true,
        organization: { select: { id: true, name: true } },
        _count: { select: { complaints: true } },
      },
    });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!STAFF_ROLES.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  try {
    // Linked complaints keep existing; their categoryId is set to null by the schema.
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ message: "Category deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
