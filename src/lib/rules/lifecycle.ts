import type { AppState, ID, ISODate } from "@/types/domain";
import { dayDiff } from "./dates";
import { err, ok, type Result } from "@/types/result";
import { closureChecks } from "./closure";
import { issue, splitIssues, type ValidationResult } from "./types";

/** Case 1: activity dates must stay within programme end (or request extension). */
export function canSetActivityDates(
  state: AppState,
  activityId: ID,
  plannedStart: ISODate,
  plannedEnd: ISODate,
): Result<true> {
  const activity = state.activities[activityId];
  if (!activity) {
    return err({ code: "ACT_MISSING", message: "Activity not found" });
  }
  const programme = state.programmes[activity.programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  if (dayDiff(plannedStart, plannedEnd) < 0) {
    return err({
      code: "ACT_DATE_ORDER",
      message: "End date must be on or after start date.",
      field: "plannedEnd",
    });
  }
  if (dayDiff(programme.startDate, plannedStart) < 0) {
    return err({
      code: "ACT_BEFORE_PRG",
      message: "Activity cannot start before the programme start.",
      field: "plannedStart",
    });
  }
  if (dayDiff(plannedEnd, programme.endDate) < 0) {
    return err({
      code: "ACT_BEYOND_PRG",
      message:
        "Activity ends after the programme end. Request an extension or shorten the activity.",
      field: "plannedEnd",
    });
  }
  return ok(true);
}

export function canRequestHold(state: AppState, programmeId: ID): Result<true> {
  const p = state.programmes[programmeId];
  if (!p) return err({ code: "PRG_MISSING", message: "Programme not found" });
  if (p.status !== "active") {
    return err({
      code: "LIF_HOLD_STATUS",
      message: "Only active programmes can be put on hold.",
    });
  }
  return ok(true);
}

export function canRequestResume(state: AppState, programmeId: ID): Result<true> {
  const p = state.programmes[programmeId];
  if (!p) return err({ code: "PRG_MISSING", message: "Programme not found" });
  if (p.status !== "on_hold") {
    return err({
      code: "LIF_RESUME_STATUS",
      message: "Only on-hold programmes can be resumed.",
    });
  }
  return ok(true);
}

export function canRequestExtension(
  state: AppState,
  programmeId: ID,
  newEndDate: ISODate,
): Result<true> {
  const p = state.programmes[programmeId];
  if (!p) return err({ code: "PRG_MISSING", message: "Programme not found" });
  if (p.status !== "active" && p.status !== "on_hold") {
    return err({
      code: "LIF_EXT_STATUS",
      message: "Extensions apply to active or on-hold programmes.",
    });
  }
  if (dayDiff(p.endDate, newEndDate) <= 0) {
    return err({
      code: "LIF_EXT_DATE",
      message: "New end date must be after the current programme end.",
      field: "newEndDate",
    });
  }
  return ok(true);
}

export function canRequestCancellation(
  state: AppState,
  programmeId: ID,
  reason?: string,
): ValidationResult {
  const issues = [];
  const p = state.programmes[programmeId];
  if (!p) {
    return splitIssues([issue("E", "PRG_MISSING", "Programme not found")]);
  }
  if (
    !["draft", "pending_approval", "active", "on_hold"].includes(p.status)
  ) {
    issues.push(
      issue(
        "E",
        "LIF_CANCEL_STATUS",
        "Programme cannot be cancelled from this status.",
      ),
    );
  }
  if (!reason?.trim()) {
    issues.push(
      issue("E", "LIF_CANCEL_REASON", "Cancellation reason is required.", "reason"),
    );
  }
  const openExpenses = Object.values(state.expenses).filter(
    (e) =>
      e.programmeId === programmeId &&
      (e.status === "submitted" || e.status === "draft"),
  );
  if (openExpenses.length > 0) {
    issues.push(
      issue(
        "E",
        "LIF_CANCEL_EXPENSES",
        `${openExpenses.length} open expense(s) must be decided before cancellation.`,
      ),
    );
  }
  return splitIssues(issues);
}

export function canRequestClosureResult(
  state: AppState,
  programmeId: ID,
): Result<true> {
  const p = state.programmes[programmeId];
  if (!p) return err({ code: "PRG_MISSING", message: "Programme not found" });
  if (p.status !== "active" && p.status !== "completed") {
    return err({
      code: "LIF_CLOSE_STATUS",
      message: "Closure can be requested for active/completed programmes.",
    });
  }
  const checks = closureChecks(state, programmeId);
  if (!checks.ready) {
    return err({
      code: "LIF_CLOSE_PENDING",
      message: `Closure blocked: ${checks.issues.join("; ")}`,
    });
  }
  return ok(true);
}

export function canReplaceManager(
  state: AppState,
  programmeId: ID,
  newManagerId: ID,
): Result<true> {
  const p = state.programmes[programmeId];
  if (!p) return err({ code: "PRG_MISSING", message: "Programme not found" });
  const user = state.users[newManagerId];
  if (!user || user.role !== "programme_manager") {
    return err({
      code: "LIF_MGR_ROLE",
      message: "New manager must be a programme manager persona.",
      field: "managerId",
    });
  }
  if (newManagerId === p.managerId) {
    return err({
      code: "LIF_MGR_SAME",
      message: "Choose a different manager.",
      field: "managerId",
    });
  }
  return ok(true);
}

/** Reporting disabled while programme is on hold (case 19). */
export function canReportOnProgramme(
  state: AppState,
  programmeId: ID,
): Result<true> {
  const p = state.programmes[programmeId];
  if (!p) return err({ code: "PRG_MISSING", message: "Programme not found" });
  if (p.status === "on_hold") {
    return err({
      code: "LIF_HOLD_REPORT",
      message: "Reporting is disabled while the programme is on hold. Resume first.",
    });
  }
  if (p.status === "cancelled" || p.status === "closed") {
    return err({
      code: "LIF_REPORT_STATUS",
      message: "Reporting is closed for this programme.",
    });
  }
  return ok(true);
}

/** Case 20: invoice soft-delete restricted to Finance/Leadership after submit. */
export function canSoftDeleteEvidence(
  state: AppState,
  evidenceId: ID,
): Result<true> {
  const evidence = state.evidence[evidenceId];
  if (!evidence || evidence.deleted) {
    return err({ code: "EVID_MISSING", message: "Evidence not found" });
  }
  const role = state.meta.currentRole;
  const isUploader = evidence.uploadedBy === state.meta.currentUserId;
  const linkedReport = evidence.reportId
    ? state.reports[evidence.reportId]
    : undefined;
  const submitted =
    linkedReport &&
    (linkedReport.status === "submitted" ||
      linkedReport.status === "released" ||
      linkedReport.versions.length > 0);

  if (evidence.type === "invoice") {
    if (role !== "finance" && role !== "leadership" && !state.meta.allowRuleBreaking) {
      return err({
        code: "EVID_INVOICE_ROLE",
        message: "Only Finance or Leadership can remove invoices.",
      });
    }
    return ok(true);
  }

  if (!submitted) {
    if (!isUploader && role !== "programme_manager" && role !== "leadership") {
      return err({
        code: "EVID_DELETE_ROLE",
        message: "Only the uploader can remove unsubmitted evidence.",
      });
    }
    return ok(true);
  }

  if (
    role !== "leadership" &&
    role !== "programme_manager" &&
    !state.meta.allowRuleBreaking
  ) {
    return err({
      code: "EVID_SOFT_DELETE_ROLE",
      message: "After submit, only Leadership or PM can soft-delete with a reason.",
    });
  }
  return ok(true);
}
