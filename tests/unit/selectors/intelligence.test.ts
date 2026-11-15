import { describe, expect, it } from "vitest";
import { produce } from "immer";
import { buildDefaultSeed } from "@/seed";
import { DEFAULT_DEMO_DATE } from "@/types/domain";
import {
  programmeInsights,
  visibleProgrammeInsights,
} from "@/selectors/intelligence";
import { institutionalInsights } from "@/selectors/institutional";

describe("programmeInsights", () => {
  const state = buildDefaultSeed(DEFAULT_DEMO_DATE);

  it("returns stable keys and fires rules on seed data", () => {
    const programmes = Object.values(state.programmes).filter(
      (p) => p.status === "active",
    );
    expect(programmes.length).toBeGreaterThan(0);
    const first = programmes[0]!;
    const a = programmeInsights(state, first.id);
    const b = programmeInsights(state, first.id);
    expect(a.map((i) => i.key)).toEqual(b.map((i) => i.key));
    expect(a.every((i) => i.scope === "programme")).toBe(true);
    expect(a.every((i) => i.evidence.length > 0)).toBe(true);
  });

  it("fires OPS-01 for an overdue incomplete activity", () => {
    const programmeId = Object.values(state.programmes).find(
      (p) => p.status === "active",
    )!.id;
    const activity = Object.values(state.activities).find(
      (a) => a.programmeId === programmeId && a.status !== "cancelled",
    )!;
    const next = produce(state, (draft) => {
      const a = draft.activities[activity.id]!;
      a.status = "in_progress";
      a.plannedEnd = "2026-10-01";
      a.revisedEnd = undefined;
      a.actualEnd = undefined;
    });
    const insights = programmeInsights(next, programmeId);
    expect(insights.some((i) => i.ruleId === "OPS-01")).toBe(true);
  });

  it("does not fire OPS-01 for completed activities", () => {
    const programmeId = Object.values(state.programmes).find(
      (p) => p.status === "active",
    )!.id;
    const activity = Object.values(state.activities).find(
      (a) => a.programmeId === programmeId,
    )!;
    const next = produce(state, (draft) => {
      const a = draft.activities[activity.id]!;
      a.status = "completed";
      a.plannedEnd = "2026-10-01";
      a.percentComplete = 100;
    });
    const insights = programmeInsights(next, programmeId);
    expect(
      insights.some(
        (i) => i.ruleId === "OPS-01" && i.key.includes(activity.id),
      ),
    ).toBe(false);
  });

  it("fires FIN-01 on activity overrun", () => {
    const activity = Object.values(state.activities).find(
      (a) =>
        (state.activityBudgets[a.id]?.revised ?? 0) > 0 &&
        a.status !== "completed" &&
        a.status !== "cancelled",
    )!;
    const next = produce(state, (draft) => {
      const a = draft.activities[activity.id]!;
      a.status = "in_progress";
      const budget = draft.activityBudgets[activity.id]!;
      budget.revised = 10_000;
      budget.original = 10_000;
      const id = "exp_test_over";
      draft.expenses[id] = {
        id,
        programmeId: activity.programmeId,
        activityId: activity.id,
        categoryId: Object.keys(draft.expenseCategories)[0]!,
        description: "over",
        date: DEFAULT_DEMO_DATE,
        amount: 15_000,
        status: "submitted",
        submittedBy: draft.meta.currentUserId,
        submittedAt: `${DEFAULT_DEMO_DATE}T12:00:00.000Z`,
      };
    });
    const insights = programmeInsights(next, activity.programmeId);
    expect(
      insights.some(
        (i) => i.ruleId === "FIN-01" && i.key.includes(activity.id),
      ),
    ).toBe(true);
  });

  it("hides dismissed insights until severity rises", () => {
    const programmeId = Object.values(state.programmes).find(
      (p) => p.status === "active",
    )!.id;
    const activity = Object.values(state.activities).find(
      (a) => a.programmeId === programmeId && a.status !== "cancelled",
    )!;
    // 5 days late → medium (demo 2026-11-12)
    const overdue = produce(state, (draft) => {
      const a = draft.activities[activity.id]!;
      a.status = "in_progress";
      a.plannedEnd = "2026-11-07";
      a.revisedEnd = undefined;
      a.actualEnd = undefined;
    });
    const key = `OPS-01:${activity.id}`;
    const dismissed = produce(overdue, (draft) => {
      draft.insightStates[key] = {
        key,
        status: "dismissed",
        by: draft.meta.currentUserId,
        at: `${DEFAULT_DEMO_DATE}T12:00:00.000Z`,
        severityAtDismissal: "medium",
      };
    });
    expect(
      visibleProgrammeInsights(dismissed, programmeId).some((i) => i.key === key),
    ).toBe(false);

    // ≥14 days late → high, more severe than dismissed medium
    const worse = produce(dismissed, (draft) => {
      draft.activities[activity.id]!.plannedEnd = "2026-10-01";
    });
    expect(
      visibleProgrammeInsights(worse, programmeId).some((i) => i.key === key),
    ).toBe(true);
  });
});

describe("institutionalInsights", () => {
  const state = buildDefaultSeed(DEFAULT_DEMO_DATE);

  it("returns insights or min-sample guard over FY portfolio", () => {
    const items = institutionalInsights(state, { fy: "2026-27" });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.scope === "institution")).toBe(true);
  });

  it("emits min-sample when portfolio too small", () => {
    const tiny = produce(state, (draft) => {
      draft.meta.settings.intelligence.minSample = 99;
    });
    const items = institutionalInsights(tiny, { fy: "2026-27" });
    expect(items.some((i) => i.ruleId === "INS-MIN")).toBe(true);
  });
});
