import type { Activity, AppState, ID, ISODate } from "@/types/domain";
import {
  effectiveEnd,
  effectiveStart,
  milestoneHealth,
} from "@/lib/rules/dependencies";
import { dayDiff } from "@/lib/rules/dates";
import { activityFinancials } from "./finance";

export { effectiveEnd, effectiveStart, milestoneHealth };

export function isOverdue(
  state: AppState,
  activity: Activity,
): boolean {
  const programme = state.programmes[activity.programmeId];
  if (programme?.status === "on_hold") return false; // overdue paused
  if (!["in_progress", "not_started", "delayed"].includes(activity.status)) {
    return false;
  }
  // dayDiff(end, demo) = demo − end; overdue when demo is after effective end
  return dayDiff(effectiveEnd(activity), state.meta.demoDate) > 0;
}

export function activityProgress(activity: Activity): number | null {
  if (activity.status === "cancelled") return null;
  if (activity.status === "completed") return 100;
  if (activity.status === "not_started") return 0;
  return activity.percentComplete;
}

export function programmeProgress(state: AppState, programmeId: ID): number {
  const acts = Object.values(state.activities).filter(
    (a) => a.programmeId === programmeId && a.status !== "cancelled",
  );
  if (acts.length === 0) return 0;
  const sum = acts.reduce((acc, a) => acc + (activityProgress(a) ?? 0), 0);
  return sum / acts.length;
}

export function orgProgress(state: AppState): {
  equalWeight: number;
  budgetWeighted: number;
} {
  const active = Object.values(state.programmes).filter(
    (p) => p.status === "active",
  );
  if (active.length === 0) return { equalWeight: 0, budgetWeighted: 0 };
  const progresses = active.map((p) => ({
    progress: programmeProgress(state, p.id),
    budget: p.totalBudget,
  }));
  const equalWeight =
    progresses.reduce((s, p) => s + p.progress, 0) / progresses.length;
  const totalBudget = progresses.reduce((s, p) => s + p.budget, 0) || 1;
  const budgetWeighted =
    progresses.reduce((s, p) => s + p.progress * p.budget, 0) / totalBudget;
  return { equalWeight, budgetWeighted };
}

export function delayedActivities(state: AppState, programmeId?: ID) {
  return Object.values(state.activities).filter((a) => {
    if (programmeId && a.programmeId !== programmeId) return false;
    return a.status === "delayed" || isOverdue(state, a);
  });
}

export function upcomingActivities(
  state: AppState,
  options?: { programmeId?: ID; days?: number },
) {
  const days = options?.days ?? state.meta.settings.upcomingDays;
  const demo = state.meta.demoDate;
  return Object.values(state.activities).filter((a) => {
    if (options?.programmeId && a.programmeId !== options.programmeId) {
      return false;
    }
    if (a.status !== "not_started") return false;
    const delta = dayDiff(demo, a.plannedStart);
    return delta >= 0 && delta <= days;
  });
}

/**
 * Pending reports: effective end ≤ demoDate (or in_progress > stale days
 * since last submitted report) with no submitted/released report after that.
 */
export function pendingReports(state: AppState, programmeId?: ID) {
  const stale = state.meta.settings.staleReportDays;
  const demo = state.meta.demoDate;
  return Object.values(state.activities).filter((a) => {
    if (programmeId && a.programmeId !== programmeId) return false;
    if (["completed", "cancelled"].includes(a.status)) return false;

    const reports = Object.values(state.reports).filter(
      (r) => r.activityId === a.id,
    );
    const lastSubmitted = reports
      .flatMap((r) => r.versions)
      .map((v) => v.submittedAt.slice(0, 10) as ISODate)
      .sort()
      .at(-1);

    const endDue = dayDiff(effectiveEnd(a), demo) <= 0;
    const staleInProgress =
      a.status === "in_progress" &&
      (!lastSubmitted || dayDiff(lastSubmitted, demo) > stale);

    if (!endDue && !staleInProgress) return false;

    const hasRecentSubmit = reports.some(
      (r) =>
        r.status === "submitted" ||
        r.status === "released" ||
        (lastSubmitted && dayDiff(effectiveEnd(a), lastSubmitted) >= 0),
    );
    return !hasRecentSubmit || staleInProgress;
  });
}

export function activityCore(state: AppState, activityId: ID) {
  const activity = state.activities[activityId];
  if (!activity) return null;
  return {
    activity,
    effectiveStart: effectiveStart(activity),
    effectiveEnd: effectiveEnd(activity),
    overdue: isOverdue(state, activity),
    progress: activityProgress(activity),
    financials: activityFinancials(state, activityId),
  };
}
