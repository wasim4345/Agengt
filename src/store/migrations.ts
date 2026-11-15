import type {
  AppState,
  Category,
  Client,
  Programme,
  Role,
  User,
} from "@/types/domain";
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_INTELLIGENCE_SETTINGS,
} from "@/types/domain";
import { buildDefaultSeed } from "@/seed";
import { IDS } from "@/seed/ids";

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

function mapLegacyRole(raw: string | undefined): {
  role: Role;
  active?: boolean;
} {
  switch (raw) {
    case "finance":
      return { role: "programme_lead" };
    case "client":
      return { role: "programme_manager", active: false };
    case "programme_lead":
    case "leadership":
    case "programme_manager":
    case "marcom":
      return { role: raw };
    default:
      return { role: "programme_manager", active: false };
  }
}

function ensureShape(state: AppState): AppState {
  const fallback = buildDefaultSeed(state.meta?.demoDate);
  const users = { ...(state.users ?? {}) };
  for (const [id, user] of Object.entries(users)) {
    const u = user as User & { role: string };
    const mapped = mapLegacyRole(u.role);
    let next: User = {
      ...u,
      role: mapped.role,
      active: mapped.active === false ? false : u.active,
    };
    if (next.role === "leadership" && next.canApprove === undefined) {
      next = { ...next, canApprove: true };
    }
    // Known seed finance → lead rename
    if (id === IDS.users.sunita) {
      next = {
        ...next,
        role: "programme_lead",
        title: next.title?.includes("Lead")
          ? next.title
          : "Programme Lead · Kolkata / HQ",
        active: true,
      };
    }
    users[id] = next;
  }

  // Ensure NE lead exists after migration
  if (!users[IDS.users.leadNe]) {
    users[IDS.users.leadNe] = fallback.users[IDS.users.leadNe]!;
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

  const programmes = { ...(state.programmes ?? {}) };
  for (const [id, prog] of Object.entries(programmes)) {
    const p = prog as Programme;
    let leadId = p.leadId;
    if (!leadId) {
      const office = p.officeId ? state.offices?.[p.officeId] : undefined;
      const isNe =
        office &&
        office.state !== "West Bengal" &&
        office.name !== "Kolkata";
      leadId = isNe ? IDS.users.leadNe : IDS.users.sunita;
      // Prefer fallback seed assignment when available
      if (fallback.programmes[id]?.leadId) {
        leadId = fallback.programmes[id]!.leadId;
      }
    }
    let completedAt = p.completedAt;
    if (
      (p.status === "completed" || p.status === "closed") &&
      !completedAt
    ) {
      const acts = Object.values(state.activities ?? {}).filter(
        (a) => a.programmeId === id,
      );
      const ends = acts
        .map((a) => a.actualEnd)
        .filter((x): x is string => Boolean(x));
      completedAt =
        ends.sort().at(-1) ??
        p.endDate ??
        fallback.programmes[id]?.completedAt;
    }
    programmes[id] = { ...p, leadId, completedAt };
  }

  let currentRole = state.meta?.currentRole as string | undefined;
  if (currentRole === "finance") currentRole = "programme_lead";
  if (currentRole === "client") currentRole = "leadership";
  if (
    currentRole !== "leadership" &&
    currentRole !== "programme_lead" &&
    currentRole !== "programme_manager" &&
    currentRole !== "marcom"
  ) {
    currentRole = "leadership";
  }

  let currentUserId = state.meta?.currentUserId ?? fallback.meta.currentUserId;
  if (currentRole === "programme_lead" && users[currentUserId]?.role !== "programme_lead") {
    currentUserId = IDS.users.sunita;
  }

  return {
    ...fallback,
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: {
      ...fallback.meta,
      ...state.meta,
      currentRole: currentRole as Role,
      currentUserId,
      settings: {
        ...fallback.meta.settings,
        ...state.meta?.settings,
        requireEventPhotos:
          state.meta?.settings?.requireEventPhotos ?? false,
        intelligence: {
          ...DEFAULT_INTELLIGENCE_SETTINGS,
          ...fallback.meta.settings.intelligence,
          ...state.meta?.settings?.intelligence,
        },
      },
    },
    users,
    clients,
    offices: state.offices ?? fallback.offices,
    categories,
    activityCategories: state.activityCategories ?? {},
    expenseCategories: state.expenseCategories ?? {},
    templates: state.templates ?? {},
    programmes,
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
    insightStates: state.insightStates ?? {},
    insightRuns: state.insightRuns ?? [],
  };
}
