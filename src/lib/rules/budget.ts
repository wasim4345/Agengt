import type { AppState, ID } from "@/types/domain";
import { activityFinancials, programmeFinancials } from "@/selectors/finance";
import { err, ok, type Result } from "@/types/result";
import { issue, splitIssues, type ValidationResult } from "./types";

/** Direct budget edit allowed only on draft programmes. */
export function canSetActivityBudget(
  state: AppState,
  activityId: ID,
  nextRevised: number,
): Result<true> {
  const activity = state.activities[activityId];
  if (!activity) {
    return err({ code: "ACT_MISSING", message: "Activity not found" });
  }
  const programme = state.programmes[activity.programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  if (programme.status !== "draft") {
    return err({
      code: "BUD_DRAFT_ONLY",
      message: "Active programmes require a budget revision request.",
      field: "revised",
    });
  }
  if (nextRevised < 0) {
    return err({
      code: "BUD_NEGATIVE",
      message: "Budget cannot be negative.",
      field: "revised",
    });
  }

  // Simulate new allocation
  let allocated = 0;
  for (const a of Object.values(state.activities)) {
    if (a.programmeId !== programme.id || a.status === "cancelled") continue;
    if (a.id === activityId) allocated += nextRevised;
    else allocated += state.activityBudgets[a.id]?.revised ?? 0;
  }
  if (allocated > programme.totalBudget) {
    return err({
      code: "BUD_OVER_ALLOC",
      message: `Allocation exceeds programme budget. Headroom: ${(programme.totalBudget - (allocated - nextRevised)).toLocaleString("en-IN")}.`,
      field: "revised",
    });
  }
  return ok(true);
}

export function canSetProgrammeBudget(
  state: AppState,
  programmeId: ID,
  nextTotal: number,
): Result<true> {
  const programme = state.programmes[programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  if (programme.status !== "draft") {
    return err({
      code: "BUD_DRAFT_ONLY",
      message: "Change the total via a budget revision on active programmes.",
      field: "totalBudget",
    });
  }
  if (nextTotal < 0) {
    return err({
      code: "BUD_NEGATIVE",
      message: "Budget cannot be negative.",
      field: "totalBudget",
    });
  }
  const fin = programmeFinancials(state, programmeId);
  if (fin.allocated > nextTotal) {
    return err({
      code: "BUD_OVER_ALLOC",
      message: "Total budget cannot be below current allocations.",
      field: "totalBudget",
    });
  }
  return ok(true);
}

export type RevisionLine = {
  activityId?: ID;
  before: number;
  after: number;
};

/**
 * Validate a proposed budget revision (doc 04 §5).
 */
export function validateBudgetRevision(
  state: AppState,
  input: {
    programmeId: ID;
    kind: "reallocation" | "total_change" | "activity_change";
    lines: RevisionLine[];
    totalAfter: number;
    requestedBy: ID;
    actingRole: string;
    requesterRole: string;
  },
): ValidationResult {
  const programme = state.programmes[input.programmeId];
  const issues = [];
  if (!programme) {
    return splitIssues([issue("E", "PRG_MISSING", "Programme not found")]);
  }

  const fin = programmeFinancials(state, input.programmeId);
  if (input.totalAfter < fin.reported) {
    issues.push(
      issue(
        "E",
        "BUD_TOTAL_BELOW_REP",
        "Revised programme budget cannot be below reported expenditure.",
        "totalAfter",
      ),
    );
  }

  // Apply lines to a scratch allocation map
  const revisedMap = new Map<string, number>();
  for (const a of Object.values(state.activities)) {
    if (a.programmeId !== input.programmeId) continue;
    revisedMap.set(a.id, state.activityBudgets[a.id]?.revised ?? 0);
  }
  for (const line of input.lines) {
    if (line.activityId) {
      revisedMap.set(line.activityId, line.after);
      const rep = activityFinancials(state, line.activityId).reported;
      if (line.after < rep) {
        issues.push(
          issue(
            "E",
            "BUD_LINE_BELOW_REP",
            `Revised allocation for ${line.activityId} cannot be below reported (${rep}).`,
            `lines.${line.activityId}`,
          ),
        );
      }
    }
  }

  let sum = 0;
  for (const [id, amount] of revisedMap) {
    const activity = state.activities[id];
    if (!activity || activity.status === "cancelled") continue;
    sum += amount;
  }
  if (sum > input.totalAfter) {
    issues.push(
      issue(
        "E",
        "BUD_SUM_OVER",
        "Sum of activity allocations exceeds the revised programme total.",
        "lines",
      ),
    );
  }

  if (input.kind === "reallocation") {
    const beforeSum = fin.allocated;
    const deltaTotal = input.totalAfter - programme.totalBudget;
    if (deltaTotal !== 0) {
      issues.push(
        issue(
          "E",
          "BUD_REALLOC_TOTAL",
          "Reallocation must keep the programme total unchanged.",
          "totalAfter",
        ),
      );
    }
    void beforeSum;
  }

  if (input.actingRole === input.requesterRole) {
    // Allowed with simulated note — warning only
    issues.push(
      issue(
        "W",
        "BUD_SAME_ROLE",
        "Requester and approver share a role in this demo (simulated).",
      ),
    );
  }

  return splitIssues(issues);
}

export function needsLeadershipForReallocation(
  state: AppState,
  sourceActivityId: ID,
  deltaAbs: number,
): boolean {
  const settings = state.meta.settings;
  const source = activityFinancials(state, sourceActivityId);
  const pct = source.revised === 0 ? 1 : deltaAbs / source.revised;
  return (
    pct > settings.reallocLeadershipPct ||
    deltaAbs > settings.reallocLeadershipAmount
  );
}
