import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser, isRole, STAFF_ROLES } from "@/lib/rbac";
import { listUsers } from "@/lib/user-queries";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!STAFF_ROLES.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roleParam = new URL(req.url).searchParams.get("role");
  if (roleParam && !isRole(roleParam)) {
    return NextResponse.json({ error: "Invalid role filter" }, { status: 400 });
  }

  const users = await listUsers(roleParam && isRole(roleParam) ? roleParam : undefined);
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!STAFF_ROLES.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const phone = typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    const role = body?.role === undefined || body?.role === "" ? "RESIDENT" : body.role;
    const organizationId =
      typeof body?.organizationId === "string" && body.organizationId.trim() ? body.organizationId.trim() : null;
    const unitId = typeof body?.unitId === "string" && body.unitId.trim() ? body.unitId.trim() : null;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!isRole(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    if (user.role === "MANAGER" && role === "OWNER") {
      return NextResponse.json({ error: "Managers cannot create Owner accounts" }, { status: 403 });
    }

    const duplicate = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (duplicate) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

    if (organizationId) {
      const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
      if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }
    if (unitId) {
      const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true } });
      if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 400 });
    }

    const created = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        phone,
        role,
        organizationId,
        unitId,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ user: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
