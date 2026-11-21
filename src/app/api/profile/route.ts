import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const profileSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
  organization: { select: { id: true, name: true } },
  unit: {
    select: {
      id: true,
      floor: true,
      unitNumber: true,
      building: { select: { id: true, name: true } },
    },
  },
} as const;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: profileSelect,
  });

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "UPDATE_PROFILE") {
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const phone =
        typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : null;

      if (!name) {
        return NextResponse.json({ error: "Full name is required" }, { status: 400 });
      }

      const profile = await prisma.user.update({
        where: { id: sessionUser.id },
        data: { name, phone },
        select: profileSelect,
      });

      return NextResponse.json({ profile, message: "Profile updated successfully" });
    }

    if (action === "CHANGE_PASSWORD") {
      const currentPassword =
        typeof body?.currentPassword === "string" ? body.currentPassword : "";
      const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: "Current password and new password are required" },
          { status: 400 },
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters" },
          { status: 400 },
        );
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: { id: true, password: true },
      });

      if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const isValid = await bcrypt.compare(currentPassword, dbUser.password);
      if (!isValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 },
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: sessionUser.id },
        data: { password: hashedPassword },
      });

      return NextResponse.json({ message: "Password updated successfully" });
    }

    return NextResponse.json({ error: "Unsupported profile action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to update account settings" }, { status: 500 });
  }
}
