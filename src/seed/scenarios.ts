import type { AppState, ISODate, ScenarioName } from "@/types/domain";
import { DEFAULT_DEMO_DATE } from "@/types/domain";
import { buildDirectory, emptyBusinessCollections } from "./base";
import { buildDefaultSeed } from "./buildDefault";
import { produce } from "immer";

export function buildEmptyScenario(
  demoDate: ISODate = DEFAULT_DEMO_DATE,
): AppState {
  return {
    ...buildDirectory(demoDate),
    ...emptyBusinessCollections(),
  };
}

/** Healthy portfolio: no delays/alerts, high progress. */
export function buildHealthyScenario(
  demoDate: ISODate = DEFAULT_DEMO_DATE,
): AppState {
  const base = buildDefaultSeed(demoDate);
  return produce(base, (draft) => {
    for (const activity of Object.values(draft.activities)) {
      if (activity.status === "delayed") {
        activity.status = "in_progress";
        activity.revisedEnd = undefined;
        activity.percentComplete = Math.max(activity.percentComplete, 80);
      }
    }
    draft.delayImpacts = {};
    // Clear overspend / pending pressure on P2 corporate pilots
    for (const expense of Object.values(draft.expenses)) {
      if (expense.overspendFlag) {
        expense.overspendFlag = false;
        expense.amount = Math.min(
          expense.amount,
          draft.activityBudgets[expense.activityId]?.revised ?? expense.amount,
        );
        if (expense.status === "submitted") {
          expense.status = "verified";
          expense.verifiedAmount = expense.amount;
        }
      }
    }
    draft.meta.seedVersion = `${base.meta.seedVersion}-healthy`;
  });
}

/** Troubled portfolio: breaches, delays, stale reports. */
export function buildTroubledScenario(
  demoDate: ISODate = DEFAULT_DEMO_DATE,
): AppState {
  const base = buildDefaultSeed(demoDate);
  return produce(base, (draft) => {
    const targets = Object.values(draft.activities)
      .filter((a) => a.programmeId === "prg_p1" || a.programmeId === "prg_p2")
      .slice(0, 9);
    targets.forEach((activity, index) => {
      if (activity.status === "not_started" || activity.status === "in_progress") {
        activity.status = "delayed";
        activity.revisedEnd = activity.plannedEnd;
      }
      if (index < 5) {
        const budget = draft.activityBudgets[activity.id];
        if (budget) {
          const id = `exp_trouble_${activity.id}`;
          draft.expenses[id] = {
            id,
            programmeId: activity.programmeId,
            activityId: activity.id,
            categoryId: Object.keys(draft.expenseCategories)[0]!,
            description: "Troubled scenario overspend",
            date: draft.meta.demoDate,
            amount: Math.round(budget.revised * 1.15),
            status: "submitted",
            submittedBy: draft.meta.currentUserId,
            submittedAt: `${draft.meta.demoDate}T12:00:00.000Z`,
            overspendFlag: true,
          };
        }
      }
    });

    // Mark a few submitted reports as stale by backdating
    let stale = 0;
    for (const report of Object.values(draft.reports)) {
      if (report.status === "submitted" && stale < 3) {
        report.versions = report.versions.map((v) => ({
          ...v,
          submittedAt: `${demoDate.slice(0, 4)}-01-01T12:00:00.000Z`,
        }));
        stale += 1;
      }
    }
    draft.meta.seedVersion = `${base.meta.seedVersion}-troubled`;
  });
}

export function buildScenario(
  name: ScenarioName,
  demoDate: ISODate = DEFAULT_DEMO_DATE,
): AppState {
  switch (name) {
    case "empty":
      return buildEmptyScenario(demoDate);
    case "healthy":
      return buildHealthyScenario(demoDate);
    case "troubled":
      return buildTroubledScenario(demoDate);
    case "default":
    default:
      return buildDefaultSeed(demoDate);
  }
}
