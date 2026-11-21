import { NextResponse } from "next/server";
import { generateMonthlyAIReport } from "@/lib/ai";
import { getSessionUser, STAFF_ROLES } from "@/lib/rbac";
import { getMonthlyReportMetrics } from "@/lib/reports";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const month = typeof body?.month === "string" ? body.month : undefined;
    const buildingId = typeof body?.buildingId === "string" ? body.buildingId : undefined;
    const customFocus = typeof body?.customFocus === "string" ? body.customFocus : undefined;

    const metrics = await getMonthlyReportMetrics({ month, buildingId });
    const report = await generateMonthlyAIReport(metrics, customFocus);

    return NextResponse.json({
      report,
      metrics,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate AI report" }, { status: 500 });
  }
}
