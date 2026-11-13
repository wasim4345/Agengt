import type { AppState, DelayImpact, ISODate } from "@/types/domain";
import { DEFAULT_DEMO_DATE, SEED_VERSION } from "@/types/domain";
import { buildDirectory, emptyBusinessCollections } from "./base";
import { d, ts } from "./dates";
import { mergePacks } from "./helpers";
import { IDS } from "./ids";
import { buildP1 } from "./programmes/p1";
import { buildOtherProgrammes } from "./programmes/others";
import { buildKpis } from "./kpis";
import {
  buildAchievements,
  buildProgrammeStartups,
  buildStartups,
} from "./startups";


/** Pure seed builder — all dates relative to demoDate (doc 06 §4). */
export function buildDefaultSeed(
  demoDate: ISODate = DEFAULT_DEMO_DATE,
): AppState {
  const directory = buildDirectory(demoDate);
  const empty = emptyBusinessCollections();
  const pack = mergePacks(buildP1(demoDate), buildOtherProgrammes(demoDate));

  const delayImpacts: Record<string, DelayImpact> = {
    di_p1_a06_a07: {
      id: "di_p1_a06_a07",
      programmeId: IDS.programmes.p1,
      sourceActivityId: "act_p1_a06",
      affectedActivityId: "act_p1_a07",
      originalStart: d(demoDate, -20),
      originalEnd: d(demoDate, 40),
      projectedStart: d(demoDate, -5),
      projectedEnd: d(demoDate, 55),
      shiftDays: 15,
      exceedsProgrammeEnd: false,
      status: "proposed",
    },
    di_p1_a06_a09: {
      id: "di_p1_a06_a09",
      programmeId: IDS.programmes.p1,
      sourceActivityId: "act_p1_a06",
      affectedActivityId: "act_p1_a09",
      originalStart: d(demoDate, 45),
      originalEnd: d(demoDate, 60),
      projectedStart: d(demoDate, 60),
      projectedEnd: d(demoDate, 75),
      shiftDays: 15,
      exceedsProgrammeEnd: false,
      status: "proposed",
    },
  };

  const approvalId = "apr_p8_activation";
  const state: AppState = {
    ...directory,
    ...empty,
    programmes: pack.programmes,
    activities: pack.activities,
    activityBudgets: pack.activityBudgets,
    dependencies: pack.dependencies,
    milestones: pack.milestones,
    activityMilestones: pack.activityMilestones,
    expenses: pack.expenses,
    reports: pack.reports,
    evidence: pack.evidence,
    startups: buildStartups(),
    programmeStartups: buildProgrammeStartups(),
    achievements: buildAchievements(demoDate),
    kpis: buildKpis(),
    delayImpacts,
    approvals: {
      [approvalId]: {
        id: approvalId,
        programmeId: IDS.programmes.p8,
        type: "activation",
        status: "pending",
        requestedBy: IDS.users.kavya,
        requestedAt: ts(demoDate, -2),
        reason: "Ready for Leadership approval",
      },
    },
    notifications: {
      n_welcome: {
        id: "n_welcome",
        roleOrUserId: "leadership",
        text: "Demo data loaded — portfolio ready for presentation.",
        at: ts(demoDate, 0),
        read: false,
        link: "/leadership",
      },
    },
    log: [
      {
        id: "log_seed",
        at: ts(demoDate, 0),
        actorId: IDS.users.meera,
        role: "leadership",
        entity: "AppState",
        entityId: "seed",
        action: "seed",
        summary: `Loaded default demo seed v${SEED_VERSION}`,
      },
    ],
  };

  state.meta.seedVersion = SEED_VERSION;
  state.meta.demoDate = demoDate;
  return state;
}
