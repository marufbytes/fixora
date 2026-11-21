import type { Metadata } from "next";
import ReportsDashboard, {
  type ReportBuildingOption,
} from "@/components/dashboard/ReportsDashboard";
import { STAFF_ROLES, requireRole } from "@/lib/rbac";
import { getCurrentMonthString, getMonthlyReportMetrics } from "@/lib/reports";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await requireRole(STAFF_ROLES);
  const currentMonth = getCurrentMonthString();

  const [initialMetrics, buildingRows] = await Promise.all([
    getMonthlyReportMetrics({ month: currentMonth }),
    prisma.building.findMany({
      where: user.role === "OWNER" ? { ownerId: user.id } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const buildings: ReportBuildingOption[] = buildingRows;

  return <ReportsDashboard initialMetrics={initialMetrics} buildings={buildings} />;
}
