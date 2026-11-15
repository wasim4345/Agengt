import type { AppState, ID, Role } from "@/types/domain";

/** Roles that may verify/reject expenses (Amendment 10 D-1). */
export function canRoleVerifyExpenses(role: Role): boolean {
  return role === "leadership" || role === "programme_lead";
}

/**
 * Lead verifies own portfolio; Leadership any; never own submissions.
 */
export function canActorVerifyExpense(
  state: AppState,
  expenseId: ID,
): { ok: true } | { ok: false; code: string; message: string } {
  const expense = state.expenses[expenseId];
  if (!expense) {
    return { ok: false, code: "EXP_MISSING", message: "Expense not found" };
  }
  if (state.meta.allowRuleBreaking) return { ok: true };

  const role = state.meta.currentRole;
  const actor = state.meta.currentUserId;

  if (!canRoleVerifyExpenses(role)) {
    return {
      ok: false,
      code: "EXP_VERIFY_ROLE",
      message: "Only Programme Lead or Leadership can verify expenses.",
    };
  }

  if (expense.submittedBy && expense.submittedBy === actor) {
    return {
      ok: false,
      code: "EXP_VERIFY_SELF",
      message: "You cannot verify your own expense submission.",
    };
  }

  if (role === "programme_lead") {
    const programme = state.programmes[expense.programmeId];
    if (!programme || programme.leadId !== actor) {
      return {
        ok: false,
        code: "EXP_VERIFY_PORTFOLIO",
        message: "Programme Lead can only verify expenses in their portfolio.",
      };
    }
  }

  return { ok: true };
}

/** Finance-step budget revisions: Lead (own portfolio) or Leadership. */
export function canDecideFinanceRevision(
  state: AppState,
  programmeId: ID,
): boolean {
  if (state.meta.allowRuleBreaking) return true;
  const role = state.meta.currentRole;
  if (role === "leadership") return true;
  if (role === "programme_lead") {
    return state.programmes[programmeId]?.leadId === state.meta.currentUserId;
  }
  return false;
}

export function programmesVisibleToRole(state: AppState): ID[] {
  const role = state.meta.currentRole;
  const me = state.meta.currentUserId;
  return Object.values(state.programmes)
    .filter((p) => {
      if (role === "leadership" || role === "marcom") return true;
      if (role === "programme_lead") return p.leadId === me;
      if (role === "programme_manager") {
        return p.managerId === me || p.teamIds.includes(me);
      }
      return false;
    })
    .map((p) => p.id);
}
