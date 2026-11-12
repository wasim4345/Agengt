import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { IDS } from "@/seed/ids";
import { createTestStore } from "@/store/store";
import { clearPersistedState } from "@/store/persist";
import { STORAGE_KEYS } from "@/types/domain";
import * as leadership from "@/selectors/leadership";
import * as manager from "@/selectors/manager";
import * as client from "@/selectors/client";
import * as marcom from "@/selectors/marcom";
import * as financeRole from "@/selectors/financeRole";
import {
  filtersFromSearchParams,
  searchParamsFromFilters,
} from "@/lib/leadershipFilters";
import { CLIENT_FORBIDDEN_KEYS } from "@/selectors/client";

describe("M9 dashboards — demo steps 1, 2, 9, 11, 12", () => {
  beforeEach(() => {
    clearPersistedState();
    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
    createTestStore(buildDefaultSeed("2026-11-12"));
  });

  it("demo step 1: Leadership sees 6 programmes, budget, verified, delays, risks", () => {
    const state = createTestStore().getState().state;
    const k = leadership.kpis(state);
    expect(k.totalProgrammes).toBe(6);
    expect(k.totalBudget).toBeGreaterThan(0);
    expect(k.verifiedExpenditure).toBeGreaterThan(0);
    expect(k.delayedActivities).toBeGreaterThan(0);
    expect(leadership.riskAlerts(state).length).toBeGreaterThan(0);
    expect(leadership.financialOverview(state).length).toBe(6);
  });

  it("demo step 2: filter category=Incubation then client; URL round-trip", () => {
    const state = createTestStore().getState().state;
    const incubation = leadership.kpis(state, {
      categoryId: IDS.categories.incubation,
    });
    expect(incubation.totalProgrammes).toBeGreaterThan(0);
    expect(incubation.totalProgrammes).toBeLessThan(6);

    const rows = leadership.programmeRows(state, {
      categoryId: IDS.categories.incubation,
    });
    expect(rows.every((r) => r.categoryId === IDS.categories.incubation)).toBe(
      true,
    );

    const clientId = rows[0]?.clientId;
    expect(clientId).toBeTruthy();
    const filtered = leadership.programmeRows(state, {
      categoryId: IDS.categories.incubation,
      clientId,
    });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((r) => r.clientId === clientId)).toBe(true);

    const params = searchParamsFromFilters({
      categoryId: IDS.categories.incubation,
      clientId,
    });
    expect(params.get("category")).toBe(IDS.categories.incubation);
    expect(params.get("client")).toBe(clientId);
    const parsed = filtersFromSearchParams(params);
    expect(parsed.categoryId).toBe(IDS.categories.incubation);
    expect(parsed.clientId).toBe(clientId);
  });

  it("demo step 9: store mutation updates leadership KPIs without remount", () => {
    const store = createTestStore();
    const before = leadership.kpis(store.getState().state).delayedActivities;

    const activity = store.getState().state.activities["act_p1_a08"]!;
    expect(activity.status).not.toBe("delayed");
    store.getState().setAllowRuleBreaking(true);
    const r = store.getState().rawUpsert("activities", activity.id, {
      ...activity,
      status: "delayed",
    });
    expect(r.ok).toBe(true);

    const after = leadership.kpis(store.getState().state).delayedActivities;
    expect(after).toBe(before + 1);
  });

  it("demo step 11: Client sees only released/approved surface — no money/remarks", () => {
    const store = createTestStore();
    store.getState().setRole("client");
    store.getState().setUser(IDS.users.rahul);
    const state = store.getState().state;

    const overview = client.overview(state);
    expect(overview.length).toBeGreaterThan(0);
    expect(overview[0]).not.toHaveProperty("budgetSummary");

    const reports = client.releasedReports(state);
    expect(reports.length).toBeGreaterThan(0);
    expect(client.photos(state).length).toBeGreaterThan(0);
    expect(client.milestones(state).length).toBeGreaterThan(0);

    const json = JSON.stringify({
      overview,
      reports,
      photos: client.photos(state),
      milestones: client.milestones(state),
    });
    for (const key of CLIENT_FORBIDDEN_KEYS) {
      expect(json.includes(`"${key}"`)).toBe(false);
    }
  });

  it("demo step 12: MarCom sees upcoming, approved photos, startup wins", () => {
    const state = createTestStore().getState().state;
    expect(marcom.upcoming(state).length + marcom.eventsConducted(state).length).toBeGreaterThan(0);
    expect(marcom.media(state).length).toBeGreaterThan(0);
    expect(marcom.achievements(state).length).toBeGreaterThan(0);
    expect(marcom.startups(state).every((s) =>
      ["selected", "onboarded", "graduated"].includes(s.status),
    )).toBe(true);
  });

  it("Data Manager number change reflects on finance & leadership selectors", () => {
    const store = createTestStore();
    const before = leadership.kpis(store.getState().state).totalBudget;
    const p1 = store.getState().state.programmes[IDS.programmes.p1]!;
    store.getState().setAllowRuleBreaking(true);
    const r = store.getState().rawUpsert("programmes", p1.id, {
      ...p1,
      totalBudget: p1.totalBudget + 1_00_000,
    });
    expect(r.ok).toBe(true);
    const after = leadership.kpis(store.getState().state).totalBudget;
    expect(after).toBe(before + 1_00_000);

    const fin = financeRole.programmeBudgets(store.getState().state).find(
      (row) => row.programme.id === IDS.programmes.p1,
    );
    expect(fin?.financials.budget).toBe(p1.totalBudget + 1_00_000);
  });

  it("manager dashboard selectors remain scoped", () => {
    const state = createTestStore().getState().state;
    const mine = manager.myProgrammes(state, IDS.users.arjun);
    expect(mine.length).toBeGreaterThan(0);
    expect(manager.budgetSummary(state, IDS.users.arjun).budget).toBeGreaterThan(
      0,
    );
  });
});
