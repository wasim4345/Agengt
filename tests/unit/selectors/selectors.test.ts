import { describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import * as leadership from "@/selectors/leadership";
import * as manager from "@/selectors/manager";
import * as client from "@/selectors/client";
import * as marcom from "@/selectors/marcom";
import * as financeRole from "@/selectors/financeRole";
import * as reports from "@/selectors/reports";
import * as core from "@/selectors/core";
import {
  activityFinancials,
  assertFinanceIdentity,
  programmeFinancials,
} from "@/selectors/finance";
import { runIntegrityChecks } from "@/selectors/integrity";
import {
  CLIENT_FORBIDDEN_KEYS,
} from "@/selectors/client";
import { MARCOM_FORBIDDEN_KEYS } from "@/selectors/marcom";

describe("finance identity", () => {
  it("holds Rep = Ver + Pen across the default seed", () => {
    const state = buildDefaultSeed("2026-11-12");
    expect(assertFinanceIdentity(state)).toBe(true);
    for (const id of Object.keys(state.activities)) {
      const fin = activityFinancials(state, id);
      expect(fin.reported).toBe(fin.verified + fin.pending);
    }
  });
});

describe("role selectors", () => {
  const state = buildDefaultSeed("2026-11-12");

  it("leadership KPIs and alerts use live store data", () => {
    const k = leadership.kpis(state);
    expect(k.totalProgrammes).toBe(6);
    expect(k.delayedActivities).toBeGreaterThan(0);
    expect(leadership.programmeRows(state).length).toBe(6);
    expect(leadership.financialOverview(state).length).toBe(6);
    expect(leadership.riskAlerts(state).length).toBeGreaterThan(0);
  });

  it("manager selectors scope to assigned programmes", () => {
    const mine = manager.myProgrammes(state, "usr_arjun");
    expect(mine.every((p) => p.programme.managerId === "usr_arjun")).toBe(
      true,
    );
    expect(manager.budgetSummary(state, "usr_arjun").budget).toBeGreaterThan(0);
    expect(manager.myDelayed(state, "usr_arjun").length).toBeGreaterThan(0);
  });

  it("client selectors omit forbidden keys and hide money by default", () => {
    const overview = client.overview(state, "cli_vanguard");
    expect(overview.length).toBeGreaterThan(0);
    expect(overview[0]).not.toHaveProperty("budgetSummary");
    const reports = client.releasedReports(state, "cli_vanguard");
    expect(reports.every((r) => !("observations" in r))).toBe(true);
    expect(client.photos(state, "cli_vanguard").length).toBeGreaterThan(0);

    const json = JSON.stringify({
      overview,
      milestones: client.milestones(state, "cli_vanguard"),
      reports,
      photos: client.photos(state, "cli_vanguard"),
      outputs: client.keyOutputs(state, "cli_vanguard"),
    });
    for (const key of CLIENT_FORBIDDEN_KEYS) {
      expect(json.includes(`"${key}"`)).toBe(false);
    }
  });

  it("marcom selectors hide applicants/rejected and internal fields", () => {
    const startups = marcom.startups(state);
    expect(
      startups.every((s) =>
        ["selected", "onboarded", "graduated"].includes(s.status),
      ),
    ).toBe(true);
    const media = marcom.media(state);
    expect(media.every((m) => m.type !== "invoice")).toBe(true);
    const blob = JSON.stringify({
      startups,
      media,
      achievements: marcom.achievements(state),
      upcoming: marcom.upcoming(state),
    });
    for (const key of MARCOM_FORBIDDEN_KEYS) {
      expect(blob.includes(`"${key}"`)).toBe(false);
    }
  });

  it("finance role queue and alerts", () => {
    expect(financeRole.queue(state).length).toBeGreaterThan(0);
    expect(financeRole.alerts(state).length).toBeGreaterThan(0);
    expect(financeRole.programmeBudgets(state).length).toBe(6);
  });

  it("builds seven report types", () => {
    expect(reports.REPORT_CATALOGUE).toHaveLength(7);
    for (const item of reports.REPORT_CATALOGUE) {
      const built = reports.buildReport(
        state,
        item.id,
        item.id === "programme_closure" ? "prg_p4" : "prg_p1",
      );
      expect(built.title).toBeTruthy();
      expect(built.dataAsOf).toBe("2026-11-12");
    }
  });

  it("core progress and overdue helpers", () => {
    expect(core.programmeProgress(state, "prg_p1")).toBeGreaterThan(0);
    expect(core.orgProgress(state).equalWeight).toBeGreaterThan(0);
    expect(core.delayedActivities(state, "prg_p1").length).toBeGreaterThan(0);
    const fin = programmeFinancials(state, "prg_p1");
    expect(fin.unallocated).toBe(2_50_000);
  });

  it("integrity remains all-green on default seed", () => {
    expect(runIntegrityChecks(state).ok).toBe(true);
  });
});

describe("client/marcom leak lint", () => {
  it("source modules never return forbidden keys in projections", async () => {
    const clientSrc = await import("@/selectors/client");
    const marcomSrc = await import("@/selectors/marcom");
    const state = buildDefaultSeed("2026-11-12");

    const clientPayloads = [
      clientSrc.overview(state),
      clientSrc.milestones(state),
      clientSrc.releasedReports(state),
      clientSrc.photos(state),
      clientSrc.keyOutputs(state),
    ];
    const marcomPayloads = [
      marcomSrc.upcoming(state),
      marcomSrc.eventsConducted(state),
      marcomSrc.startups(state),
      marcomSrc.achievements(state),
      marcomSrc.media(state),
    ];

    function walk(value: unknown): string[] {
      if (!value || typeof value !== "object") return [];
      if (Array.isArray(value)) return value.flatMap(walk);
      return Object.keys(value).concat(Object.values(value).flatMap(walk));
    }

    const keys = [...clientPayloads, ...marcomPayloads].flatMap(walk);
    for (const forbidden of [
      ...CLIENT_FORBIDDEN_KEYS,
      ...MARCOM_FORBIDDEN_KEYS,
    ]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
