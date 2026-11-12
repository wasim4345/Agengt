import type {
  Achievement,
  AppState,
  ID,
  ProgrammeStartup,
  Startup,
} from "@/types/domain";
import { err, ok, type Result } from "@/types/result";

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function applyUpsertStartup(
  draft: AppState,
  input: {
    id?: ID;
    name: string;
    sector: string;
    city?: string;
    founders?: string;
    website?: string;
  },
): Result<{ startupId: ID }> {
  if (!input.name.trim()) {
    return err({
      code: "ST_NAME",
      message: "Startup name is required.",
      field: "name",
    });
  }
  const id = input.id ?? nid("st");
  const row: Startup = {
    id,
    name: input.name.trim(),
    sector: input.sector.trim() || "General",
    city: input.city,
    founders: input.founders,
    website: input.website,
  };
  draft.startups[id] = row;
  return ok({ startupId: id });
}

export function applySetProgrammeStartup(
  draft: AppState,
  input: {
    programmeId: ID;
    startupId: ID;
    status: ProgrammeStartup["status"];
  },
): Result<true> {
  if (!draft.programmes[input.programmeId]) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  if (!draft.startups[input.startupId]) {
    return err({ code: "ST_MISSING", message: "Startup not found" });
  }
  const idx = draft.programmeStartups.findIndex(
    (r) =>
      r.programmeId === input.programmeId && r.startupId === input.startupId,
  );
  const row: ProgrammeStartup = {
    programmeId: input.programmeId,
    startupId: input.startupId,
    status: input.status,
  };
  if (idx >= 0) draft.programmeStartups[idx] = row;
  else draft.programmeStartups.push(row);
  return ok(true);
}

export function applyUpsertAchievement(
  draft: AppState,
  input: {
    id?: ID;
    startupId: ID;
    programmeId: ID;
    title: string;
    description: string;
    date: string;
    type: Achievement["type"];
    marcomApproved?: boolean;
    clientApproved?: boolean;
  },
): Result<{ achievementId: ID }> {
  if (!input.title.trim()) {
    return err({
      code: "ACH_TITLE",
      message: "Title is required.",
      field: "title",
    });
  }
  if (!draft.startups[input.startupId]) {
    return err({ code: "ST_MISSING", message: "Startup not found" });
  }
  const id = input.id ?? nid("ach");
  const existing = draft.achievements[id];
  draft.achievements[id] = {
    id,
    startupId: input.startupId,
    programmeId: input.programmeId,
    title: input.title.trim(),
    description: input.description.trim(),
    date: input.date,
    type: input.type,
    marcomApproved: input.marcomApproved ?? existing?.marcomApproved ?? false,
    clientApproved: input.clientApproved ?? existing?.clientApproved ?? false,
  };
  return ok({ achievementId: id });
}

export function applySetAchievementApproval(
  draft: AppState,
  achievementId: ID,
  audience: "marcom" | "client",
  approved: boolean,
): Result<true> {
  const ach = draft.achievements[achievementId];
  if (!ach) {
    return err({ code: "ACH_MISSING", message: "Achievement not found" });
  }
  if (audience === "marcom") ach.marcomApproved = approved;
  else ach.clientApproved = approved;
  return ok(true);
}

export function applyDeleteAchievement(
  draft: AppState,
  achievementId: ID,
): Result<true> {
  if (!draft.achievements[achievementId]) {
    return err({ code: "ACH_MISSING", message: "Achievement not found" });
  }
  delete draft.achievements[achievementId];
  return ok(true);
}
