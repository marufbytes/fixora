import { NextResponse } from "next/server";
import { getSessionUser, STAFF_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: buildingId } = await params;
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: { id: true, ownerId: true, organizationId: true },
  });
  if (!building) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }
  if (user.role === "OWNER" && building.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const floor = typeof body?.floor === "string" || typeof body?.floor === "number" ? String(body.floor).trim() : "";
    if (!floor) {
      return NextResponse.json({ error: "Floor is required" }, { status: 400 });
    }

    const candidates: string[] = [];

    if (typeof body?.unitNumber === "string" && body.unitNumber.trim()) {
      candidates.push(body.unitNumber.trim());
    } else if (typeof body?.unitNumbers === "string" && body.unitNumbers.trim()) {
      for (const part of body.unitNumbers.split(",")) {
        const trimmed = part.trim();
        if (trimmed) candidates.push(trimmed);
      }
    } else if (Array.isArray(body?.unitNumbers)) {
      for (const item of body.unitNumbers) {
        const trimmed = String(item ?? "").trim();
        if (trimmed) candidates.push(trimmed);
      }
    } else if (body?.count !== undefined) {
      const count = Number(body.count);
      const prefix = typeof body?.prefix === "string" ? body.prefix.trim() : floor;
      if (!Number.isInteger(count) || count < 1 || count > 100) {
        return NextResponse.json({ error: "Count must be between 1 and 100" }, { status: 400 });
      }
      for (let i = 1; i <= count; i++) {
        const suffix = count <= 26 && body?.useLetters ? String.fromCharCode(64 + i) : String(i).padStart(2, "0");
        candidates.push(`${prefix}${suffix}`);
      }
    }

    const uniqueRequested = Array.from(new Set(candidates));
    if (uniqueRequested.length === 0) {
      return NextResponse.json({ error: "Provide at least one unit number" }, { status: 400 });
    }

    const existingUnits: { unitNumber: string }[] = await prisma.unit.findMany({
      where: { buildingId },
      select: { unitNumber: true },
    });
    const existingSet = new Set(existingUnits.map((u) => u.unitNumber.toLowerCase()));

    const duplicates = uniqueRequested.filter((u) => existingSet.has(u.toLowerCase()));
    const toInsert = uniqueRequested.filter((u) => !existingSet.has(u.toLowerCase()));

    if (toInsert.length === 0) {
      return NextResponse.json(
        { error: `Unit number(s) already exist in this building: ${duplicates.join(", ")}` },
        { status: 409 },
      );
    }

    await prisma.unit.createMany({
      data: toInsert.map((unitNumber) => ({
        buildingId,
        floor,
        unitNumber,
      })),
    });

    return NextResponse.json(
      {
        createdCount: toInsert.length,
        createdUnits: toInsert,
        skippedDuplicates: duplicates,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Failed to create unit(s)" }, { status: 500 });
  }
}
