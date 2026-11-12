import type { AppState, ID, ProgrammeStatus } from "@/types/domain";
import {
  delayedActivities,
  orgProgress,
  programmeProgress,
} from "./core";
import { activityFinancials, programmeFinancials } from "./finance";
import { dayDiff } from "@/lib/rules/dates";
import { milestoneHealth } from "@/lib/rules/dependencies";

export type LeadershipFilters = {
  categoryId?: ID;
  clientId?: ID;
  managerId?: ID;
  status?: ProgrammeStatus;
  dateFrom?: string;
  dateTo?: string;
};

function matchesFilters(
  state: AppState,
  programmeId: ID,
  filters?: LeadershipFilters,
): boolean {
  if (!filters) return true;
  const p = state.programmes[programmeId];
  if (!p) return false;
  if (filters.categoryId && p.categoryId !== filters.categoryId) return false;
  if (filters.clientId && p.clientId !== filters.clientId) return false;
  if (filters.managerId && p.managerId !== filters.managerId) return false;
  if (filters.status && p.status !== filters.status) return false;
  if (filters.dateFrom && dayDiff(p.endDate, filters.dateFrom) > 0) return false;
  if (filters.dateTo && dayDiff(filters.dateTo, p.startDate) > 0) return false;
  return true;
}

export function kpis(state: AppState, filters?: LeadershipFilters) {
  const programmes = Object.values(state.programmes).filter((p) =>
    matchesFilters(state, p.id, filters),
  );
  const active = programmes.filter((p) => p.status === "active");
  const completed = programmes.filter((p) => p.status === "completed");
  let totalBudget = 0;
  let verified = 0;
  let reported = 0;
  for (const p of programmes) {
    const fin = programmeFinancials(state, p.id);
    totalBudget += fin.budget;
    verified += fin.verified;
    reported += fin.reported;
  }
  const delayed = delayedActivities(state).filter((a) =>
    programmes.some((p) => p.id === a.programmeId),
  );
  const progress = orgProgress(state);

  return {
    totalProgrammes: programmes.length,
    active: active.length,
    completed: completed.length,
    totalBudget,
    verifiedExpenditure: verified,
    reportedExpenditure: reported,
    remaining: totalBudget - reported,
    overallProgress: progress.equalWeight,
    overallProgressBudgetWeighted: progress.budgetWeighted,
    delayedActivities: delayed.length,
  };
}

export function programmeRows(state: AppState, filters?: LeadershipFilters) {
  return Object.values(state.programmes)
    .filter((p) => matchesFilters(state, p.id, filters))
    .map((p) => {
      const fin = programmeFinancials(state, p.id);
      const delayed = delayedActivities(state, p.id).length;
      const progress = programmeProgress(state, p.id);
      const utilised =
        fin.budget === 0 ? null : fin.verified / fin.budget;
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        categoryId: p.categoryId,
        category: state.categories[p.categoryId]?.name,
        clientId: p.clientId,
        client: state.clients[p.clientId]?.name,
        managerId: p.managerId,
        manager: state.users[p.managerId]?.name,
        status: p.status,
        progress,
        budget: fin.budget,
        verified: fin.verified,
        utilised,
        delayed,
        rag:
          delayed > 0 || fin.alert === "critical"
            ? ("red" as const)
            : progress < 40
              ? ("amber" as const)
              : ("green" as const),
      };
    });
}

export function financialOverview(state: AppState, filters?: LeadershipFilters) {
  return Object.values(state.programmes)
    .filter((p) => matchesFilters(state, p.id, filters))
    .map((p) => {
      const fin = programmeFinancials(state, p.id);
      return {
        programmeId: p.id,
        code: p.code,
        verified: fin.verified,
        pending: fin.pending,
        remaining: Math.max(0, fin.remaining),
        unallocated: fin.unallocated,
      };
    });
}

export function upcomingMilestones(state: AppState, withinDays = 30) {
  const demo = state.meta.demoDate;
  return Object.values(state.milestones)
    .filter((m) => {
      const delta = dayDiff(demo, m.targetDate);
      return delta >= 0 && delta <= withinDays;
    })
    .map((m) => ({
      ...m,
      health: milestoneHealth(state, m.id),
      programmeCode: state.programmes[m.programmeId]?.code,
    }))
    .sort((a, b) => dayDiff(a.targetDate, b.targetDate));
}

export function riskAlerts(state: AppState) {
  const alerts: {
    id: string;
    kind: string;
    text: string;
    link?: string;
  }[] = [];

  for (const activity of Object.values(state.activities)) {
    const fin = activityFinancials(state, activity.id);
    if (fin.alert === "breach") {
      alerts.push({
        id: `overspend-${activity.id}`,
        kind: "overspend",
        text: `${activity.code} reported spend exceeds allocation`,
        link: `/programmes/`,
      });
    }
  }

  for (const a of delayedActivities(state)) {
    alerts.push({
      id: `delayed-${a.id}`,
      kind: "delayed",
      text: `${a.code} is delayed or overdue`,
      link: `/programmes/`,
    });
  }

  for (const m of Object.values(state.milestones)) {
    const health = milestoneHealth(state, m.id);
    if (health === "at_risk" || health === "missed") {
      alerts.push({
        id: `ms-${m.id}`,
        kind: "milestone",
        text: `Milestone “${m.name}” is ${health.replace("_", " ")}`,
      });
    }
  }

  for (const approval of Object.values(state.approvals)) {
    if (approval.status === "pending") {
      alerts.push({
        id: `apr-${approval.id}`,
        kind: "approval",
        text: `Pending ${approval.type} approval`,
        link: `/approvals/`,
      });
    }
  }

  return alerts;
}
