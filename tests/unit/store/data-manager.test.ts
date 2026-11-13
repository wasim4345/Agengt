import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { createTestStore } from "@/store/store";
import { clearPersistedState } from "@/store/persist";
import { STORAGE_KEYS } from "@/types/domain";
import { newEntityStub, ENTITY_TABS } from "@/components/data/entityRegistry";

describe("Data Manager store actions", () => {
  beforeEach(() => {
    clearPersistedState();
    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
    createTestStore(buildDefaultSeed("2026-11-12"));
  });

  it("export → reset → import round-trips identically", () => {
    const store = createTestStore();
    const before = structuredClone(store.getState().state);

    const exported = store.getState().exportJSON();
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const reset = store.getState().resetToSeed();
    expect(reset.ok).toBe(true);

    // Mutate so import has something to restore
    store.getState().rawUpsert("programmes", "prg_p1", {
      ...store.getState().state.programmes.prg_p1!,
      name: "Changed after reset",
    });
    expect(store.getState().state.programmes.prg_p1?.name).toBe(
      "Changed after reset",
    );

    const imported = store.getState().importJSON(exported.data);
    expect(imported.ok).toBe(true);
    expect(store.getState().state).toEqual(before);
    expect(JSON.parse(exported.data)).toEqual(store.getState().state);
  });

  it("adds, edits, and deletes a record entity", () => {
    const store = createTestStore();
    const stub = newEntityStub(
      ENTITY_TABS.find((t) => t.key === "clients")!,
    );
    const id = String(stub.id);

    const add = store.getState().rawUpsert("clients", id, stub);
    expect(add.ok).toBe(true);
    expect(store.getState().state.clients[id]?.name).toBe("New sponsor");

    const edited = { ...stub, name: "Edited client" };
    const edit = store.getState().rawUpsert("clients", id, edited);
    expect(edit.ok).toBe(true);
    expect(store.getState().state.clients[id]?.name).toBe("Edited client");

    const del = store.getState().rawDelete("clients", id);
    expect(del.ok).toBe(true);
    expect(store.getState().state.clients[id]).toBeUndefined();
  });

  it("upserts and deletes array entities", () => {
    const store = createTestStore();
    const row = {
      programmeId: "prg_p1",
      startupId: "st_new",
      status: "applied",
    };
    const add = store.getState().upsertArrayItem(
      "programmeStartups",
      (r) => r.programmeId === "prg_p1" && r.startupId === "st_new",
      row,
    );
    expect(add.ok).toBe(true);
    expect(
      store
        .getState()
        .state.programmeStartups.some(
          (r) => r.programmeId === "prg_p1" && r.startupId === "st_new",
        ),
    ).toBe(true);

    const del = store.getState().deleteArrayItem(
      "programmeStartups",
      (r) => r.programmeId === "prg_p1" && r.startupId === "st_new",
    );
    expect(del.ok).toBe(true);
    expect(
      store
        .getState()
        .state.programmeStartups.some(
          (r) => r.programmeId === "prg_p1" && r.startupId === "st_new",
        ),
    ).toBe(false);
  });

  it("blocks invalid expense upsert unless rule-breaking is on", () => {
    const store = createTestStore();
    const bad = {
      id: "exp_bad",
      programmeId: "prg_p1",
      activityId: "act_p1_a01",
      categoryId: "ecat_misc",
      description: "",
      date: "2026-11-12",
      amount: 0,
      status: "draft" as const,
    };
    const blocked = store.getState().rawUpsert("expenses", "exp_bad", bad);
    expect(blocked.ok).toBe(false);

    store.getState().setAllowRuleBreaking(true);
    const allowed = store.getState().rawUpsert("expenses", "exp_bad", bad);
    expect(allowed.ok).toBe(true);
  });

  it("runs quick scenarios and updates settings", () => {
    const store = createTestStore();
    const delayed = store.getState().runQuickScenario("make_delayed");
    expect(delayed.ok).toBe(true);
    expect(
      Object.values(store.getState().state.activities).some(
        (a) => a.status === "delayed",
      ),
    ).toBe(true);

    const settings = store.getState().updateSettings({ upcomingDays: 21 });
    expect(settings.ok).toBe(true);
    expect(store.getState().state.meta.settings.upcomingDays).toBe(21);
  });

  it("saves and restores snapshots", () => {
    const store = createTestStore();
    store.getState().rawUpsert("clients", "cli_temp", {
      id: "cli_temp",
      name: "Temp",
    });
    const saved = store.getState().saveSnapshot("mid-demo");
    expect(saved.ok).toBe(true);

    store.getState().rawDelete("clients", "cli_temp");
    expect(store.getState().state.clients.cli_temp).toBeUndefined();

    const restored = store.getState().restoreSnapshot(saved.ok ? saved.data.id : "");
    expect(restored.ok).toBe(true);
    expect(store.getState().state.clients.cli_temp?.name).toBe("Temp");
  });
});
