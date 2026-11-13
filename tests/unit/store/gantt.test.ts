import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { IDS } from "@/seed/ids";
import { addCalendarDays } from "@/lib/rules/dates";
import { effectiveEnd } from "@/lib/rules/dependencies";
import { createTestStore } from "@/store/store";
import { clearPersistedState } from "@/store/persist";
import { STORAGE_KEYS } from "@/types/domain";

describe("M6 Gantt reschedule & impacts", () => {
  beforeEach(() => {
    clearPersistedState();
    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
    createTestStore(buildDefaultSeed("2026-11-12"));
  });

  it("dragging Bootcamps later proposes Investor Meet / Demo Day shifts (demo step 4)", () => {
    const store = createTestStore();
    const bootcamps = store.getState().state.activities["act_p1_a07"]!;
    const oldEnd = effectiveEnd(bootcamps);
    // Large delay so FS into Investor Meet and cascade into Demo Day
    const newEnd = addCalendarDays(oldEnd, 70);
    const newStart = addCalendarDays(bootcamps.plannedStart, 70);

    const result = store
      .getState()
      .rescheduleActivity("act_p1_a07", newStart, newEnd);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.impacts.length).toBeGreaterThan(0);
    const affected = new Set(
      result.data.impacts.map((i) => i.affectedActivityId),
    );
    expect(affected.has("act_p1_a09")).toBe(true); // Investor Meet
    expect(affected.has("act_p1_a10")).toBe(true); // Demo Day (direct FS + cascade)

    const proposals = Object.values(store.getState().state.delayImpacts).filter(
      (i) =>
        i.sourceActivityId === "act_p1_a07" && i.status === "proposed",
    );
    expect(proposals.length).toBe(result.data.impacts.length);

    // Dates updated on Bootcamps immediately
    expect(store.getState().state.activities["act_p1_a07"]!.plannedEnd).toBe(
      newEnd,
    );
  });

  it("apply impacts updates successors; dismiss leaves them; undo restores", () => {
    const store = createTestStore();
    const bootcamps = store.getState().state.activities["act_p1_a07"]!;
    const investorBefore =
      store.getState().state.activities["act_p1_a09"]!.plannedStart;
    const newEnd = addCalendarDays(effectiveEnd(bootcamps), 30);
    const newStart = addCalendarDays(bootcamps.plannedStart, 30);

    store.getState().rescheduleActivity("act_p1_a07", newStart, newEnd);
    const applied = store.getState().applyImpacts("act_p1_a07", "all");
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.data).toBeGreaterThan(0);

    const investorAfter =
      store.getState().state.activities["act_p1_a09"]!.plannedStart;
    expect(investorAfter > investorBefore).toBe(true);

    const undone = store.getState().undo();
    expect(undone.ok).toBe(true);
    // After undo of apply, proposals may be proposed again or prior state
    // Undo last mutation (apply) — investor should revert
    expect(
      store.getState().state.activities["act_p1_a09"]!.plannedStart,
    ).toBe(investorBefore);
  });

  it("dismiss keeps successor dates unchanged", () => {
    const store = createTestStore();
    const bootcamps = store.getState().state.activities["act_p1_a07"]!;
    const demoBefore =
      store.getState().state.activities["act_p1_a10"]!.plannedStart;
    const newEnd = addCalendarDays(effectiveEnd(bootcamps), 25);
    const newStart = addCalendarDays(bootcamps.plannedStart, 25);
    store.getState().rescheduleActivity("act_p1_a07", newStart, newEnd);
    store.getState().dismissImpacts("act_p1_a07", "all");
    expect(
      store.getState().state.activities["act_p1_a10"]!.plannedStart,
    ).toBe(demoBefore);
    expect(
      Object.values(store.getState().state.delayImpacts).some(
        (i) =>
          i.sourceActivityId === "act_p1_a07" && i.status === "dismissed",
      ),
    ).toBe(true);
  });

  it("nudge ±1 day updates store", () => {
    const store = createTestStore();
    const before = store.getState().state.activities["act_p1_a07"]!.plannedStart;
    const r = store.getState().nudgeActivity("act_p1_a07", 1);
    expect(r.ok).toBe(true);
    expect(store.getState().state.activities["act_p1_a07"]!.plannedStart).toBe(
      addCalendarDays(before, 1),
    );
  });

  it("stays correct for flagship programme activity count (~11)", () => {
    const store = createTestStore();
    const count = Object.values(store.getState().state.activities).filter(
      (a) => a.programmeId === IDS.programmes.p1,
    ).length;
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(50);
  });
});
