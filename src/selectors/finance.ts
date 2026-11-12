import type { Activity, AppState, Expense, ID } from "@/types/domain";
import { overspendLevel } from "@/lib/rules/expense";

export type ActivityFinancials = {
  activityId: ID;
  original: number;
  revised: number;
  reported: number;
  verified: number;
  pending: number;
  remaining: number;
  variance: number;
  verifiedVariance: number;
  utilisationReported: number | null;
  utilisationVerified: number | null;
  alert: "ok" | "warning" | "breach";
};

/**
 * ONLY place money maths exists (doc 04 §4).
 * Rep = Ver + Pen by construction.
 */
export function expenseReportedAmount(expense: Expense): number {
  if (expense.status === "verified") {
    return expense.verifiedAmount ?? expense.amount;
  }
  if (expense.status === "submitted") {
    return expense.amount;
  }
  return 0;
}

export function activityFinancials(
  state: AppState,
  activityId: ID,
): ActivityFinancials {
  const budget = state.activityBudgets[activityId];
  const original = budget?.original ?? 0;
  const revised = budget?.revised ?? 0;

  let verified = 0;
  let pending = 0;

  for (const expense of Object.values(state.expenses)) {
    if (expense.activityId !== activityId) continue;
    if (expense.status === "verified") {
      verified += expense.verifiedAmount ?? expense.amount;
    } else if (expense.status === "submitted") {
      pending += expense.amount;
    }
  }

  const reported = verified + pending;
  const utilisationReported = revised === 0 ? null : reported / revised;
  const utilisationVerified = revised === 0 ? null : verified / revised;

  return {
    activityId,
    original,
    revised,
    reported,
    verified,
    pending,
    remaining: revised - reported,
    variance: revised - reported,
    verifiedVariance: revised - verified,
    utilisationReported,
    utilisationVerified,
    alert: overspendLevel(reported, revised, state.meta.settings.warnPct),
  };
}

/**
 * Allocated = Σ R_a over non-cancelled (+ Σ spend of cancelled, floor).
 */
export function programmeAllocated(state: AppState, programmeId: ID): number {
  let allocated = 0;
  for (const activity of Object.values(state.activities)) {
    if (activity.programmeId !== programmeId) continue;
    if (activity.status === "cancelled") {
      const spend = activityFinancials(state, activity.id).reported;
      allocated += spend;
      continue;
    }
    allocated += state.activityBudgets[activity.id]?.revised ?? 0;
  }
  return allocated;
}

export function programmeFinancials(state: AppState, programmeId: ID) {
  const programme = state.programmes[programmeId];
  const budget = programme?.totalBudget ?? 0;
  const allocated = programmeAllocated(state, programmeId);
  let reported = 0;
  let verified = 0;
  let pending = 0;

  for (const activity of Object.values(state.activities)) {
    if (activity.programmeId !== programmeId) continue;
    const fin = activityFinancials(state, activity.id);
    reported += fin.reported;
    verified += fin.verified;
    pending += fin.pending;
  }

  return {
    programmeId,
    budget,
    allocated,
    unallocated: budget - allocated,
    reported,
    verified,
    pending,
    remaining: budget - reported,
    surplusOrDeficit: budget - reported,
    closureSurplus: budget - verified,
    alert:
      reported > budget
        ? ("critical" as const)
        : ("ok" as const),
  };
}

export function allocationPct(
  state: AppState,
  activityId: ID,
): number | null {
  const activity = state.activities[activityId];
  if (!activity) return null;
  const B = state.programmes[activity.programmeId]?.totalBudget ?? 0;
  if (B === 0) return null;
  const R = state.activityBudgets[activityId]?.revised ?? 0;
  return R / B;
}

export function activitiesWithFinance(state: AppState, programmeId: ID) {
  return Object.values(state.activities)
    .filter((a) => a.programmeId === programmeId)
    .map((a) => ({ activity: a, financials: activityFinancials(state, a.id) }));
}

export function assertFinanceIdentity(state: AppState): boolean {
  for (const activity of Object.values(state.activities) as Activity[]) {
    const fin = activityFinancials(state, activity.id);
    if (fin.reported !== fin.verified + fin.pending) return false;
  }
  return true;
}
