import type { AppState, ID } from "@/types/domain";
import { activityFinancials, programmeFinancials } from "./finance";
import { dayDiff } from "@/lib/rules/dates";

export function programmeBudgets(state: AppState) {
  return Object.values(state.programmes).map((p) => ({
    programme: p,
    financials: programmeFinancials(state, p.id),
  }));
}

export function activityAllocations(state: AppState, programmeId?: ID) {
  return Object.values(state.activities)
    .filter((a) => !programmeId || a.programmeId === programmeId)
    .map((a) => ({
      activity: a,
      financials: activityFinancials(state, a.id),
    }));
}

export function queue(state: AppState) {
  return Object.values(state.expenses)
    .filter((e) => e.status === "submitted")
    .map((e) => {
      const fin = activityFinancials(state, e.activityId);
      const age = dayDiff(e.submittedAt?.slice(0, 10) ?? e.date, state.meta.demoDate);
      return {
        expense: e,
        activity: state.activities[e.activityId],
        programme: state.programmes[e.programmeId],
        activityFinancials: fin,
        ageDays: age,
      };
    })
    .sort((a, b) => b.ageDays - a.ageDays);
}

export function alerts(state: AppState) {
  const items: {
    id: string;
    level: "warning" | "breach" | "critical";
    text: string;
    activityId?: ID;
    programmeId?: ID;
  }[] = [];

  for (const activity of Object.values(state.activities)) {
    const fin = activityFinancials(state, activity.id);
    if (fin.alert === "warning" || fin.alert === "breach") {
      items.push({
        id: `act-${activity.id}`,
        level: fin.alert,
        text: `${activity.code}: reported ${fin.reported} vs allocation ${fin.revised}`,
        activityId: activity.id,
        programmeId: activity.programmeId,
      });
    }
  }

  for (const programme of Object.values(state.programmes)) {
    const fin = programmeFinancials(state, programme.id);
    if (fin.alert === "critical") {
      items.push({
        id: `prg-${programme.id}`,
        level: "critical",
        text: `${programme.code}: reported spend exceeds programme budget`,
        programmeId: programme.id,
      });
    }
  }

  return items;
}
