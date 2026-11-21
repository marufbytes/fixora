export type TriagePriority = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

import type { MonthlyReportMetrics } from "@/lib/reports";

export interface MonthlyAIReportResult {
  executiveSummary: string;
  keyFindings: string[];
  topIssueInsight: string;
  technicianHighlight: string;
  recommendations: string[];
  source: "gemini" | "fallback";
}

export interface AnalyzeComplaintInput {
  title: string;
  description: string;
  categories: { id: string; name: string }[];
  recentComplaints: {
    id: string;
    title: string;
    description: string;
    unitNumber: string;
  }[];
}

export interface AnalyzeComplaintResult {
  suggestedCategory: string;
  suggestedPriority: TriagePriority;
  issueSummary: string;
  assignedTeam: string;
  suggestedResponse: string;
  troubleshootingSteps: string[];
  isDuplicate: boolean;
  duplicateOfId: string | null;
}

const VALID_PRIORITIES: readonly TriagePriority[] = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"];

interface CategoryRule {
  category: string;
  team: string;
  keywords: string[];
  steps: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "Plumbing",
    team: "Plumbing & Water Systems Team",
    keywords: [
      "water", "leak", "pipe", "drain", "sink", "toilet", "flush", "faucet", "tap", "flood", "sewage", "geyser",
      "পানি", "লিক", "পাইপ", "কল", "টয়লেট", "বাথরুম", "ড্রেন", "বেসিন", "ফ্লাশ",
    ],
    steps: [
      "Shut off the local water isolation valve if active leaking is present.",
      "Inspect pipe joints, seals, traps, and supply lines for visible cracks or blockages.",
      "Clear drainage obstruction or replace faulty washers/fittings and pressure-test for leaks.",
      "Dry affected surfaces and confirm normal water flow with the resident.",
    ],
  },
  {
    category: "Electrical",
    team: "Electrical & Power Maintenance Team",
    keywords: [
      "electric", "power", "spark", "short circuit", "circuit", "breaker", "fuse", "light", "bulb", "switch", "socket", "outlet", "wiring", "voltage", "generator",
      "বিদ্যুৎ", "কারেন্ট", "বাত্তি", "লাইট", "সুইচ", "সকেট", "শর্ট সার্কিট", "তার", "ফ্যান", "জেনারেটর",
    ],
    steps: [
      "Turn off the corresponding circuit breaker at the distribution panel before inspection.",
      "Test voltage and continuity across the affected switch, outlet, or fixture.",
      "Replace damaged wiring, socket, or breaker components according to safety standards.",
      "Restore power and verify stable operation under load.",
    ],
  },
  {
    category: "HVAC / AC",
    team: "HVAC & Climate Control Team",
    keywords: [
      "ac", "air condition", "hvac", "cooling", "heating", "thermostat", "vent", "compressor", "refrigerant", "filter",
      "এসি", "ঠান্ডা", "গরম", "বাতাস", "কম্প্রেসার",
    ],
    steps: [
      "Inspect and clean air filters, evaporator coils, and condensate drain lines.",
      "Check thermostat calibration and electrical supply to the indoor and outdoor units.",
      "Measure refrigerant pressure and inspect compressor/fan operation.",
      "Verify target cooling performance and check for condensate drips.",
    ],
  },
  {
    category: "Elevator",
    team: "Elevator & Lift Specialist Team",
    keywords: [
      "elevator", "lift", "stuck", "cabin", "lift door",
      "লিফট", "আটকে",
    ],
    steps: [
      "Confirm passenger safety immediately via intercom and prioritize cabin release if occupied.",
      "Inspect door sensors, interlocks, and floor alignment indicators.",
      "Check main controller fault codes and power supply stability.",
      "Run multi-floor test cycles before returning the elevator to service.",
    ],
  },
  {
    category: "Carpentry",
    team: "Carpentry & Structural Fixtures Team",
    keywords: [
      "door", "window", "lock", "hinge", "cabinet", "wood", "drawer", "handle", "glass", "latch",
      "দরজা", "জানালা", "তালা", "কাঠ", "কেবিনেট", "হ্যান্ডেল", "ছিটকিনি",
    ],
    steps: [
      "Inspect alignment of door/window frames, hinges, and locking mechanisms.",
      "Tighten, lubricate, or replace worn hinges, handles, or latches.",
      "Plane or adjust wood/frame clearance for smooth closing.",
      "Verify secure locking and smooth operation with the resident.",
    ],
  },
  {
    category: "Cleaning",
    team: "Janitorial & Sanitation Team",
    keywords: [
      "clean", "garbage", "trash", "waste", "smell", "odor", "pest", "cockroach", "stain", "corridor", "stair",
      "ময়লা", "পরিষ্কার", "আবর্জনা", "দুর্গন্ধ", "তেলাপোকা", "মশা",
    ],
    steps: [
      "Inspect the reported area and remove accumulated waste or debris.",
      "Sanitize surfaces using appropriate disinfectant and deodorizing agents.",
      "Apply pest-control treatment if insect or rodent activity is reported.",
      "Confirm cleanliness standards and schedule follow-up inspection.",
    ],
  },
  {
    category: "Security",
    team: "Security & Access Control Team",
    keywords: [
      "security", "cctv", "camera", "intercom", "gate", "alarm", "fire", "guard", "unauthorized", "access",
      "সিকিউরিটি", "ক্যামেরা", "গেট", "ইন্টারকম", "গার্ড", "আগুন",
    ],
    steps: [
      "Verify physical security of the entry point or affected zone immediately.",
      "Check power and network connectivity for CCTV, intercom, or access hardware.",
      "Repair or replace malfunctioning sensors, cameras, or gate locks.",
      "Log incident findings and test alarm/communication links.",
    ],
  },
];

const EMERGENCY_KEYWORDS = [
  "burst", "flood", "flooding", "gas leak", "gas smell", "fire", "smoke", "spark", "sparking", "short circuit",
  "electrocut", "stuck in elevator", "stuck in lift", "trapped", "collapse", "explosion", "live wire",
  "আগুন", "ধোঁয়া", "গ্যাস লিক", "গ্যাস", "শর্ট সার্কিট", "লিফটে আটকে", "পাইপ ফেটে", "বন্যা", "স্পার্ক",
];

const HIGH_KEYWORDS = [
  "no water", "no power", "power outage", "blackout", "overflow", "sewage", "broken lock", "main door",
  "ceiling leak", "heavy leak", "elevator not working", "lift not working", "ac not cooling", "urgent",
  "পানি নেই", "কারেন্ট নেই", "বিদ্যুৎ নেই", "জরুরি", "লিফট নষ্ট", "তালা ভাঙা", "ছাদ থেকে পানি",
];

const LOW_KEYWORDS = [
  "paint", "scratch", "minor", "squeak", "loose handle", "touch up", "cosmetic", "bulb",
  "রং", "সামান্য", "দাগ",
];

function tokenize(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(cleaned);
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function matchAvailableCategory(suggested: string, available: { id: string; name: string }[]): string {
  if (available.length === 0) return suggested;
  const lower = suggested.toLowerCase();
  const exact = available.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact.name;
  const partial = available.find(
    (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()),
  );
  return partial ? partial.name : suggested;
}

function runFallbackAnalyzer(input: AnalyzeComplaintInput): AnalyzeComplaintResult {
  const combined = `${input.title} ${input.description}`.toLowerCase();

  let bestRule: CategoryRule | null = null;
  let bestScore = 0;
  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (combined.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  const baseCategory = bestRule ? bestRule.category : "General Maintenance";
  const suggestedCategory = matchAvailableCategory(baseCategory, input.categories);
  const assignedTeam = bestRule ? bestRule.team : "General Facility Maintenance Team";
  const troubleshootingSteps = bestRule
    ? bestRule.steps
    : [
        "Inspect the reported location and verify the issue details with the resident.",
        "Identify required tools or replacement parts needed for safe repair.",
        "Complete the maintenance work and test functionality.",
        "Update ticket status and attach completion notes.",
      ];

  let suggestedPriority: TriagePriority = "MEDIUM";
  if (EMERGENCY_KEYWORDS.some((kw) => combined.includes(kw))) {
    suggestedPriority = "EMERGENCY";
  } else if (HIGH_KEYWORDS.some((kw) => combined.includes(kw))) {
    suggestedPriority = "HIGH";
  } else if (LOW_KEYWORDS.some((kw) => combined.includes(kw))) {
    suggestedPriority = "LOW";
  }

  let duplicateOfId: string | null = null;
  let bestSim = 0;
  const fullText = `${input.title} ${input.description}`;
  for (const recent of input.recentComplaints) {
    const sim = jaccardSimilarity(fullText, `${recent.title} ${recent.description}`);
    if (sim > bestSim) {
      bestSim = sim;
      duplicateOfId = recent.id;
    }
  }
  const isDuplicate = bestSim >= 0.35 && duplicateOfId !== null;
  if (!isDuplicate) duplicateOfId = null;

  const trimmedTitle = input.title.trim();
  const issueSummary = `${suggestedPriority} priority ${suggestedCategory.toLowerCase()} issue reported: "${trimmedTitle}". Routed to ${assignedTeam}.`;

  const suggestedResponse =
    suggestedPriority === "EMERGENCY"
      ? `We have received your emergency report regarding "${trimmedTitle}" and alerted our ${assignedTeam} for immediate dispatch. Please stay clear of any hazard.`
      : `Thank you for reporting "${trimmedTitle}". Your request has been categorized under ${suggestedCategory} (${suggestedPriority} priority) and routed to our ${assignedTeam}.`;

  return {
    suggestedCategory,
    suggestedPriority,
    issueSummary,
    assignedTeam,
    suggestedResponse,
    troubleshootingSteps,
    isDuplicate,
    duplicateOfId,
  };
}

export async function analyzeComplaint(input: AnalyzeComplaintInput): Promise<AnalyzeComplaintResult> {
  const fallback = runFallbackAnalyzer(input);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return fallback;
  }

  try {
    const categoryNames =
      input.categories.length > 0
        ? input.categories.map((c) => c.name).join(", ")
        : "Plumbing, Electrical, HVAC / AC, Elevator, Carpentry, Cleaning, Security, General Maintenance";

    const recentList =
      input.recentComplaints.length > 0
        ? input.recentComplaints
            .slice(0, 15)
            .map((r) => `- ID: "${r.id}" (Unit ${r.unitNumber}): ${r.title} — ${r.description.slice(0, 140)}`)
            .join("\n")
        : "None";

    const prompt = `You are an AI maintenance triage engine for a property management platform called Fixora.
The complaint may be written in English, Bangla (বাংলা), or Banglish. Respond with clean English JSON fields.

Available categories: [${categoryNames}]

Recent open complaints in the same building (last 7 days):
${recentList}

New complaint to analyze:
Title: ${input.title}
Description: ${input.description}

Return strictly valid JSON with this exact shape:
{
  "suggestedCategory": "Closest category name from Available categories",
  "suggestedPriority": "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY",
  "issueSummary": "Concise 1-2 sentence executive summary of the issue",
  "assignedTeam": "Recommended maintenance team name",
  "suggestedResponse": "Polite, reassuring response message to the resident",
  "troubleshootingSteps": ["Step 1", "Step 2", "Step 3", "Step 4"],
  "isDuplicate": boolean,
  "duplicateOfId": "matching complaint ID from Recent open complaints if isDuplicate is true, otherwise null"
}

Rules:
- Use EMERGENCY for life/property hazards (water pipe burst, flooding, gas leak, fire/smoke, electrical sparks/short circuit, person stuck in elevator).
- Use HIGH for major service outages (no water, power outage, broken main lock, elevator out of service, severe leak).
- Flag isDuplicate=true only if the new complaint clearly describes the same physical incident as one of the recent open complaints.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      },
    );

    clearTimeout(timeout);

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    const rawText: unknown = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof rawText !== "string" || !rawText.trim()) {
      return fallback;
    }

    const parsed = JSON.parse(rawText);

    const suggestedCategory =
      typeof parsed?.suggestedCategory === "string" && parsed.suggestedCategory.trim()
        ? matchAvailableCategory(parsed.suggestedCategory.trim(), input.categories)
        : fallback.suggestedCategory;

    const suggestedPriority: TriagePriority = VALID_PRIORITIES.includes(parsed?.suggestedPriority)
      ? parsed.suggestedPriority
      : fallback.suggestedPriority;

    const issueSummary =
      typeof parsed?.issueSummary === "string" && parsed.issueSummary.trim()
        ? parsed.issueSummary.trim()
        : fallback.issueSummary;

    const assignedTeam =
      typeof parsed?.assignedTeam === "string" && parsed.assignedTeam.trim()
        ? parsed.assignedTeam.trim()
        : fallback.assignedTeam;

    const suggestedResponse =
      typeof parsed?.suggestedResponse === "string" && parsed.suggestedResponse.trim()
        ? parsed.suggestedResponse.trim()
        : fallback.suggestedResponse;

    const troubleshootingSteps =
      Array.isArray(parsed?.troubleshootingSteps) && parsed.troubleshootingSteps.length > 0
        ? parsed.troubleshootingSteps.map((s: unknown) => String(s ?? "").trim()).filter(Boolean).slice(0, 5)
        : fallback.troubleshootingSteps;

    const validIds = new Set(input.recentComplaints.map((r) => r.id));
    const candidateDupId =
      typeof parsed?.duplicateOfId === "string" && validIds.has(parsed.duplicateOfId)
        ? parsed.duplicateOfId
        : null;
    const isDuplicate = Boolean(parsed?.isDuplicate) && candidateDupId !== null;

    return {
      suggestedCategory,
      suggestedPriority,
      issueSummary,
      assignedTeam,
      suggestedResponse,
      troubleshootingSteps: troubleshootingSteps.length > 0 ? troubleshootingSteps : fallback.troubleshootingSteps,
      isDuplicate,
      duplicateOfId: isDuplicate ? candidateDupId : null,
    };
  } catch {
    return fallback;
  }
}

function buildFallbackMonthlyReport(
  metrics: MonthlyReportMetrics,
  customFocus?: string,
): MonthlyAIReportResult {
  const { summary, byCategory, technicianPerformance, periodLabel, buildingName } = metrics;
  const topCat = byCategory[0];
  const topTech = technicianPerformance[0];

  if (summary.totalComplaints === 0) {
    return {
      executiveSummary: `No maintenance complaints were recorded for ${buildingName} during ${periodLabel}. Facility operations remained stable with zero emergency incidents or backlog accumulation.`,
      keyFindings: [
        `0 maintenance tickets submitted in ${periodLabel} across ${buildingName}.`,
        "No open backlog or emergency escalations pending dispatch.",
        "Preventive maintenance inspections can proceed on their regular schedule.",
      ],
      topIssueInsight:
        "No recurring category patterns detected this period due to zero ticket volume.",
      technicianHighlight:
        "No technician assignments were required during this reporting window.",
      recommendations: [
        "Conduct routine preventive checks on plumbing, electrical panels, and elevators.",
        "Verify that residents are onboarded and assigned to their respective building units.",
        "Keep default maintenance categories and technician rosters up to date.",
      ],
      source: "fallback",
    };
  }

  const avgTimeText =
    summary.avgResolutionHours !== null
      ? `an average resolution time of ${summary.avgResolutionHours} hours`
      : "resolutions currently in progress";

  const executiveSummary = `During ${periodLabel} (${buildingName}), Fixora processed ${summary.totalComplaints} maintenance complaints, achieving a ${summary.resolutionRate}% resolution rate (${summary.resolvedCount} resolved, ${summary.openCount} open) with ${avgTimeText}.${
    customFocus ? ` Focus note addressed: "${customFocus}".` : ""
  }`;

  const keyFindings: string[] = [
    `Total volume of ${summary.totalComplaints} tickets: ${summary.resolvedCount} resolved (${summary.resolutionRate}%) and ${summary.openCount} currently active in the queue.`,
    topCat
      ? `${topCat.categoryName} was the highest-volume category, accounting for ${topCat.count} tickets (${topCat.percentage}% of monthly demand).`
      : "Ticket volume was distributed evenly across general maintenance categories.",
    summary.emergencyCount > 0
      ? `${summary.emergencyCount} EMERGENCY priority incident(s) and ${metrics.byPriority.HIGH} HIGH priority ticket(s) required rapid response.`
      : `0 EMERGENCY incidents occurred; ${metrics.byPriority.HIGH} HIGH priority ticket(s) were logged.`,
    summary.duplicateCount > 0
      ? `AI triage flagged ${summary.duplicateCount} potential duplicate report(s), reducing redundant technician dispatches.`
      : "No duplicate complaint clusters were detected this month.",
  ];

  const topIssueInsight = topCat
    ? `${topCat.categoryName} generated ${topCat.count} requests (${topCat.percentage}% of total volume) in ${buildingName}. Proactive inspection of shared ${topCat.categoryName.toLowerCase()} infrastructure is recommended to reduce repeat tickets next month.`
    : "No single category dominated the maintenance queue during this period.";

  const technicianHighlight = topTech
    ? `${topTech.name} led the technician team with ${topTech.completedCount} completed jobs out of ${topTech.totalAssigned} assigned (${topTech.completionRate}% completion rate)${
        topTech.avgResolutionHours !== null
          ? ` and an average turnaround of ${topTech.avgResolutionHours} hours`
          : ""
      }.`
    : "No technicians were assigned to tickets during this period.";

  const recommendations: string[] = [
    topCat
      ? `Schedule preventive maintenance for ${topCat.categoryName} systems to curb the #1 source of resident complaints (${topCat.percentage}%).`
      : "Maintain weekly preventive walk-throughs across common building utilities.",
    summary.openCount > 0
      ? `Prioritize clearing the ${summary.openCount} open ticket(s) (${metrics.byStatus.PENDING} pending assignment, ${metrics.byStatus.IN_PROGRESS + metrics.byStatus.ASSIGNED} in progress).`
      : "All tickets for the period are resolved; encourage residents to confirm any remaining completed items.",
    summary.emergencyCount > 0
      ? `Review root causes for the ${summary.emergencyCount} emergency ticket(s) and stock critical spare parts on-site.`
      : "Keep emergency escalation protocols active for plumbing, electrical, and lift systems.",
    "Balance technician workloads using the active-task counter when dispatching new complaints.",
  ];

  return {
    executiveSummary,
    keyFindings,
    topIssueInsight,
    technicianHighlight,
    recommendations,
    source: "fallback",
  };
}

export async function generateMonthlyAIReport(
  metrics: MonthlyReportMetrics,
  customFocus?: string,
): Promise<MonthlyAIReportResult> {
  const trimmedFocus = typeof customFocus === "string" && customFocus.trim() ? customFocus.trim() : undefined;
  const fallback = buildFallbackMonthlyReport(metrics, trimmedFocus);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return fallback;
  }

  try {
    const prompt = `You are an executive facility management AI analyst for Fixora.
Generate a formal, data-driven monthly maintenance performance report in English based on the following metrics:

Period: ${metrics.periodLabel} (${metrics.month})
Scope: ${metrics.buildingName}
Summary: ${JSON.stringify(metrics.summary)}
By Category: ${JSON.stringify(metrics.byCategory)}
By Status: ${JSON.stringify(metrics.byStatus)}
By Priority: ${JSON.stringify(metrics.byPriority)}
Technician Performance: ${JSON.stringify(metrics.technicianPerformance)}
Manager Custom Focus: ${trimmedFocus ?? "None"}

Return strictly valid JSON with this exact shape:
{
  "executiveSummary": "2-3 sentence formal executive summary citing exact numbers from the metrics",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3", "Finding 4"],
  "topIssueInsight": "1-2 sentences analyzing the top complaint category and recurring patterns",
  "technicianHighlight": "1-2 sentences recognizing top technician performance and workload balance",
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3", "Actionable recommendation 4"]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.25,
          },
        }),
      },
    );

    clearTimeout(timeout);

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    const rawText: unknown = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof rawText !== "string" || !rawText.trim()) {
      return fallback;
    }

    const parsed = JSON.parse(rawText);

    const executiveSummary =
      typeof parsed?.executiveSummary === "string" && parsed.executiveSummary.trim()
        ? parsed.executiveSummary.trim()
        : fallback.executiveSummary;

    const keyFindings =
      Array.isArray(parsed?.keyFindings) && parsed.keyFindings.length > 0
        ? parsed.keyFindings.map((s: unknown) => String(s ?? "").trim()).filter(Boolean).slice(0, 6)
        : fallback.keyFindings;

    const topIssueInsight =
      typeof parsed?.topIssueInsight === "string" && parsed.topIssueInsight.trim()
        ? parsed.topIssueInsight.trim()
        : fallback.topIssueInsight;

    const technicianHighlight =
      typeof parsed?.technicianHighlight === "string" && parsed.technicianHighlight.trim()
        ? parsed.technicianHighlight.trim()
        : fallback.technicianHighlight;

    const recommendations =
      Array.isArray(parsed?.recommendations) && parsed.recommendations.length > 0
        ? parsed.recommendations.map((s: unknown) => String(s ?? "").trim()).filter(Boolean).slice(0, 6)
        : fallback.recommendations;

    return {
      executiveSummary,
      keyFindings: keyFindings.length > 0 ? keyFindings : fallback.keyFindings,
      topIssueInsight,
      technicianHighlight,
      recommendations: recommendations.length > 0 ? recommendations : fallback.recommendations,
      source: "gemini",
    };
  } catch {
    return fallback;
  }
}
