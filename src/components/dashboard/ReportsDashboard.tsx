"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Loader2,
  Printer,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type ComplaintPriority,
  type ComplaintStatus,
} from "@/components/ui/Badges";
import type { MonthlyAIReportResult } from "@/lib/ai";
import type { MonthlyReportMetrics } from "@/lib/reports";

export interface ReportBuildingOption {
  id: string;
  name: string;
}

const STATUS_BAR_COLORS: Record<ComplaintStatus, string> = {
  PENDING: "bg-amber-500",
  ASSIGNED: "bg-violet-500",
  IN_PROGRESS: "bg-blue-600",
  COMPLETED: "bg-emerald-500",
  CONFIRMED: "bg-teal-500",
};

const PRIORITY_ORDER: readonly ComplaintPriority[] = ["EMERGENCY", "HIGH", "MEDIUM", "LOW"];

const PRIORITY_BAR_COLORS: Record<ComplaintPriority, string> = {
  EMERGENCY: "bg-red-600",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-sky-500",
  LOW: "bg-slate-400",
};

const PRIORITY_LABELS: Record<ComplaintPriority, string> = {
  EMERGENCY: "Emergency",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export default function ReportsDashboard({
  initialMetrics,
  buildings,
}: {
  initialMetrics: MonthlyReportMetrics;
  buildings: ReportBuildingOption[];
}) {
  const [metrics, setMetrics] = useState<MonthlyReportMetrics>(initialMetrics);
  const [month, setMonth] = useState<string>(initialMetrics.month);
  const [buildingId, setBuildingId] = useState<string>(initialMetrics.buildingId ?? "ALL");
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const [customFocus, setCustomFocus] = useState("");
  const [aiReport, setAiReport] = useState<MonthlyAIReportResult | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function fetchMetrics(nextMonth: string, nextBuildingId: string) {
    setError("");
    setLoadingMetrics(true);
    try {
      const qs = new URLSearchParams();
      if (nextMonth) qs.set("month", nextMonth);
      if (nextBuildingId && nextBuildingId !== "ALL") qs.set("buildingId", nextBuildingId);

      const res = await fetch(`/api/reports?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok || !data?.metrics) {
        setError(data.error || "Failed to load report metrics");
        setLoadingMetrics(false);
        return;
      }
      setMetrics(data.metrics);
    } catch {
      setError("Network error while loading report metrics");
    } finally {
      setLoadingMetrics(false);
    }
  }

  function handleMonthChange(nextMonth: string) {
    setMonth(nextMonth);
    if (nextMonth) fetchMetrics(nextMonth, buildingId);
  }

  function handleBuildingChange(nextBuildingId: string) {
    setBuildingId(nextBuildingId);
    fetchMetrics(month, nextBuildingId);
  }

  async function handleGenerateAiReport(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGeneratingAi(true);
    try {
      const res = await fetch("/api/reports/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          buildingId: buildingId === "ALL" ? undefined : buildingId,
          customFocus: customFocus.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.report) {
        setError(data.error || "Failed to generate AI report");
        setGeneratingAi(false);
        return;
      }
      setAiReport(data.report);
      if (data.metrics) setMetrics(data.metrics);
      setGeneratedAt(data.generatedAt ?? new Date().toISOString());
    } catch {
      setError("Network error while generating AI report");
    } finally {
      setGeneratingAi(false);
    }
  }

  async function handleCopyReport() {
    if (!aiReport) return;
    const text = [
      `Fixora Maintenance Performance Report — ${metrics.periodLabel} (${metrics.buildingName})`,
      "",
      "EXECUTIVE SUMMARY",
      aiReport.executiveSummary,
      "",
      "KEY FINDINGS",
      ...aiReport.keyFindings.map((f) => `- ${f}`),
      "",
      "TOP ISSUE PATTERN",
      aiReport.topIssueInsight,
      "",
      "TECHNICIAN RECOGNITION",
      aiReport.technicianHighlight,
      "",
      "ACTIONABLE RECOMMENDATIONS",
      ...aiReport.recommendations.map((r, idx) => `${idx + 1}. ${r}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API unavailable
    }
  }

  const { summary } = metrics;
  const total = summary.totalComplaints;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Monthly Analytics & AI Performance Report"
        subtitle={`${metrics.periodLabel} · ${metrics.buildingName}`}
        action={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <input
              type="month"
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              aria-label="Report month"
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <select
              value={buildingId}
              onChange={(e) => handleBuildingChange(e.target.value)}
              aria-label="Building filter"
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="ALL">All Buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" /> Print Report
            </button>
          </div>
        }
      />

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {/* KPI Strip */}
      <section className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 ${loadingMetrics ? "opacity-60" : ""}`}>
        <StatCard
          label="Total Complaints"
          value={summary.totalComplaints}
          hint={`${summary.openCount} open · ${summary.resolvedCount} resolved`}
          icon={ClipboardList}
        />
        <StatCard
          label="Resolution Rate"
          value={`${summary.resolutionRate}%`}
          hint={`${summary.resolvedCount} of ${summary.totalComplaints} tickets resolved`}
          icon={CheckCircle2}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Avg. Resolution Time"
          value={summary.avgResolutionHours !== null ? `${summary.avgResolutionHours}h` : "—"}
          hint={
            summary.avgResolutionHours !== null
              ? "From ticket creation to resolution"
              : "No resolved tickets in this period"
          }
          icon={Clock}
          tone="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Urgent & Duplicates"
          value={`${summary.emergencyCount} / ${summary.duplicateCount}`}
          hint={`${summary.emergencyCount} emergency · ${summary.duplicateCount} AI duplicate(s)`}
          icon={AlertTriangle}
          tone="bg-amber-50 text-amber-600"
        />
      </section>

      {/* 2-Column Analytics Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: Issues by Category */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Tags className="h-4 w-4 text-blue-600" />
              Issues by Category
            </h2>
            <span className="text-xs text-slate-500">{total} total</span>
          </div>

          {metrics.byCategory.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No category data"
              description="Complaints submitted during this month will be grouped by category here."
            />
          ) : (
            <ul className="mt-4 space-y-3.5">
              {metrics.byCategory.map((item) => (
                <li key={item.categoryName}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{item.categoryName}</span>
                    <span className="text-slate-500">
                      <strong className="font-semibold text-slate-900">{item.count}</strong> · {item.percentage}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#2563EB] transition-all"
                      style={{ width: `${Math.max(item.percentage, item.count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right: Status & Priority Distribution */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Status &amp; Priority Distribution
            </h2>
            <span className="text-xs text-slate-500">{metrics.periodLabel}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                By Status
              </h3>
              <ul className="mt-2.5 space-y-2.5">
                {STATUS_ORDER.map((s) => {
                  const count = metrics.byStatus[s] ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <li key={s}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{STATUS_LABELS[s]}</span>
                        <span className="text-slate-500">
                          <strong className="text-slate-900">{count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${STATUS_BAR_COLORS[s]}`}
                          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                By Priority
              </h3>
              <ul className="mt-2.5 space-y-2.5">
                {PRIORITY_ORDER.map((p) => {
                  const count = metrics.byPriority[p] ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <li key={p}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{PRIORITY_LABELS[p]}</span>
                        <span className="text-slate-500">
                          <strong className="text-slate-900">{count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${PRIORITY_BAR_COLORS[p]}`}
                          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Technician Performance Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Users className="h-4 w-4 text-blue-600" />
            Technician Performance ({metrics.periodLabel})
          </h2>
          <span className="text-xs text-slate-500">
            {metrics.technicianPerformance.length} active technician(s)
          </span>
        </div>

        {metrics.technicianPerformance.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No technician assignments in this period"
            description="Once tickets are assigned to technicians during the selected month, their resolution metrics will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Technician</th>
                  <th className="px-5 py-2.5 font-medium">Assigned</th>
                  <th className="px-5 py-2.5 font-medium">Completed</th>
                  <th className="px-5 py-2.5 font-medium">Active Queue</th>
                  <th className="px-5 py-2.5 font-medium">Avg. Resolution Time</th>
                  <th className="px-5 py-2.5 text-right font-medium">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.technicianPerformance.map((tech) => (
                  <tr key={tech.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-medium text-slate-900">{tech.name}</td>
                    <td className="px-5 py-3 text-slate-700">{tech.totalAssigned}</td>
                    <td className="px-5 py-3 font-medium text-emerald-700">{tech.completedCount}</td>
                    <td className="px-5 py-3 text-slate-600">{tech.activeCount}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {tech.avgResolutionHours !== null ? `${tech.avgResolutionHours}h` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          tech.completionRate >= 75
                            ? "bg-emerald-50 text-emerald-700"
                            : tech.completionRate >= 40
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {tech.completionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* AI Maintenance Performance Report Generator */}
      <section className="rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-blue-600" />
              AI Maintenance Performance Report Generator
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Synthesizes monthly volume, category bottlenecks, technician turnaround, and executive recommendations.
            </p>
          </div>
          {aiReport && (
            <button
              type="button"
              onClick={handleCopyReport}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 print:hidden"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy Report
                </>
              )}
            </button>
          )}
        </div>

        <form onSubmit={handleGenerateAiReport} className="mt-4 flex flex-col gap-2 sm:flex-row print:hidden">
          <input
            type="text"
            value={customFocus}
            onChange={(e) => setCustomFocus(e.target.value)}
            placeholder="Optional custom focus (e.g. Highlight recurring plumbing issues and response delays)..."
            aria-label="Custom report focus"
            className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={generatingAi || loadingMetrics}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {generatingAi ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate AI Report
              </>
            )}
          </button>
        </form>

        {aiReport ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Executive Summary
                </h3>
                {generatedAt && (
                  <span className="text-[11px] text-slate-400">
                    Generated {new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                {aiReport.executiveSummary}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Key Findings
                </h3>
                <ul className="mt-2.5 space-y-2 text-xs text-slate-700">
                  {aiReport.keyFindings.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                      <span className="leading-relaxed">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Tags className="h-3.5 w-3.5 text-blue-600" />
                    Top Issue Pattern
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                    {aiReport.topIssueInsight}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    <Award className="h-3.5 w-3.5 text-emerald-600" />
                    Technician Recognition
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-emerald-950">
                    {aiReport.technicianHighlight}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actionable Recommendations
              </h3>
              <ol className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {aiReport.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs text-slate-700"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-blue-200 bg-white/70 px-4 py-6 text-center text-xs text-slate-500">
            Click <strong className="font-semibold text-slate-700">Generate AI Report</strong> above to produce an executive analysis for {metrics.periodLabel} ({metrics.buildingName}).
          </p>
        )}
      </section>
    </div>
  );
}
