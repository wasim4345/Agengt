"use client";

import { create } from "zustand";
import { applyPatches, enablePatches, produceWithPatches, type Patch } from "immer";
import type {
  Activity,
  AppState,
  DepType,
  ID,
  ISODate,
  Milestone,
  Programme,
  Role,
  ScenarioName,
  SnapshotRecord,
  Template,
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
import { validateEntityUpsert } from "./actions/dataValidation";
import { applyQuickScenario } from "./actions/scenarios";
import {
  applyActivateDemo,
  applyAddActivity,
  applyAddDependency,
  applyAddMilestone,
  applyBulkAssignOwner,
  applyBulkShiftDates,
  applyCreateProgrammeDraft,
  applyDecideActivation,
  applyDeleteActivity,
  applyDeleteDependency,
  applyDeleteMilestone,
  applyDuplicateActivity,
  applyReorderActivity,
  applySetActivityBudgetAmount,
  applySetActivityMilestones,
  applySetWizardStep,
  applySubmitProgramme,
  applyTemplateToProgramme,
  applyUpdateActivity,
  applyUpdateMilestone,
  applyUpdateProgramme,
} from "./actions/programme";
import {
  applyDeleteTemplate,
  applyDuplicateTemplate,
  applySaveProgrammeAsTemplate,
  applyUpdateTemplate,
} from "./actions/templates";
import {
  applyImpactProposals,
  applyNudgeActivity,
  applyRescheduleActivity,
  dismissImpactProposals,
} from "./actions/gantt";

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
  markNotificationRead: (id: ID) => Result<true>;
  markAllNotificationsRead: () => Result<number>;
  updateSettings: (
    patch: Partial<AppState["meta"]["settings"]>,
  ) => Result<AppState["meta"]["settings"]>;

  /** Data Manager escape hatch (doc 03) — validates unless allowRuleBreaking */
  rawUpsert: (entity: string, id: ID, value: unknown) => Result<true>;
  rawDelete: (entity: string, id: ID) => Result<true>;
  upsertArrayItem: (
    entity: string,
    match: (row: Record<string, unknown>) => boolean,
    value: Record<string, unknown>,
  ) => Result<true>;
  deleteArrayItem: (
    entity: string,
    match: (row: Record<string, unknown>) => boolean,
  ) => Result<true>;

  /** Quick scenario buttons (P-DAT-03) */
  runQuickScenario: (
    name:
      | "make_delayed"
      | "add_overspend"
      | "add_pending_x5"
      | "complete_next"
      | "release_latest"
      | "add_startup_win",
  ) => Result<string>;

  /** M5 programme wizard & templates */
  createProgrammeDraft: (input?: {
    name?: string;
    categoryId?: ID;
    clientId?: ID;
    startDate?: ISODate;
    endDate?: ISODate;
    totalBudget?: number;
  }) => Result<{ programmeId: ID }>;
  updateProgramme: (
    programmeId: ID,
    patch: Partial<Programme>,
  ) => Result<Programme>;
  setWizardStep: (programmeId: ID, step: number) => Result<number>;
  applyTemplate: (
    programmeId: ID,
    templateId: ID | null,
  ) => Result<{ activityCount: number }>;
  addActivity: (
    programmeId: ID,
    partial?: Partial<Activity> & { budget?: number },
  ) => Result<{ activityId: ID }>;
  updateActivity: (
    activityId: ID,
    patch: Partial<Activity>,
  ) => Result<Activity>;
  deleteActivity: (activityId: ID, cascade?: boolean) => Result<true>;
  duplicateActivity: (activityId: ID) => Result<{ activityId: ID }>;
  reorderActivity: (
    activityId: ID,
    direction: "up" | "down",
  ) => Result<true>;
  bulkShiftDates: (activityIds: ID[], days: number) => Result<number>;
  bulkAssignOwner: (activityIds: ID[], ownerId: ID) => Result<number>;
  addDependency: (input: {
    programmeId: ID;
    successorId: ID;
    predecessorId?: ID;
    predecessorMilestoneId?: ID;
    type?: DepType;
    lagDays?: number;
  }) => Result<{ dependencyId: ID }>;
  deleteDependency: (dependencyId: ID) => Result<true>;
  addMilestone: (
    programmeId: ID,
    input?: Partial<Milestone> & { gatingActivityIds?: ID[] },
  ) => Result<{ milestoneId: ID }>;
  updateMilestone: (
    milestoneId: ID,
    patch: Partial<Milestone>,
  ) => Result<Milestone>;
  deleteMilestone: (milestoneId: ID) => Result<true>;
  setActivityMilestones: (
    activityId: ID,
    milestoneIds: ID[],
  ) => Result<true>;
  setActivityBudgetAmount: (
    activityId: ID,
    amount: number,
  ) => Result<true>;
  submitProgramme: (
    programmeId: ID,
    options?: { acknowledgeUnallocated?: boolean },
  ) => Result<{ approvalId: ID }>;
  decideActivation: (
    approvalId: ID,
    decision: "approved" | "rejected",
    remarks?: string,
  ) => Result<true>;
  activateDemo: (
    programmeId: ID,
    options?: { acknowledgeUnallocated?: boolean },
  ) => Result<true>;
  duplicateTemplate: (templateId: ID) => Result<{ templateId: ID }>;
  updateTemplate: (
    templateId: ID,
    patch: Partial<Template>,
  ) => Result<Template>;
  deleteTemplate: (templateId: ID) => Result<true>;
  saveProgrammeAsTemplate: (
    programmeId: ID,
    name: string,
  ) => Result<{ templateId: ID }>;

  /** M6 Gantt */
  rescheduleActivity: (
    activityId: ID,
    plannedStart: ISODate,
    plannedEnd: ISODate,
  ) => Result<{
    impacts: import("@/lib/rules/dependencies").ImpactProposal[];
    scheduleViolations: number;
  }>;
  nudgeActivity: (
    activityId: ID,
    days: number,
  ) => Result<{
    impacts: import("@/lib/rules/dependencies").ImpactProposal[];
    scheduleViolations: number;
  }>;
  applyImpacts: (
    sourceActivityId: ID,
    mode?: "all" | ID[],
  ) => Result<number>;
  dismissImpacts: (
    sourceActivityId: ID,
    mode?: "all" | ID[],
  ) => Result<number>;
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
        // Exact replace so export→import round-trips identically
        set({ state: parsed, lastUndo: null, quotaError: false });
        schedulePersist(parsed, () => set({ quotaError: true }));
        return ok(parsed);
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

    markNotificationRead: (id) =>
      runMutation("markNotificationRead", (draft) => {
        const note = draft.notifications[id];
        if (!note) {
          return err({
            code: "NOTIFICATION_MISSING",
            message: "Notification not found",
          });
        }
        note.read = true;
        return ok(true as const);
      }),

    markAllNotificationsRead: () =>
      runMutation("markAllNotificationsRead", (draft) => {
        const role = draft.meta.currentRole;
        const userId = draft.meta.currentUserId;
        let count = 0;
        for (const note of Object.values(draft.notifications)) {
          if (
            !note.read &&
            (note.roleOrUserId === role ||
              note.roleOrUserId === userId ||
              note.roleOrUserId === "all")
          ) {
            note.read = true;
            count += 1;
          }
        }
        return ok(count);
      }),

    updateSettings: (patch) =>
      runMutation(
        "updateSettings",
        (draft) => {
          draft.meta.settings = { ...draft.meta.settings, ...patch };
          return ok(draft.meta.settings);
        },
        {
          entity: "Meta",
          entityId: "settings",
          action: "updateSettings",
          summary: "Updated demo settings thresholds",
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
          const validation = validateEntityUpsert(draft, entity, id, value);
          if (!validation.ok) return validation;
          (collection as Record<string, unknown>)[id] = value;
          return ok(true as const);
        },
        {
          entity,
          entityId: id,
          action: "rawUpsert",
          summary: `Upsert ${entity}/${id}`,
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
          summary: `Delete ${entity}/${id}`,
        },
      ),

    upsertArrayItem: (entity, match, value) =>
      runMutation(
        "upsertArrayItem",
        (draft) => {
          const collection = (draft as unknown as Record<string, unknown>)[
            entity
          ];
          if (!Array.isArray(collection)) {
            return err({
              code: "ENTITY_UNKNOWN",
              message: `Unknown entity array: ${entity}`,
              field: "entity",
            });
          }
          const idx = collection.findIndex((row) =>
            match(row as Record<string, unknown>),
          );
          if (idx >= 0) collection[idx] = value;
          else collection.push(value);
          return ok(true as const);
        },
        {
          entity,
          entityId: "array",
          action: "upsertArrayItem",
          summary: `Upsert array item in ${entity}`,
        },
      ),

    deleteArrayItem: (entity, match) =>
      runMutation(
        "deleteArrayItem",
        (draft) => {
          const collection = (draft as unknown as Record<string, unknown>)[
            entity
          ];
          if (!Array.isArray(collection)) {
            return err({
              code: "ENTITY_UNKNOWN",
              message: `Unknown entity array: ${entity}`,
              field: "entity",
            });
          }
          const next = collection.filter(
            (row) => !match(row as Record<string, unknown>),
          );
          (draft as unknown as Record<string, unknown>)[entity] = next;
          return ok(true as const);
        },
        {
          entity,
          entityId: "array",
          action: "deleteArrayItem",
          summary: `Delete array item in ${entity}`,
        },
      ),

    runQuickScenario: (name) =>
      runMutation(
        "runQuickScenario",
        (draft) => applyQuickScenario(draft, name),
        {
          entity: "AppState",
          entityId: "scenario",
          action: "runQuickScenario",
          summary: `Quick scenario: ${name}`,
          notify: `Applied quick scenario “${name}”`,
        },
      ),

    createProgrammeDraft: (input) =>
      runMutation(
        "createProgrammeDraft",
        (draft) => applyCreateProgrammeDraft(draft, input),
        {
          entity: "Programme",
          entityId: "new",
          action: "createProgrammeDraft",
          summary: "Created programme draft",
        },
      ),

    updateProgramme: (programmeId, patch) =>
      runMutation(
        "updateProgramme",
        (draft) => applyUpdateProgramme(draft, programmeId, patch),
        {
          entity: "Programme",
          entityId: programmeId,
          action: "updateProgramme",
          summary: `Updated programme ${programmeId}`,
          programmeId,
        },
      ),

    setWizardStep: (programmeId, step) =>
      runMutation(
        "setWizardStep",
        (draft) => applySetWizardStep(draft, programmeId, step),
        {
          entity: "Programme",
          entityId: programmeId,
          action: "setWizardStep",
          summary: `Wizard step ${step}`,
          programmeId,
        },
      ),

    applyTemplate: (programmeId, templateId) =>
      runMutation(
        "applyTemplate",
        (draft) => applyTemplateToProgramme(draft, programmeId, templateId),
        {
          entity: "Programme",
          entityId: programmeId,
          action: "applyTemplate",
          summary: templateId
            ? `Applied template ${templateId}`
            : "Cleared template (blank)",
          programmeId,
        },
      ),

    addActivity: (programmeId, partial) =>
      runMutation(
        "addActivity",
        (draft) => applyAddActivity(draft, programmeId, partial),
        {
          entity: "Activity",
          entityId: programmeId,
          action: "addActivity",
          summary: "Added activity block",
          programmeId,
        },
      ),

    updateActivity: (activityId, patch) =>
      runMutation(
        "updateActivity",
        (draft) => applyUpdateActivity(draft, activityId, patch),
        {
          entity: "Activity",
          entityId: activityId,
          action: "updateActivity",
          summary: `Updated activity ${activityId}`,
        },
      ),

    deleteActivity: (activityId, cascade) =>
      runMutation(
        "deleteActivity",
        (draft) => applyDeleteActivity(draft, activityId, cascade),
        {
          entity: "Activity",
          entityId: activityId,
          action: "deleteActivity",
          summary: `Deleted activity ${activityId}`,
        },
      ),

    duplicateActivity: (activityId) =>
      runMutation(
        "duplicateActivity",
        (draft) => applyDuplicateActivity(draft, activityId),
        {
          entity: "Activity",
          entityId: activityId,
          action: "duplicateActivity",
          summary: `Duplicated activity ${activityId}`,
        },
      ),

    reorderActivity: (activityId, direction) =>
      runMutation(
        "reorderActivity",
        (draft) => applyReorderActivity(draft, activityId, direction),
        {
          entity: "Activity",
          entityId: activityId,
          action: "reorderActivity",
          summary: `Reordered activity ${direction}`,
        },
      ),

    bulkShiftDates: (activityIds, days) =>
      runMutation(
        "bulkShiftDates",
        (draft) => applyBulkShiftDates(draft, activityIds, days),
        {
          entity: "Activity",
          entityId: "bulk",
          action: "bulkShiftDates",
          summary: `Shifted ${activityIds.length} activities by ${days}d`,
        },
      ),

    bulkAssignOwner: (activityIds, ownerId) =>
      runMutation(
        "bulkAssignOwner",
        (draft) => applyBulkAssignOwner(draft, activityIds, ownerId),
        {
          entity: "Activity",
          entityId: "bulk",
          action: "bulkAssignOwner",
          summary: `Assigned owner to ${activityIds.length} activities`,
        },
      ),

    addDependency: (input) =>
      runMutation(
        "addDependency",
        (draft) => applyAddDependency(draft, input),
        {
          entity: "Dependency",
          entityId: input.programmeId,
          action: "addDependency",
          summary: "Added dependency",
          programmeId: input.programmeId,
        },
      ),

    deleteDependency: (dependencyId) =>
      runMutation(
        "deleteDependency",
        (draft) => applyDeleteDependency(draft, dependencyId),
        {
          entity: "Dependency",
          entityId: dependencyId,
          action: "deleteDependency",
          summary: `Deleted dependency ${dependencyId}`,
        },
      ),

    addMilestone: (programmeId, input) =>
      runMutation(
        "addMilestone",
        (draft) => applyAddMilestone(draft, programmeId, input),
        {
          entity: "Milestone",
          entityId: programmeId,
          action: "addMilestone",
          summary: "Added milestone",
          programmeId,
        },
      ),

    updateMilestone: (milestoneId, patch) =>
      runMutation(
        "updateMilestone",
        (draft) => applyUpdateMilestone(draft, milestoneId, patch),
        {
          entity: "Milestone",
          entityId: milestoneId,
          action: "updateMilestone",
          summary: `Updated milestone ${milestoneId}`,
        },
      ),

    deleteMilestone: (milestoneId) =>
      runMutation(
        "deleteMilestone",
        (draft) => applyDeleteMilestone(draft, milestoneId),
        {
          entity: "Milestone",
          entityId: milestoneId,
          action: "deleteMilestone",
          summary: `Deleted milestone ${milestoneId}`,
        },
      ),

    setActivityMilestones: (activityId, milestoneIds) =>
      runMutation(
        "setActivityMilestones",
        (draft) => applySetActivityMilestones(draft, activityId, milestoneIds),
        {
          entity: "Activity",
          entityId: activityId,
          action: "setActivityMilestones",
          summary: "Updated activity milestones",
        },
      ),

    setActivityBudgetAmount: (activityId, amount) =>
      runMutation(
        "setActivityBudgetAmount",
        (draft) => applySetActivityBudgetAmount(draft, activityId, amount),
        {
          entity: "ActivityBudget",
          entityId: activityId,
          action: "setActivityBudgetAmount",
          summary: `Set budget for ${activityId}`,
        },
      ),

    submitProgramme: (programmeId, options) =>
      runMutation(
        "submitProgramme",
        (draft) => applySubmitProgramme(draft, programmeId, options),
        {
          entity: "Programme",
          entityId: programmeId,
          action: "submitProgramme",
          summary: `Submitted programme ${programmeId} for approval`,
          programmeId,
          notify: "Programme submitted for Leadership approval",
        },
      ),

    decideActivation: (approvalId, decision, remarks) =>
      runMutation(
        "decideActivation",
        (draft) =>
          applyDecideActivation(draft, approvalId, decision, remarks),
        {
          entity: "Approval",
          entityId: approvalId,
          action: "decideActivation",
          summary: `Activation ${decision}`,
          notify: `Programme activation ${decision}`,
        },
      ),

    activateDemo: (programmeId, options) =>
      runMutation(
        "activateDemo",
        (draft) => applyActivateDemo(draft, programmeId, options),
        {
          entity: "Programme",
          entityId: programmeId,
          action: "activateDemo",
          summary: `Activated programme ${programmeId} (demo)`,
          programmeId,
        },
      ),

    duplicateTemplate: (templateId) =>
      runMutation(
        "duplicateTemplate",
        (draft) => applyDuplicateTemplate(draft, templateId),
        {
          entity: "Template",
          entityId: templateId,
          action: "duplicateTemplate",
          summary: `Duplicated template ${templateId}`,
        },
      ),

    updateTemplate: (templateId, patch) =>
      runMutation(
        "updateTemplate",
        (draft) => applyUpdateTemplate(draft, templateId, patch),
        {
          entity: "Template",
          entityId: templateId,
          action: "updateTemplate",
          summary: `Updated template ${templateId}`,
        },
      ),

    deleteTemplate: (templateId) =>
      runMutation(
        "deleteTemplate",
        (draft) => applyDeleteTemplate(draft, templateId),
        {
          entity: "Template",
          entityId: templateId,
          action: "deleteTemplate",
          summary: `Deleted template ${templateId}`,
        },
      ),

    saveProgrammeAsTemplate: (programmeId, name) =>
      runMutation(
        "saveProgrammeAsTemplate",
        (draft) => applySaveProgrammeAsTemplate(draft, programmeId, name),
        {
          entity: "Template",
          entityId: programmeId,
          action: "saveProgrammeAsTemplate",
          summary: `Saved programme as template “${name}”`,
          programmeId,
        },
      ),

    rescheduleActivity: (activityId, plannedStart, plannedEnd) =>
      runMutation(
        "rescheduleActivity",
        (draft) =>
          applyRescheduleActivity(draft, activityId, plannedStart, plannedEnd),
        {
          entity: "Activity",
          entityId: activityId,
          action: "rescheduleActivity",
          summary: `Rescheduled ${activityId} to ${plannedStart}→${plannedEnd}`,
        },
      ),

    nudgeActivity: (activityId, days) =>
      runMutation(
        "nudgeActivity",
        (draft) => applyNudgeActivity(draft, activityId, days),
        {
          entity: "Activity",
          entityId: activityId,
          action: "nudgeActivity",
          summary: `Nudged ${activityId} by ${days}d`,
        },
      ),

    applyImpacts: (sourceActivityId, mode = "all") =>
      runMutation(
        "applyImpacts",
        (draft) => applyImpactProposals(draft, sourceActivityId, mode),
        {
          entity: "DelayImpact",
          entityId: sourceActivityId,
          action: "applyImpacts",
          summary: `Applied downstream shifts from ${sourceActivityId}`,
        },
      ),

    dismissImpacts: (sourceActivityId, mode = "all") =>
      runMutation(
        "dismissImpacts",
        (draft) => dismissImpactProposals(draft, sourceActivityId, mode),
        {
          entity: "DelayImpact",
          entityId: sourceActivityId,
          action: "dismissImpacts",
          summary: `Dismissed downstream shifts from ${sourceActivityId}`,
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
