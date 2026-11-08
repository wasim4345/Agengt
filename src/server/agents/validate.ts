import { LIMITS } from "@/lib/limits";
import type { AgentRole, Profile } from "@/lib/types";
import { EMPTY_PROFILE } from "@/lib/sample-profile";

const ROLES: AgentRole[] = [
  "positioning",
  "ideator",
  "strategist",
  "draft",
  "x-adapt",
];

export function parseGenerateRequest(body: unknown): {
  role: AgentRole;
  profile: Profile;
  payload: Record<string, unknown>;
} {
  if (!body || typeof body !== "object") {
    throw new Error("The request was empty.");
  }
  const record = body as Record<string, unknown>;
  if (!ROLES.includes(record.role as AgentRole)) {
    throw new Error("That step is not recognised.");
  }
  const profile = parseProfile(record.profile);
  const payload =
    record.payload && typeof record.payload === "object"
      ? clipRecord(record.payload as Record<string, unknown>)
      : {};
  return {
    role: record.role as AgentRole,
    profile,
    payload,
  };
}

function parseProfile(value: unknown): Profile {
  const base = { ...EMPTY_PROFILE };
  if (!value || typeof value !== "object") return base;
  const record = value as Record<string, unknown>;
  (Object.keys(base) as Array<keyof Profile>).forEach((key) => {
    if (typeof record[key] === "string") {
      const max = key === "writingSamples" || key === "pastedSourceMaterial"
        ? LIMITS.long
        : key === "restrictions"
          ? LIMITS.medium
          : LIMITS.medium;
      base[key] = record[key].slice(0, max);
    }
  });
  return base;
}

function clipRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") {
      out[key] = value.slice(0, LIMITS.draft);
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, LIMITS.ideas);
    } else if (value && typeof value === "object") {
      out[key] = clipRecord(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function assertBodySize(raw: string) {
  if (raw.length > LIMITS.bodyBytes) {
    throw new Error("That request was too large. Shorten the notes and try again.");
  }
}
