import { describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
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
  overspendLevel,
  validateExpenseEntry,
} from "@/lib/rules/expense";

describe("budget rules (§5)", () => {
  it("allows draft budget edits within headroom and blocks active direct edits", () => {
    const state = buildDefaultSeed("2026-11-12");
    expect(canSetActivityBudget(state, "act_p5_a01", 2_00_000).ok).toBe(true);
    expect(canSetActivityBudget(state, "act_p1_a01", 10_000).ok).toBe(false);
    expect(canSetProgrammeBudget(state, "prg_p5", 40_00_000).ok).toBe(true);
    expect(canSetProgrammeBudget(state, "prg_p1", 10_00_000).ok).toBe(false);
  });

  it("validates revision lines against reported and totals", () => {
    const state = buildDefaultSeed("2026-11-12");
    const bad = validateBudgetRevision(state, {
      programmeId: "prg_p1",
      kind: "activity_change",
      lines: [{ activityId: "act_p1_a07", before: 5_00_000, after: 1_000 }],
      totalAfter: 25_00_000,
      requestedBy: "usr_arjun",
      actingRole: "finance",
      requesterRole: "programme_manager",
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors.some((e) => e.code === "BUD_LINE_BELOW_REP")).toBe(true);

    expect(
      needsLeadershipForReallocation(state, "act_p1_a07", 2_00_000),
    ).toBe(true);
  });
});

describe("expense rules (§4.1–4.2)", () => {
  it("detects duplicates and overspend justification", () => {
    const state = buildDefaultSeed("2026-11-12");
    const dup = checkExpenseDuplicate(state, {
      activityId: "act_p1_a02",
      date: state.expenses.exp_p1_03!.date,
      amount: state.expenses.exp_p1_03!.amount,
      categoryId: state.expenses.exp_p1_03!.categoryId,
      description: "Other",
    });
    expect(dup.warning).toBeTruthy();

    const over = validateExpenseEntry(state, {
      activityId: "act_p1_a07",
      date: "2026-11-12",
      amount: 10_00_000,
      categoryId: "ecat_venue",
      description: "Huge venue",
    });
    expect(over.ok).toBe(false);
    expect(over.errors.some((e) => e.code === "EXP_OVERSPEND_JUSTIFY")).toBe(
      true,
    );
  });

  it("blocks verify beyond allocation and requires reject remarks", () => {
    const state = buildDefaultSeed("2026-11-12");
    // exp_p2_02 is submitted with overspend on corporate pilots
    const verify = canVerifyExpense(state, "exp_p2_02");
    expect(verify.ok).toBe(false);
    if (!verify.ok) expect(verify.errors[0]?.code).toBe("EXP_VERIFY_OVER");

    const expense = state.expenses.exp_p1_11!;
    expect(canRejectExpense(expense, "").ok).toBe(false);
    expect(canRejectExpense(expense, "Duplicate bill").ok).toBe(true);
  });

  it("classifies overspend levels", () => {
    expect(overspendLevel(90, 100, 0.9)).toBe("warning");
    expect(overspendLevel(101, 100, 0.9)).toBe("breach");
    expect(overspendLevel(50, 100, 0.9)).toBe("ok");
  });
});
