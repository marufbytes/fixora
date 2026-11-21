import { NextResponse } from "next/server";
import { getSessionUser, STAFF_ROLES } from "@/lib/rbac";
import { getMonthlyReportMetrics } from "@/lib/reports";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const buildingId = searchParams.get("buildingId");

    const metrics = await getMonthlyReportMetrics({ month, buildingId });
    return NextResponse.json({ metrics });
  } catch {
    return NextResponse.json({ error: "Failed to load report metrics" }, { status: 500 });
  }
}
