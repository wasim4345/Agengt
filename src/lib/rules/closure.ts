import type { AppState, ID } from "@/types/domain";

const TERMINAL: Set<string> = new Set([
  "completed",
  "cancelled",
]);

/**
 * Closure readiness checks (doc 04 §1 / M8).
 * Finance clears before Leadership can approve closure (M11).
 */
export function closureChecks(
  state: AppState,
  programmeId: ID,
): { ready: boolean; issues: string[] } {
  const programme = state.programmes[programmeId];
  const issues: string[] = [];
  if (!programme) {
    return { ready: false, issues: ["Programme not found"] };
  }

  const submitted = Object.values(state.expenses).filter(
    (e) => e.programmeId === programmeId && e.status === "submitted",
  );
  if (submitted.length > 0) {
    issues.push(
      `${submitted.length} submitted expense(s) still awaiting Finance decision`,
    );
  }

  const openActivities = Object.values(state.activities).filter(
    (a) => a.programmeId === programmeId && !TERMINAL.has(a.status),
  );
  if (openActivities.length > 0) {
    issues.push(
      `${openActivities.length} activity(ies) not completed or cancelled`,
    );
  }

  const pendingRevisions = Object.values(state.budgetRevisions).filter(
    (r) =>
      r.programmeId === programmeId &&
      (r.status === "pending_finance" || r.status === "pending_leadership"),
  );
  if (pendingRevisions.length > 0) {
    issues.push(
      `${pendingRevisions.length} budget revision(s) still pending`,
    );
  }

  const draftExpenses = Object.values(state.expenses).filter(
    (e) => e.programmeId === programmeId && e.status === "draft",
  );
  if (draftExpenses.length > 0) {
    issues.push(`${draftExpenses.length} draft expense(s) must be cleared`);
  }

  return { ready: issues.length === 0, issues };
}
