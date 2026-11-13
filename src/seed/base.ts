import type { AppState, ISODate, Role } from "@/types/domain";
import {
  DEFAULT_DEMO_DATE,
  SEED_VERSION,
} from "@/types/domain";
import { buildActivityCategories, buildCategories, buildExpenseCategories } from "./categories";
import { buildClients } from "./clients";
import { buildTemplates } from "./templates";
import { buildUsers } from "./users";
import { IDS } from "./ids";

export function buildDirectory(demoDate: ISODate = DEFAULT_DEMO_DATE): Pick<
  AppState,
  | "schemaVersion"
  | "meta"
  | "users"
  | "clients"
  | "categories"
  | "activityCategories"
  | "expenseCategories"
  | "templates"
> {
  return {
    schemaVersion: 1,
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
      },
    },
    users: buildUsers(),
    clients: buildClients(),
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
  | "approvals"
  | "delayImpacts"
  | "notifications"
  | "log"
> {
  return {
    programmes: {},
    activities: {},
    activityBudgets: {},
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
    approvals: {},
    delayImpacts: {},
    notifications: {},
    log: [],
  };
}
