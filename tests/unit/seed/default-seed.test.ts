import { describe, expect, it } from "vitest";
import { buildDefaultSeed, IDS } from "@/seed";
import { programmeFinancials } from "@/selectors/finance";
import { runIntegrityChecks } from "@/selectors/integrity";

describe("default seed (doc 06 §4)", () => {
  const state = buildDefaultSeed("2026-11-12");

  it("includes six programmes with expected codes", () => {
    const codes = Object.values(state.programmes)
      .map((p) => p.code)
      .sort();
    expect(codes).toEqual([
      "IIMCIP-ACC-2026-002",
      "IIMCIP-ACC-2026-006",
      "IIMCIP-IMM-2026-004",
      "IIMCIP-INC-2026-001",
      "IIMCIP-INC-2026-005",
      "IIMCIP-PRE-2026-003",
    ]);
  });

  it("has flagship P1 with 11 activities and ₹2.5L unallocated", () => {
    const p1Acts = Object.values(state.activities).filter(
      (a) => a.programmeId === IDS.programmes.p1,
    );
    expect(p1Acts).toHaveLength(11);
    const fin = programmeFinancials(state, IDS.programmes.p1);
    expect(fin.budget).toBe(25_00_000);
    expect(fin.allocated).toBe(22_50_000);
    expect(fin.unallocated).toBe(2_50_000);
  });

  it("seeds 18 startups and 8 achievements", () => {
    expect(Object.keys(state.startups)).toHaveLength(18);
    expect(Object.keys(state.achievements)).toHaveLength(8);
  });

  it("integrity reports all-green", () => {
    const report = runIntegrityChecks(state);
    expect(report.checks.map((c) => `${c.id}:${c.ok}`)).toEqual([
      "orphans:true",
      "allocation:true",
      "cycles:true",
      "finance-identity:true",
      "visibility:true",
    ]);
    expect(report.ok).toBe(true);
  });
});
