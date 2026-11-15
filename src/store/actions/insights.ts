import type {
  AppState,
  ID,
  Insight,
  InsightSeverity,
  InsightState,
} from "@/types/domain";
import { ok, type Result } from "@/types/result";

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function applyRecordInsightRun(
  draft: AppState,
  input: {
    scope: "programme" | "institution";
    programmeId?: ID;
    items: Insight[];
  },
): Result<{ runId: ID }> {
  const id = nid("irun");
  draft.insightRuns.unshift({
    id,
    scope: input.scope,
    programmeId: input.programmeId,
    at: `${draft.meta.demoDate}T12:00:00.000Z`,
    items: input.items.map((i) => ({ key: i.key, severity: i.severity })),
  });
  // Keep last 40 runs
  if (draft.insightRuns.length > 40) {
    draft.insightRuns = draft.insightRuns.slice(0, 40);
  }
  return ok({ runId: id });
}

export function applySetInsightState(
  draft: AppState,
  input: {
    key: string;
    status: InsightState["status"];
    severity?: InsightSeverity;
  },
): Result<InsightState> {
  const state: InsightState = {
    key: input.key,
    status: input.status,
    by: draft.meta.currentUserId,
    at: `${draft.meta.demoDate}T12:00:00.000Z`,
    severityAtDismissal:
      input.status === "dismissed" ? input.severity : undefined,
  };
  draft.insightStates[input.key] = state;
  return ok(state);
}
