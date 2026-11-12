import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { createTestStore } from "@/store/store";
import {
  clearPersistedState,
  readPersistedState,
  writePersistedState,
} from "@/store/persist";
import { STORAGE_KEYS } from "@/types/domain";

describe("store persistence & reset", () => {
  beforeEach(() => {
    clearPersistedState();
    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
    createTestStore(buildDefaultSeed("2026-11-12"));
  });

  it("reload preserves edits via localStorage", () => {
    const store = createTestStore();
    const originalName = store.getState().state.programmes.prg_p1!.name;

    const result = store.getState().rawUpsert("programmes", "prg_p1", {
      ...store.getState().state.programmes.prg_p1!,
      name: "Edited Flagship",
    });
    expect(result.ok).toBe(true);

    // flush debounce by writing immediately for the test
    writePersistedState(store.getState().state);

    const reloaded = readPersistedState();
    expect(reloaded?.programmes.prg_p1?.name).toBe("Edited Flagship");
    expect(reloaded?.programmes.prg_p1?.name).not.toBe(originalName);
  });

  it("resetToSeed restores the exact default seed payload", () => {
    const store = createTestStore();
    store.getState().rawUpsert("programmes", "prg_p1", {
      ...store.getState().state.programmes.prg_p1!,
      name: "Edited Flagship",
    });

    const reset = store.getState().resetToSeed();
    expect(reset.ok).toBe(true);

    const expected = buildDefaultSeed("2026-11-12");
    expected.meta.currentRole = store.getState().state.meta.currentRole;
    expected.meta.currentUserId = store.getState().state.meta.currentUserId;
    expected.meta.allowRuleBreaking =
      store.getState().state.meta.allowRuleBreaking;

    expect(store.getState().state).toEqual(expected);
  });

  it("clearAll leaves directory entities only", () => {
    const store = createTestStore();
    const result = store.getState().clearAll();
    expect(result.ok).toBe(true);
    expect(Object.keys(store.getState().state.programmes)).toHaveLength(0);
    expect(Object.keys(store.getState().state.users).length).toBeGreaterThan(0);
    expect(Object.keys(store.getState().state.templates).length).toBeGreaterThan(
      0,
    );
  });
});
