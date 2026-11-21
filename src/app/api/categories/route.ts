import { NextResponse } from "next/server";
import { getSessionUser, STAFF_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  "Plumbing",
  "Electrical",
  "HVAC / AC",
  "Elevator",
  "Carpentry",
  "Cleaning",
  "Security",
  "General Maintenance",
];

const categorySelect = {
  id: true,
  name: true,
  description: true,
  organizationId: true,
  createdAt: true,
  organization: { select: { id: true, name: true } },
  _count: { select: { complaints: true } },
} as const;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: categorySelect,
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!STAFF_ROLES.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const organizationId =
      typeof body?.organizationId === "string" && body.organizationId.trim() ? body.organizationId.trim() : null;

    if (organizationId) {
      const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { ownerId: true } });
      if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      if (user.role === "OWNER" && org.ownerId !== user.id) {
        return NextResponse.json({ error: "Forbidden: You do not own this organization" }, { status: 403 });
      }
      if (user.role === "MANAGER") {
        const me = await prisma.user.findUnique({ where: { id: user.id }, select: { organizationId: true } });
        if (me?.organizationId !== organizationId) {
          return NextResponse.json({ error: "Forbidden: Not your organization" }, { status: 403 });
        }
      }
    }

    const existing = await prisma.category.findMany({ where: { organizationId }, select: { name: true } });
    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

    if (body?.seedDefaults === true) {
      const toCreate = DEFAULT_CATEGORIES.filter((n) => !existingNames.has(n.toLowerCase()));
      if (toCreate.length > 0) {
        await prisma.category.createMany({ data: toCreate.map((name) => ({ name, organizationId })) });
      }
      return NextResponse.json(
        { createdCount: toCreate.length, skippedCount: DEFAULT_CATEGORIES.length - toCreate.length },
        { status: 201 },
      );
    }

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description = typeof body?.description === "string" && body.description.trim() ? body.description.trim() : null;
    if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    if (existingNames.has(name.toLowerCase())) {
      return NextResponse.json({ error: `Category "${name}" already exists` }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name, description, organizationId },
      select: categorySelect,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
