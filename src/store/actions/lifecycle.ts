import type { AppState, Approval, ID, ISODate } from "@/types/domain";
import { err, ok, type Result } from "@/types/result";
import {
  canReplaceManager,
  canRequestCancellation,
  canRequestClosureResult,
  canRequestExtension,
  canRequestHold,
  canRequestResume,
} from "@/lib/rules/lifecycle";
import { closureChecks } from "@/lib/rules/closure";

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function now(draft: AppState): string {
  return `${draft.meta.demoDate}T12:00:00.000Z`;
}

function notify(draft: AppState, roleOrUserId: string, text: string, link?: string) {
  const id = nid("ntf");
  draft.notifications[id] = {
    id,
    roleOrUserId,
    text,
    at: now(draft),
    read: false,
    link,
  };
}

function createApproval(
  draft: AppState,
  input: {
    programmeId: ID;
    type: Approval["type"];
    reason: string;
    payload?: unknown;
  },
): ID {
  const id = nid("apr");
  draft.approvals[id] = {
    id,
    programmeId: input.programmeId,
    type: input.type,
    status: "pending",
    requestedBy: draft.meta.currentUserId,
    requestedAt: now(draft),
    reason: input.reason,
    payload: input.payload,
  };
  notify(
    draft,
    "leadership",
    `${input.type} request for ${draft.programmes[input.programmeId]?.code ?? input.programmeId}`,
    "/approvals/",
  );
  return id;
}

export function applyRequestHold(
  draft: AppState,
  programmeId: ID,
  reason: string,
): Result<{ approvalId: ID }> {
  const check = canRequestHold(draft, programmeId);
  if (!check.ok && !draft.meta.allowRuleBreaking) return check;
  if (!reason.trim()) {
    return err({
      code: "LIF_HOLD_REASON",
      message: "Hold reason is required.",
      field: "reason",
    });
  }
  const approvalId = createApproval(draft, {
    programmeId,
    type: "hold",
    reason: reason.trim(),
  });
  return ok({ approvalId });
}

export function applyRequestResume(
  draft: AppState,
  programmeId: ID,
  reason: string,
): Result<{ approvalId: ID }> {
  const check = canRequestResume(draft, programmeId);
  if (!check.ok && !draft.meta.allowRuleBreaking) return check;
  const approvalId = createApproval(draft, {
    programmeId,
    type: "resume",
    reason: reason.trim() || "Resume programme",
  });
  return ok({ approvalId });
}

export function applyRequestExtension(
  draft: AppState,
  programmeId: ID,
  newEndDate: ISODate,
  reason: string,
): Result<{ approvalId: ID }> {
  const check = canRequestExtension(draft, programmeId, newEndDate);
  if (!check.ok && !draft.meta.allowRuleBreaking) return check;
  if (!reason.trim()) {
    return err({
      code: "LIF_EXT_REASON",
      message: "Extension reason is required.",
      field: "reason",
    });
  }
  const approvalId = createApproval(draft, {
    programmeId,
    type: "extension",
    reason: reason.trim(),
    payload: { newEndDate, previousEndDate: draft.programmes[programmeId]?.endDate },
  });
  return ok({ approvalId });
}

export function applyRequestCancellation(
  draft: AppState,
  programmeId: ID,
  reason: string,
): Result<{ approvalId: ID }> {
  const validation = canRequestCancellation(draft, programmeId, reason);
  if (!validation.ok && !draft.meta.allowRuleBreaking) {
    return err(validation.errors);
  }
  const approvalId = createApproval(draft, {
    programmeId,
    type: "cancellation",
    reason: reason.trim(),
  });
  // Leadership may approve immediately in the same turn
  if (draft.meta.currentRole === "leadership") {
    return applyDecideLifecycle(draft, approvalId, {
      approved: true,
      remarks: reason.trim(),
    });
  }
  return ok({ approvalId });
}

export function applyRequestClosure(
  draft: AppState,
  programmeId: ID,
  reason?: string,
): Result<{ approvalId: ID }> {
  const check = canRequestClosureResult(draft, programmeId);
  if (!check.ok && !draft.meta.allowRuleBreaking) return check;
  const programme = draft.programmes[programmeId]!;
  if (programme.status === "active") {
    programme.status = "completed";
  }
  const approvalId = createApproval(draft, {
    programmeId,
    type: "closure",
    reason: reason?.trim() || "Request programme closure",
  });
  return ok({ approvalId });
}

export function applyReplaceManager(
  draft: AppState,
  programmeId: ID,
  newManagerId: ID,
): Result<true> {
  const check = canReplaceManager(draft, programmeId, newManagerId);
  if (!check.ok && !draft.meta.allowRuleBreaking) return check;
  const programme = draft.programmes[programmeId]!;
  const previous = programme.managerId;
  programme.managerId = newManagerId;
  if (!programme.teamIds.includes(newManagerId)) {
    programme.teamIds = [...programme.teamIds, newManagerId];
  }
  notify(
    draft,
    newManagerId,
    `You are now manager of ${programme.code}`,
    `/programmes/view/?id=${programmeId}`,
  );
  notify(
    draft,
    previous,
    `Manager role for ${programme.code} transferred`,
  );
  void previous;
  return ok(true);
}

export function applyMarkProgrammeCompletedIfReady(
  draft: AppState,
  programmeId: ID,
): Result<{ completed: boolean }> {
  const programme = draft.programmes[programmeId];
  if (!programme || programme.status !== "active") {
    return ok({ completed: false });
  }
  const acts = Object.values(draft.activities).filter(
    (a) => a.programmeId === programmeId,
  );
  if (acts.length === 0) return ok({ completed: false });
  const allTerminal = acts.every((a) =>
    ["completed", "cancelled", "partially_completed"].includes(a.status),
  );
  // Auto-offer: mark completed only when every activity is completed/cancelled
  // (partially_completed alone does not auto-complete — must be resolved for closure)
  const resolved = acts.every((a) =>
    ["completed", "cancelled"].includes(a.status),
  );
  if (resolved && allTerminal) {
    programme.status = "completed";
    return ok({ completed: true });
  }
  return ok({ completed: false });
}

export function applyDecideLifecycle(
  draft: AppState,
  approvalId: ID,
  input: { approved: boolean; remarks?: string },
): Result<{ approvalId: ID }> {
  const approval = draft.approvals[approvalId];

  if (!approval) {
    return err({ code: "APR_MISSING", message: "Approval not found" });
  }
  if (
    !["hold", "resume", "extension", "cancellation", "closure"].includes(
      approval.type,
    )
  ) {
    return err({
      code: "APR_TYPE",
      message: "Not a lifecycle approval.",
    });
  }
  if (approval.status !== "pending") {
    return err({ code: "APR_DECIDED", message: "Already decided" });
  }
  if (draft.meta.currentRole !== "leadership" && !draft.meta.allowRuleBreaking) {
    return err({
      code: "APR_ROLE",
      message: "Only Leadership can decide lifecycle approvals.",
    });
  }
  if (!input.approved && !input.remarks?.trim()) {
    return err({
      code: "APR_REMARKS",
      message: "Remarks are required when rejecting.",
      field: "remarks",
    });
  }

  const programme = draft.programmes[approval.programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }

  approval.status = input.approved ? "approved" : "rejected";
  approval.decision = {
    by: draft.meta.currentUserId,
    at: now(draft),
    approved: input.approved,
    remarks: input.remarks,
  };

  if (!input.approved) {
    return ok({ approvalId });
  }

  switch (approval.type) {
    case "hold":
      programme.status = "on_hold";
      programme.statusReason = approval.reason;
      break;
    case "resume":
      programme.status = "active";
      programme.statusReason = undefined;
      break;
    case "extension": {
      const newEnd = approval.payload?.newEndDate as string | undefined;
      if (!newEnd) {
        return err({
          code: "LIF_EXT_PAYLOAD",
          message: "Extension payload missing newEndDate.",
        });
      }
      if (!programme.baselineEndDate) {
        programme.baselineEndDate = programme.endDate;
      }
      programme.endDate = newEnd;
      break;
    }
    case "cancellation": {
      const validation = canRequestCancellation(
        draft,
        programme.id,
        approval.reason,
      );
      if (!validation.ok && !draft.meta.allowRuleBreaking) {
        approval.status = "pending";
        approval.decision = undefined;
        return err(validation.errors);
      }
      programme.status = "cancelled";
      programme.statusReason = approval.reason;
      // Release unspent allocation: zero revised for non-cancelled activities with no spend
      for (const activity of Object.values(draft.activities)) {
        if (activity.programmeId !== programme.id) continue;
        if (activity.status !== "cancelled" && activity.status !== "completed") {
          activity.status = "cancelled";
          activity.cancellationReason = approval.reason;
        }
        const budget = draft.activityBudgets[activity.id];
        if (budget) {
          // Keep revised at reported floor (unspent released)
          const spent = Object.values(draft.expenses)
            .filter(
              (e) =>
                e.activityId === activity.id &&
                (e.status === "verified" || e.status === "submitted"),
            )
            .reduce(
              (s, e) =>
                s +
                (e.status === "verified"
                  ? (e.verifiedAmount ?? e.amount)
                  : e.amount),
              0,
            );
          budget.revised = Math.min(budget.revised, Math.max(spent, 0));
        }
      }
      break;
    }
    case "closure": {
      const checks = closureChecks(draft, programme.id);
      if (!checks.ready && !draft.meta.allowRuleBreaking) {
        approval.status = "pending";
        approval.decision = undefined;
        return err({
          code: "LIF_CLOSE_PENDING",
          message: `Closure blocked: ${checks.issues.join("; ")}`,
        });
      }
      programme.status = "closed";
      break;
    }
    default:
      break;
  }

  return ok({ approvalId });
}
