import { prisma } from "@/lib/prisma";
import type { ComplaintPriority, ComplaintStatus } from "@/components/ui/Badges";

export interface CategoryBreakdownItem {
  categoryName: string;
  count: number;
  percentage: number;
}

export interface TechnicianPerformanceItem {
  id: string;
  name: string;
  totalAssigned: number;
  completedCount: number;
  activeCount: number;
  avgResolutionHours: number | null;
  completionRate: number;
}

export interface MonthlyReportSummary {
  totalComplaints: number;
  resolvedCount: number;
  openCount: number;
  emergencyCount: number;
  duplicateCount: number;
  resolutionRate: number;
  avgResolutionHours: number | null;
}

export interface MonthlyReportMetrics {
  periodLabel: string;
  month: string;
  buildingId: string | null;
  buildingName: string;
  summary: MonthlyReportSummary;
  byCategory: CategoryBreakdownItem[];
  byStatus: Record<ComplaintStatus, number>;
  byPriority: Record<ComplaintPriority, number>;
  technicianPerformance: TechnicianPerformanceItem[];
}

export function getCurrentMonthString(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonthRange(monthParam?: string | null): {
  month: string;
  start: Date;
  end: Date;
  periodLabel: string;
} {
  const fallback = getCurrentMonthString();
  const normalized =
    typeof monthParam === "string" && /^\d{4}-\d{2}$/.test(monthParam.trim())
      ? monthParam.trim()
      : fallback;

  const [yStr, mStr] = normalized.split("-");
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return parseMonthRange(fallback);
  }

  const start = new Date(year, monthIdx, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIdx + 1, 1, 0, 0, 0, 0);
  const periodLabel = start.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return { month: normalized, start, end, periodLabel };
}

export async function getMonthlyReportMetrics(params?: {
  month?: string | null;
  buildingId?: string | null;
}): Promise<MonthlyReportMetrics> {
  const { month, start, end, periodLabel } = parseMonthRange(params?.month);
  const rawBuildingId =
    typeof params?.buildingId === "string" &&
    params.buildingId.trim() &&
    params.buildingId.trim() !== "ALL"
      ? params.buildingId.trim()
      : null;

  let buildingName = "All Buildings";
  let effectiveBuildingId: string | null = null;

  if (rawBuildingId) {
    const b = await prisma.building.findUnique({
      where: { id: rawBuildingId },
      select: { id: true, name: true },
    });
    if (b) {
      effectiveBuildingId = b.id;
      buildingName = b.name;
    }
  }

  const where: Record<string, unknown> = {
    createdAt: { gte: start, lt: end },
  };
  if (effectiveBuildingId) {
    where.OR = [
      { buildingId: effectiveBuildingId },
      { unit: { buildingId: effectiveBuildingId } },
    ];
  }

  const complaints = await prisma.complaint.findMany({
    where,
    select: {
      id: true,
      priority: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { name: true } },
      technician: { select: { id: true, name: true } },
      aiAnalysis: { select: { isDuplicate: true, suggestedCategory: true } },
      statusHistory: {
        where: { toStatus: { in: ["COMPLETED", "CONFIRMED"] } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      },
    },
  });

  const byStatus: Record<ComplaintStatus, number> = {
    PENDING: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CONFIRMED: 0,
  };

  const byPriority: Record<ComplaintPriority, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    EMERGENCY: 0,
  };

  const categoryCounts = new Map<string, number>();
  const techStats = new Map<
    string,
    {
      id: string;
      name: string;
      totalAssigned: number;
      completedCount: number;
      activeCount: number;
      resolutionHoursSum: number;
      resolutionSampleCount: number;
    }
  >();

  let duplicateCount = 0;
  let totalResolutionHoursSum = 0;
  let totalResolutionSamples = 0;

  for (const c of complaints) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    byPriority[c.priority] = (byPriority[c.priority] ?? 0) + 1;

    if (c.aiAnalysis?.isDuplicate) {
      duplicateCount++;
    }

    const catName =
      c.category?.name ?? c.aiAnalysis?.suggestedCategory ?? "Uncategorized";
    categoryCounts.set(catName, (categoryCounts.get(catName) ?? 0) + 1);

    const isResolved = c.status === "COMPLETED" || c.status === "CONFIRMED";
    let ticketResolutionHours: number | null = null;

    if (isResolved) {
      const resolvedAt = c.statusHistory[0]?.createdAt ?? c.updatedAt;
      const diffMs = Math.max(0, resolvedAt.getTime() - c.createdAt.getTime());
      ticketResolutionHours = diffMs / (1000 * 60 * 60);
      totalResolutionHoursSum += ticketResolutionHours;
      totalResolutionSamples++;
    }

    if (c.technician) {
      const existing = techStats.get(c.technician.id) ?? {
        id: c.technician.id,
        name: c.technician.name,
        totalAssigned: 0,
        completedCount: 0,
        activeCount: 0,
        resolutionHoursSum: 0,
        resolutionSampleCount: 0,
      };
      existing.totalAssigned++;
      if (isResolved) {
        existing.completedCount++;
        if (ticketResolutionHours !== null) {
          existing.resolutionHoursSum += ticketResolutionHours;
          existing.resolutionSampleCount++;
        }
      } else {
        existing.activeCount++;
      }
      techStats.set(c.technician.id, existing);
    }
  }

  const totalComplaints = complaints.length;
  const resolvedCount = byStatus.COMPLETED + byStatus.CONFIRMED;
  const openCount = byStatus.PENDING + byStatus.ASSIGNED + byStatus.IN_PROGRESS;
  const emergencyCount = byPriority.EMERGENCY;
  const resolutionRate =
    totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 100) : 0;
  const avgResolutionHours =
    totalResolutionSamples > 0
      ? Number((totalResolutionHoursSum / totalResolutionSamples).toFixed(1))
      : null;

  const byCategory: CategoryBreakdownItem[] = Array.from(categoryCounts.entries())
    .map(([categoryName, count]) => ({
      categoryName,
      count,
      percentage: totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const technicianPerformance: TechnicianPerformanceItem[] = Array.from(
    techStats.values(),
  )
    .map((t) => ({
      id: t.id,
      name: t.name,
      totalAssigned: t.totalAssigned,
      completedCount: t.completedCount,
      activeCount: t.activeCount,
      avgResolutionHours:
        t.resolutionSampleCount > 0
          ? Number((t.resolutionHoursSum / t.resolutionSampleCount).toFixed(1))
          : null,
      completionRate:
        t.totalAssigned > 0 ? Math.round((t.completedCount / t.totalAssigned) * 100) : 0,
    }))
    .sort((a, b) => b.completedCount - a.completedCount || b.totalAssigned - a.totalAssigned);

  return {
    periodLabel,
    month,
    buildingId: effectiveBuildingId,
    buildingName,
    summary: {
      totalComplaints,
      resolvedCount,
      openCount,
      emergencyCount,
      duplicateCount,
      resolutionRate,
      avgResolutionHours,
    },
    byCategory,
    byStatus,
    byPriority,
    technicianPerformance,
  };
}
