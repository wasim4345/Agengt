import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { IDS } from "@/seed/ids";
import { createTestStore } from "@/store/store";
import { clearPersistedState } from "@/store/persist";
import { STORAGE_KEYS } from "@/types/domain";

describe("M5 programme wizard & templates", () => {
  beforeEach(() => {
    clearPersistedState();
    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
    createTestStore(buildDefaultSeed("2026-11-12"));
  });

  it("applies Incubation template with 11 blocks (demo step 3)", () => {
    const store = createTestStore();
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);

    const created = store.getState().createProgrammeDraft({
      name: "Demo incubation",
      categoryId: IDS.categories.incubation,
      totalBudget: 30_00_000,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const applied = store
      .getState()
      .applyTemplate(created.data.programmeId, IDS.templates.incubation);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.data.activityCount).toBe(11);

    const activities = Object.values(store.getState().state.activities).filter(
      (a) => a.programmeId === created.data.programmeId,
    );
    expect(activities).toHaveLength(11);

    // edit dates, add one, delete one
    const first = activities[0]!;
    store.getState().updateActivity(first.id, {
      plannedEnd: "2027-01-15",
      name: "Call for Applications (edited)",
    });
    store.getState().addActivity(created.data.programmeId, {
      name: "Extra clinic",
    });
    const toDelete = Object.values(store.getState().state.activities).find(
      (a) =>
        a.programmeId === created.data.programmeId && a.name === "Extra clinic",
    )!;
    // delete a template block with cascade (has deps possibly)
    const outreach = Object.values(store.getState().state.activities).find(
      (a) =>
        a.programmeId === created.data.programmeId &&
        a.name === "Outreach Sessions",
    )!;
    const del = store.getState().deleteActivity(outreach.id, true);
    expect(del.ok).toBe(true);
    expect(toDelete).toBeTruthy();
    store.getState().deleteActivity(toDelete.id, true);

    const remaining = Object.values(store.getState().state.activities).filter(
      (a) => a.programmeId === created.data.programmeId,
    );
    // 11 template blocks + 1 extra − outreach − extra = 10
    expect(remaining.length).toBe(10);
    expect(
      remaining.some((a) => a.name.includes("edited")),
    ).toBe(true);
  });

  it("blocks over-allocation (demo step 5)", () => {
    const store = createTestStore();
    const created = store.getState().createProgrammeDraft({
      totalBudget: 1_00_000,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const pid = created.data.programmeId;
    store.getState().applyTemplate(pid, null);
    const a1 = store.getState().addActivity(pid, {
      name: "A",
      budget: 60_000,
    });
    const a2 = store.getState().addActivity(pid, {
      name: "B",
      budget: 40_000,
    });
    expect(a1.ok && a2.ok).toBe(true);
    if (!a2.ok) return;

    const blocked = store
      .getState()
      .setActivityBudgetAmount(a2.data.activityId, 50_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.ok === false && blocked.errors[0]?.code).toBe(
      "BUD_OVER_ALLOC",
    );
  });

  it("rejects dependency cycles with path", () => {
    const store = createTestStore();
    const created = store.getState().createProgrammeDraft({});
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const pid = created.data.programmeId;
    const x = store.getState().addActivity(pid, { name: "X" });
    const y = store.getState().addActivity(pid, { name: "Y" });
    expect(x.ok && y.ok).toBe(true);
    if (!x.ok || !y.ok) return;

    const d1 = store.getState().addDependency({
      programmeId: pid,
      predecessorId: x.data.activityId,
      successorId: y.data.activityId,
      type: "FS",
    });
    expect(d1.ok).toBe(true);

    const cycle = store.getState().addDependency({
      programmeId: pid,
      predecessorId: y.data.activityId,
      successorId: x.data.activityId,
      type: "FS",
    });
    expect(cycle.ok).toBe(false);
    if (cycle.ok) return;
    expect(cycle.errors[0]?.code).toBe("DEP_CYCLE");
    expect(cycle.errors[0]?.message).toMatch(/→/);
  });

  it("submit → leadership approve → active (demo step 6)", () => {
    const store = createTestStore();
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);

    const created = store.getState().createProgrammeDraft({
      name: "Approval demo",
      categoryId: IDS.categories.incubation,
      clientId: IDS.clients.vanguard,
      totalBudget: 25_00_000,
      startDate: "2026-11-12",
      endDate: "2027-11-12",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const pid = created.data.programmeId;

    store.getState().applyTemplate(pid, IDS.templates.incubation);

    // Leave some unallocated by shrinking one budget — still ≤ total
    const acts = Object.values(store.getState().state.activities).filter(
      (a) => a.programmeId === pid,
    );
    // Acknowledge unallocated on submit
    const submitted = store.getState().submitProgramme(pid, {
      acknowledgeUnallocated: true,
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(store.getState().state.programmes[pid]?.status).toBe(
      "pending_approval",
    );

    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    const decided = store
      .getState()
      .decideActivation(submitted.data.approvalId, "approved");
    expect(decided.ok).toBe(true);
    expect(store.getState().state.programmes[pid]?.status).toBe("active");
    expect(acts[0]?.baselineStart || store.getState().state.activities[acts[0]!.id]?.baselineStart).toBeTruthy();
  });

  it("duplicates template and saves programme as template", () => {
    const store = createTestStore();
    const dup = store.getState().duplicateTemplate(IDS.templates.immersion);
    expect(dup.ok).toBe(true);
    if (!dup.ok) return;
    expect(store.getState().state.templates[dup.data.templateId]?.builtIn).toBe(
      false,
    );

    const created = store.getState().createProgrammeDraft({});
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    store
      .getState()
      .applyTemplate(created.data.programmeId, IDS.templates.immersion);
    const saved = store
      .getState()
      .saveProgrammeAsTemplate(created.data.programmeId, "From programme");
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(
      store.getState().state.templates[saved.data.templateId]?.activities.length,
    ).toBe(6);
  });
});
