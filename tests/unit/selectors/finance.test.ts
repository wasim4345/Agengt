import { describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { activityFinancials } from "@/selectors/finance";

describe("finance identity", () => {
  it("holds Rep = Ver + Pen for every seeded activity", () => {
    const state = buildDefaultSeed("2026-11-12");
    for (const activityId of Object.keys(state.activities)) {
      const fin = activityFinancials(state, activityId);
      expect(fin.reported).toBe(fin.verified + fin.pending);
    }
  });

  it("counts A07 near warning utilisation from seed expenses", () => {
    const state = buildDefaultSeed("2026-11-12");
    const fin = activityFinancials(state, "act_p1_a07");
    expect(fin.revised).toBe(5_00_000);
    expect(fin.reported).toBe(4_60_000);
    expect(fin.reported / fin.revised).toBeGreaterThanOrEqual(0.9);
  });
});
