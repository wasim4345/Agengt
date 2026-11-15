import type { AppState, Expense, Achievement } from "@/types/domain";
import { err, ok, type Result } from "@/types/result";

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Quick scenario buttons (P-DAT-03). */
export function applyQuickScenario(
  draft: AppState,
  name:
    | "make_delayed"
    | "add_overspend"
    | "add_pending_x5"
    | "complete_next"
    | "release_latest"
    | "add_startup_win",
): Result<string> {
  switch (name) {
    case "make_delayed": {
      const candidate = Object.values(draft.activities).find(
        (a) =>
          a.status === "in_progress" || a.status === "not_started",
      );
      if (!candidate) {
        return err({
          code: "SCENARIO_EMPTY",
          message: "No activity available to mark delayed",
        });
      }
      candidate.status = "delayed";
      candidate.revisedEnd = draft.meta.demoDate;
      return ok(`Marked ${candidate.code} delayed`);
    }
    case "add_overspend": {
      const activity = Object.values(draft.activities).find(
        (a) => (draft.activityBudgets[a.id]?.revised ?? 0) > 0,
      );
      if (!activity) {
        return err({
          code: "SCENARIO_EMPTY",
          message: "No budgeted activity found",
        });
      }
      const budget = draft.activityBudgets[activity.id]!.revised;
      const id = nid("exp");
      const expense: Expense = {
        id,
        programmeId: activity.programmeId,
        activityId: activity.id,
        categoryId: Object.keys(draft.expenseCategories)[0]!,
        description: "Quick scenario overspend",
        date: draft.meta.demoDate,
        amount: Math.round(budget * 1.2),
        status: "submitted",
        submittedBy: draft.meta.currentUserId,
        submittedAt: `${draft.meta.demoDate}T12:00:00.000Z`,
        overspendFlag: true,
      };
      draft.expenses[id] = expense;
      return ok(`Added overspend on ${activity.code}`);
    }
    case "add_pending_x5": {
      const activity = Object.values(draft.activities)[0];
      if (!activity) {
        return err({
          code: "SCENARIO_EMPTY",
          message: "No activities in store",
        });
      }
      for (let i = 0; i < 5; i += 1) {
        const id = nid("exp");
        draft.expenses[id] = {
          id,
          programmeId: activity.programmeId,
          activityId: activity.id,
          categoryId: Object.keys(draft.expenseCategories)[0]!,
          description: `Pending scenario expense ${i + 1}`,
          date: draft.meta.demoDate,
          amount: 10_000 + i * 1000,
          status: "submitted",
          submittedBy: draft.meta.currentUserId,
          submittedAt: `${draft.meta.demoDate}T12:00:00.000Z`,
        };
      }
      return ok("Added 5 pending expenses");
    }
    case "complete_next": {
      const next = Object.values(draft.activities)
        .filter((a) => a.status === "in_progress" || a.status === "not_started")
        .sort((a, b) => a.sortOrder - b.sortOrder)[0];
      if (!next) {
        return err({
          code: "SCENARIO_EMPTY",
          message: "No incomplete activity found",
        });
      }
      next.status = "completed";
      next.percentComplete = 100;
      next.actualEnd = draft.meta.demoDate;
      return ok(`Completed ${next.code}`);
    }
    case "release_latest": {
      const report = Object.values(draft.reports).find(
        (r) => r.status === "submitted",
      );
      if (!report) {
        return err({
          code: "SCENARIO_EMPTY",
          message: "No submitted report to release",
        });
      }
      const versionNo =
        report.versions[report.versions.length - 1]?.no ?? 1;
      report.status = "released";
      report.release = {
        clientVisible: true,
        marcomVisible: true,
        by: draft.meta.currentUserId,
        at: `${draft.meta.demoDate}T12:00:00.000Z`,
        versionNo,
      };
      return ok(`Released report ${report.id}`);
    }
    case "add_startup_win": {
      const link = draft.programmeStartups.find((ps) =>
        ["selected", "onboarded", "graduated"].includes(ps.status),
      );
      if (!link) {
        return err({
          code: "SCENARIO_EMPTY",
          message: "No visible startup participation found",
        });
      }
      const id = nid("ach");
      const win: Achievement = {
        id,
        startupId: link.startupId,
        programmeId: link.programmeId,
        title: "Quick scenario win",
        description: "Added from Data Manager scenario button",
        date: draft.meta.demoDate,
        type: "award",
        marcomApproved: true,
        clientApproved: false,
      };
      draft.achievements[id] = win;
      return ok(`Added startup win ${id}`);
    }
    default:
      return err({ code: "SCENARIO_UNKNOWN", message: "Unknown scenario" });
  }
}
