import type { AppState, ID } from "@/types/domain";
import {
  delayedActivities,
  pendingReports,
  programmeProgress,
  upcomingActivities,
} from "./core";
import { programmeFinancials } from "./finance";

export function myProgrammes(state: AppState, managerId?: ID) {
  const id = managerId ?? state.meta.currentUserId;
  return Object.values(state.programmes)
    .filter((p) => p.managerId === id)
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
