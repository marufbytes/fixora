import { NextResponse } from "next/server";
import { getSessionUser, OWNER_ONLY, STAFF_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

interface OrganizationRow {
  id: string;
  name: string;
  address: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { buildings: number; members: number };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let where: Record<string, unknown> = {};
  if (user.role === "OWNER") {
    where = { ownerId: user.id };
  } else {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });
    if (!dbUser?.organizationId) {
      return NextResponse.json({ organizations: [] });
    }
    where = { id: dbUser.organizationId };
  }

  const organizations: OrganizationRow[] = await prisma.organization.findMany({
    where,
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json({ organizations });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!OWNER_ONLY.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden: OWNER role required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const address = typeof body?.address === "string" && body.address.trim() ? body.address.trim() : null;

    if (!name) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        address,
        ownerId: user.id,
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

    const ownerRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });
    if (!ownerRecord?.organizationId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { organizationId: organization.id },
      });
    }

    return NextResponse.json({ organization }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
