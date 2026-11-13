import type { AppState, ID } from "@/types/domain";
import { programmeProgress, upcomingActivities } from "./core";
import { programmeFinancials } from "./finance";
import { milestoneHealth } from "@/lib/rules/dependencies";

const FORBIDDEN_KEYS = [
  "observations",
  "additionalRemarks",
  "amount",
  "expenses",
] as const;

function assertNoLeak(obj: unknown, path = "root"): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => assertNoLeak(item, `${path}[${i}]`));
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    if ((FORBIDDEN_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Client selector leak at ${path}.${key}`);
    }
    assertNoLeak(value, `${path}.${key}`);
  }
}

function clientProgrammeIds(state: AppState, clientId?: ID): Set<ID> {
  const id =
    clientId ??
    state.users[state.meta.currentUserId]?.clientId;
  return new Set(
    Object.values(state.programmes)
      .filter((p) => p.clientId === id)
      .map((p) => p.id),
  );
}

export function overview(state: AppState, clientId?: ID) {
  const ids = clientProgrammeIds(state, clientId);
  const rows = Object.values(state.programmes)
    .filter((p) => ids.has(p.id))
    .map((p) => {
      const base = {
        id: p.id,
        code: p.code,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        objectives: p.objectives,
        expectedOutcomes: p.expectedOutcomes,
        keyDeliverables: p.keyDeliverables,
        status: p.status,
        progress: programmeProgress(state, p.id),
      };
      if (p.clientBudgetSummaryVisible) {
        const fin = programmeFinancials(state, p.id);
        return {
          ...base,
          budgetSummary: {
            totalBudget: fin.budget,
            reportedUtilisation:
              fin.budget === 0 ? null : fin.reported / fin.budget,
          },
        };
      }
      return base;
    });
  assertNoLeak(rows);
  return rows;
}

export function milestones(state: AppState, clientId?: ID) {
  const ids = clientProgrammeIds(state, clientId);
  const rows = Object.values(state.milestones)
    .filter((m) => m.clientVisible && ids.has(m.programmeId))
    .map((m) => ({
      id: m.id,
      programmeId: m.programmeId,
      name: m.name,
      description: m.description,
      targetDate: m.targetDate,
      health: milestoneHealth(state, m.id),
    }));
  assertNoLeak(rows);
  return rows;
}

export function releasedReports(state: AppState, clientId?: ID) {
  const ids = clientProgrammeIds(state, clientId);
  const rows = Object.values(state.reports)
    .filter(
      (r) =>
        ids.has(r.programmeId) &&
        r.status === "released" &&
        r.release?.clientVisible,
    )
    .map((r) => {
      const version =
        r.versions.find((v) => v.no === r.release?.versionNo) ??
        r.versions[r.versions.length - 1];
      const content = version?.content ?? r.draft;
      return {
        id: r.id,
        programmeId: r.programmeId,
        activityId: r.activityId,
        type: r.type,
        clientSummary: content.clientSummary,
        keyOutcomes: content.keyOutcomes,
        whatConducted: content.whatConducted,
        participants: content.participants,
        startups: content.startups,
        activityStatus: content.activityStatus,
        percentComplete: content.percentComplete,
        releasedAt: r.release?.at,
      };
    });
  assertNoLeak(rows);
  return rows;
}

export function photos(state: AppState, clientId?: ID) {
  const ids = clientProgrammeIds(state, clientId);
  const rows = Object.values(state.evidence)
    .filter(
      (e) =>
        ids.has(e.programmeId) &&
        e.type === "photograph" &&
        e.clientApproved &&
        !e.deleted,
    )
    .map((e) => ({
      id: e.id,
      programmeId: e.programmeId,
      activityId: e.activityId,
      fileName: e.fileName,
      thumb: e.thumb,
      caption: e.caption,
    }));
  assertNoLeak(rows);
  return rows;
}

export function keyOutputs(state: AppState, clientId?: ID) {
  const rows = releasedReports(state, clientId).map((r) => ({
    reportId: r.id,
    keyOutcomes: r.keyOutcomes,
    participants: r.participants,
    startups: r.startups,
  }));
  assertNoLeak(rows);
  return rows;
}

export function completedActivities(state: AppState, clientId?: ID) {
  const ids = clientProgrammeIds(state, clientId);
  return Object.values(state.activities)
    .filter((a) => ids.has(a.programmeId) && a.status === "completed")
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      plannedEnd: a.plannedEnd,
      percentComplete: 100,
    }));
}

export function upcoming(state: AppState, clientId?: ID) {
  const ids = clientProgrammeIds(state, clientId);
  return upcomingActivities(state).filter((a) => ids.has(a.programmeId));
}

/** Lint-style export for tests — keys that must never appear. */
export const CLIENT_FORBIDDEN_KEYS = FORBIDDEN_KEYS;
