import { NextResponse } from "next/server";
import { getSessionUser, STAFF_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let where: Record<string, unknown> = {};
  if (user.role === "OWNER") {
    where = { ownerId: user.id };
  } else if (user.role === "MANAGER") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });
    if (dbUser?.organizationId) {
      where = { organizationId: dbUser.organizationId };
    }
  }

  const buildings = await prisma.building.findMany({
    where,
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json({ buildings });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    const totalFloorsRaw = Number(body?.totalFloors ?? 1);
    const totalFloors = Number.isInteger(totalFloorsRaw) && totalFloorsRaw >= 1 ? totalFloorsRaw : 1;
    let organizationId =
      typeof body?.organizationId === "string" && body.organizationId.trim()
        ? body.organizationId.trim()
        : null;

    if (!name || !address) {
      return NextResponse.json({ error: "Building name and address are required" }, { status: 400 });
    }

    let ownerId = user.id;

    if (organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, ownerId: true },
      });
      if (!org) {
        return NextResponse.json({ error: "Selected organization not found" }, { status: 404 });
      }
      if (user.role === "OWNER" && org.ownerId !== user.id) {
        return NextResponse.json({ error: "Forbidden: You do not own this organization" }, { status: 403 });
      }
      ownerId = org.ownerId;
    } else if (user.role === "MANAGER") {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organizationId: true, organization: { select: { ownerId: true } } },
      });
      if (dbUser?.organizationId && dbUser.organization) {
        organizationId = dbUser.organizationId;
        ownerId = dbUser.organization.ownerId;
      }
    }

    const building = await prisma.building.create({
      data: {
        name,
        address,
        totalFloors,
        organizationId,
        ownerId,
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

    return NextResponse.json({ building }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create building" }, { status: 500 });
  }
}
