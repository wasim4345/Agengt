"use client";

import { create } from "zustand";
import { applyPatches, enablePatches, produceWithPatches, type Patch } from "immer";
import type {
  AppState,
  ID,
  ISODate,
  Role,
  ScenarioName,
  SnapshotRecord,
} from "@/types/domain";
import { DEFAULT_DEMO_DATE } from "@/types/domain";
import { buildDefaultSeed, buildScenario } from "@/seed";
import { err, ok, type Result } from "@/types/result";
import {
  clearPersistedState,
  readPersistedState,
  readSnapshots,
  writePersistedState,
  writeSnapshots,
} from "./persist";
import { migrate } from "./migrations";
import { replaceUndo, type UndoEntry } from "./undo";
import {
  applySetAllowRuleBreaking,
  applySetDemoDate,
  applySetRole,
  applySetUser,
} from "./actions/meta";

enablePatches();

type Mutator<T> = (draft: AppState) => Result<T>;

export type OsStore = {
  state: AppState;
  hydrated: boolean;
  snapshots: SnapshotRecord[];
  lastUndo: UndoEntry | null;
  quotaError: boolean;

  hydrate: () => void;
  undo: () => Result<true>;

  /** Data management */
  resetToSeed: () => Result<AppState>;
  loadScenario: (name: ScenarioName) => Result<AppState>;
  clearAll: () => Result<AppState>;
  saveSnapshot: (name: string) => Result<SnapshotRecord>;
  restoreSnapshot: (id: ID) => Result<AppState>;
  deleteSnapshot: (id: ID) => Result<true>;
  exportJSON: () => Result<string>;
  importJSON: (json: string) => Result<AppState>;
  setDemoDate: (date: ISODate) => Result<ISODate>;
  setRole: (role: Role) => Result<Role>;
  setUser: (userId: ID) => Result<ID>;
  setAllowRuleBreaking: (allow: boolean) => Result<boolean>;

  /** Data Manager escape hatch (doc 03) */
  rawUpsert: (entity: string, id: ID, value: unknown) => Result<true>;
  rawDelete: (entity: string, id: ID) => Result<true>;
};

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(state: AppState, onQuota: () => void) {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      writePersistedState(state);
    } catch {
      onQuota();
    }
  }, 300);
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function appendLog(
  draft: AppState,
  opts: {
    entity: string;
    entityId: ID;
    action: string;
    summary: string;
    programmeId?: ID;
  },
) {
  const actorId = draft.meta.currentUserId;
  draft.log.unshift({
    id: newId("log"),
    at: `${draft.meta.demoDate}T12:00:00.000Z`,
    actorId,
    role: draft.meta.currentRole,
    entity: opts.entity,
    entityId: opts.entityId,
    action: opts.action,
    summary: opts.summary,
    programmeId: opts.programmeId,
  });
}

function appendNotification(
  draft: AppState,
  text: string,
  link?: string,
) {
  const id = newId("ntf");
  draft.notifications[id] = {
    id,
    roleOrUserId: draft.meta.currentRole,
    text,
    at: `${draft.meta.demoDate}T12:00:00.000Z`,
    read: false,
    link,
  };
}

export const useOsStore = create<OsStore>((set, get) => {
  const runMutation = <T,>(
    label: string,
    mutator: Mutator<T>,
    log?: {
      entity: string;
      entityId: ID;
      action: string;
      summary: string;
      programmeId?: ID;
      notify?: string;
    },
  ): Result<T> => {
    const current = get().state;
    let result: Result<T> = err({
      code: "NO_RESULT",
      message: "Mutation produced no result",
    });

    let next = current;
    let patches: Patch[] = [];
    let inversePatches: Patch[] = [];

    try {
      [next, patches, inversePatches] = produceWithPatches(current, (draft) => {
        result = mutator(draft);
        if (!result.ok) {
          throw Object.assign(new Error("MUTATION_FAILED"), { result });
        }
        if (log) {
          appendLog(draft, log);
          if (log.notify) appendNotification(draft, log.notify);
        }
      });
    } catch (error) {
      const failed = error as { result?: Result<T> };
      if (failed?.result && failed.result.ok === false) {
        return failed.result;
      }
      throw error;
    }

    if (!result.ok) {
      return result;
    }

    // If mutator failed mid-draft we shouldn't get here; patches empty means no-op ok
    const undoEntry =
      patches.length > 0
        ? replaceUndo(get().lastUndo, {
            patches,
            inversePatches,
            label,
          })
        : get().lastUndo;

    set({
      state: next,
      lastUndo: undoEntry,
      quotaError: false,
    });
    schedulePersist(next, () => set({ quotaError: true }));
    return result;
  };

  const replaceState = (
    next: AppState,
    label: string,
    summary: string,
  ): Result<AppState> => {
    return runMutation(label, (draft) => {
      // Replace root fields
      draft.schemaVersion = next.schemaVersion;
      draft.meta = next.meta;
      draft.users = next.users;
      draft.clients = next.clients;
      draft.categories = next.categories;
      draft.activityCategories = next.activityCategories;
      draft.expenseCategories = next.expenseCategories;
      draft.templates = next.templates;
      draft.programmes = next.programmes;
      draft.activities = next.activities;
      draft.activityBudgets = next.activityBudgets;
      draft.dependencies = next.dependencies;
      draft.milestones = next.milestones;
      draft.activityMilestones = next.activityMilestones;
      draft.budgetRevisions = next.budgetRevisions;
      draft.expenses = next.expenses;
      draft.reports = next.reports;
      draft.evidence = next.evidence;
      draft.startups = next.startups;
      draft.programmeStartups = next.programmeStartups;
      draft.achievements = next.achievements;
      draft.approvals = next.approvals;
      draft.delayImpacts = next.delayImpacts;
      draft.notifications = next.notifications;
      draft.log = next.log;
      return ok(next);
    }, {
      entity: "AppState",
      entityId: "root",
      action: label,
      summary,
      notify: summary,
    });
  };

  return {
    state: buildDefaultSeed(DEFAULT_DEMO_DATE),
    hydrated: false,
    snapshots: [],
    lastUndo: null,
    quotaError: false,

    hydrate: () => {
      if (get().hydrated) return;
      const persisted = readPersistedState();
      const snapshots = readSnapshots();
      set({
        state: persisted ?? buildDefaultSeed(DEFAULT_DEMO_DATE),
        snapshots,
        hydrated: true,
      });

      if (typeof window !== "undefined") {
        window.addEventListener("storage", (event) => {
          if (event.key !== "iimcip-os:v1:state" || !event.newValue) return;
          try {
            const next = migrate(JSON.parse(event.newValue) as unknown);
            set({ state: next });
          } catch {
            // ignore corrupt cross-tab payloads
          }
        });
      }
    },

    undo: () => {
      const entry = get().lastUndo;
      if (!entry) {
        return err({ code: "UNDO_EMPTY", message: "Nothing to undo" });
      }
      const next = applyPatches(get().state, entry.inversePatches) as AppState;
      // Append log without creating a new undo of the undo
      const withLog = produceWithPatches(next, (draft) => {
        appendLog(draft, {
          entity: "AppState",
          entityId: "root",
          action: "undo",
          summary: `Undid: ${entry.label}`,
        });
      })[0];
      set({ state: withLog, lastUndo: null });
      schedulePersist(withLog, () => set({ quotaError: true }));
      return ok(true as const);
    },

    resetToSeed: () => {
      const current = get().state;
      const seed = buildDefaultSeed(current.meta.demoDate);
      // Preserve persona/role prefs; otherwise restore exact seed payload
      seed.meta.currentRole = current.meta.currentRole;
      seed.meta.currentUserId = current.meta.currentUserId;
      seed.meta.allowRuleBreaking = current.meta.allowRuleBreaking;
      clearPersistedState();
      set({ state: seed, lastUndo: null, quotaError: false });
      schedulePersist(seed, () => set({ quotaError: true }));
      return ok(seed);
    },

    loadScenario: (name) => {
      const demoDate = get().state.meta.demoDate;
      const scenario = buildScenario(name, demoDate);
      scenario.meta.currentRole = get().state.meta.currentRole;
      scenario.meta.currentUserId = get().state.meta.currentUserId;
      return replaceState(
        scenario,
        "loadScenario",
        `Loaded scenario: ${name}`,
      );
    },

    clearAll: () => {
      const scenario = buildScenario("empty", get().state.meta.demoDate);
      scenario.meta.currentRole = get().state.meta.currentRole;
      scenario.meta.currentUserId = get().state.meta.currentUserId;
      return replaceState(scenario, "clearAll", "Cleared all business data");
    },

    saveSnapshot: (name) => {
      const snap: SnapshotRecord = {
        id: newId("snap"),
        name,
        createdAt: new Date().toISOString(),
        state: structuredClone(get().state),
      };
      const snapshots = [snap, ...get().snapshots].slice(0, 10);
      writeSnapshots(snapshots);
      set({ snapshots });
      return runMutation(
        "saveSnapshot",
        () => ok(snap),
        {
          entity: "Snapshot",
          entityId: snap.id,
          action: "saveSnapshot",
          summary: `Saved snapshot “${name}”`,
        },
      );
    },

    restoreSnapshot: (id) => {
      const snap = get().snapshots.find((s) => s.id === id);
      if (!snap) {
        return err({
          code: "SNAPSHOT_MISSING",
          message: "Snapshot not found",
        });
      }
      return replaceState(
        structuredClone(snap.state),
        "restoreSnapshot",
        `Restored snapshot “${snap.name}”`,
      );
    },

    deleteSnapshot: (id) => {
      const snapshots = get().snapshots.filter((s) => s.id !== id);
      writeSnapshots(snapshots);
      set({ snapshots });
      return ok(true as const);
    },

    exportJSON: () => {
      const json = JSON.stringify(get().state, null, 2);
      return ok(json);
    },

    importJSON: (json) => {
      try {
        const parsed = migrate(JSON.parse(json) as unknown);
        return replaceState(parsed, "importJSON", "Imported JSON store");
      } catch {
        return err({
          code: "IMPORT_INVALID",
          message: "Could not parse or migrate JSON",
        });
      }
    },

    setDemoDate: (date) =>
      runMutation(
        "setDemoDate",
        (draft) => applySetDemoDate(draft, date),
        {
          entity: "Meta",
          entityId: "demoDate",
          action: "setDemoDate",
          summary: `Demo clock set to ${date}`,
        },
      ),

    setRole: (role) =>
      runMutation("setRole", (draft) => applySetRole(draft, role), {
        entity: "Meta",
        entityId: "role",
        action: "setRole",
        summary: `Role switched to ${role}`,
      }),

    setUser: (userId) =>
      runMutation("setUser", (draft) => applySetUser(draft, userId), {
        entity: "Meta",
        entityId: userId,
        action: "setUser",
        summary: `Persona switched to ${userId}`,
      }),

    setAllowRuleBreaking: (allow) =>
      runMutation(
        "setAllowRuleBreaking",
        (draft) => applySetAllowRuleBreaking(draft, allow),
        {
          entity: "Meta",
          entityId: "allowRuleBreaking",
          action: "setAllowRuleBreaking",
          summary: `Rule-breaking ${allow ? "enabled" : "disabled"}`,
        },
      ),

    rawUpsert: (entity, id, value) =>
      runMutation(
        "rawUpsert",
        (draft) => {
          const collection = (draft as unknown as Record<string, unknown>)[
            entity
          ];
          if (
            !collection ||
            typeof collection !== "object" ||
            Array.isArray(collection)
          ) {
            return err({
              code: "ENTITY_UNKNOWN",
              message: `Unknown entity map: ${entity}`,
              field: "entity",
            });
          }
          (collection as Record<string, unknown>)[id] = value;
          return ok(true as const);
        },
        {
          entity,
          entityId: id,
          action: "rawUpsert",
          summary: `Raw upsert ${entity}/${id}`,
        },
      ),

    rawDelete: (entity, id) =>
      runMutation(
        "rawDelete",
        (draft) => {
          const collection = (draft as unknown as Record<string, unknown>)[
            entity
          ];
          if (
            !collection ||
            typeof collection !== "object" ||
            Array.isArray(collection)
          ) {
            return err({
              code: "ENTITY_UNKNOWN",
              message: `Unknown entity map: ${entity}`,
              field: "entity",
            });
          }
          delete (collection as Record<string, unknown>)[id];
          return ok(true as const);
        },
        {
          entity,
          entityId: id,
          action: "rawDelete",
          summary: `Raw delete ${entity}/${id}`,
        },
      ),
  };
});

/** Test helper: create an isolated store-like API over a seed (no persistence). */
export function createTestStore(initial?: AppState) {
  // Reuse the singleton pattern carefully — tests should reset via these helpers
  useOsStore.setState({
    state: initial ?? buildDefaultSeed(DEFAULT_DEMO_DATE),
    hydrated: true,
    snapshots: [],
    lastUndo: null,
    quotaError: false,
  });
  return useOsStore;
}

export type { Patch };
