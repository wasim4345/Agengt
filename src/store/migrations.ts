import type { AppState } from "@/types/domain";
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
    // Future dump — best-effort cast after ensuring required collections exist
    return ensureShape(raw as unknown as AppState);
  }

  if (version < 1) {
    // Pre-versioned prototype dumps: wrap if it looks like AppState-ish
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
  return {
    ...fallback,
    ...state,
    schemaVersion: 1,
    meta: { ...fallback.meta, ...state.meta },
    users: state.users ?? {},
    clients: state.clients ?? {},
    categories: state.categories ?? {},
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
    approvals: state.approvals ?? {},
    delayImpacts: state.delayImpacts ?? {},
    notifications: state.notifications ?? {},
    log: state.log ?? [],
  };
}
