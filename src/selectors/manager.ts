import type { AppState, ID } from "@/types/domain";
import {
  delayedActivities,
  pendingReports,
  programmeProgress,
  upcomingActivities,
} from "./core";
import { activityFinancials, programmeFinancials } from "./finance";

export type BudgetVsCostRow = {
  activityId: ID | null;
  code: string;
  name: string;
  budget: number;
  cost: number;
  surplus: number;
  pctUsed: number | null;
  alert: "ok" | "warning" | "breach";
  cancelled: boolean;
  kind: "activity" | "unallocated" | "programme";
};

/** Doc 09 Feature C — Budget vs cost by activity (plan order + totals). */
export function budgetVsCostByActivity(
  state: AppState,
  programmeId: ID,
): BudgetVsCostRow[] {
  const programme = state.programmes[programmeId];
  if (!programme) return [];
  const fin = programmeFinancials(state, programmeId);
  const activities = Object.values(state.activities)
    .filter((a) => a.programmeId === programmeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const rows: BudgetVsCostRow[] = activities.map((a) => {
    const af = activityFinancials(state, a.id);
    return {
      activityId: a.id,
      code: a.code,
      name: a.name,
      budget: af.revised,
      cost: af.reported,
      surplus: af.surplus,
      pctUsed: af.utilisation,
      alert: af.alert,
      cancelled: a.status === "cancelled",
      kind: "activity",
    };
  });

  rows.push({
    activityId: null,
    code: "",
    name: "Unallocated budget",
    budget: fin.unallocated,
    cost: 0,
    surplus: fin.unallocated,
    pctUsed: null,
    alert: "ok",
    cancelled: false,
    kind: "unallocated",
  });
  rows.push({
    activityId: null,
    code: "",
    name: "Programme current surplus",
    budget: fin.budget,
    cost: fin.reported,
    surplus: fin.surplus,
    pctUsed: fin.budget === 0 ? null : fin.reported / fin.budget,
    alert: fin.surplus < 0 ? "breach" : "ok",
    cancelled: false,
    kind: "programme",
  });
  return rows;
}

export function myProgrammes(state: AppState, managerId?: ID) {
  const id = managerId ?? state.meta.currentUserId;
  const role = state.meta.currentRole;
  const explicit = managerId != null;
  return Object.values(state.programmes)
    .filter((p) => {
      if (!explicit && role === "programme_lead") {
        return p.leadId === id;
      }
      if (explicit) return p.managerId === id;
      return p.managerId === id || p.teamIds.includes(id);
    })
    .map((p) => ({
      programme: p,
      progress: programmeProgress(state, p.id),
      budget: programmeFinancials(state, p.id),
      nextMilestone: Object.values(state.milestones)
        .filter((m) => m.programmeId === p.id)
        .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0],
    }));
}

export function myPendingReports(state: AppState, managerId?: ID) {
  const mine = new Set(myProgrammes(state, managerId).map((p) => p.programme.id));
  return pendingReports(state).filter((a) => mine.has(a.programmeId));
}

export function myUpcoming(state: AppState, managerId?: ID) {
  const mine = new Set(myProgrammes(state, managerId).map((p) => p.programme.id));
  return upcomingActivities(state).filter((a) => mine.has(a.programmeId));
}

export function myDelayed(state: AppState, managerId?: ID) {
  const mine = new Set(myProgrammes(state, managerId).map((p) => p.programme.id));
  return delayedActivities(state).filter((a) => mine.has(a.programmeId));
}

export function budgetSummary(state: AppState, managerId?: ID) {
  const programmes = myProgrammes(state, managerId);
  return programmes.reduce(
    (acc, row) => {
      acc.allocated += row.budget.allocated;
      acc.reported += row.budget.reported;
      acc.remaining += row.budget.remaining;
      acc.unallocated += row.budget.unallocated;
      acc.budget += row.budget.budget;
      return acc;
    },
    {
      budget: 0,
      allocated: 0,
      reported: 0,
      remaining: 0,
      unallocated: 0,
    },
  );
}

export function activityBlocksByProgramme(state: AppState, managerId?: ID) {
  return myProgrammes(state, managerId).map((row) => ({
    programme: row.programme,
    activities: Object.values(state.activities)
      .filter((a) => a.programmeId === row.programme.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}
