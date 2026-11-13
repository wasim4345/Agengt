import type { AppState, ID } from "@/types/domain";
import { upcomingActivities } from "./core";

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
      throw new Error(`MarCom selector leak at ${path}.${key}`);
    }
    assertNoLeak(value, `${path}.${key}`);
  }
}

const VISIBLE_STARTUP = new Set([
  "selected",
  "onboarded",
  "graduated",
]);

export function upcoming(state: AppState) {
  const rows = upcomingActivities(state)
    .filter(
      (a) =>
        a.categoryId === "acat_events" ||
        a.categoryId === "acat_market" ||
        a.categoryId === "acat_investor" ||
        a.categoryId === "acat_outreach",
    )
    .map((a) => ({
      id: a.id,
      name: a.name,
      plannedStart: a.plannedStart,
      plannedEnd: a.plannedEnd,
      programmeId: a.programmeId,
      status: a.status,
    }));
  assertNoLeak(rows);
  return rows;
}

export function eventsConducted(state: AppState) {
  const rows = Object.values(state.activities)
    .filter(
      (a) =>
        (a.categoryId === "acat_events" ||
          a.categoryId === "acat_market" ||
          a.categoryId === "acat_investor") &&
        a.status === "completed",
    )
    .map((a) => ({
      id: a.id,
      name: a.name,
      plannedEnd: a.plannedEnd,
      programmeId: a.programmeId,
    }));
  assertNoLeak(rows);
  return rows;
}

export function startups(state: AppState) {
  const rows = state.programmeStartups
    .filter((ps) => VISIBLE_STARTUP.has(ps.status))
    .map((ps) => ({
      programmeId: ps.programmeId,
      startupId: ps.startupId,
      status: ps.status,
      name: state.startups[ps.startupId]?.name,
      sector: state.startups[ps.startupId]?.sector,
      programmeCode: state.programmes[ps.programmeId]?.code,
    }));
  assertNoLeak(rows);
  return rows;
}

export function achievements(state: AppState) {
  const rows = Object.values(state.achievements)
    .filter((a) => a.marcomApproved)
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      date: a.date,
      type: a.type,
      startupId: a.startupId,
      startupName: state.startups[a.startupId]?.name,
      programmeId: a.programmeId,
    }));
  assertNoLeak(rows);
  return rows;
}

export function media(state: AppState) {
  const rows = Object.values(state.evidence)
    .filter(
      (e) =>
        e.marcomApproved &&
        !e.deleted &&
        e.type !== "invoice" &&
        e.type !== "attendance_sheet",
    )
    .map((e) => ({
      id: e.id,
      fileName: e.fileName,
      type: e.type,
      thumb: e.thumb,
      caption: e.caption,
      mime: e.mime,
      programmeId: e.programmeId,
      activityId: e.activityId,
      blobKey: e.blobKey,
    }));
  assertNoLeak(rows);
  return rows;
}

export function milestones(state: AppState, programmeId?: ID) {
  return Object.values(state.milestones)
    .filter((m) => !programmeId || m.programmeId === programmeId)
    .map((m) => ({
      id: m.id,
      name: m.name,
      targetDate: m.targetDate,
      programmeId: m.programmeId,
    }));
}

export const MARCOM_FORBIDDEN_KEYS = FORBIDDEN_KEYS;
