import type { AppState, Category, Client, User } from "@/types/domain";
import { CURRENT_SCHEMA_VERSION } from "@/types/domain";
import { buildDefaultSeed } from "@/seed";

type UnknownRecord = Record<string, unknown>;

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Migrate persisted / imported JSON to the current schema.
 * Unknown or corrupt payloads fall back to default seed.
 */
export function migrate(raw: unknown): AppState {
  if (!isObject(raw)) {
    return buildDefaultSeed();
  }

  const version =
    typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;

  if (version > CURRENT_SCHEMA_VERSION) {
    return ensureShape(raw as unknown as AppState);
  }

  if (version < 1) {
    if (isObject(raw.meta) && isObject(raw.programmes)) {
      return ensureShape({
        ...(raw as unknown as AppState),
        schemaVersion: 1,
      });
    }
    return buildDefaultSeed();
  }

  return ensureShape(raw as unknown as AppState);
}

function ensureShape(state: AppState): AppState {
  const fallback = buildDefaultSeed(state.meta?.demoDate);
  const users = { ...(state.users ?? {}) };
  for (const [id, user] of Object.entries(users)) {
    const u = user as User;
    if (u.role === "leadership" && u.canApprove === undefined) {
      users[id] = { ...u, canApprove: true };
    }
  }
  const clients = { ...(state.clients ?? {}) };
  for (const [id, client] of Object.entries(clients)) {
    const c = client as Client;
    if (!c.type) {
      clients[id] = { ...c, type: "other" };
    }
  }
  const categories = { ...(state.categories ?? {}) };
  for (const [id, cat] of Object.entries(categories)) {
    const c = cat as Category;
    if (!c.stage) {
      categories[id] = { ...c, stage: "custom" };
    }
  }

  return {
    ...fallback,
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: { ...fallback.meta, ...state.meta },
    users,
    clients,
    offices: state.offices ?? fallback.offices,
    categories,
    activityCategories: state.activityCategories ?? {},
    expenseCategories: state.expenseCategories ?? {},
    templates: state.templates ?? {},
    programmes: state.programmes ?? {},
    activities: state.activities ?? {},
    activityBudgets: state.activityBudgets ?? {},
    dependencies: state.dependencies ?? {},
    milestones: state.milestones ?? {},
    activityMilestones: state.activityMilestones ?? [],
    budgetRevisions: state.budgetRevisions ?? {},
    expenses: state.expenses ?? {},
    reports: state.reports ?? {},
    evidence: state.evidence ?? {},
    startups: state.startups ?? {},
    programmeStartups: state.programmeStartups ?? [],
    achievements: state.achievements ?? {},
    kpis: state.kpis ?? {},
    approvals: state.approvals ?? {},
    delayImpacts: state.delayImpacts ?? {},
    notifications: state.notifications ?? {},
    log: state.log ?? [],
  };
}
