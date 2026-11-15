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
  /** Doc 09: R − Rep (alias of remaining). */
  surplus: number;
  variance: number;
  verifiedVariance: number;
  utilisationReported: number | null;
  utilisationVerified: number | null;
  /** Doc 09 alias of utilisationReported. */
  utilisation: number | null;
  alert: "ok" | "warning" | "breach";
  /** Doc 09: none | warning | breach (maps ok → none). */
  alertLevel: "none" | "warning" | "breach";
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
  const alert = overspendLevel(reported, revised, state.meta.settings.warnPct);
  const remaining = revised - reported;

  return {
    activityId,
    original,
    revised,
    reported,
    verified,
    pending,
    remaining,
    surplus: remaining,
    variance: remaining,
    verifiedVariance: revised - verified,
    utilisationReported,
    utilisationVerified,
    utilisation: utilisationReported,
    alert,
    alertLevel: alert === "ok" ? "none" : alert,
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

  let deficitActivityCount = 0;
  for (const activity of Object.values(state.activities)) {
    if (activity.programmeId !== programmeId) continue;
    if (activity.status === "cancelled") continue;
    if (activityFinancials(state, activity.id).surplus < 0) {
      deficitActivityCount += 1;
    }
  }

  const surplus = budget - reported;
  const surplusVerified = budget - verified;

  return {
    programmeId,
    budget,
    allocated,
    unallocated: budget - allocated,
    reported,
    verified,
    pending,
    remaining: surplus,
    surplus,
    surplusVerified,
    deficitActivityCount,
    surplusOrDeficit: surplus,
    closureSurplus: surplusVerified,
    alert:
      reported > budget
        ? ("critical" as const)
        : ("ok" as const),
  };
}

export type PortfolioSurplus = {
  budget: number;
  reported: number;
  verified: number;
  surplus: number;
  surplusVerified: number;
  programmesInDeficit: number;
};

/** Doc 09: Σ B − Σ Rep over the given programmes. */
export function portfolioSurplus(
  state: AppState,
  programmeIds: ID[],
): PortfolioSurplus {
  let budget = 0;
  let reported = 0;
  let verified = 0;
  let programmesInDeficit = 0;
  for (const id of programmeIds) {
    const fin = programmeFinancials(state, id);
    budget += fin.budget;
    reported += fin.reported;
    verified += fin.verified;
    if (fin.surplus < 0) programmesInDeficit += 1;
  }
  return {
    budget,
    reported,
    verified,
    surplus: budget - reported,
    surplusVerified: budget - verified,
    programmesInDeficit,
  };
}

/** Preview surplus if draft/unsaved expenses on this report were submitted. */
export function previewActivityAfterReport(
  state: AppState,
  activityId: ID,
  draftExpenses: { amount: number }[],
): {
  reported: number;
  surplus: number;
  utilisation: number | null;
  alert: "ok" | "warning" | "breach";
  alertLevel: "none" | "warning" | "breach";
} {
  const fin = activityFinancials(state, activityId);
  const extra = draftExpenses.reduce((s, e) => s + Math.max(0, e.amount), 0);
  const reported = fin.reported + extra;
  const surplus = fin.revised - reported;
  const utilisation = fin.revised === 0 ? null : reported / fin.revised;
  const alert = overspendLevel(
    reported,
    fin.revised,
    state.meta.settings.warnPct,
  );
  return {
    reported,
    surplus,
    utilisation,
    alert,
    alertLevel: alert === "ok" ? "none" : alert,
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
