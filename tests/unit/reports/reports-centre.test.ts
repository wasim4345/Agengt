import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { IDS } from "@/seed/ids";
import { createTestStore } from "@/store/store";
import { clearPersistedState } from "@/store/persist";
import { STORAGE_KEYS } from "@/types/domain";
import * as leadership from "@/selectors/leadership";
import * as financeRole from "@/selectors/financeRole";
import {
  REPORT_CATALOGUE,
  buildReport,
  catalogueForRole,
  parseCsvTotals,
  reportToCsv,
} from "@/selectors/reports";
import { CLIENT_FORBIDDEN_KEYS } from "@/selectors/client";

describe("M10 reports centre — demo step 13", () => {
  beforeEach(() => {
    clearPersistedState();
    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
    createTestStore(buildDefaultSeed("2026-11-12"));
  });

  it("demo step 13: Leadership Summary builds with Data as of and exportable CSV", () => {
    const store = createTestStore();
    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    const state = store.getState().state;

    const report = buildReport(state, "leadership_summary");
    expect(report.title).toBe("Leadership Summary");
    expect(report.dataAsOf).toBe(state.meta.demoDate);
    expect(report.generatedBy).toBeTruthy();
    expect(report.rows?.length).toBe(8);
    expect(report.totals?.programmes).toBe(8);

    const csv = reportToCsv(report);
    expect(csv).toContain("Data as of");
    expect(csv).toContain("Leadership Summary");
    expect(csv).toContain("Totals");
    expect(csv).toContain("Detail");
  });

  it("CSV totals equal Leadership dashboard KPIs", () => {
    const state = createTestStore().getState().state;
    const kpis = leadership.kpis(state);
    const report = buildReport(state, "leadership_summary");
    const csv = reportToCsv(report);
    const totals = parseCsvTotals(csv);

    expect(totals.programmes).toBe(kpis.totalProgrammes);
    expect(totals.totalBudget).toBe(kpis.totalBudget);
    expect(totals.verifiedExpenditure).toBe(kpis.verifiedExpenditure);
    expect(totals.reportedExpenditure).toBe(kpis.reportedExpenditure);
    expect(totals.remaining).toBe(kpis.remaining);
    expect(totals.delayed).toBe(kpis.delayedActivities);
    expect(totals.active).toBe(kpis.active);
  });

  it("Financial Utilisation CSV totals equal finance dashboard programme sums", () => {
    const state = createTestStore().getState().state;
    const budgets = financeRole.programmeBudgets(state);
    const dashApproved = budgets.reduce((s, r) => s + r.financials.budget, 0);
    const dashVerified = budgets.reduce((s, r) => s + r.financials.verified, 0);
    const dashReported = budgets.reduce((s, r) => s + r.financials.reported, 0);
    const dashPending = budgets.reduce((s, r) => s + r.financials.pending, 0);

    const report = buildReport(state, "financial_utilisation");
    const totals = parseCsvTotals(reportToCsv(report));
    expect(totals.approved).toBe(dashApproved);
    expect(totals.verified).toBe(dashVerified);
    expect(totals.reported).toBe(dashReported);
    expect(totals.pending).toBe(dashPending);
  });

  it("all 7 reports preview from live data", () => {
    const state = createTestStore().getState().state;
    expect(REPORT_CATALOGUE).toHaveLength(7);
    for (const item of REPORT_CATALOGUE) {
      const built = buildReport(
        state,
        item.id,
        item.id === "programme_closure"
          ? { programmeId: IDS.programmes.p4 }
          : undefined,
      );
      expect(built.error).toBeUndefined();
      expect(built.dataAsOf).toBe(state.meta.demoDate);
      expect(built.title).toBe(item.title);
    }
  });

  it("client-safe catalogue and report omit forbidden money/remarks keys", () => {
    const store = createTestStore();
    store.getState().setRole("client");
    store.getState().setUser(IDS.users.rahul);
    const state = store.getState().state;

    expect(catalogueForRole("client")).toHaveLength(1);
    expect(catalogueForRole("client")[0]?.id).toBe("client_programme");

    const report = buildReport(state, "client_programme");
    const json = JSON.stringify(report.sections);
    for (const key of CLIENT_FORBIDDEN_KEYS) {
      expect(json.includes(`"${key}"`)).toBe(false);
    }
    expect(report.totals?.releasedReports).toBeGreaterThan(0);
  });
});
