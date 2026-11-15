/**
 * Programme Intelligence — deterministic rule catalogue (Amendment 10 §5).
 * Never marketed as AI. All numbers from the central store.
 */
import type {
  AppState,
  ID,
  Insight,
  InsightEvidence,
  InsightSeverity,
  ISODate,
} from "@/types/domain";
import { addCalendarDays, dayDiff } from "@/lib/rules/dates";
import {
  effectiveEnd,
  effectiveStart,
  milestoneHealth,
} from "@/lib/rules/dependencies";
import {
  activityFinancials,
  programmeFinancials,
} from "@/selectors/finance";
import {
  activityProgress,
  isOverdue,
  programmeProgress,
} from "@/selectors/core";
import { achieved as kpiAchieved } from "@/selectors/kpi";
import { formatINR } from "@/lib/format/inr";

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const DUE_DAYS: Record<InsightSeverity, number> = {
  critical: 3,
  high: 7,
  medium: 14,
  low: 30,
};

function dueDate(demo: ISODate, severity: InsightSeverity): ISODate {
  return addCalendarDays(demo, DUE_DAYS[severity]);
}

function fact(
  label: string,
  value: string,
  ref?: InsightEvidence["ref"],
): InsightEvidence {
  return { label, value, kind: "fact", ref };
}

function calc(
  label: string,
  value: string,
  ref?: InsightEvidence["ref"],
): InsightEvidence {
  return { label, value, kind: "calculated", ref };
}

function estimate(
  label: string,
  value: string,
  ref?: InsightEvidence["ref"],
): InsightEvidence {
  return { label, value, kind: "estimate", ref };
}

function insight(partial: Omit<Insight, "suggestedDueDate"> & {
  suggestedDueDate?: ISODate;
  demoDate: ISODate;
}): Insight {
  const { demoDate, ...rest } = partial;
  return {
    ...rest,
    suggestedDueDate: rest.suggestedDueDate ?? dueDate(demoDate, rest.severity),
  };
}

function terminal(status: string): boolean {
  return status === "completed" || status === "cancelled";
}

function schedulePct(
  start: ISODate,
  end: ISODate,
  today: ISODate,
): number {
  const total = Math.max(1, dayDiff(start, end));
  const elapsed = Math.max(0, Math.min(total, dayDiff(start, today)));
  return (elapsed / total) * 100;
}

function downstreamCount(state: AppState, activityId: ID): number {
  let n = 0;
  for (const d of Object.values(state.dependencies)) {
    if (d.predecessorId === activityId) n += 1;
  }
  for (const am of state.activityMilestones) {
    if (am.activityId === activityId) n += 1;
  }
  return n;
}

function latestReport(state: AppState, activityId: ID) {
  return Object.values(state.reports).find((r) => r.activityId === activityId);
}

function photoCount(state: AppState, activityId: ID): number {
  return Object.values(state.evidence).filter(
    (e) =>
      e.activityId === activityId &&
      !e.deleted &&
      (e.type === "photograph" || e.type === "event_documentation"),
  ).length;
}

/** Derive all programme-scoped insights for one programme. */
export function programmeInsights(
  state: AppState,
  programmeId: ID,
): Insight[] {
  const programme = state.programmes[programmeId];
  if (!programme) return [];

  const demo = state.meta.demoDate;
  const thr = state.meta.settings.intelligence;
  const warnPct = state.meta.settings.warnPct;
  const out: Insight[] = [];
  const activities = Object.values(state.activities).filter(
    (a) => a.programmeId === programmeId,
  );
  const fin = programmeFinancials(state, programmeId);
  const progress = programmeProgress(state, programmeId);
  const schedule = schedulePct(programme.startDate, programme.endDate, demo);

  for (const activity of activities) {
    if (terminal(activity.status)) {
      // PRF-04 still applies to completed events
      if (activity.status === "completed") {
        const report = latestReport(state, activity.id);
        const isEvent =
          report?.draft.isEvent ||
          report?.versions.some((v) => v.content.isEvent);
        if (isEvent && photoCount(state, activity.id) === 0) {
          out.push(
            insight({
              demoDate: demo,
              key: `PRF-04:${activity.id}`,
              ruleId: "PRF-04",
              scope: "programme",
              category: "performance",
              title: `Evidence gap: ${activity.name}`,
              severity: "low",
              programmeId,
              suggestedOwnerId: activity.ownerId,
              evidence: [
                fact("Activity status", activity.status, {
                  entity: "activity",
                  id: activity.id,
                }),
                fact("Event photographs", "0"),
              ],
              explanation:
                "This completed event activity has no photograph or event documentation evidence on file.",
              recommendation:
                "Upload event photographs before releasing the activity report to MarCom.",
            }),
          );
        }
      }
      continue;
    }

    // OPS-01 overdue
    if (isOverdue(state, activity)) {
      const daysLate = dayDiff(effectiveEnd(activity), demo);
      const severity: InsightSeverity =
        daysLate >= thr.overdueHighDays ? "high" : "medium";
      out.push(
        insight({
          demoDate: demo,
          key: `OPS-01:${activity.id}`,
          ruleId: "OPS-01",
          scope: "programme",
          category: "operational",
          title: `Overdue activity: ${activity.name}`,
          severity,
          programmeId,
          suggestedOwnerId: activity.ownerId,
          evidence: [
            fact("Effective end", effectiveEnd(activity), {
              entity: "activity",
              id: activity.id,
            }),
            fact("Demo date", demo),
            calc("Days overdue", String(daysLate)),
          ],
          explanation: `Activity end date has passed (${daysLate} day${daysLate === 1 ? "" : "s"} late) and the activity is not terminal.`,
          recommendation:
            "Review remaining work, capture delay reason if needed, and revise the completion date.",
        }),
      );
    }

    // OPS-02 starting soon without readiness
    {
      const daysToStart = dayDiff(demo, effectiveStart(activity));
      if (
        activity.status === "not_started" &&
        daysToStart >= 0 &&
        daysToStart <= 7
      ) {
        const budget = state.activityBudgets[activity.id]?.revised ?? 0;
        const blocked = Object.values(state.dependencies).some((d) => {
          if (d.successorId !== activity.id || !d.predecessorId) return false;
          const pred = state.activities[d.predecessorId];
          return pred && !terminal(pred.status);
        });
        if (!activity.ownerId || budget <= 0 || blocked) {
          out.push(
            insight({
              demoDate: demo,
              key: `OPS-02:${activity.id}`,
              ruleId: "OPS-02",
              scope: "programme",
              category: "operational",
              title: `Not ready to start: ${activity.name}`,
              severity: "medium",
              programmeId,
              suggestedOwnerId: activity.ownerId || programme.managerId,
              evidence: [
                fact("Planned start", effectiveStart(activity), {
                  entity: "activity",
                  id: activity.id,
                }),
                fact("Owner assigned", activity.ownerId ? "yes" : "no"),
                fact("Budget allocated", formatINR(budget)),
                fact("Blocked by predecessor", blocked ? "yes" : "no"),
              ],
              explanation:
                "Activity starts within 7 days but is missing an owner/budget or has an incomplete predecessor.",
              recommendation:
                "Assign an owner, allocate budget, and clear blocking predecessors before the start date.",
            }),
          );
        }
      }
    }

    // OPS-03 ending soon with low progress
    {
      const daysToEnd = dayDiff(demo, effectiveEnd(activity));
      const pct = activityProgress(activity) ?? 0;
      if (daysToEnd >= 0 && daysToEnd <= 7 && pct < 70) {
        out.push(
          insight({
            demoDate: demo,
            key: `OPS-03:${activity.id}`,
            ruleId: "OPS-03",
            scope: "programme",
            category: "operational",
            title: `Low progress near deadline: ${activity.name}`,
            severity: "medium",
            programmeId,
            suggestedOwnerId: activity.ownerId,
            evidence: [
              fact("Effective end", effectiveEnd(activity), {
                entity: "activity",
                id: activity.id,
              }),
              calc("Progress", `${Math.round(pct)}%`),
            ],
            explanation:
              "Activity ends within 7 days but progress is below 70%.",
            recommendation:
              "Accelerate delivery or revise the end date with a documented plan.",
          }),
        );
      }
    }

    // OPS-05 incomplete reporting
    {
      const report = latestReport(state, activity.id);
      const needsReport =
        activity.status === "in_progress" ||
        activity.status === "delayed" ||
        dayDiff(effectiveEnd(activity), demo) >= 0;
      if (needsReport) {
        const lastAt =
          report?.versions[report.versions.length - 1]?.submittedAt?.slice(
            0,
            10,
          ) ?? null;
        const submitted =
          report &&
          (report.status === "submitted" || report.status === "released");
        if (!submitted) {
          const daysSinceEnd = Math.max(
            0,
            dayDiff(effectiveEnd(activity), demo),
          );
          const stale =
            lastAt != null
              ? dayDiff(lastAt, demo)
              : daysSinceEnd || thr.staleReportDays + 1;
          if (stale >= thr.staleReportDays) {
            const severity: InsightSeverity =
              stale >= thr.staleReportDays * 2 ? "high" : "medium";
            out.push(
              insight({
                demoDate: demo,
                key: `OPS-05:${activity.id}`,
                ruleId: "OPS-05",
                scope: "programme",
                category: "operational",
                title: `Reporting gap: ${activity.name}`,
                severity,
                programmeId,
                suggestedOwnerId: activity.ownerId,
                evidence: [
                  fact("Activity status", activity.status, {
                    entity: "activity",
                    id: activity.id,
                  }),
                  fact(
                    "Latest submitted report",
                    lastAt ?? "none",
                  ),
                  calc("Days without submission", String(stale)),
                ],
                explanation:
                  "Activity is active or past end without a recent submitted report.",
                recommendation:
                  "Submit an activity report covering progress, outcomes, and any expenses.",
              }),
            );
          }
        }
      }
    }

    // OPS-06 returned/unreleased > 7 days
    {
      const report = latestReport(state, activity.id);
      if (report?.status === "returned" && report.versions.length > 0) {
        const lastAt =
          report.versions[report.versions.length - 1]!.submittedAt.slice(0, 10);
        const age = dayDiff(lastAt, demo);
        if (age > 7) {
          out.push(
            insight({
              demoDate: demo,
              key: `OPS-06:${activity.id}`,
              ruleId: "OPS-06",
              scope: "programme",
              category: "operational",
              title: `Returned report pending: ${activity.name}`,
              severity: "low",
              programmeId,
              suggestedOwnerId: activity.ownerId,
              evidence: [
                fact("Report status", "returned", {
                  entity: "report",
                  id: report.id,
                }),
                calc("Days since last submit", String(age)),
              ],
              explanation:
                "A returned report has been waiting more than 7 days without resubmission.",
              recommendation:
                "Address return comments and resubmit the activity report.",
            }),
          );
        }
      }
    }

    // FIN-01 activity utilisation
    {
      const af = activityFinancials(state, activity.id);
      if (af.revised > 0 && af.reported / af.revised >= warnPct) {
        const breach = af.reported > af.revised;
        out.push(
          insight({
            demoDate: demo,
            key: `FIN-01:${activity.id}`,
            ruleId: "FIN-01",
            scope: "programme",
            category: "financial",
            title: breach
              ? `Budget overrun: ${activity.name}`
              : `High utilisation: ${activity.name}`,
            severity: breach ? "high" : "medium",
            programmeId,
            suggestedOwnerId: activity.ownerId,
            evidence: [
              fact("Allocation", formatINR(af.revised), {
                entity: "activity",
                id: activity.id,
              }),
              calc("Reported spend", formatINR(af.reported)),
              calc(
                "Utilisation",
                `${Math.round((af.reported / af.revised) * 100)}%`,
              ),
            ],
            explanation: breach
              ? "Reported expenditure exceeds the activity allocation."
              : `Reported expenditure has reached ${Math.round((af.reported / af.revised) * 100)}% of allocation.`,
            recommendation: breach
              ? "Request a budget revision or stop further spend until reallocation is approved."
              : "Monitor remaining spend and verify pending expenses promptly.",
          }),
        );
      }
    }

    // RSK-02 downstream chain
    if (
      (activity.status === "delayed" || isOverdue(state, activity)) &&
      downstreamCount(state, activity.id) >= 2
    ) {
      out.push(
        insight({
          demoDate: demo,
          key: `RSK-02:${activity.id}`,
          ruleId: "RSK-02",
          scope: "programme",
          category: "risk",
          title: `Downstream risk: ${activity.name}`,
          severity: "high",
          programmeId,
          suggestedOwnerId: programme.leadId,
          evidence: [
            fact("Activity status", activity.status, {
              entity: "activity",
              id: activity.id,
            }),
            calc(
              "Downstream activities/milestones",
              String(downstreamCount(state, activity.id)),
            ),
          ],
          explanation:
            "A delayed activity has two or more downstream dependents that may slip.",
          recommendation:
            "Re-sequence dependents, notify owners, and update milestone forecasts.",
        }),
      );
    }

    // RSK-03 forecast beyond programme end
    if (dayDiff(programme.endDate, effectiveEnd(activity)) < 0) {
      out.push(
        insight({
          demoDate: demo,
          key: `RSK-03:${activity.id}`,
          ruleId: "RSK-03",
          scope: "programme",
          category: "risk",
          title: `Extends past programme end: ${activity.name}`,
          severity: "critical",
          programmeId,
          suggestedOwnerId: programme.leadId,
          evidence: [
            fact("Activity end", effectiveEnd(activity), {
              entity: "activity",
              id: activity.id,
            }),
            fact("Programme end", programme.endDate),
          ],
          explanation:
            "Forecast activity end is beyond the programme end date.",
          recommendation:
            "Request a programme extension or compress the remaining schedule.",
        }),
      );
    }
  }

  // OPS-04 open delay impacts
  for (const impact of Object.values(state.delayImpacts)) {
    if (impact.programmeId !== programmeId) continue;
    if (impact.status !== "proposed") continue;
    out.push(
      insight({
        demoDate: demo,
        key: `OPS-04:${impact.id}`,
        ruleId: "OPS-04",
        scope: "programme",
        category: "operational",
        title: "Open delay impact proposal",
        severity: impact.exceedsProgrammeEnd ? "high" : "medium",
        programmeId,
        suggestedOwnerId: programme.managerId,
        evidence: [
          fact("Source activity", impact.sourceActivityId, {
            entity: "activity",
            id: impact.sourceActivityId,
          }),
          fact("Affected activity", impact.affectedActivityId, {
            entity: "activity",
            id: impact.affectedActivityId,
          }),
          calc("Shift days", String(impact.shiftDays)),
          fact(
            "Exceeds programme end",
            impact.exceedsProgrammeEnd ? "yes" : "no",
          ),
        ],
        explanation:
          "A delay impact proposal is still open and has not been applied or dismissed.",
        recommendation:
          "Review the impact proposal and apply or dismiss it with documented rationale.",
      }),
    );
  }

  // FIN-02 programme overrun / projected
  if (fin.reported > fin.budget) {
    out.push(
      insight({
        demoDate: demo,
        key: `FIN-02:${programmeId}`,
        ruleId: "FIN-02",
        scope: "programme",
        category: "financial",
        title: "Programme budget overrun",
        severity: "critical",
        programmeId,
        suggestedOwnerId: programme.leadId,
        evidence: [
          fact("Approved budget", formatINR(fin.budget)),
          calc("Reported expenditure", formatINR(fin.reported)),
          calc("Deficit", formatINR(fin.reported - fin.budget)),
        ],
        explanation:
          "Reported programme expenditure exceeds the approved programme budget.",
        recommendation:
          "Escalate to Leadership, freeze non-critical spend, and initiate a budget revision.",
      }),
    );
  } else if (progress >= 20 && fin.budget > 0) {
    const projected = fin.reported / (progress / 100);
    if (projected > fin.budget) {
      out.push(
        insight({
          demoDate: demo,
          key: `FIN-02:${programmeId}`,
          ruleId: "FIN-02",
          scope: "programme",
          category: "financial",
          title: "Projected programme overrun",
          severity: "high",
          programmeId,
          suggestedOwnerId: programme.leadId,
          evidence: [
            fact("Approved budget", formatINR(fin.budget)),
            calc("Reported expenditure", formatINR(fin.reported)),
            calc("Progress", `${Math.round(progress)}%`),
            estimate(
              "Projected spend at 100%",
              formatINR(projected),
            ),
          ],
          explanation:
            "Extrapolating current spend against progress projects an overrun of the approved budget (estimate).",
          recommendation:
            "Review high-spend activities and reallocate or revise the budget before further commitments.",
        }),
      );
    }
  }

  // FIN-03 pending verification
  if (fin.reported > 0) {
    const pendingShare = fin.pending / fin.reported;
    let oldestPendingDays = 0;
    for (const e of Object.values(state.expenses)) {
      if (e.programmeId !== programmeId || e.status !== "submitted") continue;
      if (!e.submittedAt) continue;
      oldestPendingDays = Math.max(
        oldestPendingDays,
        dayDiff(e.submittedAt.slice(0, 10), demo),
      );
    }
    if (
      pendingShare > thr.pendingShareWarn ||
      oldestPendingDays > thr.pendingVerifyDays
    ) {
      const severity: InsightSeverity =
        oldestPendingDays > thr.pendingVerifyDays * 2 ? "high" : "medium";
      out.push(
        insight({
          demoDate: demo,
          key: `FIN-03:${programmeId}`,
          ruleId: "FIN-03",
          scope: "programme",
          category: "financial",
          title: "Pending expense verification",
          severity,
          programmeId,
          suggestedOwnerId: programme.leadId,
          evidence: [
            calc("Pending amount", formatINR(fin.pending)),
            calc(
              "Share of reported",
              `${Math.round(pendingShare * 100)}%`,
            ),
            calc("Oldest pending (days)", String(oldestPendingDays)),
          ],
          explanation:
            "A material share of reported expenditure is unverified, or items have been pending beyond the threshold.",
          recommendation:
            "Programme Lead should verify or reject pending expenses promptly.",
        }),
      );
    }
  }

  // FIN-04 unallocated while schedule elapsed
  if (
    fin.budget > 0 &&
    fin.unallocated / fin.budget > 0.1 &&
    schedule >= 50
  ) {
    out.push(
      insight({
        demoDate: demo,
        key: `FIN-04:${programmeId}`,
        ruleId: "FIN-04",
        scope: "programme",
        category: "financial",
        title: "High unallocated budget mid-programme",
        severity: "low",
        programmeId,
        suggestedOwnerId: programme.managerId,
        evidence: [
          calc("Unallocated", formatINR(fin.unallocated)),
          calc(
            "Unallocated share",
            `${Math.round((fin.unallocated / fin.budget) * 100)}%`,
          ),
          calc("Schedule elapsed", `${Math.round(schedule)}%`),
        ],
        explanation:
          "More than 10% of the programme budget remains unallocated after half the schedule has elapsed.",
        recommendation:
          "Allocate remaining budget to planned activities or document intentional contingency.",
      }),
    );
  }

  // FIN-05 rejected without resubmission
  for (const expense of Object.values(state.expenses)) {
    if (expense.programmeId !== programmeId) continue;
    if (expense.status !== "rejected" || !expense.decision?.at) continue;
    const age = dayDiff(expense.decision.at.slice(0, 10), demo);
    if (age <= 7) continue;
    const resubmitted = Object.values(state.expenses).some(
      (e) => e.resubmissionOf === expense.id,
    );
    if (resubmitted) continue;
    out.push(
      insight({
        demoDate: demo,
        key: `FIN-05:${expense.id}`,
        ruleId: "FIN-05",
        scope: "programme",
        category: "financial",
        title: "Rejected expense not resubmitted",
        severity: "low",
        programmeId,
        suggestedOwnerId:
          state.activities[expense.activityId]?.ownerId ??
          programme.managerId,
        evidence: [
          fact("Expense", formatINR(expense.amount), {
            entity: "expense",
            id: expense.id,
          }),
          calc("Days since rejection", String(age)),
        ],
        explanation:
          "A rejected expense has not been resubmitted for more than 7 days.",
        recommendation:
          "Correct the expense package and resubmit, or withdraw the claim.",
      }),
    );
  }

  // RSK-01 milestones
  for (const m of Object.values(state.milestones)) {
    if (m.programmeId !== programmeId) continue;
    const health = milestoneHealth(state, m.id);
    if (health !== "missed" && health !== "at_risk") continue;
    out.push(
      insight({
        demoDate: demo,
        key: `RSK-01:${m.id}`,
        ruleId: "RSK-01",
        scope: "programme",
        category: "risk",
        title: `Milestone ${health.replace("_", " ")}: ${m.name}`,
        severity: health === "missed" ? "critical" : "high",
        programmeId,
        suggestedOwnerId: programme.leadId,
        evidence: [
          fact("Target date", m.targetDate, {
            entity: "milestone",
            id: m.id,
          }),
          calc("Health", health),
        ],
        explanation:
          health === "missed"
            ? "Milestone target date has passed without achievement."
            : "Milestone is at risk based on gating activity progress and forecast.",
        recommendation:
          "Replan gating activities and communicate the revised milestone date to stakeholders.",
      }),
    );
  }

  // RSK-04 on hold > 14 days
  if (programme.status === "on_hold") {
    const holdApproval = Object.values(state.approvals).find(
      (a) =>
        a.programmeId === programmeId &&
        a.type === "hold" &&
        a.status === "approved",
    );
    const since =
      holdApproval?.decision?.at?.slice(0, 10) ?? programme.startDate;
    const days = dayDiff(since, demo);
    if (days > 14) {
      out.push(
        insight({
          demoDate: demo,
          key: `RSK-04:${programmeId}`,
          ruleId: "RSK-04",
          scope: "programme",
          category: "risk",
          title: "Programme on hold too long",
          severity: "medium",
          programmeId,
          suggestedOwnerId: programme.leadId,
          evidence: [
            fact("Status", "on_hold"),
            calc("Days on hold (approx.)", String(days)),
          ],
          explanation:
            "Programme has remained on hold for more than 14 days.",
          recommendation:
            "Decide whether to resume, extend, or close; document the holding rationale.",
        }),
      );
    }
  }

  // PRF-01 schedule lag
  {
    const lag = schedule - progress;
    if (lag > thr.scheduleLagPts) {
      out.push(
        insight({
          demoDate: demo,
          key: `PRF-01:${programmeId}`,
          ruleId: "PRF-01",
          scope: "programme",
          category: "performance",
          title: "Progress lags schedule",
          severity: lag > thr.scheduleLagPts * 2 ? "high" : "medium",
          programmeId,
          suggestedOwnerId: programme.managerId,
          evidence: [
            calc("Schedule elapsed", `${Math.round(schedule)}%`),
            calc("Operational progress", `${Math.round(progress)}%`),
            calc("Lag (points)", String(Math.round(lag))),
          ],
          explanation:
            "Programme progress percentage lags the calendar schedule by more than the configured threshold.",
          recommendation:
            "Identify delayed activities and put a recovery plan in place with owners and dates.",
        }),
      );
    }
  }

  // PRF-02 KPI behind pro-rata
  for (const row of kpiAchieved(state, programmeId)) {
    const expected = row.kpi.target * (schedule / 100);
    if (schedule < 20) continue;
    if (row.achieved < expected * 0.7) {
      out.push(
        insight({
          demoDate: demo,
          key: `PRF-02:${row.kpi.id}`,
          ruleId: "PRF-02",
          scope: "programme",
          category: "performance",
          title: `KPI behind target: ${row.kpi.name}`,
          severity: "medium",
          programmeId,
          suggestedOwnerId: programme.managerId,
          evidence: [
            fact("Target", String(row.kpi.target), {
              entity: "kpi",
              id: row.kpi.id,
            }),
            fact("Achieved", String(row.achieved)),
            calc("Pro-rata expected", String(Math.round(expected))),
          ],
          explanation:
            "KPI achievement is below 70% of the pro-rata schedule expectation.",
          recommendation:
            "Review delivery levers for this KPI and adjust activity focus.",
        }),
      );
    }
  }

  // PRF-03 milestone achievement vs schedule
  {
    const milestones = Object.values(state.milestones).filter(
      (m) => m.programmeId === programmeId,
    );
    if (milestones.length >= 2) {
      const due = milestones.filter((m) => dayDiff(m.targetDate, demo) >= 0);
      const achieved = due.filter(
        (m) => milestoneHealth(state, m.id) === "achieved",
      ).length;
      const rate = due.length === 0 ? 1 : achieved / due.length;
      const expected = Math.min(1, schedule / 100);
      if (due.length > 0 && rate < expected - 0.15) {
        out.push(
          insight({
            demoDate: demo,
            key: `PRF-03:${programmeId}`,
            ruleId: "PRF-03",
            scope: "programme",
            category: "performance",
            title: "Milestone achievement behind schedule",
            severity: "medium",
            programmeId,
            suggestedOwnerId: programme.managerId,
            evidence: [
              calc("Milestones due", String(due.length)),
              calc("Achieved", String(achieved)),
              calc("Achievement rate", `${Math.round(rate * 100)}%`),
              calc("Schedule elapsed", `${Math.round(schedule)}%`),
            ],
            explanation:
              "Milestone achievement rate for due milestones is below the schedule-expected rate.",
            recommendation:
              "Prioritise gating activities for the next at-risk milestones.",
          }),
        );
      }
    }
  }

  return sortInsights(out);
}

export function sortInsights(items: Insight[]): Insight[] {
  return [...items].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    return a.suggestedDueDate.localeCompare(b.suggestedDueDate);
  });
}

/** Apply dismissal / acknowledgement filters. */
export function visibleProgrammeInsights(
  state: AppState,
  programmeId: ID,
): Insight[] {
  const all = programmeInsights(state, programmeId);
  return all.filter((item) => {
    const st = state.insightStates[item.key];
    if (!st) return true;
    if (st.status === "dismissed") {
      const prev = SEVERITY_ORDER[st.severityAtDismissal ?? "low"];
      return SEVERITY_ORDER[item.severity] < prev; // resurface if more severe
    }
    return true;
  });
}

export function severityCounts(items: Insight[]) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of items) counts[i.severity] += 1;
  return counts;
}

export function lastInsightRun(
  state: AppState,
  scope: "programme" | "institution",
  programmeId?: ID,
) {
  return state.insightRuns.find(
    (r) =>
      r.scope === scope &&
      (scope === "institution" || r.programmeId === programmeId),
  );
}

export function insightRunDiff(
  state: AppState,
  current: Insight[],
  scope: "programme" | "institution",
  programmeId?: ID,
) {
  const prev = lastInsightRun(state, scope, programmeId);
  if (!prev) {
    return { newCount: current.length, resolvedCount: 0 };
  }
  const prevKeys = new Set(prev.items.map((i) => i.key));
  const currKeys = new Set(current.map((i) => i.key));
  let newCount = 0;
  let resolvedCount = 0;
  for (const k of currKeys) if (!prevKeys.has(k)) newCount += 1;
  for (const k of prevKeys) if (!currKeys.has(k)) resolvedCount += 1;
  return { newCount, resolvedCount };
}
