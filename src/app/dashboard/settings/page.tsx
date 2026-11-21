import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { profileSelect } from "@/app/api/profile/route";
import SettingsManager, {
  type UserProfileData,
} from "@/components/dashboard/SettingsManager";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const sessionUser = await requireRole();

  const row = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: profileSelect,
  });

  if (!row) redirect("/login");

  const profile: UserProfileData = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    organizationName: row.organization?.name ?? null,
    unitSummary: row.unit
      ? `${row.unit.building.name} · Unit ${row.unit.unitNumber} (Floor ${row.unit.floor})`
      : null,
  };

  return <SettingsManager profile={profile} />;
}
