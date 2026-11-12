import { describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { createTestStore } from "@/store/store";
import * as leadership from "@/selectors/leadership";
import { programmeFinancials } from "@/selectors/finance";
import type { Activity, ActivityBudget, Programme } from "@/types/domain";

function inflate(
  draft: ReturnType<typeof buildDefaultSeed>,
  programmes: number,
  activitiesPerProgramme: number,
) {
  const managerId = Object.values(draft.users).find(
    (u) => u.role === "programme_manager",
  )!.id;
  const clientId = Object.keys(draft.clients)[0]!;
  const categoryId = Object.keys(draft.categories)[0]!;
  const activityCategoryId = Object.keys(draft.activityCategories)[0];

  for (let p = 0; p < programmes; p += 1) {
    const programmeId = `perf_prg_${p}`;
    const start = "2026-01-01";
    const end = "2026-12-31";
    const programme: Programme = {
      id: programmeId,
      code: `PERF-${p}`,
      name: `Perf Programme ${p}`,
      categoryId,
      clientId,
      managerId,
      teamIds: [managerId],
      startDate: start,
      endDate: end,
      totalBudget: 10_00_000,
      originalBudget: 10_00_000,
      objectives: "Scale smoke",
      expectedOutcomes: "Selectors stay responsive",
      keyDeliverables: ["KPI pass"],
      reportingRequirements: [
        { id: `${programmeId}_rr`, type: "Progress", frequency: "monthly" },
      ],
      status: "active",
      clientBudgetSummaryVisible: false,
      createdAt: "2026-11-12T00:00:00.000Z",
      createdBy: managerId,
    };
    draft.programmes[programmeId] = programme;

    for (let a = 0; a < activitiesPerProgramme; a += 1) {
      const activityId = `perf_act_${p}_${a}`;
      const activity: Activity = {
        id: activityId,
        programmeId,
        code: `A${String(a).padStart(3, "0")}`,
        name: `Activity ${a}`,
        description: "",
        categoryId: activityCategoryId,
        plannedStart: start,
        plannedEnd: end,
        baselineStart: start,
        baselineEnd: end,
        ownerId: managerId,
        supportIds: [],
        expectedOutput: "",
        priority: "medium",
        status: a % 17 === 0 ? "delayed" : "in_progress",
        percentComplete: a % 100,
        sortOrder: a,
      };
      draft.activities[activityId] = activity;
      const budget: ActivityBudget = {
        activityId,
        original: 1_000,
        revised: 1_000,
      };
      draft.activityBudgets[activityId] = budget;
    }
  }
}

/**
 * Soft scale target from M12. Full 60×500 constructs and runs selectors;
 * interactive Gantt remains recommended at ≤ ~50 activities / programme
 * (see README).
 */
describe("M12 scale smoke", () => {
  it("constructs 60×500 and runs portfolio selectors under 8s", () => {
    const base = buildDefaultSeed("2026-11-12");
    const store = createTestStore(base);
    const draft = structuredClone(store.getState().state);
    inflate(draft, 60, 500);
    store.setState({ state: draft });

    const t0 = performance.now();
    const kpis = leadership.kpis(store.getState().state);
    const rows = leadership.programmeRows(store.getState().state);
    const sampleFin = programmeFinancials(
      store.getState().state,
      "perf_prg_0",
    );
    const elapsed = performance.now() - t0;

    expect(kpis.totalProgrammes).toBeGreaterThanOrEqual(60);
    expect(rows.length).toBeGreaterThanOrEqual(60);
    expect(
      Object.keys(store.getState().state.activities).length,
    ).toBeGreaterThanOrEqual(60 * 500);
    expect(sampleFin.allocated).toBeGreaterThan(0);
    // Soft budget for CI VMs; local machines are typically much faster.
    expect(elapsed).toBeLessThan(8000);
  });

  it("demo-sized portfolio (seed + extras) stays under 200ms for KPIs", () => {
    const store = createTestStore(buildDefaultSeed("2026-11-12"));
    const draft = structuredClone(store.getState().state);
    inflate(draft, 10, 50);
    store.setState({ state: draft });

    const t0 = performance.now();
    leadership.kpis(store.getState().state);
    leadership.programmeRows(store.getState().state);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(200);
  });
});
