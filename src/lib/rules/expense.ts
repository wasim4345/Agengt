import type { AppState, Expense, ID } from "@/types/domain";
import { activityFinancials } from "@/selectors/finance";
import { err, ok, type Result } from "@/types/result";
import { issue, splitIssues, type ValidationResult } from "./types";

export type DuplicateCheck = {
  warning?: string;
  block?: string;
};

/** Duplicate guard (doc 04 §4.2). */
export function checkExpenseDuplicate(
  state: AppState,
  input: {
    activityId: ID;
    date: string;
    amount: number;
    categoryId: ID;
    description: string;
    reportId?: ID;
    excludeId?: ID;
  },
): DuplicateCheck {
  const others = Object.values(state.expenses).filter(
    (e) => e.id !== input.excludeId && e.activityId === input.activityId,
  );

  const soft = others.find(
    (e) =>
      e.date === input.date &&
      e.amount === input.amount &&
      e.categoryId === input.categoryId,
  );
  const hard = others.find(
    (e) =>
      input.reportId &&
      e.reportId === input.reportId &&
      e.description.trim().toLowerCase() ===
        input.description.trim().toLowerCase() &&
      e.amount === input.amount,
  );

  return {
    warning: soft
      ? "Possible duplicate: same activity, date, amount and category."
      : undefined,
    block: hard
      ? "Duplicate expense description and amount within this report."
      : undefined,
  };
}

export function validateExpenseEntry(
  state: AppState,
  input: {
    activityId: ID;
    date: string;
    amount: number;
    categoryId: ID;
    description: string;
    reportId?: ID;
    excludeId?: ID;
    justification?: string;
  },
): ValidationResult {
  const issues = [];
  if (input.amount <= 0) {
    issues.push(
      issue("E", "EXP_AMOUNT", "Amount must be greater than zero.", "amount"),
    );
  }
  if (!input.description.trim()) {
    issues.push(
      issue("E", "EXP_DESC", "Description is required.", "description"),
    );
  }
  if (!state.expenseCategories[input.categoryId]) {
    issues.push(
      issue("E", "EXP_CAT", "Choose an expense category.", "categoryId"),
    );
  }

  const dup = checkExpenseDuplicate(state, input);
  if (dup.block) {
    issues.push(issue("E", "EXP_DUP_BLOCK", dup.block, "description"));
  } else if (dup.warning) {
    issues.push(issue("W", "EXP_DUP_WARN", dup.warning));
  }

  const fin = activityFinancials(state, input.activityId);
  const projectedRep = fin.reported + input.amount;
  if (projectedRep > fin.revised) {
    if (!input.justification?.trim()) {
      issues.push(
        issue(
          "E",
          "EXP_OVERSPEND_JUSTIFY",
          "This expense causes an overspend breach. Add a justification.",
          "justification",
        ),
      );
    } else {
      issues.push(
        issue(
          "W",
          "EXP_OVERSPEND",
          "Expense exceeds activity allocation and will be flagged.",
        ),
      );
    }
  } else if (projectedRep >= fin.revised * state.meta.settings.warnPct) {
    issues.push(
      issue(
        "W",
        "EXP_WARN",
        "Reported spend will reach the warning threshold for this activity.",
      ),
    );
  }

  return splitIssues(issues);
}

/** Finance cannot verify beyond activity revised allocation. */
export function canVerifyExpense(
  state: AppState,
  expenseId: ID,
  verifiedAmount?: number,
): Result<true> {
  const expense = state.expenses[expenseId];
  if (!expense) {
    return err({ code: "EXP_MISSING", message: "Expense not found" });
  }
  if (expense.status !== "submitted") {
    return err({
      code: "EXP_VERIFY_STATUS",
      message: "Only submitted expenses can be verified.",
      field: "status",
    });
  }

  const amount = verifiedAmount ?? expense.amount;
  if (amount <= 0 || amount > expense.amount) {
    return err({
      code: "EXP_VERIFY_AMOUNT",
      message: "Verified amount must be between 0 and the claimed amount.",
      field: "verifiedAmount",
    });
  }
  if (amount < expense.amount && amount > 0) {
    // reduced verify — remarks mandatory (checked by caller via remarks arg)
  }

  const fin = activityFinancials(state, expense.activityId);
  // Pending includes this expense; replace its pending with verified amount
  const othersPending = fin.pending - expense.amount;
  const projectedVerified = fin.verified + amount;
  const projectedRep = projectedVerified + Math.max(0, othersPending);
  if (projectedRep > fin.revised || projectedVerified > fin.revised) {
    return err({
      code: "EXP_VERIFY_OVER",
      message: "Raise a budget reallocation — cannot verify beyond activity allocation.",
      field: "verifiedAmount",
    });
  }
  return ok(true);
}

export function canRejectExpense(
  expense: Expense,
  remarks?: string,
): Result<true> {
  if (expense.status !== "submitted") {
    return err({
      code: "EXP_REJECT_STATUS",
      message: "Only submitted expenses can be rejected.",
    });
  }
  if (!remarks?.trim()) {
    return err({
      code: "EXP_REJECT_REMARKS",
      message: "Remarks are required when rejecting an expense.",
      field: "remarks",
    });
  }
  return ok(true);
}

export function overspendLevel(
  reported: number,
  revised: number,
  warnPct: number,
): "ok" | "warning" | "breach" {
  if (revised <= 0) return reported > 0 ? "breach" : "ok";
  if (reported > revised) return "breach";
  if (reported >= revised * warnPct) return "warning";
  return "ok";
}
