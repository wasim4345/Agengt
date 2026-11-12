import type { AppState, ID } from "@/types/domain";
import {
  delayedActivities,
  programmeProgress,
} from "./core";
import { activityFinancials, programmeFinancials } from "./finance";
import * as client from "./client";
import { milestoneHealth } from "@/lib/rules/dependencies";

export type ReportId =
  | "programme_progress"
  | "activity_completion"
  | "financial_utilisation"
  | "milestone_achievement"
  | "client_programme"
  | "leadership_summary"
  | "programme_closure";

export const REPORT_CATALOGUE: {
  id: ReportId;
  title: string;
  clientSafe?: boolean;
}[] = [
  { id: "programme_progress", title: "Programme Progress" },
  { id: "activity_completion", title: "Activity Completion" },
  { id: "financial_utilisation", title: "Financial Utilisation" },
  { id: "milestone_achievement", title: "Milestone Achievement" },
  { id: "client_programme", title: "Client Programme Report", clientSafe: true },
  { id: "leadership_summary", title: "Leadership Summary" },
  { id: "programme_closure", title: "Programme Closure" },
];

function stamp(state: AppState) {
  return {
    dataAsOf: state.meta.demoDate,
    generatedBy: state.users[state.meta.currentUserId]?.name ?? "Unknown",
    role: state.meta.currentRole,
  };
}

export function buildReport(
  state: AppState,
  reportId: ReportId,
  programmeId?: ID,
) {
  const meta = stamp(state);
  switch (reportId) {
    case "programme_progress": {
      const programmes = Object.values(state.programmes).filter(
        (p) => !programmeId || p.id === programmeId,
      );
      return {
        ...meta,
        title: "Programme Progress",
        rows: programmes.map((p) => ({
          code: p.code,
          name: p.name,
          status: p.status,
          progress: programmeProgress(state, p.id),
          delayed: delayedActivities(state, p.id).length,
        })),
      };
    }
    case "activity_completion": {
      const acts = Object.values(state.activities).filter(
        (a) => !programmeId || a.programmeId === programmeId,
      );
      return {
        ...meta,
        title: "Activity Completion",
        rows: acts.map((a) => ({
          code: a.code,
          name: a.name,
          status: a.status,
          percentComplete: a.percentComplete,
        })),
      };
    }
    case "financial_utilisation": {
      const programmes = Object.values(state.programmes).filter(
        (p) => !programmeId || p.id === programmeId,
      );
      return {
        ...meta,
        title: "Financial Utilisation",
        rows: programmes.map((p) => {
          const fin = programmeFinancials(state, p.id);
          return {
            code: p.code,
            approved: fin.budget,
            reported: fin.reported,
            verified: fin.verified,
            pending: fin.pending,
            unallocated: fin.unallocated,
          };
        }),
      };
    }
    case "milestone_achievement": {
      const milestones = Object.values(state.milestones).filter(
        (m) => !programmeId || m.programmeId === programmeId,
      );
      return {
        ...meta,
        title: "Milestone Achievement",
        rows: milestones.map((m) => ({
          name: m.name,
          targetDate: m.targetDate,
          health: milestoneHealth(state, m.id),
        })),
      };
    }
    case "client_programme":
      return {
        ...meta,
        title: "Client Programme Report",
        overview: client.overview(state),
        milestones: client.milestones(state),
        reports: client.releasedReports(state),
        outputs: client.keyOutputs(state),
      };
    case "leadership_summary": {
      const programmes = Object.values(state.programmes);
      return {
        ...meta,
        title: "Leadership Summary",
        totals: {
          programmes: programmes.length,
          delayed: delayedActivities(state).length,
        },
        programmes: programmes.map((p) => ({
          code: p.code,
          progress: programmeProgress(state, p.id),
          financials: programmeFinancials(state, p.id),
        })),
      };
    }
    case "programme_closure": {
      if (!programmeId) {
        return { ...meta, title: "Programme Closure", error: "programmeId required" };
      }
      const p = state.programmes[programmeId];
      const fin = programmeFinancials(state, programmeId);
      const acts = Object.values(state.activities).filter(
        (a) => a.programmeId === programmeId,
      );
      return {
        ...meta,
        title: "Programme Closure",
        programme: p,
        financials: fin,
        activities: acts.map((a) => ({
          code: a.code,
          status: a.status,
          financials: activityFinancials(state, a.id),
        })),
      };
    }
    default:
      return { ...meta, title: "Unknown", error: "Unknown report" };
  }
}
