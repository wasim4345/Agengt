import { describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import {
  activityFinancials,
  portfolioSurplus,
  previewActivityAfterReport,
  programmeFinancials,
} from "@/selectors/finance";
import { budgetVsCostByActivity } from "@/selectors/manager";
import { overallSurplus } from "@/selectors/leadership";
import { runIntegrityChecks } from "@/selectors/integrity";
import { IDS } from "@/seed/ids";

describe("doc 09 surplus selectors", () => {
  const state = buildDefaultSeed("2026-11-12");

  it("A07 is ~92% used with positive surplus", () => {
    const fin = activityFinancials(state, "act_p1_a07");
    expect(fin.revised).toBe(5_00_000);
    expect(fin.reported).toBe(4_60_000);
    expect(fin.surplus).toBe(40_000);
    expect(fin.utilisation).toBeCloseTo(0.92, 2);
    expect(fin.alert).toBe("warning");
    expect(fin.alertLevel).toBe("warning");
  });

  it("seed includes an over-budget (deficit) activity", () => {
    const fin = activityFinancials(state, "act_p5_a03");
    expect(fin.reported).toBeGreaterThan(fin.revised);
    expect(fin.surplus).toBeLessThan(0);
    expect(fin.alert).toBe("breach");
  });

  it("zero-cost activity shows full surplus", () => {
    const fin = activityFinancials(state, "act_p1_a09");
    expect(fin.reported).toBe(0);
    expect(fin.surplus).toBe(fin.revised);
    expect(fin.alert).toBe("ok");
  });

  it("previewActivityAfterReport does not mutate reported until submit", () => {
    const before = activityFinancials(state, "act_p1_a07");
    const preview = previewActivityAfterReport(state, "act_p1_a07", [
      { amount: 60_000 },
    ]);
    expect(preview.reported).toBe(before.reported + 60_000);
    expect(preview.surplus).toBe(before.surplus - 60_000);
    expect(preview.alert).toBe("breach");
    expect(activityFinancials(state, "act_p1_a07").reported).toBe(
      before.reported,
    );
  });

  it("programme surplus equals Σ activity surplus + unallocated", () => {
    const fin = programmeFinancials(state, IDS.programmes.p1);
    let activitySurplus = 0;
    for (const a of Object.values(state.activities)) {
      if (a.programmeId !== IDS.programmes.p1) continue;
      if (a.status === "cancelled") continue;
      activitySurplus += activityFinancials(state, a.id).surplus;
    }
    expect(fin.surplus).toBe(activitySurplus + fin.unallocated);
  });

  it("portfolio surplus is positive with at least one programme in deficit", () => {
    const ids = Object.keys(state.programmes);
    const portfolio = portfolioSurplus(state, ids);
    expect(portfolio.surplus).toBeGreaterThan(0);
    expect(portfolio.programmesInDeficit).toBeGreaterThanOrEqual(1);
    const p5 = programmeFinancials(state, IDS.programmes.p5);
    expect(p5.surplus).toBeLessThan(0);
  });

  it("budgetVsCostByActivity includes unallocated and programme rows", () => {
    const rows = budgetVsCostByActivity(state, IDS.programmes.p1);
    expect(rows.some((r) => r.kind === "activity")).toBe(true);
    expect(rows.some((r) => r.kind === "unallocated")).toBe(true);
    expect(rows.some((r) => r.kind === "programme")).toBe(true);
    const a07 = rows.find((r) => r.activityId === "act_p1_a07");
    expect(a07?.alert).toBe("warning");
  });

  it("overallSurplus matches portfolioSurplus for all programmes", () => {
    const overall = overallSurplus(state);
    const portfolio = portfolioSurplus(state, Object.keys(state.programmes));
    expect(overall.surplus).toBe(portfolio.surplus);
    expect(overall.programmes.length).toBe(Object.keys(state.programmes).length);
  });

  it("integrity checks pass on default seed including surplus identities", () => {
    const report = runIntegrityChecks(state);
    expect(report.ok).toBe(true);
    expect(report.checks.find((c) => c.id === "surplus-programme")?.ok).toBe(
      true,
    );
    expect(report.checks.find((c) => c.id === "surplus-portfolio")?.ok).toBe(
      true,
    );
    expect(report.checks.find((c) => c.id === "event-photos")?.ok).toBe(true);
  });

  it("outreach report has 6–8 event photographs", () => {
    const photos = Object.values(state.evidence).filter(
      (e) =>
        e.reportId === "rpt_p1_a02" &&
        e.type === "photograph" &&
        !e.deleted,
    );
    expect(photos.length).toBeGreaterThanOrEqual(6);
    expect(photos.length).toBeLessThanOrEqual(8);
  });
});
