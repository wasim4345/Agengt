import type { AppState, ISODate, Role } from "@/types/domain";
import {
  DEFAULT_DEMO_DATE,
  DEFAULT_INTELLIGENCE_SETTINGS,
  SEED_VERSION,
} from "@/types/domain";
import { buildActivityCategories, buildCategories, buildExpenseCategories } from "./categories";
import { buildClients } from "./clients";
import { buildOffices } from "./offices";
import { buildTemplates } from "./templates";
import { buildUsers } from "./users";
import { IDS } from "./ids";

export function buildDirectory(demoDate: ISODate = DEFAULT_DEMO_DATE): Pick<
  AppState,
  | "schemaVersion"
  | "meta"
  | "users"
  | "clients"
  | "offices"
  | "categories"
  | "activityCategories"
  | "expenseCategories"
  | "templates"
> {
  return {
    schemaVersion: 4,
    meta: {
      demoDate,
      currentRole: "leadership" as Role,
      currentUserId: IDS.users.meera,
      allowRuleBreaking: false,
      seedVersion: SEED_VERSION,
      settings: {
        warnPct: 0.9,
        reallocLeadershipPct: 0.1,
        reallocLeadershipAmount: 100_000,
        upcomingDays: 14,
        staleReportDays: 14,
        requireEventPhotos: false,
        intelligence: { ...DEFAULT_INTELLIGENCE_SETTINGS },
      },
    },
    users: buildUsers(),
    clients: buildClients(),
    offices: buildOffices(),
    categories: buildCategories(),
    activityCategories: buildActivityCategories(),
    expenseCategories: buildExpenseCategories(),
    templates: buildTemplates(),
  };
}

export function emptyBusinessCollections(): Pick<
  AppState,
  | "programmes"
  | "activities"
  | "activityBudgets"
  | "activityDetails"
  | "activityLocations"
  | "activitySessions"
  | "activityStakeholders"
  | "dependencies"
  | "milestones"
  | "activityMilestones"
  | "budgetRevisions"
  | "expenses"
  | "reports"
  | "evidence"
  | "startups"
  | "programmeStartups"
  | "achievements"
  | "kpis"
  | "approvals"
  | "delayImpacts"
  | "notifications"
  | "log"
  | "insightStates"
  | "insightRuns"
> {
  return {
    programmes: {},
    activities: {},
    activityBudgets: {},
    activityDetails: {},
    activityLocations: {},
    activitySessions: {},
    activityStakeholders: {},
    dependencies: {},
    milestones: {},
    activityMilestones: [],
    budgetRevisions: {},
    expenses: {},
    reports: {},
    evidence: {},
    startups: {},
    programmeStartups: [],
    achievements: {},
    kpis: {},
    approvals: {},
    delayImpacts: {},
    notifications: {},
    log: [],
    insightStates: {},
    insightRuns: [],
  };
}
