/**
 * Institutional Intelligence — cross-programme analysis (Amendment 10 §6).
 * Leadership only. Consumes programme insights + INS-01…09.
 */
import type { AppState, ID, Insight, InsightSeverity } from "@/types/domain";
import { dayDiff } from "@/lib/rules/dates";
import { milestoneHealth } from "@/lib/rules/dependencies";
import { formatINR } from "@/lib/format/inr";
import {
  delayedActivities,
} from "@/selectors/core";
import {
  programmeFinancials,
} from "@/selectors/finance";
import {
  type LeadershipFilters,
  portfolioClassificationCounts,
  programmeRows,
  resolveFy,
} from "@/selectors/leadership";
import {
  programmeInsights,
  sortInsights,
  visibleProgrammeInsights,
} from "@/selectors/intelligence";

function matchesPortfolio(
  state: AppState,
  programmeId: ID,
  filters?: LeadershipFilters,
): boolean {
  return programmeRows(state, filters).some((r) => r.id === programmeId);
}

export function institutionalPerformance(
  state: AppState,
  filters?: LeadershipFilters,
) {
  const fy = resolveFy(state, filters);
  const counts = portfolioClassificationCounts(state, filters);
  const rows = programmeRows(state, filters);
  const delayedProgrammeIds = new Set(
    delayedActivities(state)
      .filter((a) => matchesPortfolio(state, a.programmeId, filters))
      .map((a) => a.programmeId),
  );

  let milestonesDue = 0;
  let milestonesAchieved = 0;
  let activitiesTotal = 0;
  let activitiesCompleted = 0;
  let onTimeCompleted = 0;

  for (const row of rows) {
    for (const m of Object.values(state.milestones)) {
      if (m.programmeId !== row.id) continue;
      if (dayDiff(m.targetDate, state.meta.demoDate) < 0) continue;
      milestonesDue += 1;
      if (milestoneHealth(state, m.id) === "achieved") {
        milestonesAchieved += 1;
      }
    }
    for (const a of Object.values(state.activities)) {
      if (a.programmeId !== row.id || a.status === "cancelled") continue;
      activitiesTotal += 1;
      if (a.status === "completed") {
        activitiesCompleted += 1;
        const end = a.actualEnd ?? a.plannedEnd;
        if (dayDiff(a.plannedEnd, end) <= 0) onTimeCompleted += 1;
      }
    }
  }

  const deliveryPerformance =
    activitiesCompleted === 0 ? null : onTimeCompleted / activitiesCompleted;

  return {
    fy: fy.label,
    total: rows.length,
    completed: counts.completed,
    ongoing: counts.ongoing,
    upcoming: counts.upcoming,
    delayed: delayedProgrammeIds.size,
    milestoneAchievement:
      milestonesDue === 0 ? null : milestonesAchieved / milestonesDue,
    activityCompletion:
      activitiesTotal === 0 ? null : activitiesCompleted / activitiesTotal,
    deliveryPerformance,
    formula:
      "Delivery performance = on-time completed activities ÷ completed activities",
  };
}

export function institutionalFinancial(
  state: AppState,
  filters?: LeadershipFilters,
) {
  const rows = programmeRows(state, filters);
  let budget = 0;
  let allocated = 0;
  let verified = 0;
  let pending = 0;
  let reported = 0;
  const byProgramme = rows.map((r) => {
    const fin = programmeFinancials(state, r.id);
    budget += fin.budget;
    allocated += fin.allocated;
    verified += fin.verified;
    pending += fin.pending;
    reported += fin.reported;
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      category: r.category,
      budget: fin.budget,
      cost: fin.reported,
      verified: fin.verified,
      variance: fin.budget - fin.reported,
      utilisation: fin.budget === 0 ? null : fin.verified / fin.budget,
    };
  });

  const byCategoryMap = new Map<
    string,
    { category: string; budget: number; cost: number; verified: number }
  >();
  for (const p of byProgramme) {
    const key = p.category ?? "Other";
    const cur = byCategoryMap.get(key) ?? {
      category: key,
      budget: 0,
      cost: 0,
      verified: 0,
    };
    cur.budget += p.budget;
    cur.cost += p.cost;
    cur.verified += p.verified;
    byCategoryMap.set(key, cur);
  }

  return {
    budget,
    allocated,
    verified,
    pending,
    reported,
    remaining: budget - verified,
    utilisation: budget === 0 ? null : verified / budget,
    variance: budget - reported,
    byProgramme,
    byCategory: [...byCategoryMap.values()],
  };
}

export function institutionalOperational(
  state: AppState,
  filters?: LeadershipFilters,
) {
  const rows = programmeRows(state, filters);
  const delayed = rows
    .map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      category: r.category,
      delayed: r.delayed,
      progress: r.progress,
    }))
    .filter((r) => r.delayed > 0)
    .sort((a, b) => b.delayed - a.delayed);

  const byCategory = new Map<
    string,
    { category: string; programmes: number; delayed: number; progressSum: number }
  >();
  for (const r of rows) {
    const key = r.category ?? "Other";
    const cur = byCategory.get(key) ?? {
      category: key,
      programmes: 0,
      delayed: 0,
      progressSum: 0,
    };
    cur.programmes += 1;
    if (r.delayed > 0) cur.delayed += 1;
    cur.progressSum += r.progress;
    byCategory.set(key, cur);
  }

  // Repeated bottlenecks: same activity name delayed in ≥3 programmes
  const nameToProgrammes = new Map<string, Set<ID>>();
  for (const a of delayedActivities(state)) {
    if (!matchesPortfolio(state, a.programmeId, filters)) continue;
    const set = nameToProgrammes.get(a.name) ?? new Set();
    set.add(a.programmeId);
    nameToProgrammes.set(a.name, set);
  }
  const bottlenecks = [...nameToProgrammes.entries()]
    .filter(([, set]) => set.size >= 3)
    .map(([name, set]) => ({ name, programmeCount: set.size }));

  // Reporting completion
  let expected = 0;
  let submitted = 0;
  for (const r of rows) {
    for (const a of Object.values(state.activities)) {
      if (a.programmeId !== r.id || a.status === "cancelled") continue;
      if (
        a.status === "completed" ||
        a.status === "in_progress" ||
        a.status === "delayed"
      ) {
        expected += 1;
        const report = Object.values(state.reports).find(
          (rep) =>
            rep.activityId === a.id &&
            (rep.status === "submitted" || rep.status === "released"),
        );
        if (report) submitted += 1;
      }
    }
  }

  return {
    delayedProgrammes: delayed,
    categoryPerformance: [...byCategory.values()].map((c) => ({
      ...c,
      avgProgress: c.programmes === 0 ? 0 : c.progressSum / c.programmes,
    })),
    bottlenecks,
    reportingCompletion: expected === 0 ? null : submitted / expected,
  };
}

export function institutionalInsights(
  state: AppState,
  filters?: LeadershipFilters,
): Insight[] {
  const thr = state.meta.settings.intelligence;
  const demo = state.meta.demoDate;
  const fy = resolveFy(state, filters);
  const rows = programmeRows(state, filters);
  const out: Insight[] = [];

  if (rows.length < thr.minSample) {
    return [
      {
        key: "INS-MIN:portfolio",
        ruleId: "INS-MIN",
        scope: "institution",
        category: "performance",
        title: "Insufficient sample for institutional rules",
        severity: "low",
        evidence: [
          {
            label: "Programmes in filtered portfolio",
            value: String(rows.length),
            kind: "fact",
          },
          {
            label: "Minimum sample",
            value: String(thr.minSample),
            kind: "fact",
          },
        ],
        explanation:
          "Fewer programmes than the configured minimum sample are in scope. Institutional pattern rules are suppressed to avoid over-claiming.",
        recommendation:
          "Widen filters or load additional sample programmes before relying on institutional pattern insights.",
        suggestedDueDate: demo,
      },
    ];
  }

  // Promote high/critical programme insights (INS-09 + risk centre feed)
  for (const row of rows) {
    for (const item of visibleProgrammeInsights(state, row.id)) {
      if (item.severity !== "critical" && item.severity !== "high") continue;
      out.push({
        ...item,
        key: `INS-09:${item.key}`,
        ruleId: item.severity === "critical" ? "INS-09" : item.ruleId,
        scope: "institution",
        title: `${row.code}: ${item.title}`,
      });
    }
  }

  // INS-01 category delay rate
  const byCat = new Map<string, { total: number; delayed: number; id: string }>();
  for (const r of rows) {
    const key = r.categoryId ?? "none";
    const cur = byCat.get(key) ?? {
      total: 0,
      delayed: 0,
      id: key,
    };
    cur.total += 1;
    if (r.delayed > 0) cur.delayed += 1;
    byCat.set(key, cur);
  }
  for (const [catId, stats] of byCat) {
    if (stats.total < thr.minSample) continue;
    const rate = stats.delayed / stats.total;
    if (rate < 0.5) continue;
    const name = state.categories[catId]?.name ?? "Other";
    out.push({
      key: `INS-01:${catId}`,
      ruleId: "INS-01",
      scope: "institution",
      category: "risk",
      title: `High delay rate in ${name}`,
      severity: "high",
      evidence: [
        {
          label: "Programmes in category",
          value: String(stats.total),
          kind: "fact",
        },
        {
          label: "With delayed activities",
          value: String(stats.delayed),
          kind: "calculated",
        },
        {
          label: "Delay rate",
          value: `${Math.round(rate * 100)}%`,
          kind: "calculated",
        },
      ],
      explanation: `At least half of programmes in ${name} have delayed or overdue activities (n ≥ ${thr.minSample}).`,
      recommendation:
        "Review category delivery standards and assign Lead support to the most delayed programmes.",
      suggestedDueDate: demo,
      suggestedOwnerId: undefined,
    });
  }

  // INS-02 variance ranking
  const overruns = rows
    .map((r) => {
      const fin = programmeFinancials(state, r.id);
      if (fin.budget <= 0 || fin.reported <= fin.budget) return null;
      return {
        id: r.id,
        code: r.code,
        name: r.name,
        ratio: (fin.reported - fin.budget) / fin.budget,
        deficit: fin.reported - fin.budget,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b!.ratio - a!.ratio))
    .slice(0, 3) as {
    id: ID;
    code: string;
    name: string;
    ratio: number;
    deficit: number;
  }[];

  for (const o of overruns) {
    out.push({
      key: `INS-02:${o.id}`,
      ruleId: "INS-02",
      scope: "institution",
      category: "financial",
      title: `High financial variance: ${o.code}`,
      severity: "high",
      programmeId: o.id,
      evidence: [
        {
          label: "Deficit",
          value: formatINR(o.deficit),
          kind: "calculated",
        },
        {
          label: "Overrun ratio",
          value: `${Math.round(o.ratio * 100)}%`,
          kind: "calculated",
        },
      ],
      explanation:
        "Programme reported cost exceeds approved budget (top variance ranking).",
      recommendation:
        "Leadership review of spend controls and reallocation for this programme.",
      suggestedDueDate: demo,
      suggestedOwnerId: state.programmes[o.id]?.leadId,
    });
  }

  // INS-03 verification bottleneck
  {
    let pendingValue = 0;
    let reportedValue = 0;
    let pendingAgeSum = 0;
    let pendingCount = 0;
    const leadPending = new Map<ID, number>();
    for (const r of rows) {
      const fin = programmeFinancials(state, r.id);
      pendingValue += fin.pending;
      reportedValue += fin.reported;
      const lead = state.programmes[r.id]?.leadId;
      if (lead) {
        leadPending.set(lead, (leadPending.get(lead) ?? 0) + fin.pending);
      }
      for (const e of Object.values(state.expenses)) {
        if (e.programmeId !== r.id || e.status !== "submitted" || !e.submittedAt)
          continue;
        pendingCount += 1;
        pendingAgeSum += dayDiff(e.submittedAt.slice(0, 10), demo);
      }
    }
    const avgAge = pendingCount === 0 ? 0 : pendingAgeSum / pendingCount;
    const share = reportedValue === 0 ? 0 : pendingValue / reportedValue;
    if (avgAge > thr.pendingVerifyDays || share > 0.2) {
      const topLead = [...leadPending.entries()].sort((a, b) => b[1] - a[1])[0];
      const severity: InsightSeverity = avgAge > 14 || share > 0.3 ? "high" : "medium";
      out.push({
        key: "INS-03:portfolio",
        ruleId: "INS-03",
        scope: "institution",
        category: "financial",
        title: "Portfolio verification bottleneck",
        severity,
        evidence: [
          {
            label: "Pending verification",
            value: formatINR(pendingValue),
            kind: "calculated",
          },
          {
            label: "Share of reported",
            value: `${Math.round(share * 100)}%`,
            kind: "calculated",
          },
          {
            label: "Average pending age (days)",
            value: String(Math.round(avgAge)),
            kind: "calculated",
          },
          {
            label: "Lead with highest pending",
            value: topLead
              ? state.users[topLead[0]]?.name ?? topLead[0]
              : "—",
            kind: "fact",
          },
        ],
        explanation:
          "Pending expense verification is elevated across the portfolio (age or share thresholds).",
        recommendation:
          "Prioritise verification queues for leads with the highest pending value.",
        suggestedDueDate: demo,
        suggestedOwnerId: topLead?.[0],
      });
    }
  }

  // INS-04 repeated activity delays
  {
    const nameMap = new Map<string, Set<ID>>();
    for (const a of delayedActivities(state)) {
      if (!matchesPortfolio(state, a.programmeId, filters)) continue;
      const set = nameMap.get(a.name) ?? new Set();
      set.add(a.programmeId);
      nameMap.set(a.name, set);
    }
    for (const [name, set] of nameMap) {
      if (set.size < 3) continue;
      out.push({
        key: `INS-04:${name}`,
        ruleId: "INS-04",
        scope: "institution",
        category: "operational",
        title: `Repeated delay pattern: ${name}`,
        severity: "medium",
        evidence: [
          {
            label: "Programmes affected",
            value: String(set.size),
            kind: "calculated",
          },
        ],
        explanation:
          "The same activity name is delayed across three or more programmes.",
        recommendation:
          "Standardise this activity block and share recovery practices across leads.",
        suggestedDueDate: demo,
      });
    }
  }

  // INS-05 lead support
  {
    const byLead = new Map<
      ID,
      { total: number; delayed: number; highRisk: number }
    >();
    for (const r of rows) {
      const lead = r.leadId;
      if (!lead) continue;
      const cur = byLead.get(lead) ?? { total: 0, delayed: 0, highRisk: 0 };
      cur.total += 1;
      if (r.delayed > 0) cur.delayed += 1;
      const critical = programmeInsights(state, r.id).filter(
        (i) => i.severity === "critical" || i.severity === "high",
      ).length;
      if (critical > 0) cur.highRisk += 1;
      byLead.set(lead, cur);
    }
    for (const [leadId, stats] of byLead) {
      const delayedShare = stats.total === 0 ? 0 : stats.delayed / stats.total;
      if (stats.highRisk < 2 && delayedShare < 0.4) continue;
      out.push({
        key: `INS-05:${leadId}`,
        ruleId: "INS-05",
        scope: "institution",
        category: "risk",
        title: `Lead portfolio under pressure: ${state.users[leadId]?.name ?? leadId}`,
        severity: "high",
        evidence: [
          {
            label: "High/critical programmes",
            value: String(stats.highRisk),
            kind: "calculated",
          },
          {
            label: "Delayed share",
            value: `${Math.round(delayedShare * 100)}%`,
            kind: "calculated",
          },
        ],
        explanation:
          "This Programme Lead has multiple high-risk programmes or a high share of delayed programmes.",
        recommendation:
          "Provide additional leadership support and review capacity across the lead’s portfolio.",
        suggestedDueDate: demo,
        suggestedOwnerId: leadId,
      });
    }
  }

  // INS-06 reporting completion
  {
    const ops = institutionalOperational(state, filters);
    if (
      ops.reportingCompletion != null &&
      ops.reportingCompletion < 0.7
    ) {
      out.push({
        key: "INS-06:portfolio",
        ruleId: "INS-06",
        scope: "institution",
        category: "operational",
        title: "Low portfolio reporting completion",
        severity: "medium",
        evidence: [
          {
            label: "Reporting completion",
            value: `${Math.round(ops.reportingCompletion * 100)}%`,
            kind: "calculated",
          },
        ],
        explanation:
          "Fewer than 70% of expected activity reports are submitted or released portfolio-wide.",
        recommendation:
          "Reinforce reporting cadence with Programme Managers and track overdue reports weekly.",
        suggestedDueDate: demo,
      });
    }
  }

  // INS-07 milestones missed in category
  {
    const missedByCat = new Map<string, number>();
    for (const r of rows) {
      for (const m of Object.values(state.milestones)) {
        if (m.programmeId !== r.id) continue;
        const inFy =
          dayDiff(fy.start, m.targetDate) >= 0 &&
          dayDiff(m.targetDate, fy.end) >= 0;
        if (!inFy) continue;
        if (milestoneHealth(state, m.id) !== "missed") continue;
        const key = r.categoryId ?? "none";
        missedByCat.set(key, (missedByCat.get(key) ?? 0) + 1);
      }
    }
    for (const [catId, count] of missedByCat) {
      if (count < 2) continue;
      out.push({
        key: `INS-07:${catId}`,
        ruleId: "INS-07",
        scope: "institution",
        category: "risk",
        title: `Missed milestones in ${state.categories[catId]?.name ?? "category"}`,
        severity: "high",
        evidence: [
          {
            label: "Missed milestones in FY",
            value: String(count),
            kind: "calculated",
          },
        ],
        explanation:
          "Two or more milestones in this category were missed within the selected financial year.",
        recommendation:
          "Strengthen milestone monitoring and gating for this programme category.",
        suggestedDueDate: demo,
      });
    }
  }

  // INS-08 timeline deviation > 14 days
  for (const r of rows) {
    const p = state.programmes[r.id];
    if (!p) continue;
    let maxEnd = p.endDate;
    for (const a of Object.values(state.activities)) {
      if (a.programmeId !== p.id || a.status === "cancelled") continue;
      const end = a.revisedEnd ?? a.plannedEnd;
      if (dayDiff(maxEnd, end) > 0) maxEnd = end;
    }
    const deviation = dayDiff(p.endDate, maxEnd);
    if (deviation > 14) {
      out.push({
        key: `INS-08:${p.id}`,
        ruleId: "INS-08",
        scope: "institution",
        category: "operational",
        title: `Timeline deviation: ${p.code}`,
        severity: "medium",
        programmeId: p.id,
        evidence: [
          {
            label: "Planned end",
            value: p.endDate,
            kind: "fact",
          },
          {
            label: "Forecast end",
            value: maxEnd,
            kind: "estimate",
          },
          {
            label: "Deviation (days)",
            value: String(deviation),
            kind: "calculated",
          },
        ],
        explanation:
          "Forecast activity ends extend more than 14 days beyond the programme end date.",
        recommendation:
          "Consider an extension request or compress the critical path.",
        suggestedDueDate: demo,
        suggestedOwnerId: p.leadId,
      });
    }
  }

  return sortInsights(out);
}

export function interventionCentre(
  state: AppState,
  filters?: LeadershipFilters,
) {
  return institutionalInsights(state, filters)
    .filter((i) => i.severity === "critical" || i.severity === "high")
    .map((i) => {
      const programme = i.programmeId
        ? state.programmes[i.programmeId]
        : undefined;
      return {
        programmeId: i.programmeId,
        programmeCode: programme?.code ?? "—",
        programmeName: programme?.name ?? i.title,
        category: programme
          ? state.categories[programme.categoryId]?.name
          : "—",
        evidence: i.evidence.map((e) => `${e.label}: ${e.value}`).join("; "),
        severity: i.severity,
        impact: i.explanation,
        intervention: i.recommendation,
        leadId: programme?.leadId ?? i.suggestedOwnerId,
        leadName: state.users[programme?.leadId ?? i.suggestedOwnerId ?? ""]
          ?.name,
        deadline: i.suggestedDueDate,
        insightKey: i.key,
      };
    });
}
