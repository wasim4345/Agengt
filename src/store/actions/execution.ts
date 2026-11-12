import type {
  ActivityReport,
  AppState,
  Evidence,
  EvidenceType,
  Expense,
  ID,
  ReportContent,
} from "@/types/domain";
import { err, ok, type Result } from "@/types/result";
import {
  canReleaseReport,
  canStartFinalReport,
  validateSubmitReport,
} from "@/lib/rules/report";
import { validateExpenseEntry } from "@/lib/rules/expense";
import { computeDelayImpact } from "@/lib/rules/dependencies";
import {
  canReportOnProgramme,
  canSoftDeleteEvidence,
} from "@/lib/rules/lifecycle";
import { FILE_SIZE_CAP_BYTES } from "@/store/files";

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function emptyDraft(): ReportContent {
  return {
    activityStatus: "in_progress",
    conducted: "yes",
    percentComplete: 0,
    description: "",
    whatConducted: "",
    keyOutcomes: "",
    observations: "",
    additionalRemarks: "",
    clientSummary: "",
    expenseIncurred: null,
  };
}

export function applyStartReport(
  draft: AppState,
  input: {
    programmeId: ID;
    activityId: ID;
    type: "interim" | "final";
  },
): Result<{ reportId: ID }> {
  const activity = draft.activities[input.activityId];
  if (!activity || activity.programmeId !== input.programmeId) {
    return err({ code: "ACT_MISSING", message: "Activity not found" });
  }
  const reportOk = canReportOnProgramme(draft, input.programmeId);
  if (!reportOk.ok && !draft.meta.allowRuleBreaking) return reportOk;
  if (input.type === "final") {
    const check = canStartFinalReport(draft, input.activityId);
    if (!check.ok) return check;
  }

  // Reuse open draft/returned thread of same type
  const existing = Object.values(draft.reports).find(
    (r) =>
      r.activityId === input.activityId &&
      r.type === input.type &&
      (r.status === "draft" || r.status === "returned"),
  );
  if (existing) return ok({ reportId: existing.id });

  const id = nid("rpt");
  const report: ActivityReport = {
    id,
    programmeId: input.programmeId,
    activityId: input.activityId,
    type: input.type,
    status: "draft",
    draft: {
      ...emptyDraft(),
      activityStatus: activity.status === "completed" ? "in_progress" : activity.status,
      percentComplete: activity.percentComplete,
    },
    versions: [],
    createdBy: draft.meta.currentUserId,
    createdAt: `${draft.meta.demoDate}T12:00:00.000Z`,
  };
  draft.reports[id] = report;
  return ok({ reportId: id });
}

export function applySaveDraft(
  draft: AppState,
  reportId: ID,
  content: ReportContent,
): Result<true> {
  const report = draft.reports[reportId];
  if (!report) {
    return err({ code: "RPT_MISSING", message: "Report not found" });
  }
  if (report.status !== "draft" && report.status !== "returned") {
    return err({
      code: "RPT_LOCKED",
      message: "Only draft/returned reports can be edited.",
    });
  }
  report.draft = content;
  if (report.status === "returned") report.status = "draft";
  return ok(true);
}

export function applySubmitReport(
  draft: AppState,
  reportId: ID,
): Result<true> {
  const report = draft.reports[reportId];
  if (!report) {
    return err({ code: "RPT_MISSING", message: "Report not found" });
  }
  if (report.status !== "draft" && report.status !== "returned") {
    return err({
      code: "RPT_STATUS",
      message: "Only draft/returned reports can be submitted.",
    });
  }

  if (!draft.meta.allowRuleBreaking) {
    const validation = validateSubmitReport(draft, reportId);
    if (!validation.ok) return err(validation.errors);
  }

  const linkedExpenses = Object.values(draft.expenses)
    .filter(
      (e) =>
        e.reportId === reportId ||
        (e.activityId === report.activityId &&
          e.status === "draft" &&
          (!e.reportId || e.reportId === reportId)),
    )
    .map((e) => e.id);

  for (const expenseId of linkedExpenses) {
    const expense = draft.expenses[expenseId]!;
    expense.reportId = reportId;
    if (expense.status === "draft") {
      expense.status = "submitted";
      expense.submittedBy = draft.meta.currentUserId;
      expense.submittedAt = `${draft.meta.demoDate}T12:00:00.000Z`;
    }
  }

  const linkedEvidence = Object.values(draft.evidence)
    .filter(
      (e) =>
        e.activityId === report.activityId &&
        (!e.reportId || e.reportId === reportId) &&
        !e.deleted,
    )
    .map((e) => e.id);
  for (const evidenceId of linkedEvidence) {
    draft.evidence[evidenceId]!.reportId = reportId;
  }

  const versionNo = (report.versions[report.versions.length - 1]?.no ?? 0) + 1;
  report.versions.push({
    no: versionNo,
    content: JSON.parse(JSON.stringify(report.draft)) as ReportContent,
    expenseIds: linkedExpenses,
    evidenceIds: linkedEvidence,
    submittedBy: draft.meta.currentUserId,
    submittedAt: `${draft.meta.demoDate}T12:00:00.000Z`,
  });
  report.status = "submitted";
  report.returnComment = undefined;

  // Apply status / percent / dates to activity
  const activity = draft.activities[report.activityId]!;
  const content = report.draft;
  activity.status = content.activityStatus;
  activity.percentComplete = content.percentComplete;
  if (content.activityStatus === "completed") {
    activity.percentComplete = 100;
    activity.actualEnd = draft.meta.demoDate;
  }
  if (content.activityStatus === "cancelled") {
    activity.cancellationReason = content.cancellationReason;
  }
  if (content.delay?.revisedEnd) {
    activity.revisedEnd = content.delay.revisedEnd;
    // Auto-propose downstream impacts (never auto-apply)
    for (const [id, impact] of Object.entries(draft.delayImpacts)) {
      if (
        impact.sourceActivityId === activity.id &&
        impact.status === "proposed"
      ) {
        delete draft.delayImpacts[id];
      }
    }
    const proposals = computeDelayImpact(
      draft,
      activity.id,
      content.delay.revisedEnd,
    );
    for (const p of proposals) {
      const id = nid("imp");
      draft.delayImpacts[id] = { ...p, id, status: "proposed" };
    }
  }

  // Notify leadership for release
  const ntf = nid("ntf");
  draft.notifications[ntf] = {
    id: ntf,
    roleOrUserId: "leadership",
    text: `Report submitted for ${activity.code} — ready to release`,
    at: `${draft.meta.demoDate}T12:00:00.000Z`,
    read: false,
    link: `/programmes/activity/?programmeId=${report.programmeId}&activityId=${report.activityId}`,
  };

  return ok(true);
}

export function applyReviseReport(
  draft: AppState,
  reportId: ID,
): Result<true> {
  const report = draft.reports[reportId];
  if (!report) {
    return err({ code: "RPT_MISSING", message: "Report not found" });
  }
  if (report.status !== "submitted" && report.status !== "released" && report.status !== "returned") {
    return err({
      code: "RPT_REVISE",
      message: "Only submitted/returned/released reports can be revised.",
    });
  }
  const latest = report.versions[report.versions.length - 1];
  if (latest) {
    report.draft = JSON.parse(JSON.stringify(latest.content)) as ReportContent;
  }
  report.status = "draft";
  report.release = undefined;
  return ok(true);
}

export function applyReleaseReport(
  draft: AppState,
  reportId: ID,
  opts?: { clientVisible?: boolean; marcomVisible?: boolean },
): Result<true> {
  const check = canReleaseReport(draft, reportId, draft.meta.currentUserId);
  if (!check.ok && !draft.meta.allowRuleBreaking) return check;
  if (draft.meta.currentRole !== "leadership" && !draft.meta.allowRuleBreaking) {
    return err({
      code: "RPT_RELEASE_ROLE",
      message: "Only Leadership can release reports to client.",
    });
  }

  const report = draft.reports[reportId]!;
  const versionNo = report.versions[report.versions.length - 1]?.no ?? 1;
  report.status = "released";
  report.release = {
    clientVisible: opts?.clientVisible ?? true,
    marcomVisible: opts?.marcomVisible ?? true,
    by: draft.meta.currentUserId,
    at: `${draft.meta.demoDate}T12:00:00.000Z`,
    versionNo,
  };

  // Approve linked photos for client when releasing
  for (const version of report.versions) {
    if (version.no !== versionNo) continue;
    for (const evidenceId of version.evidenceIds) {
      const ev = draft.evidence[evidenceId];
      if (ev && ev.type === "photograph") {
        ev.clientApproved = true;
        ev.marcomApproved = true;
      }
    }
  }

  return ok(true);
}

export function applyReturnReport(
  draft: AppState,
  reportId: ID,
  comment: string,
): Result<true> {
  const report = draft.reports[reportId];
  if (!report) {
    return err({ code: "RPT_MISSING", message: "Report not found" });
  }
  if (report.status !== "submitted") {
    return err({
      code: "RPT_RETURN_STATUS",
      message: "Only submitted reports can be returned.",
    });
  }
  if (!comment.trim()) {
    return err({
      code: "RPT_RETURN_COMMENT",
      message: "Add a return comment for the submitter.",
      field: "returnComment",
    });
  }
  if (draft.meta.currentRole !== "leadership" && !draft.meta.allowRuleBreaking) {
    return err({
      code: "RPT_RETURN_ROLE",
      message: "Only Leadership can return reports.",
    });
  }
  report.status = "returned";
  report.returnComment = comment.trim();
  return ok(true);
}

export function applyAddExpense(
  draft: AppState,
  input: {
    programmeId: ID;
    activityId: ID;
    reportId?: ID;
    categoryId: ID;
    description: string;
    date: string;
    amount: number;
    justification?: string;
    submit?: boolean;
  },
): Result<{ expenseId: ID }> {
  const validation = validateExpenseEntry(draft, {
    activityId: input.activityId,
    date: input.date,
    amount: input.amount,
    categoryId: input.categoryId,
    description: input.description,
    reportId: input.reportId,
    justification: input.justification,
  });
  if (!validation.ok && !draft.meta.allowRuleBreaking) {
    return err(validation.errors);
  }

  const id = nid("exp");
  const overspend =
    validation.warnings.some((w) => w.code === "EXP_OVERSPEND") ||
    validation.errors.some((e) => e.code === "EXP_OVERSPEND_JUSTIFY");

  const expense: Expense = {
    id,
    programmeId: input.programmeId,
    activityId: input.activityId,
    reportId: input.reportId,
    categoryId: input.categoryId,
    description: input.description,
    date: input.date,
    amount: input.amount,
    status: input.submit ? "submitted" : "draft",
    submittedBy: input.submit ? draft.meta.currentUserId : undefined,
    submittedAt: input.submit
      ? `${draft.meta.demoDate}T12:00:00.000Z`
      : undefined,
    overspendFlag: overspend || undefined,
  };
  draft.expenses[id] = expense;
  return ok({ expenseId: id });
}

export function applyUpdateExpense(
  draft: AppState,
  expenseId: ID,
  patch: Partial<Expense> & { justification?: string },
): Result<true> {
  const expense = draft.expenses[expenseId];
  if (!expense) {
    return err({ code: "EXP_MISSING", message: "Expense not found" });
  }
  if (expense.status !== "draft") {
    return err({
      code: "EXP_LOCKED",
      message: "Only draft expenses can be edited.",
    });
  }
  const next = { ...expense, ...patch };
  const validation = validateExpenseEntry(draft, {
    activityId: next.activityId,
    date: next.date,
    amount: next.amount,
    categoryId: next.categoryId,
    description: next.description,
    reportId: next.reportId,
    excludeId: expenseId,
    justification: patch.justification,
  });
  if (!validation.ok && !draft.meta.allowRuleBreaking) {
    return err(validation.errors);
  }
  Object.assign(expense, patch);
  return ok(true);
}

export function applyDeleteExpense(
  draft: AppState,
  expenseId: ID,
): Result<true> {
  const expense = draft.expenses[expenseId];
  if (!expense) {
    return err({ code: "EXP_MISSING", message: "Expense not found" });
  }
  if (expense.status !== "draft") {
    return err({
      code: "EXP_DELETE",
      message: "Only draft expenses can be deleted.",
    });
  }
  delete draft.expenses[expenseId];
  return ok(true);
}

export function applyResubmitExpense(
  draft: AppState,
  expenseId: ID,
): Result<{ expenseId: ID }> {
  const source = draft.expenses[expenseId];
  if (!source) {
    return err({ code: "EXP_MISSING", message: "Expense not found" });
  }
  if (source.status !== "rejected") {
    return err({
      code: "EXP_RESUBMIT",
      message: "Only rejected expenses can be resubmitted.",
    });
  }
  const id = nid("exp");
  draft.expenses[id] = {
    ...(JSON.parse(JSON.stringify(source)) as Expense),
    id,
    status: "draft",
    decision: undefined,
    submittedAt: undefined,
    submittedBy: undefined,
    verifiedAmount: undefined,
    resubmissionOf: expenseId,
  };
  return ok({ expenseId: id });
}

export function applyAddEvidenceMeta(
  draft: AppState,
  input: {
    programmeId: ID;
    activityId: ID;
    reportId?: ID;
    type: EvidenceType;
    fileName: string;
    mime: string;
    size: number;
    blobKey?: string;
    thumb?: string;
    caption?: string;
  },
): Result<{ evidenceId: ID }> {
  if (input.size > FILE_SIZE_CAP_BYTES) {
    return err({
      code: "EVID_SIZE",
      message: `File exceeds ${FILE_SIZE_CAP_BYTES / (1024 * 1024)} MB prototype cap.`,
      field: "size",
    });
  }
  const id = nid("ev");
  const evidence: Evidence = {
    id,
    programmeId: input.programmeId,
    activityId: input.activityId,
    reportId: input.reportId,
    type: input.type,
    fileName: input.fileName,
    mime: input.mime,
    size: input.size,
    blobKey: input.blobKey,
    thumb: input.thumb,
    caption: input.caption,
    uploadedBy: draft.meta.currentUserId,
    uploadedAt: `${draft.meta.demoDate}T12:00:00.000Z`,
    clientApproved: false,
    marcomApproved: false,
  };
  draft.evidence[id] = evidence;
  return ok({ evidenceId: id });
}

export function applyApproveEvidence(
  draft: AppState,
  evidenceId: ID,
  audience: "client" | "marcom",
  approved: boolean,
): Result<true> {
  const evidence = draft.evidence[evidenceId];
  if (!evidence || evidence.deleted) {
    return err({ code: "EVID_MISSING", message: "Evidence not found" });
  }
  if (audience === "client") evidence.clientApproved = approved;
  else evidence.marcomApproved = approved;
  return ok(true);
}

export function applySoftDeleteEvidence(
  draft: AppState,
  evidenceId: ID,
  reason: string,
): Result<true> {
  const check = canSoftDeleteEvidence(draft, evidenceId);
  if (!check.ok && !draft.meta.allowRuleBreaking) return check;
  const evidence = draft.evidence[evidenceId];
  if (!evidence) {
    return err({ code: "EVID_MISSING", message: "Evidence not found" });
  }
  const linkedReport = evidence.reportId
    ? draft.reports[evidence.reportId]
    : undefined;
  const afterSubmit =
    linkedReport &&
    (linkedReport.status === "submitted" ||
      linkedReport.status === "released" ||
      linkedReport.versions.length > 0);
  if (afterSubmit && !reason.trim()) {
    return err({
      code: "EVID_DELETE_REASON",
      message: "Reason is required to soft-delete evidence after submit.",
      field: "reason",
    });
  }
  evidence.deleted = {
    by: draft.meta.currentUserId,
    at: `${draft.meta.demoDate}T12:00:00.000Z`,
    reason: reason.trim() || "Removed",
  };
  return ok(true);
}
