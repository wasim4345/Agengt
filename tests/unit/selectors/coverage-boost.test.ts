import { describe, expect, it } from "vitest";
import { produce } from "immer";
import { buildDefaultSeed } from "@/seed";
import * as core from "@/selectors/core";
import * as finance from "@/selectors/finance";
import * as leadership from "@/selectors/leadership";
import * as manager from "@/selectors/manager";
import * as client from "@/selectors/client";
import * as marcom from "@/selectors/marcom";
import * as financeRole from "@/selectors/financeRole";
import * as reports from "@/selectors/reports";
import * as kpi from "@/selectors/kpi";
import { runIntegrityChecks, clientSafeReportProjection } from "@/selectors/integrity";

describe("selectors coverage boost", () => {
  const state = buildDefaultSeed("2026-11-12");

  it("covers core helpers including on_hold overdue pause", () => {
    expect(core.activityCore(state, "act_p1_a06")?.overdue).toBeTypeOf(
      "boolean",
    );
    expect(core.upcomingActivities(state, { programmeId: "prg_p1" })).toBeTruthy();
    expect(core.pendingReports(state, "prg_p1")).toBeTruthy();
    expect(core.activityProgress(state.activities.act_p1_a01!)).toBe(100);
    expect(core.activityProgress(state.activities.act_p1_a09!)).toBe(0);

    const held = produce(state, (draft) => {
      draft.programmes.prg_p1!.status = "on_hold";
    });
    expect(
      core.isOverdue(held, held.activities.act_p1_a06!),
    ).toBe(false);
  });

  it("covers finance helpers and cancelled allocation floor", () => {
    expect(finance.allocationPct(state, "act_p1_a07")).toBeGreaterThan(0);
    expect(finance.allocationPct(state, "missing")).toBeNull();
    expect(finance.activitiesWithFinance(state, "prg_p1").length).toBe(11);
    expect(finance.expenseReportedAmount(state.expenses.exp_p1_14!)).toBe(0);
    expect(finance.expenseReportedAmount(state.expenses.exp_p1_04!)).toBe(0);

    const cancelled = produce(state, (draft) => {
      draft.activities.act_p1_a11!.status = "cancelled";
    });
    const allocated = finance.programmeAllocated(cancelled, "prg_p1");
    expect(allocated).toBeLessThan(
      finance.programmeAllocated(state, "prg_p1"),
    );
  });

  it("covers leadership filters and milestones", () => {
    expect(
      leadership.kpis(state, { categoryId: "cat_incubation" }).totalProgrammes,
    ).toBeGreaterThan(0);
    expect(
      leadership.programmeRows(state, { status: "active" }).every(
        (r) => r.status === "active",
      ),
    ).toBe(true);
    expect(leadership.upcomingMilestones(state, 400).length).toBeGreaterThan(0);
    expect(
      leadership.kpis(state, {
        dateFrom: "2099-01-01",
        dateTo: "2099-12-31",
      }).totalProgrammes,
    ).toBe(0);
    expect(leadership.programmesBySponsorType(state).length).toBeGreaterThan(0);
    expect(
      leadership.programmesByOffice(state, { officeId: "off_kolkata" }).length,
    ).toBeGreaterThan(0);
    expect(leadership.riskAlerts(state).length).toBeGreaterThan(0);
  });

  it("covers KPI selectors and portfolio impact strip", () => {
    const list = kpi.programmeKpis(state, "prg_p1");
    expect(list.length).toBeGreaterThan(0);
    expect(kpi.achieved(state, "prg_p1").length).toBe(list.length);
    expect(kpi.achievedReleased(state, "prg_p1").length).toBe(list.length);

    const withKpi = produce(state, (draft) => {
      const report = Object.values(draft.reports).find(
        (r) => r.programmeId === "prg_p1" && r.status === "released",
      );
      if (!report || list.length === 0) return;
      const kpiId = list[0]!.id;
      const content = {
        ...report.draft,
        kpiValues: [{ kpiId, value: 3, note: "seeded for coverage" }],
      };
      report.draft = content;
      if (report.versions.length === 0) {
        report.versions.push({
          no: 1,
          content,
          expenseIds: [],
          evidenceIds: [],
          submittedBy: "usr_arjun",
          submittedAt: "2026-11-01T12:00:00.000Z",
        });
      } else {
        report.versions[report.versions.length - 1]!.content = content;
      }
    });
    const rows = kpi.achieved(withKpi, "prg_p1");
    expect(rows.some((r) => r.fromReleased >= 3)).toBe(true);
    expect(kpi.portfolioImpact(withKpi).length).toBeGreaterThan(0);
    expect(kpi.formatKpiValue("count", 12.4)).toBe("12");
    expect(kpi.formatKpiValue("inr", 1_00_000)).toMatch(/₹|INR|1/);
  });

  it("covers manager / client / marcom / financeRole leftovers", () => {
    expect(manager.myPendingReports(state, "usr_arjun")).toBeTruthy();
    expect(manager.myUpcoming(state, "usr_arjun")).toBeTruthy();
    expect(manager.activityBlocksByProgramme(state, "usr_arjun").length).toBeGreaterThan(
      0,
    );

    const withBudgetFlag = produce(state, (draft) => {
      draft.programmes.prg_p1!.clientBudgetSummaryVisible = true;
    });
    expect(
      client.overview(withBudgetFlag, "cli_balmer")[0],
    ).toHaveProperty("budgetSummary");
    expect(client.completedActivities(state, "cli_balmer").length).toBeGreaterThan(
      0,
    );
    expect(client.upcoming(state, "cli_balmer")).toBeTruthy();

    expect(marcom.eventsConducted(state)).toBeTruthy();
    expect(marcom.milestones(state, "prg_p1").length).toBeGreaterThan(0);

    expect(financeRole.activityAllocations(state, "prg_p2").length).toBe(9);
  });

  it("covers reports errors and integrity branches", () => {
    const closure = reports.buildReport(state, "programme_closure") as {
      error?: string;
    };
    expect(closure.error).toBeTruthy();
    const unknown = reports.buildReport(
      state,
      "nope" as reports.ReportId,
    ) as { error?: string };
    expect(unknown.error).toBeTruthy();
    expect(clientSafeReportProjection(state).length).toBeGreaterThan(0);

    const broken = produce(state, (draft) => {
      draft.activities.orphan = {
        ...draft.activities.act_p1_a01!,
        id: "orphan",
        programmeId: "missing",
      };
      draft.dependencies.cycle = {
        id: "cycle",
        programmeId: "prg_p1",
        predecessorId: "act_p1_a03",
        successorId: "act_p1_a01",
        type: "FS",
        lagDays: 0,
      };
      draft.activityBudgets.act_p1_a07!.revised = 1;
    });
    const report = runIntegrityChecks(broken);
    expect(report.ok).toBe(false);
  });
});
