import type { AppState, ID, ISODate } from "@/types/domain";
import { err, ok, type Result } from "@/types/result";
import {
  computeDelayImpact,
  effectiveEnd,
  effectiveStart,
  validateSchedule,
  type ImpactProposal,
} from "@/lib/rules/dependencies";
import { addCalendarDays, dayDiff } from "@/lib/rules/dates";

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function clearProposalsForSource(draft: AppState, sourceActivityId: ID) {
  for (const [id, impact] of Object.entries(draft.delayImpacts)) {
    if (
      impact.sourceActivityId === sourceActivityId &&
      impact.status === "proposed"
    ) {
      delete draft.delayImpacts[id];
    }
  }
}

function writeProposals(draft: AppState, proposals: ImpactProposal[]) {
  for (const p of proposals) {
    const id = nid("imp");
    draft.delayImpacts[id] = { ...p, id, status: "proposed" };
  }
}

/**
 * Reschedule an activity on the Gantt (works for draft and active programmes).
 * Writes proposed DelayImpacts for downstream successors; never auto-applies.
 */
export function applyRescheduleActivity(
  draft: AppState,
  activityId: ID,
  plannedStart: ISODate,
  plannedEnd: ISODate,
): Result<{
  impacts: ImpactProposal[];
  scheduleViolations: number;
}> {
  const activity = draft.activities[activityId];
  if (!activity) {
    return err({ code: "ACT_MISSING", message: "Activity not found" });
  }
  const programme = draft.programmes[activity.programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  if (programme.status === "closed" || programme.status === "cancelled") {
    return err({
      code: "PRG_LOCKED",
      message: "Cannot reschedule on a closed/cancelled programme.",
    });
  }
  if (dayDiff(plannedStart, plannedEnd) < 0) {
    return err({
      code: "DATE_ORDER",
      message: "End must be on or after start.",
      field: "plannedEnd",
    });
  }
  // Case 1: beyond programme end → block with extension message
  if (dayDiff(plannedEnd, programme.endDate) < 0) {
    return err({
      code: "ACT_BEYOND_PRG",
      message:
        "Activity ends after the programme end. Request an extension or shorten the activity.",
      field: "plannedEnd",
    });
  }

  activity.plannedStart = plannedStart;
  activity.plannedEnd = plannedEnd;
  // Clear revisedEnd if new plan moves past it — keep for delay reports otherwise
  if (activity.revisedEnd && dayDiff(plannedEnd, activity.revisedEnd) <= 0) {
    activity.revisedEnd = undefined;
  }

  clearProposalsForSource(draft, activityId);
  const impacts = computeDelayImpact(draft, activityId, plannedEnd);
  writeProposals(draft, impacts);

  const scheduleViolations = validateSchedule(
    draft,
    activity.programmeId,
  ).filter((v) => v.activityId !== activityId).length;

  return ok({ impacts, scheduleViolations });
}

export function applyNudgeActivity(
  draft: AppState,
  activityId: ID,
  days: number,
): Result<{
  impacts: ImpactProposal[];
  scheduleViolations: number;
}> {
  const activity = draft.activities[activityId];
  if (!activity) {
    return err({ code: "ACT_MISSING", message: "Activity not found" });
  }
  return applyRescheduleActivity(
    draft,
    activityId,
    addCalendarDays(effectiveStart(activity), days),
    addCalendarDays(effectiveEnd(activity), days),
  );
}

export function applyImpactProposals(
  draft: AppState,
  sourceActivityId: ID,
  mode: "all" | ID[] = "all",
): Result<number> {
  const ids =
    mode === "all"
      ? Object.keys(draft.delayImpacts).filter(
          (id) =>
            draft.delayImpacts[id]?.sourceActivityId === sourceActivityId &&
            draft.delayImpacts[id]?.status === "proposed",
        )
      : mode;

  let applied = 0;
  for (const id of ids) {
    const impact = draft.delayImpacts[id];
    if (!impact || impact.status !== "proposed") continue;
    const activity = draft.activities[impact.affectedActivityId];
    if (!activity) continue;
    activity.plannedStart = impact.projectedStart;
    activity.plannedEnd = impact.projectedEnd;
    impact.status = "applied";
    applied += 1;
  }
  return ok(applied);
}

export function dismissImpactProposals(
  draft: AppState,
  sourceActivityId: ID,
  mode: "all" | ID[] = "all",
): Result<number> {
  const ids =
    mode === "all"
      ? Object.keys(draft.delayImpacts).filter(
          (id) =>
            draft.delayImpacts[id]?.sourceActivityId === sourceActivityId &&
            draft.delayImpacts[id]?.status === "proposed",
        )
      : mode;

  let count = 0;
  for (const id of ids) {
    const impact = draft.delayImpacts[id];
    if (!impact || impact.status !== "proposed") continue;
    impact.status = "dismissed";
    count += 1;
  }
  return ok(count);
}

export function collectUpstreamDownstream(
  state: AppState,
  activityId: ID,
): { upstream: Set<ID>; downstream: Set<ID> } {
  const activity = state.activities[activityId];
  const upstream = new Set<ID>();
  const downstream = new Set<ID>();
  if (!activity) return { upstream, downstream };

  const programmeId = activity.programmeId;

  // Upstream: walk predecessors
  const upQueue = [activityId];
  const upSeen = new Set<ID>([activityId]);
  while (upQueue.length) {
    const cur = upQueue.shift()!;
    for (const dep of Object.values(state.dependencies)) {
      if (dep.programmeId !== programmeId || dep.successorId !== cur) continue;
      if (dep.predecessorId && !upSeen.has(dep.predecessorId)) {
        upSeen.add(dep.predecessorId);
        upstream.add(dep.predecessorId);
        upQueue.push(dep.predecessorId);
      }
    }
  }

  // Downstream: walk successors
  const downQueue = [activityId];
  const downSeen = new Set<ID>([activityId]);
  while (downQueue.length) {
    const cur = downQueue.shift()!;
    for (const dep of Object.values(state.dependencies)) {
      if (dep.programmeId !== programmeId) continue;
      const isPred =
        dep.predecessorId === cur ||
        (dep.predecessorMilestoneId
          ? state.activityMilestones.some(
              (am) =>
                am.milestoneId === dep.predecessorMilestoneId &&
                am.gating &&
                am.activityId === cur,
            )
          : false);
      if (!isPred) continue;
      if (!downSeen.has(dep.successorId)) {
        downSeen.add(dep.successorId);
        downstream.add(dep.successorId);
        downQueue.push(dep.successorId);
      }
    }
  }

  return { upstream, downstream };
}
