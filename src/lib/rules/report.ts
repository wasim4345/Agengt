import type {
  ActivityReport,
  ActivityStatus,
  AppState,
  ID,
  ReportContent,
} from "@/types/domain";
import { dayDiff } from "./dates";
import { issue, splitIssues, type ValidationResult } from "./types";
import { err, ok, type Result } from "@/types/result";

const RPT = {
  EXP_MISSING:
    "Add at least one expense entry, or choose 'No expense'.",
  EXP_NONE:
    "Remove or unlink expense entries, or choose 'Yes'.",
  DELAY: "Explain the reason for delay.",
  PARTIAL: "Describe progress achieved and % complete.",
  COMPLETE: "A completion (final) report with outcomes is required.",
  CANCEL: "State the cancellation reason.",
  CONSISTENCY: "Status conflicts with 'Activity conducted: No'.",
  DATE: "Revised date cannot be in the past.",
} as const;

export function validateReportContent(
  state: AppState,
  input: {
    type: ActivityReport["type"];
    content: ReportContent;
    linkedExpenseIds: ID[];
  },
): ValidationResult {
  const { type, content, linkedExpenseIds } = input;
  const issues = [];

  if (content.expenseIncurred === true && linkedExpenseIds.length === 0) {
    issues.push(
      issue("E", "RPT_EXP_MISSING", RPT.EXP_MISSING, "expenseIncurred"),
    );
  }
  if (content.expenseIncurred === false && linkedExpenseIds.length > 0) {
    issues.push(issue("E", "RPT_EXP_NONE", RPT.EXP_NONE, "expenseIncurred"));
  }

  if (content.activityStatus === "delayed") {
    if (!content.delay?.reason?.trim()) {
      issues.push(issue("E", "RPT_DELAY", RPT.DELAY, "delay.reason"));
    }
    if (!content.delay?.corrective?.trim()) {
      issues.push(
        issue(
          "E",
          "RPT_DELAY",
          "Describe the corrective action for the delay.",
          "delay.corrective",
        ),
      );
    }
    if (!content.delay?.revisedEnd) {
      issues.push(
        issue(
          "E",
          "RPT_DELAY",
          "Provide a revised end date for the delay.",
          "delay.revisedEnd",
        ),
      );
    }
  }

  if (content.activityStatus === "partially_completed") {
    if (!content.progressDetails?.trim() || content.percentComplete == null) {
      issues.push(issue("E", "RPT_PARTIAL", RPT.PARTIAL, "progressDetails"));
    }
  }

  if (content.activityStatus === "completed") {
    if (
      type !== "final" ||
      !content.whatConducted?.trim() ||
      !content.keyOutcomes?.trim()
    ) {
      issues.push(issue("E", "RPT_COMPLETE", RPT.COMPLETE, "keyOutcomes"));
    }
  }

  if (
    content.activityStatus === "cancelled" &&
    !content.cancellationReason?.trim()
  ) {
    issues.push(issue("E", "RPT_CANCEL", RPT.CANCEL, "cancellationReason"));
  }

  if (
    content.conducted === "no" &&
    (content.activityStatus === "completed" ||
      content.activityStatus === "partially_completed")
  ) {
    issues.push(
      issue("E", "RPT_CONSISTENCY", RPT.CONSISTENCY, "conducted"),
    );
  }

  if (
    content.delay?.revisedEnd &&
    dayDiff(state.meta.demoDate, content.delay.revisedEnd) < 0
  ) {
    issues.push(issue("E", "RPT_DATE", RPT.DATE, "delay.revisedEnd"));
  }

  return splitIssues(issues);
}

export function validateSubmitReport(
  state: AppState,
  reportId: ID,
): ValidationResult {
  const report = state.reports[reportId];
  if (!report) {
    return splitIssues([
      issue("E", "RPT_MISSING", "Report not found", "reportId"),
    ]);
  }
  const linked =
    report.status === "draft" || report.status === "returned"
      ? Object.values(state.expenses)
          .filter(
            (e) =>
              e.reportId === reportId ||
              (e.activityId === report.activityId && e.status === "draft"),
          )
          .map((e) => e.id)
      : (report.versions[report.versions.length - 1]?.expenseIds ?? []);

  return validateReportContent(state, {
    type: report.type,
    content: report.draft,
    linkedExpenseIds: linked,
  });
}

/** One final thread per activity (revisable). */
export function canStartFinalReport(
  state: AppState,
  activityId: ID,
): Result<true> {
  const existing = Object.values(state.reports).find(
    (r) => r.activityId === activityId && r.type === "final",
  );
  if (existing) {
    return err({
      code: "RPT_FINAL_EXISTS",
      message: "A final report thread already exists for this activity. Revise it instead.",
      field: "type",
    });
  }
  return ok(true);
}

export function canReleaseReport(
  state: AppState,
  reportId: ID,
  actorId: ID,
): Result<true> {
  const report = state.reports[reportId];
  if (!report) {
    return err({ code: "RPT_MISSING", message: "Report not found" });
  }
  if (report.status !== "submitted") {
    return err({
      code: "RPT_RELEASE_STATUS",
      message: "Only submitted reports can be released.",
      field: "status",
    });
  }
  const latest = report.versions[report.versions.length - 1];
  if (latest && latest.submittedBy === actorId) {
    return err({
      code: "RPT_RELEASE_SELF",
      message: "Submitter cannot release their own report. Switch persona or role.",
      field: "actorId",
    });
  }
  return ok(true);
}

export type { ActivityStatus };
