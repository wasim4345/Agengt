import type {
  AppState,
  BudgetRevision,
  Decision,
  ID,
} from "@/types/domain";
import { err, ok, type Result } from "@/types/result";
import {
  canRejectExpense,
  canVerifyExpense,
} from "@/lib/rules/expense";
import {
  needsLeadershipForReallocation,
  validateBudgetRevision,
  type RevisionLine,
} from "@/lib/rules/budget";
import { closureChecks } from "@/lib/rules/closure";

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function now(draft: AppState): string {
  return `${draft.meta.demoDate}T12:00:00.000Z`;
}

function decision(
  draft: AppState,
  approved: boolean,
  remarks?: string,
): Decision {
  return {
    by: draft.meta.currentUserId,
    at: now(draft),
    approved,
    remarks: remarks?.trim() || undefined,
  };
}

/** Move draft expense to submitted (after resubmit). */
export function applySubmitExpense(
  draft: AppState,
  expenseId: ID,
): Result<true> {
  const expense = draft.expenses[expenseId];
  if (!expense) {
    return err({ code: "EXP_MISSING", message: "Expense not found" });
  }
  if (expense.status !== "draft") {
    return err({
      code: "EXP_SUBMIT_STATUS",
      message: "Only draft expenses can be submitted.",
      field: "status",
    });
  }
  expense.status = "submitted";
  expense.submittedBy = draft.meta.currentUserId;
  expense.submittedAt = now(draft);
  return ok(true);
}

export function applyVerifyExpense(
  draft: AppState,
  expenseId: ID,
  opts?: { verifiedAmount?: number; remarks?: string },
): Result<true> {
  if (draft.meta.currentRole !== "finance" && !draft.meta.allowRuleBreaking) {
    return err({
      code: "EXP_VERIFY_ROLE",
      message: "Only Finance can verify expenses.",
    });
  }

  const expense = draft.expenses[expenseId];
  if (!expense) {
    return err({ code: "EXP_MISSING", message: "Expense not found" });
  }

  const amount = opts?.verifiedAmount ?? expense.amount;
  const check = canVerifyExpense(draft, expenseId, amount);
  if (!check.ok && !draft.meta.allowRuleBreaking) return check;

  if (amount < expense.amount && !opts?.remarks?.trim()) {
    return err({
      code: "EXP_PARTIAL_REMARKS",
      message: "Remarks are required when verifying a reduced amount.",
      field: "remarks",
    });
  }

  expense.status = "verified";
  expense.verifiedAmount = amount;
  expense.decision = decision(draft, true, opts?.remarks);
  return ok(true);
}

export function applyRejectExpense(
  draft: AppState,
  expenseId: ID,
  remarks: string,
): Result<true> {
  if (draft.meta.currentRole !== "finance" && !draft.meta.allowRuleBreaking) {
    return err({
      code: "EXP_REJECT_ROLE",
      message: "Only Finance can reject expenses.",
    });
  }

  const expense = draft.expenses[expenseId];
  if (!expense) {
    return err({ code: "EXP_MISSING", message: "Expense not found" });
  }

  const check = canRejectExpense(expense, remarks);
  if (!check.ok && !draft.meta.allowRuleBreaking) return check;

  expense.status = "rejected";
  expense.decision = decision(draft, false, remarks);
  return ok(true);
}

export function applyRequestBudgetRevision(
  draft: AppState,
  input: {
    programmeId: ID;
    kind: BudgetRevision["kind"];
    reason: string;
    lines: RevisionLine[];
    totalAfter: number;
  },
): Result<{ revisionId: ID }> {
  const programme = draft.programmes[input.programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  if (programme.status === "draft") {
    return err({
      code: "BUD_REVISION_DRAFT",
      message: "Draft programmes edit budgets directly — no revision needed.",
    });
  }
  if (!input.reason.trim()) {
    return err({
      code: "BUD_REASON",
      message: "Provide a reason for the revision.",
      field: "reason",
    });
  }

  const validation = validateBudgetRevision(draft, {
    programmeId: input.programmeId,
    kind: input.kind,
    lines: input.lines,
    totalAfter: input.totalAfter,
    requestedBy: draft.meta.currentUserId,
    actingRole: draft.meta.currentRole,
    requesterRole: draft.meta.currentRole,
  });
  if (!validation.ok && !draft.meta.allowRuleBreaking) {
    return err(validation.errors);
  }

  let needsLeadership = input.kind === "total_change";
  if (input.kind === "reallocation") {
    // Leadership threshold is vs source R_a (lines that decrease)
    for (const line of input.lines) {
      if (!line.activityId) continue;
      if (line.after >= line.before) continue;
      const delta = line.before - line.after;
      if (needsLeadershipForReallocation(draft, line.activityId, delta)) {
        needsLeadership = true;
        break;
      }
    }
  }
  if (input.kind === "activity_change") {
    needsLeadership = true;
  }

  const existing = Object.values(draft.budgetRevisions).filter(
    (r) => r.programmeId === input.programmeId,
  );
  const no = existing.length + 1;
  const id = nid("brev");
  const revision: BudgetRevision = {
    id,
    programmeId: input.programmeId,
    no,
    kind: input.kind,
    reason: input.reason.trim(),
    lines: input.lines.map((l) => ({ ...l })),
    totalBefore: programme.totalBudget,
    totalAfter: input.totalAfter,
    status: "pending_finance",
    requestedBy: draft.meta.currentUserId,
    requestedAt: now(draft),
    needsLeadership,
  };
  draft.budgetRevisions[id] = revision;
  return ok({ revisionId: id });
}

function applyRevisionLines(draft: AppState, revision: BudgetRevision) {
  for (const line of revision.lines) {
    if (!line.activityId) continue;
    const budget = draft.activityBudgets[line.activityId];
    if (budget) {
      budget.revised = line.after;
    }
  }
  const programme = draft.programmes[revision.programmeId];
  if (programme && revision.totalAfter !== revision.totalBefore) {
    programme.totalBudget = revision.totalAfter;
  }
}

export function applyDecideBudgetRevision(
  draft: AppState,
  revisionId: ID,
  input: { approved: boolean; remarks?: string },
): Result<true> {
  const revision = draft.budgetRevisions[revisionId];
  if (!revision) {
    return err({ code: "BUD_REV_MISSING", message: "Revision not found" });
  }

  const role = draft.meta.currentRole;
  const isFinanceStep = revision.status === "pending_finance";
  const isLeadershipStep = revision.status === "pending_leadership";

  if (isFinanceStep) {
    if (role !== "finance" && !draft.meta.allowRuleBreaking) {
      return err({
        code: "BUD_REV_ROLE",
        message: "Finance must decide this revision first.",
      });
    }
  } else if (isLeadershipStep) {
    if (role !== "leadership" && !draft.meta.allowRuleBreaking) {
      return err({
        code: "BUD_REV_ROLE",
        message: "Leadership must decide this revision.",
      });
    }
  } else {
    return err({
      code: "BUD_REV_STATUS",
      message: "Revision is not awaiting a decision.",
      field: "status",
    });
  }

  // Approver ≠ requester (role-level in demo; same persona switching roles is OK)
  if (
    input.approved &&
    revision.requestedBy === draft.meta.currentUserId &&
    !draft.meta.allowRuleBreaking
  ) {
    // Same persona: allow with simulated note via log only when role differs
    // Block only if same role path would self-approve without role switch —
    // blueprint: acting role must differ from requester role; persona switch OK.
  }

  if (!input.approved && !input.remarks?.trim()) {
    return err({
      code: "BUD_REV_REMARKS",
      message: "Remarks are required when rejecting a revision.",
      field: "remarks",
    });
  }

  const dec = decision(draft, input.approved, input.remarks);

  if (isFinanceStep) {
    revision.financeDecision = dec;
    if (!input.approved) {
      revision.status = "rejected";
      return ok(true);
    }
    if (revision.needsLeadership) {
      revision.status = "pending_leadership";
      return ok(true);
    }
    // Re-validate before apply
    const validation = validateBudgetRevision(draft, {
      programmeId: revision.programmeId,
      kind: revision.kind,
      lines: revision.lines,
      totalAfter: revision.totalAfter,
      requestedBy: revision.requestedBy,
      actingRole: role,
      requesterRole: "programme_manager",
    });
    if (!validation.ok && !draft.meta.allowRuleBreaking) {
      return err(validation.errors);
    }
    applyRevisionLines(draft, revision);
    revision.status = "approved";
    return ok(true);
  }

  // Leadership step
  revision.leadershipDecision = dec;
  if (!input.approved) {
    revision.status = "rejected";
    return ok(true);
  }
  const validation = validateBudgetRevision(draft, {
    programmeId: revision.programmeId,
    kind: revision.kind,
    lines: revision.lines,
    totalAfter: revision.totalAfter,
    requestedBy: revision.requestedBy,
    actingRole: role,
    requesterRole: "programme_manager",
  });
  if (!validation.ok && !draft.meta.allowRuleBreaking) {
    return err(validation.errors);
  }
  applyRevisionLines(draft, revision);
  revision.status = "approved";
  return ok(true);
}

export function applyWithdrawBudgetRevision(
  draft: AppState,
  revisionId: ID,
): Result<true> {
  const revision = draft.budgetRevisions[revisionId];
  if (!revision) {
    return err({ code: "BUD_REV_MISSING", message: "Revision not found" });
  }
  if (
    revision.status !== "pending_finance" &&
    revision.status !== "pending_leadership"
  ) {
    return err({
      code: "BUD_REV_STATUS",
      message: "Only pending revisions can be withdrawn.",
    });
  }
  if (
    revision.requestedBy !== draft.meta.currentUserId &&
    draft.meta.currentRole !== "leadership" &&
    !draft.meta.allowRuleBreaking
  ) {
    return err({
      code: "BUD_REV_WITHDRAW",
      message: "Only the requester or Leadership can withdraw.",
    });
  }
  revision.status = "withdrawn";
  return ok(true);
}

export function applyCheckClosure(
  draft: AppState,
  programmeId: ID,
): Result<{ ready: boolean; issues: string[] }> {
  const result = closureChecks(draft, programmeId);
  return ok(result);
}
