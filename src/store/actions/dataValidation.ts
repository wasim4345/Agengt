import type { AppState, Activity, Dependency, Expense, ID } from "@/types/domain";
import { err, ok, type Result } from "@/types/result";
import { validateAddDependency } from "@/lib/rules/dependencies";
import { validateExpenseEntry } from "@/lib/rules/expense";

export type ValidatableEntity =
  | "programmes"
  | "activities"
  | "activityBudgets"
  | "dependencies"
  | "expenses"
  | string;

/**
 * Validate Data Manager upserts using M3 rules unless rule-breaking is on.
 * Programme/budget checks stay light so stub CRUD still works (full
 * programme submission rules live on the Programme Builder screens).
 */
export function validateEntityUpsert(
  state: AppState,
  entity: ValidatableEntity,
  id: ID,
  value: unknown,
): Result<true> {
  if (state.meta.allowRuleBreaking) return ok(true);

  switch (entity) {
    case "dependencies": {
      const dep = value as Dependency;
      return validateAddDependency(state, {
        programmeId: dep.programmeId,
        successorId: dep.successorId,
        predecessorId: dep.predecessorId,
        predecessorMilestoneId: dep.predecessorMilestoneId,
      });
    }
    case "programmes": {
      const programme = value as AppState["programmes"][string];
      if (programme.endDate < programme.startDate) {
        return err({
          code: "E1",
          message: "Programme end date must be on or after start date.",
          field: "endDate",
        });
      }
      return ok(true);
    }
    case "activities": {
      const activity = value as Activity;
      if (!activity.ownerId) {
        return err({
          code: "E4",
          message: "Activity needs an owner.",
          field: "ownerId",
        });
      }
      if (activity.plannedEnd < activity.plannedStart) {
        return err({
          code: "E1",
          message: "Activity end must be on or after start.",
          field: "plannedEnd",
        });
      }
      return ok(true);
    }
    case "activityBudgets": {
      const budget = value as { activityId?: string; revised: number };
      if (budget.revised < 0) {
        return err({
          code: "BUD_NEG",
          message: "Revised budget cannot be negative.",
          field: "revised",
        });
      }
      return ok(true);
    }
    case "expenses": {
      const expense = value as Expense;
      const result = validateExpenseEntry(state, {
        activityId: expense.activityId,
        date: expense.date,
        amount: expense.amount,
        categoryId: expense.categoryId,
        description: expense.description,
        reportId: expense.reportId,
        excludeId: id,
        justification: expense.overspendFlag ? "Presenter justified" : undefined,
      });
      if (!result.ok) return err(result.errors);
      return ok(true);
    }
    default:
      return ok(true);
  }
}
