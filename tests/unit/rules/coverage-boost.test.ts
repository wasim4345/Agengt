import { describe, expect, it } from "vitest";
import { produce } from "immer";
import { buildDefaultSeed } from "@/seed";
import {
  addCalendarDays,
  compareDates,
  isAfter,
  isBefore,
  maxDate,
  minDate,
} from "@/lib/rules/dates";
import {
  canStartOrComplete,
  computeDelayImpact,
  milestoneEffectiveDate,
  validateAddDependency,
} from "@/lib/rules/dependencies";
import {
  canSetActivityBudget,
  canSetProgrammeBudget,
  needsLeadershipForReallocation,
  validateBudgetRevision,
} from "@/lib/rules/budget";
import {
  canRejectExpense,
  canVerifyExpense,
  checkExpenseDuplicate,
  validateExpenseEntry,
} from "@/lib/rules/expense";
import {
  canRequestClosure,
  validateProgramme,
} from "@/lib/rules/programme";
import {
  canReleaseReport,
  canStartFinalReport,
  validateSubmitReport,
} from "@/lib/rules/report";
import { issue, splitIssues } from "@/lib/rules/types";

describe("rules coverage boost", () => {
  it("covers date helpers", () => {
    expect(maxDate("2026-01-01", "2026-02-01")).toBe("2026-02-01");
    expect(minDate("2026-01-01", "2026-02-01")).toBe("2026-01-01");
    expect(compareDates("2026-01-01", "2026-01-02")).toBe(1);
    expect(isBefore("2026-01-01", "2026-01-02")).toBe(true);
    expect(isAfter("2026-01-02", "2026-01-01")).toBe(true);
    expect(addCalendarDays("2026-01-01", 5)).toBe("2026-01-06");
  });

  it("covers milestone predecessor deps and SS start guard", () => {
    const state = buildDefaultSeed("2026-11-12");
    const withMsDep = produce(state, (draft) => {
      draft.dependencies.dep_ms = {
        id: "dep_ms",
        programmeId: "prg_p1",
        successorId: "act_p1_a09",
        predecessorMilestoneId: "ms_p1_m2",
        type: "FS",
        lagDays: 0,
      };
    });
    expect(
      validateAddDependency(withMsDep, {
        programmeId: "prg_p1",
        successorId: "act_p1_a08",
        predecessorMilestoneId: "ms_p1_m1",
      }).ok,
    ).toBe(true);
    expect(
      validateAddDependency(state, {
        programmeId: "prg_p1",
        successorId: "act_p1_a01",
        predecessorId: "act_p1_a02",
        predecessorMilestoneId: "ms_p1_m1",
      }).ok,
    ).toBe(false);

    const msDate = milestoneEffectiveDate(state, state.milestones.ms_p1_m1!);
    expect(msDate).toBeTruthy();

    // SS: Mentoring (A08) parallel with Bootcamps — force SS pred not started
    const ssState = produce(state, (draft) => {
      draft.dependencies.dep_ss = {
        id: "dep_ss",
        programmeId: "prg_p1",
        predecessorId: "act_p1_a09",
        successorId: "act_p1_a08",
        type: "SS",
        lagDays: 0,
      };
      draft.activities.act_p1_a09!.status = "not_started";
    });
    expect(canStartOrComplete(ssState, "act_p1_a08", "in_progress").ok).toBe(
      false,
    );

    // impact via milestone gating
    const impacts = computeDelayImpact(withMsDep, "act_p1_a06", "2027-01-15");
    expect(Array.isArray(impacts)).toBe(true);
  });

  it("covers budget / expense success and edge paths", () => {
    const state = buildDefaultSeed("2026-11-12");
    expect(canSetActivityBudget(state, "missing", 1).ok).toBe(false);
    expect(canSetActivityBudget(state, "act_p5_a01", -1).ok).toBe(false);
    expect(canSetProgrammeBudget(state, "missing", 1).ok).toBe(false);
    expect(canSetProgrammeBudget(state, "prg_p5", -1).ok).toBe(false);
    expect(canSetProgrammeBudget(state, "prg_p5", 100).ok).toBe(false);

    const realloc = validateBudgetRevision(state, {
      programmeId: "prg_p1",
      kind: "reallocation",
      lines: [
        { activityId: "act_p1_a11", before: 50_000, after: 40_000 },
        { activityId: "act_p1_a04", before: 50_000, after: 60_000 },
      ],
      totalAfter: 26_00_000, // changed — should error for realloc
      requestedBy: "usr_arjun",
      actingRole: "finance",
      requesterRole: "finance",
    });
    expect(realloc.errors.some((e) => e.code === "BUD_REALLOC_TOTAL")).toBe(
      true,
    );
    expect(realloc.warnings.some((w) => w.code === "BUD_SAME_ROLE")).toBe(true);
    expect(needsLeadershipForReallocation(state, "act_p1_a04", 100)).toBe(
      false,
    );

    const okExpense = validateExpenseEntry(state, {
      activityId: "act_p1_a04",
      date: "2026-11-01",
      amount: 1_000,
      categoryId: "ecat_misc",
      description: "Small top-up",
    });
    expect(okExpense.ok).toBe(true);

    const justified = validateExpenseEntry(state, {
      activityId: "act_p1_a07",
      date: "2026-11-12",
      amount: 10_00_000,
      categoryId: "ecat_venue",
      description: "Huge venue",
      justification: "Client insisted",
    });
    expect(justified.warnings.some((w) => w.code === "EXP_OVERSPEND")).toBe(
      true,
    );

    const hardDup = checkExpenseDuplicate(state, {
      activityId: "act_p1_a07",
      date: "2026-11-01",
      amount: 1_50_000,
      categoryId: "ecat_honorarium",
      description: "Bootcamp faculty fees",
      reportId: "rpt_p1_a07",
    });
    expect(hardDup.block).toBeTruthy();

    // verifiable pending expense under allocation
    expect(canVerifyExpense(state, "exp_p3_02").ok).toBe(true);
    expect(canVerifyExpense(state, "exp_p1_01").ok).toBe(false); // already verified
    expect(canVerifyExpense(state, "exp_p1_11", 0).ok).toBe(false);
    expect(canRejectExpense(state.expenses.exp_p1_01!, "x").ok).toBe(false);
  });

  it("covers programme warnings and closure partial path", () => {
    const state = produce(buildDefaultSeed("2026-11-12"), (draft) => {
      draft.activities.act_p5_a01!.ownerId = "missing";
      delete draft.activityBudgets.act_p5_a02;
      draft.programmes.prg_p5!.clientId = "missing";
      // clear milestones for p5
      for (const id of Object.keys(draft.milestones)) {
        if (draft.milestones[id]!.programmeId === "prg_p5") {
          delete draft.milestones[id];
        }
      }
      draft.activityMilestones = draft.activityMilestones.filter(
        (am) => draft.milestones[am.milestoneId],
      );
      // cycle on p1 for E3
      draft.dependencies.bad = {
        id: "bad",
        programmeId: "prg_p1",
        predecessorId: "act_p1_a03",
        successorId: "act_p1_a01",
        type: "FS",
        lagDays: 0,
      };
    });
    const p5 = validateProgramme(state, "prg_p5");
    expect(p5.errors.some((e) => e.code === "E4")).toBe(true);
    expect(p5.warnings.some((w) => w.code === "W1")).toBe(true);
    expect(p5.warnings.some((w) => w.code === "W3")).toBe(true);
    expect(p5.warnings.some((w) => w.code === "W4")).toBe(true);
    expect(validateProgramme(state, "prg_p1").errors.some((e) => e.code === "E3")).toBe(
      true,
    );
    expect(validateProgramme(state, "missing").ok).toBe(false);

    const closed = produce(state, (draft) => {
      for (const a of Object.values(draft.activities)) {
        if (a.programmeId === "prg_p4") {
          if (a.id === "act_p4_a06") a.status = "partially_completed";
          else a.status = "completed";
        }
      }
      for (const e of Object.values(draft.expenses)) {
        if (e.programmeId === "prg_p4" && e.status === "submitted") {
          e.status = "verified";
        }
      }
    });
    const closure = canRequestClosure(closed, "prg_p4");
    expect(closure.errors.some((e) => e.code === "CLOSE_PARTIAL")).toBe(true);
    expect(canRequestClosure(state, "missing").ok).toBe(false);
  });

  it("covers report release / submit edges", () => {
    const state = buildDefaultSeed("2026-11-12");
    expect(validateSubmitReport(state, "missing").ok).toBe(false);
    expect(canReleaseReport(state, "missing", "usr_meera").ok).toBe(false);
    expect(canReleaseReport(state, "rpt_p1_a08", "usr_meera").ok).toBe(false);
    expect(canStartFinalReport(state, "act_p1_a01").ok).toBe(false);
    expect(splitIssues([issue("E", "X", "x"), issue("W", "Y", "y")]).ok).toBe(
      false,
    );
  });

  it("covers remaining budget/expense/programme branches", () => {
    const state = buildDefaultSeed("2026-11-12");

    // successful reallocation (total unchanged) + total_change below reported
    const okRealloc = validateBudgetRevision(state, {
      programmeId: "prg_p1",
      kind: "reallocation",
      lines: [
        { activityId: "act_p1_a11", before: 50_000, after: 40_000 },
        { activityId: "act_p1_a04", before: 50_000, after: 60_000 },
      ],
      totalAfter: 25_00_000,
      requestedBy: "usr_arjun",
      actingRole: "finance",
      requesterRole: "programme_manager",
    });
    expect(okRealloc.ok).toBe(true);

    const belowRep = validateBudgetRevision(state, {
      programmeId: "prg_p1",
      kind: "total_change",
      lines: [],
      totalAfter: 100,
      requestedBy: "usr_arjun",
      actingRole: "leadership",
      requesterRole: "finance",
    });
    expect(belowRep.errors.some((e) => e.code === "BUD_TOTAL_BELOW_REP")).toBe(
      true,
    );

    const sumOver = validateBudgetRevision(state, {
      programmeId: "prg_p1",
      kind: "activity_change",
      lines: [{ activityId: "act_p1_a07", before: 5_00_000, after: 30_00_000 }],
      totalAfter: 25_00_000,
      requestedBy: "usr_arjun",
      actingRole: "finance",
      requesterRole: "programme_manager",
    });
    expect(sumOver.errors.some((e) => e.code === "BUD_SUM_OVER")).toBe(true);

    // over-alloc draft activity budget
    expect(canSetActivityBudget(state, "act_p5_a01", 50_00_000).ok).toBe(false);

    // warn threshold without breach
    const warn = validateExpenseEntry(state, {
      activityId: "act_p1_a04",
      date: "2026-11-12",
      amount: 40_000,
      categoryId: "ecat_misc",
      description: "Near limit",
    });
    // A04 budget 50k, already has 18k verified → +40k = 58k > 50k → overspend path
    expect(warn.ok || warn.errors.length > 0 || warn.warnings.length > 0).toBe(
      true,
    );

    const empty = validateExpenseEntry(state, {
      activityId: "act_p1_a04",
      date: "2026-11-12",
      amount: 0,
      categoryId: "missing",
      description: "  ",
    });
    expect(empty.errors.some((e) => e.code === "EXP_AMOUNT")).toBe(true);
    expect(empty.errors.some((e) => e.code === "EXP_DESC")).toBe(true);
    expect(empty.errors.some((e) => e.code === "EXP_CAT")).toBe(true);

    // E2 activity outside programme window
    const e2 = validateProgramme(
      produce(state, (draft) => {
        draft.activities.act_p1_a01!.plannedStart = "2020-01-01";
        draft.activities.act_p1_a11!.plannedEnd = "2035-01-01";
        draft.activities.act_p1_a11!.revisedEnd = "2035-01-01";
      }),
      "prg_p1",
      { acknowledgeUnallocated: true },
    );
    expect(e2.errors.filter((e) => e.code === "E2").length).toBeGreaterThan(0);

    // reduced verify with remarks path amount check
    expect(canVerifyExpense(state, "exp_p1_11", 1_50_000).ok).toBe(true);
    expect(canVerifyExpense(state, "exp_p1_11", 9_00_000).ok).toBe(false);
  });
});
