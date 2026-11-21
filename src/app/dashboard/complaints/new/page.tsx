import type { Metadata } from "next";
import { redirect } from "next/navigation";
import NewComplaintForm, {
  type ComplaintBuildingOption,
  type ComplaintCategoryOption,
} from "@/components/dashboard/NewComplaintForm";
import { COMPLAINT_SUBMITTERS, requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "New Complaint" };

export default async function NewComplaintPage() {
  const user = await requireRole();
  if (!COMPLAINT_SUBMITTERS.includes(user.role)) {
    redirect("/dashboard/complaints");
  }

  const [dbUser, buildingRows, categoryRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        unitId: true,
        unit: { select: { id: true, buildingId: true } },
      },
    }),
    prisma.building.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        units: {
          orderBy: [{ floor: "asc" }, { unitNumber: "asc" }],
          select: { id: true, unitNumber: true, floor: true },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const buildings: ComplaintBuildingOption[] = buildingRows;
  const categories: ComplaintCategoryOption[] = categoryRows;
  const defaultBuildingId = dbUser?.unit?.buildingId ?? buildings[0]?.id ?? "";
  const defaultUnitId =
    dbUser?.unit?.id ??
    buildings.find((b) => b.id === defaultBuildingId)?.units[0]?.id ??
    "";

  return (
    <NewComplaintForm
      buildings={buildings}
      categories={categories}
      defaultBuildingId={defaultBuildingId}
      defaultUnitId={defaultUnitId}
    />
  );
}
