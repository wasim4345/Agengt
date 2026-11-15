import type { AppState, ID, ISODate } from "@/types/domain";
import { dayDiff } from "./dates";
import { detectCycle, effectiveEnd, effectiveStart, validateSchedule } from "./dependencies";
import {
  issue,
  splitIssues,
  type ValidationIssue,
  type ValidationResult,
} from "./types";
import { programmeAllocated } from "@/selectors/finance";

/**
 * Pre-submission validation (doc 04 §2).
 * Blocking E1–E7, warnings W1–W4.
 */
export function validateProgramme(
  state: AppState,
  programmeId: ID,
  options?: { acknowledgeUnallocated?: boolean },
): ValidationResult {
  const programme = state.programmes[programmeId];
  const issues: ValidationIssue[] = [];
  if (!programme) {
    return splitIssues([
      issue("E", "PRG_MISSING", "Programme not found", "programmeId"),
    ]);
  }

  // E1 end ≥ start
  if (dayDiff(programme.startDate, programme.endDate) < 0) {
    issues.push(
      issue("E", "E1", "Programme end date must be on or after start date.", "endDate"),
    );
  }

  const activities = Object.values(state.activities).filter(
    (a) => a.programmeId === programmeId,
  );

  // E6 ≥1 activity
  if (activities.length === 0) {
    issues.push(issue("E", "E6", "Add at least one activity block.", "activities"));
  }

  // E2 every activity within programme dates
  for (const activity of activities) {
    if (dayDiff(programme.startDate, effectiveStart(activity)) < 0) {
      issues.push(
        issue(
          "E",
          "E2",
          `${activity.code} starts before the programme start.`,
          `activities.${activity.id}.plannedStart`,
        ),
      );
    }
    if (dayDiff(programme.endDate, effectiveEnd(activity)) > 0) {
      issues.push(
        issue(
          "E",
          "E2",
          `${activity.code} ends after the programme end. Request an extension or shorten the activity.`,
          `activities.${activity.id}.plannedEnd`,
        ),
      );
    }
  }

  // E3 no dependency cycle
  const cycle = detectCycle(state, programmeId);
  if (cycle.hasCycle) {
    issues.push(
      issue("E", "E3", `Dependency cycle detected: ${cycle.path}`, "dependencies"),
    );
  }

  // E4 every activity has an owner
  for (const activity of activities) {
    if (!activity.ownerId || !state.users[activity.ownerId]) {
      issues.push(
        issue(
          "E",
          "E4",
          `${activity.code} needs an owner.`,
          `activities.${activity.id}.ownerId`,
        ),
      );
    }
  }

  // E5 Σ allocations ≤ total budget
  const allocated = programmeAllocated(state, programmeId);
  if (allocated > programme.totalBudget) {
    const headroom = programme.totalBudget - allocated;
    issues.push(
      issue(
        "E",
        "E5",
        `Allocations exceed programme budget by ${Math.abs(headroom).toLocaleString("en-IN")}. Headroom is insufficient.`,
        "totalBudget",
      ),
    );
  }

  // E7 dependency date violations (blocking); soft alternative would be W
  const scheduleViolations = validateSchedule(state, programmeId);
  for (const v of scheduleViolations) {
    issues.push(
      issue("E", "E7", v.message, `dependencies.${v.dependencyId}`),
    );
  }

  // W1 activity without budget
  for (const activity of activities) {
    const budget = state.activityBudgets[activity.id];
    if (!budget || budget.revised <= 0) {
      issues.push(
        issue(
          "W",
          "W1",
          `${activity.code} has no budget allocation.`,
          `activityBudgets.${activity.id}`,
        ),
      );
    }
  }

  // W2 unallocated > 0
  const unallocated = programme.totalBudget - allocated;
  if (unallocated > 0 && !options?.acknowledgeUnallocated) {
    issues.push(
      issue(
        "W",
        "W2",
        `Unallocated budget remains (${unallocated.toLocaleString("en-IN")}). Acknowledge before activation.`,
        "unallocated",
      ),
    );
  }

  // W3 no milestone
  const milestones = Object.values(state.milestones).filter(
    (m) => m.programmeId === programmeId,
  );
  if (milestones.length === 0) {
    issues.push(issue("W", "W3", "No milestones defined for this programme."));
  }

  // W4 no client set
  if (!programme.clientId || !state.clients[programme.clientId]) {
    issues.push(issue("W", "W4", "No client organisation is set.", "clientId"));
  }

  return splitIssues(issues);
}

export function activityBeyondProgrammeEnd(
  state: AppState,
  activityId: ID,
): { beyond: boolean; programmeEnd?: ISODate } {
  const activity = state.activities[activityId];
  if (!activity) return { beyond: false };
  const programme = state.programmes[activity.programmeId];
  if (!programme) return { beyond: false };
  return {
    // activity effective end after programme end
    beyond: dayDiff(programme.endDate, effectiveEnd(activity)) > 0,
    programmeEnd: programme.endDate,
  };
}

/** Closure guards (edge case 14). */
export function canRequestClosure(
  state: AppState,
  programmeId: ID,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const programme = state.programmes[programmeId];
  if (!programme) {
    return splitIssues([issue("E", "PRG_MISSING", "Programme not found")]);
  }

  const pendingExpenses = Object.values(state.expenses).filter(
    (e) => e.programmeId === programmeId && e.status === "submitted",
  );
  if (pendingExpenses.length > 0) {
    issues.push(
      issue(
        "E",
        "CLOSE_PENDING_EXP",
        `${pendingExpenses.length} submitted expense(s) must be verified or rejected before closure.`,
      ),
    );
  }

  const unresolved = Object.values(state.activities).filter(
    (a) =>
      a.programmeId === programmeId &&
      !["completed", "cancelled"].includes(a.status),
  );
  // partially_completed must be resolved at closure (edge 18)
  const partial = Object.values(state.activities).filter(
    (a) =>
      a.programmeId === programmeId && a.status === "partially_completed",
  );
  if (unresolved.length > 0) {
    issues.push(
      issue(
        "E",
        "CLOSE_ACTIVITIES",
        `${unresolved.length} activit(ies) are not terminal (completed/cancelled).`,
      ),
    );
  }
  if (partial.length > 0) {
    issues.push(
      issue(
        "E",
        "CLOSE_PARTIAL",
        `${partial.length} partially completed activit(ies) must be resolved before closure.`,
      ),
    );
  }

  return splitIssues(issues);
}
