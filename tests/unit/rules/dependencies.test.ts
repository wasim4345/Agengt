import { describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import {
  canStartOrComplete,
  computeDelayImpact,
  constraintForDependency,
  detectCycle,
  effectiveEnd,
  milestoneHealth,
  validateAddDependency,
  validateSchedule,
  wouldCreateCycle,
} from "@/lib/rules/dependencies";
import { produce } from "immer";

describe("dependency constraints (§3.1)", () => {
  it("computes FS/SS/FF/SF required dates", () => {
    expect(constraintForDependency("FS", 0, "2026-01-01", "2026-01-10")).toEqual({
      requiredStart: "2026-01-11",
    });
    expect(constraintForDependency("SS", 2, "2026-01-01", "2026-01-10")).toEqual({
      requiredStart: "2026-01-03",
    });
    expect(constraintForDependency("FF", 0, "2026-01-01", "2026-01-10")).toEqual({
      requiredEnd: "2026-01-10",
    });
    expect(constraintForDependency("SF", 1, "2026-01-01", "2026-01-10")).toEqual({
      requiredEnd: "2026-01-02",
    });
  });

  it("uses revisedEnd as effective end", () => {
    const state = buildDefaultSeed("2026-11-12");
    const a06 = state.activities.act_p1_a06!;
    expect(effectiveEnd(a06)).toBe(a06.revisedEnd);
  });
});

describe("cycle prevention (§3.2)", () => {
  it("accepts valid dependency and rejects self / cross-programme / cycle", () => {
    const state = buildDefaultSeed("2026-11-12");
    expect(
      validateAddDependency(state, {
        programmeId: "prg_p1",
        successorId: "act_p1_a04",
        predecessorId: "act_p1_a03",
      }).ok,
    ).toBe(true);

    expect(
      validateAddDependency(state, {
        programmeId: "prg_p1",
        successorId: "act_p1_a01",
        predecessorId: "act_p1_a01",
      }).ok,
    ).toBe(false);

    expect(
      validateAddDependency(state, {
        programmeId: "prg_p1",
        successorId: "act_p1_a01",
        predecessorId: "act_p2_a01",
      }).ok,
    ).toBe(false);

    // Seed already has A01 → A03 (FS). Closing A03 → A01 creates a cycle.
    const cycled = produce(state, (draft) => {
      draft.dependencies.dep_cycle = {
        id: "dep_cycle",
        programmeId: "prg_p1",
        predecessorId: "act_p1_a03",
        successorId: "act_p1_a01",
        type: "FS",
        lagDays: 0,
      };
    });
    const cycle = detectCycle(cycled, "prg_p1");
    expect(cycle.hasCycle).toBe(true);
    expect(cycle.path).toContain("act_p1_a01");

    const would = wouldCreateCycle(
      state,
      "prg_p1",
      "activity:act_p1_a03",
      "activity:act_p1_a01",
    );
    expect(would.hasCycle).toBe(true);
  });
});

describe("schedule validation & impact (§3.3–3.4)", () => {
  it("flags schedule violations when successor starts too early", () => {
    const state = produce(buildDefaultSeed("2026-11-12"), (draft) => {
      draft.activities.act_p1_a03!.plannedStart = "2026-01-01";
      draft.activities.act_p1_a03!.plannedEnd = "2026-01-02";
    });
    const violations = validateSchedule(state, "prg_p1");
    expect(violations.some((v) => v.activityId === "act_p1_a03")).toBe(true);
  });

  it("computes downstream impact proposals without auto-applying", () => {
    const state = buildDefaultSeed("2026-11-12");
    const impacts = computeDelayImpact(state, "act_p1_a07", "2026-12-31");
    expect(impacts.length).toBeGreaterThan(0);
    expect(impacts.every((i) => i.status === "proposed")).toBe(true);
    expect(impacts.some((i) => i.affectedActivityId === "act_p1_a09")).toBe(
      true,
    );
  });
});

describe("status & milestones (§3.5–3.6)", () => {
  it("blocks in_progress when FS predecessor incomplete", () => {
    const state = buildDefaultSeed("2026-11-12");
    // A09 FS after A07 which is in_progress
    const result = canStartOrComplete(state, "act_p1_a09", "in_progress");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("ACT_PRED_FS");
  });

  it("derives milestone health", () => {
    const state = buildDefaultSeed("2026-11-12");
    expect(milestoneHealth(state, "ms_p1_m1")).toBe("achieved");
    expect(["at_risk", "on_track", "missed"]).toContain(
      milestoneHealth(state, "ms_p1_m2"),
    );
  });
});
