import { describe, expect, it } from "vitest";
import { produce } from "immer";
import { buildDefaultSeed } from "@/seed";
import {
  activityBeyondProgrammeEnd,
  canRequestClosure,
  validateProgramme,
} from "@/lib/rules/programme";

describe("programme validation (§2)", () => {
  it("passes default flagship with warnings only for unallocated", () => {
    const state = buildDefaultSeed("2026-11-12");
    const result = validateProgramme(state, "prg_p1");
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.code === "W2")).toBe(true);
  });

  it("acknowledging unallocated clears W2", () => {
    const state = buildDefaultSeed("2026-11-12");
    const result = validateProgramme(state, "prg_p1", {
      acknowledgeUnallocated: true,
    });
    expect(result.warnings.some((w) => w.code === "W2")).toBe(false);
  });

  it("blocks E1–E6 style failures", () => {
    const state = produce(buildDefaultSeed("2026-11-12"), (draft) => {
      draft.programmes.prg_p5!.endDate = "2020-01-01";
      draft.programmes.prg_p5!.startDate = "2026-12-01";
      // remove activities for E6 on a copy programme — use p5 and clear acts
      for (const id of Object.keys(draft.activities)) {
        if (draft.activities[id]!.programmeId === "prg_p5") {
          delete draft.activities[id];
          delete draft.activityBudgets[id];
        }
      }
    });
    const result = validateProgramme(state, "prg_p5");
    expect(result.ok).toBe(false);
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain("E1");
    expect(codes).toContain("E6");
  });

  it("blocks allocation above budget (E5) and activity beyond end", () => {
    const state = produce(buildDefaultSeed("2026-11-12"), (draft) => {
      draft.activityBudgets.act_p1_a07!.revised = 50_00_000;
    });
    const result = validateProgramme(state, "prg_p1");
    expect(result.errors.some((e) => e.code === "E5")).toBe(true);

    const beyond = activityBeyondProgrammeEnd(
      produce(buildDefaultSeed("2026-11-12"), (draft) => {
        draft.activities.act_p1_a11!.plannedEnd = "2030-01-01";
        draft.activities.act_p1_a11!.revisedEnd = "2030-01-01";
      }),
      "act_p1_a11",
    );
    expect(beyond.beyond).toBe(true);
  });

  it("blocks closure with pending expenses / unresolved activities", () => {
    const state = buildDefaultSeed("2026-11-12");
    const result = canRequestClosure(state, "prg_p1");
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
