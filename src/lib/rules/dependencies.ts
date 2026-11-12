import type {
  Activity,
  AppState,
  DelayImpact,
  Dependency,
  DepType,
  ID,
  ISODate,
  Milestone,
} from "@/types/domain";
import { err, ok, type Result } from "@/types/result";
import { addCalendarDays, dayDiff, maxDate, toISO, parseDate } from "./dates";
import { addDays } from "date-fns";

export function effectiveEnd(activity: Activity): ISODate {
  return activity.revisedEnd ?? activity.plannedEnd;
}

export function effectiveStart(activity: Activity): ISODate {
  return activity.plannedStart;
}

/** Milestone effective date per doc 04 §3.1 / §3.6. */
export function milestoneEffectiveDate(
  state: AppState,
  milestone: Milestone,
): ISODate {
  if (milestone.rule === "manual" && milestone.manualAchievedAt) {
    return milestone.manualAchievedAt.slice(0, 10);
  }
  const gating = state.activityMilestones.filter(
    (am) => am.milestoneId === milestone.id && am.gating,
  );
  if (gating.length === 0) return milestone.targetDate;
  const ends = gating.map((g) => {
    const activity = state.activities[g.activityId];
    return activity ? effectiveEnd(activity) : milestone.targetDate;
  });
  return maxDate(...ends, milestone.targetDate);
}

/**
 * Required constraint on successor given predecessor dates.
 * Returns required start and/or end for the successor.
 */
export function constraintForDependency(
  type: DepType,
  lagDays: number,
  predStart: ISODate,
  predEnd: ISODate,
): { requiredStart?: ISODate; requiredEnd?: ISODate } {
  switch (type) {
    case "FS":
      // S.start ≥ P.end + 1 + lag
      return { requiredStart: addCalendarDays(predEnd, 1 + lagDays) };
    case "SS":
      return { requiredStart: addCalendarDays(predStart, lagDays) };
    case "FF":
      return { requiredEnd: addCalendarDays(predEnd, lagDays) };
    case "SF":
      return { requiredEnd: addCalendarDays(predStart, lagDays) };
    default:
      return {};
  }
}

export type GraphNode = { kind: "activity" | "milestone"; id: ID };

function nodeKey(node: GraphNode): string {
  return `${node.kind}:${node.id}`;
}

/** Build predecessor→successor adjacency for cycle detection. */
export function buildDependencyGraph(state: AppState, programmeId: ID) {
  const adj = new Map<string, string[]>();
  const ensure = (key: string) => {
    if (!adj.has(key)) adj.set(key, []);
  };

  for (const activity of Object.values(state.activities)) {
    if (activity.programmeId === programmeId) {
      ensure(nodeKey({ kind: "activity", id: activity.id }));
    }
  }
  for (const milestone of Object.values(state.milestones)) {
    if (milestone.programmeId === programmeId) {
      ensure(nodeKey({ kind: "milestone", id: milestone.id }));
    }
  }

  for (const dep of Object.values(state.dependencies)) {
    if (dep.programmeId !== programmeId) continue;
    const to = nodeKey({ kind: "activity", id: dep.successorId });
    ensure(to);
    if (dep.predecessorId) {
      const from = nodeKey({ kind: "activity", id: dep.predecessorId });
      ensure(from);
      adj.get(from)!.push(to);
    }
    if (dep.predecessorMilestoneId) {
      const from = nodeKey({
        kind: "milestone",
        id: dep.predecessorMilestoneId,
      });
      ensure(from);
      adj.get(from)!.push(to);
    }
  }

  // gating activity → milestone edges
  for (const link of state.activityMilestones) {
    const milestone = state.milestones[link.milestoneId];
    if (!milestone || milestone.programmeId !== programmeId || !link.gating) {
      continue;
    }
    const from = nodeKey({ kind: "activity", id: link.activityId });
    const to = nodeKey({ kind: "milestone", id: link.milestoneId });
    ensure(from);
    ensure(to);
    adj.get(from)!.push(to);
  }

  return adj;
}

export type CycleCheck = {
  hasCycle: boolean;
  path?: string;
};

export function detectCycle(
  state: AppState,
  programmeId: ID,
): CycleCheck {
  const adj = buildDependencyGraph(state, programmeId);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  let foundPath: string[] | undefined;

  function dfs(node: string) {
    if (foundPath) return;
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      foundPath = [...stack.slice(idx), node];
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of adj.get(node) ?? []) dfs(next);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const key of adj.keys()) dfs(key);
  if (!foundPath) return { hasCycle: false };
  const labels = foundPath.map((k) => k.replace(/^(activity|milestone):/, ""));
  return { hasCycle: true, path: labels.join(" → ") };
}

/**
 * Would adding edge predecessor→successor create a cycle?
 * DFS from successor; if predecessor reachable ⇒ cycle.
 */
export function wouldCreateCycle(
  state: AppState,
  programmeId: ID,
  predecessorKey: string,
  successorKey: string,
): CycleCheck {
  if (predecessorKey === successorKey) {
    return { hasCycle: true, path: `${predecessorKey} → ${successorKey}` };
  }
  const adj = buildDependencyGraph(state, programmeId);
  // temporarily add edge
  if (!adj.has(predecessorKey)) adj.set(predecessorKey, []);
  adj.get(predecessorKey)!.push(successorKey);

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  let foundPath: string[] | undefined;

  function dfs(node: string) {
    if (foundPath) return;
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      foundPath = [...stack.slice(idx), node];
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of adj.get(node) ?? []) dfs(next);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  dfs(successorKey);
  if (!foundPath) {
    for (const key of adj.keys()) dfs(key);
  }

  if (!foundPath) return { hasCycle: false };
  const labels = foundPath.map((k) => k.replace(/^(activity|milestone):/, ""));
  return { hasCycle: true, path: labels.join(" → ") };
}

export function validateAddDependency(
  state: AppState,
  input: {
    programmeId: ID;
    successorId: ID;
    predecessorId?: ID;
    predecessorMilestoneId?: ID;
  },
): Result<true> {
  const { programmeId, successorId, predecessorId, predecessorMilestoneId } =
    input;

  if (!!predecessorId === !!predecessorMilestoneId) {
    return err({
      code: "DEP_PRED",
      message: "Set exactly one of predecessor activity or milestone.",
      field: "predecessorId",
    });
  }

  const successor = state.activities[successorId];
  if (!successor || successor.programmeId !== programmeId) {
    return err({
      code: "DEP_CROSS",
      message: "Successor must belong to the programme.",
      field: "successorId",
    });
  }

  if (predecessorId) {
    if (predecessorId === successorId) {
      return err({
        code: "DEP_SELF",
        message: "An activity cannot depend on itself.",
        field: "predecessorId",
      });
    }
    const pred = state.activities[predecessorId];
    if (!pred || pred.programmeId !== programmeId) {
      return err({
        code: "DEP_CROSS",
        message: "Predecessor must belong to the same programme.",
        field: "predecessorId",
      });
    }
    const cycle = wouldCreateCycle(
      state,
      programmeId,
      `activity:${predecessorId}`,
      `activity:${successorId}`,
    );
    if (cycle.hasCycle) {
      return err({
        code: "DEP_CYCLE",
        message: `Dependency would create a cycle: ${cycle.path}`,
        field: "predecessorId",
      });
    }
  }

  if (predecessorMilestoneId) {
    const milestone = state.milestones[predecessorMilestoneId];
    if (!milestone || milestone.programmeId !== programmeId) {
      return err({
        code: "DEP_CROSS",
        message: "Milestone predecessor must belong to the same programme.",
        field: "predecessorMilestoneId",
      });
    }
    const cycle = wouldCreateCycle(
      state,
      programmeId,
      `milestone:${predecessorMilestoneId}`,
      `activity:${successorId}`,
    );
    if (cycle.hasCycle) {
      return err({
        code: "DEP_CYCLE",
        message: `Dependency would create a cycle: ${cycle.path}`,
        field: "predecessorMilestoneId",
      });
    }
  }

  return ok(true);
}

export type ScheduleViolation = {
  activityId: ID;
  dependencyId: ID;
  requiredStart?: ISODate;
  requiredEnd?: ISODate;
  actualStart: ISODate;
  actualEnd: ISODate;
  message: string;
};

function predecessorDates(
  state: AppState,
  dep: Dependency,
): { start: ISODate; end: ISODate } | null {
  if (dep.predecessorId) {
    const pred = state.activities[dep.predecessorId];
    if (!pred) return null;
    return { start: effectiveStart(pred), end: effectiveEnd(pred) };
  }
  if (dep.predecessorMilestoneId) {
    const milestone = state.milestones[dep.predecessorMilestoneId];
    if (!milestone) return null;
    const effective = milestoneEffectiveDate(state, milestone);
    // Milestone treated as FS on effective date → pred end = effective, start = effective
    return { start: effective, end: effective };
  }
  return null;
}

export function validateSchedule(
  state: AppState,
  programmeId: ID,
): ScheduleViolation[] {
  const violations: ScheduleViolation[] = [];
  for (const dep of Object.values(state.dependencies)) {
    if (dep.programmeId !== programmeId) continue;
    const successor = state.activities[dep.successorId];
    const predDates = predecessorDates(state, dep);
    if (!successor || !predDates) continue;

    const required = constraintForDependency(
      dep.type,
      dep.lagDays,
      predDates.start,
      predDates.end,
    );
    const actualStart = effectiveStart(successor);
    const actualEnd = effectiveEnd(successor);
    let bad = false;
    if (
      required.requiredStart &&
      dayDiff(required.requiredStart, actualStart) < 0
    ) {
      bad = true;
    }
    if (required.requiredEnd && dayDiff(required.requiredEnd, actualEnd) < 0) {
      bad = true;
    }
    if (bad) {
      violations.push({
        activityId: successor.id,
        dependencyId: dep.id,
        requiredStart: required.requiredStart,
        requiredEnd: required.requiredEnd,
        actualStart,
        actualEnd,
        message: `${successor.code} violates ${dep.type} dependency`,
      });
    }
  }
  return violations;
}

export type ImpactProposal = Omit<DelayImpact, "id" | "status"> & {
  status: "proposed";
};

/**
 * Downstream impact from delaying an activity to newEnd (doc 04 §3.4).
 * Never auto-applies.
 */
export function computeDelayImpact(
  state: AppState,
  activityId: ID,
  newEnd: ISODate,
): ImpactProposal[] {
  const source = state.activities[activityId];
  if (!source) return [];
  const programme = state.programmes[source.programmeId];
  if (!programme) return [];

  type QueueItem = { id: ID; end: ISODate; start: ISODate };
  const duration = dayDiff(source.plannedStart, effectiveEnd(source));
  const newStart = toISO(
    addDays(parseDate(newEnd), -Math.max(duration, 0)),
  );

  const queue: QueueItem[] = [
    { id: activityId, end: newEnd, start: newStart },
  ];
  const visited = new Set<ID>();
  const results: ImpactProposal[] = [];
  const projected = new Map<ID, { start: ISODate; end: ISODate }>();
  projected.set(activityId, { start: newStart, end: newEnd });

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    for (const dep of Object.values(state.dependencies)) {
      if (dep.programmeId !== source.programmeId) continue;
      const isPred =
        dep.predecessorId === current.id ||
        // via milestone: if current gates a milestone that is predecessor
        (dep.predecessorMilestoneId
          ? state.activityMilestones.some(
              (am) =>
                am.milestoneId === dep.predecessorMilestoneId &&
                am.gating &&
                am.activityId === current.id,
            )
          : false);
      if (!isPred) continue;

      const successor = state.activities[dep.successorId];
      if (!successor) continue;

      const predProj = projected.get(current.id)!;
      let predStart = predProj.start;
      let predEnd = predProj.end;
      if (dep.predecessorMilestoneId) {
        const milestone = state.milestones[dep.predecessorMilestoneId]!;
        // recompute milestone effective using projected ends for gating acts
        const gating = state.activityMilestones.filter(
          (am) => am.milestoneId === milestone.id && am.gating,
        );
        const ends = gating.map((g) => {
          if (projected.has(g.activityId)) return projected.get(g.activityId)!.end;
          const act = state.activities[g.activityId];
          return act ? effectiveEnd(act) : milestone.targetDate;
        });
        const mDate = maxDate(...ends);
        predStart = mDate;
        predEnd = mDate;
      }

      const required = constraintForDependency(
        dep.type,
        dep.lagDays,
        predStart,
        predEnd,
      );
      const sStart = projected.get(successor.id)?.start ?? effectiveStart(successor);
      const sEnd = projected.get(successor.id)?.end ?? effectiveEnd(successor);
      const sDuration = dayDiff(sStart, sEnd);

      let shift = 0;
      if (required.requiredStart && dayDiff(required.requiredStart, sStart) < 0) {
        shift = Math.max(shift, dayDiff(sStart, required.requiredStart));
      }
      if (required.requiredEnd) {
        const projectedEndIfShiftStart = addCalendarDays(sStart, shift + sDuration);
        if (dayDiff(required.requiredEnd, projectedEndIfShiftStart) < 0) {
          // need end at least requiredEnd → shift so end moves
          const neededEndShift = dayDiff(sEnd, required.requiredEnd);
          shift = Math.max(shift, neededEndShift);
        }
      }

      if (shift <= 0) continue;

      const projectedStart = addCalendarDays(sStart, shift);
      const projectedEnd = addCalendarDays(sEnd, shift);
      projected.set(successor.id, { start: projectedStart, end: projectedEnd });

      results.push({
        programmeId: source.programmeId,
        sourceActivityId: activityId,
        affectedActivityId: successor.id,
        originalStart: effectiveStart(successor),
        originalEnd: effectiveEnd(successor),
        projectedStart,
        projectedEnd,
        shiftDays: shift,
        exceedsProgrammeEnd: dayDiff(programme.endDate, projectedEnd) < 0,
        status: "proposed",
      });
      queue.push({
        id: successor.id,
        start: projectedStart,
        end: projectedEnd,
      });
    }
  }

  return results;
}

/** Hard FS predecessor must be completed before successor can start/complete. */
export function canStartOrComplete(
  state: AppState,
  activityId: ID,
  nextStatus: "in_progress" | "completed",
): Result<true> {
  const activity = state.activities[activityId];
  if (!activity) {
    return err({ code: "ACT_MISSING", message: "Activity not found" });
  }

  for (const dep of Object.values(state.dependencies)) {
    if (dep.successorId !== activityId || !dep.predecessorId) continue;
    const pred = state.activities[dep.predecessorId];
    if (!pred) continue;

    if (dep.type === "FS" && pred.status !== "completed") {
      return err({
        code: "ACT_PRED_FS",
        message: `Blocked until ${pred.code} (${pred.name}) is completed.`,
        field: "status",
      });
    }
    if (
      dep.type === "SS" &&
      nextStatus === "in_progress" &&
      pred.status === "not_started"
    ) {
      return err({
        code: "ACT_PRED_SS",
        message: `Blocked until ${pred.code} (${pred.name}) has started.`,
        field: "status",
      });
    }
  }
  return ok(true);
}

export type MilestoneHealth =
  | "achieved"
  | "missed"
  | "at_risk"
  | "on_track";

export function milestoneHealth(
  state: AppState,
  milestoneId: ID,
): MilestoneHealth {
  const milestone = state.milestones[milestoneId];
  if (!milestone) return "on_track";
  const demoDate = state.meta.demoDate;
  const gating = state.activityMilestones.filter(
    (am) => am.milestoneId === milestoneId && am.gating,
  );

  if (milestone.rule === "manual" && milestone.manualAchievedAt) {
    return "achieved";
  }
  if (
    milestone.rule === "all_gating_complete" &&
    gating.length > 0 &&
    gating.every((g) => state.activities[g.activityId]?.status === "completed")
  ) {
    return "achieved";
  }

  if (dayDiff(milestone.targetDate, demoDate) < 0) return "missed";

  const forecast = milestoneEffectiveDate(state, milestone);
  const daysAway = dayDiff(demoDate, milestone.targetDate);
  const avgProgress =
    gating.length === 0
      ? 100
      : gating.reduce(
          (sum, g) =>
            sum + (state.activities[g.activityId]?.percentComplete ?? 0),
          0,
        ) / gating.length;

  if (
    dayDiff(milestone.targetDate, forecast) < 0 ||
    (daysAway <= 7 && avgProgress < 50)
  ) {
    return "at_risk";
  }
  return "on_track";
}
