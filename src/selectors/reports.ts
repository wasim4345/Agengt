import type { AppState, ID, ISODate } from "@/types/domain";
import {
  delayedActivities,
  programmeProgress,
} from "./core";
import { activityFinancials, programmeFinancials } from "./finance";
import * as client from "./client";
import * as leadership from "./leadership";
import { milestoneHealth } from "@/lib/rules/dependencies";
import { dayDiff } from "@/lib/rules/dates";
import { closureChecks } from "@/lib/rules/closure";

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
  description: string;
  clientSafe?: boolean;
}[] = [
  {
    id: "programme_progress",
    title: "Programme Progress",
    description: "Status and progress across programmes",
  },
  {
    id: "activity_completion",
    title: "Activity Completion",
    description: "Activity-level completion and status",
  },
  {
    id: "financial_utilisation",
    title: "Financial Utilisation",
    description: "Approved / reported / verified / pending",
  },
  {
    id: "milestone_achievement",
    title: "Milestone Achievement",
    description: "Milestone health and target dates",
  },
  {
    id: "client_programme",
    title: "Client Programme Report",
    description: "Client-safe overview, milestones, and released reports",
    clientSafe: true,
  },
  {
    id: "leadership_summary",
    title: "Leadership Summary",
    description: "Portfolio KPIs and programme financials",
  },
  {
    id: "programme_closure",
    title: "Programme Closure",
    description: "Closure readiness and final financials",
  },
];

export type ReportParams = {
  programmeId?: ID;
  dateFrom?: ISODate;
  dateTo?: ISODate;
  /** Section toggles for preview (all true by default). */
  sections?: {
    overview?: boolean;
    tables?: boolean;
    charts?: boolean;
  };
};

function stamp(state: AppState) {
  return {
    dataAsOf: state.meta.demoDate,
    generatedBy: state.users[state.meta.currentUserId]?.name ?? "Unknown",
    role: state.meta.currentRole,
  };
}

function programmeOverlaps(
  state: AppState,
  programmeId: ID,
  params?: ReportParams,
): boolean {
  if (!params?.dateFrom && !params?.dateTo) return true;
  const p = state.programmes[programmeId];
  if (!p) return false;
  if (params.dateFrom && dayDiff(p.endDate, params.dateFrom) > 0) return false;
  if (params.dateTo && dayDiff(params.dateTo, p.startDate) > 0) return false;
  return true;
}

function filteredProgrammeIds(state: AppState, params?: ReportParams): ID[] {
  return Object.values(state.programmes)
    .filter((p) => {
      if (params?.programmeId && p.id !== params.programmeId) return false;
      return programmeOverlaps(state, p.id, params);
    })
    .map((p) => p.id);
}

export type BuiltReport = {
  id: ReportId;
  title: string;
  dataAsOf: string;
  generatedBy: string;
  role: string;
  error?: string;
  /** Numeric totals used for CSV ↔ dashboard equality checks. */
  totals?: Record<string, number>;
  columns?: string[];
  rows?: Record<string, string | number | null>[];
  sections?: Record<string, unknown>;
};

export function buildReport(
  state: AppState,
  reportId: ReportId,
  programmeIdOrParams?: ID | ReportParams,
): BuiltReport {
  const params: ReportParams =
    typeof programmeIdOrParams === "string"
      ? { programmeId: programmeIdOrParams }
      : (programmeIdOrParams ?? {});
  const meta = stamp(state);
  const programmeIds = filteredProgrammeIds(state, params);

  switch (reportId) {
    case "programme_progress": {
      const rows = programmeIds.map((id) => {
        const p = state.programmes[id]!;
        return {
          code: p.code,
          name: p.name,
          status: p.status,
          progress: Math.round(programmeProgress(state, id) * 10) / 10,
          delayed: delayedActivities(state, id).length,
        };
      });
      return {
        id: reportId,
        ...meta,
        title: "Programme Progress",
        columns: ["code", "name", "status", "progress", "delayed"],
        rows,
        totals: {
          programmes: rows.length,
          delayed: rows.reduce((s, r) => s + Number(r.delayed), 0),
        },
      };
    }
    case "activity_completion": {
      const acts = Object.values(state.activities).filter((a) =>
        programmeIds.includes(a.programmeId),
      );
      const rows = acts.map((a) => ({
        code: a.code,
        name: a.name,
        programme: state.programmes[a.programmeId]?.code ?? "",
        status: a.status,
        percentComplete: a.percentComplete,
      }));
      return {
        id: reportId,
        ...meta,
        title: "Activity Completion",
        columns: ["code", "name", "programme", "status", "percentComplete"],
        rows,
        totals: {
          activities: rows.length,
          completed: rows.filter((r) => r.status === "completed").length,
        },
      };
    }
    case "financial_utilisation": {
      const rows = programmeIds.map((id) => {
        const p = state.programmes[id]!;
        const fin = programmeFinancials(state, id);
        return {
          code: p.code,
          approved: fin.budget,
          reported: fin.reported,
          verified: fin.verified,
          pending: fin.pending,
          unallocated: fin.unallocated,
        };
      });
      const totals = rows.reduce(
        (acc, r) => {
          acc.approved += Number(r.approved);
          acc.reported += Number(r.reported);
          acc.verified += Number(r.verified);
          acc.pending += Number(r.pending);
          return acc;
        },
        { approved: 0, reported: 0, verified: 0, pending: 0 },
      );
      return {
        id: reportId,
        ...meta,
        title: "Financial Utilisation",
        columns: [
          "code",
          "approved",
          "reported",
          "verified",
          "pending",
          "unallocated",
        ],
        rows,
        totals,
      };
    }
    case "milestone_achievement": {
      const milestones = Object.values(state.milestones).filter((m) =>
        programmeIds.includes(m.programmeId),
      );
      const rows = milestones.map((m) => ({
        name: m.name,
        programme: state.programmes[m.programmeId]?.code ?? "",
        targetDate: m.targetDate,
        health: milestoneHealth(state, m.id),
      }));
      return {
        id: reportId,
        ...meta,
        title: "Milestone Achievement",
        columns: ["name", "programme", "targetDate", "health"],
        rows,
        totals: {
          milestones: rows.length,
          achieved: rows.filter((r) => r.health === "achieved").length,
        },
      };
    }
    case "client_programme": {
      const clientId =
        state.users[state.meta.currentUserId]?.clientId ??
        Object.values(state.clients)[0]?.id;
      const overview = client
        .overview(state, clientId)
        .filter((p) => !params.programmeId || p.id === params.programmeId);
      const milestones = client
        .milestones(state, clientId)
        .filter((m) => !params.programmeId || m.programmeId === params.programmeId);
      const reports = client
        .releasedReports(state, clientId)
        .filter((r) => !params.programmeId || r.programmeId === params.programmeId);
      const outputs = client
        .keyOutputs(state, clientId)
        .filter((o) => reports.some((r) => r.id === o.reportId));
      return {
        id: reportId,
        ...meta,
        title: "Client Programme Report",
        columns: ["programme", "progress", "status"],
        rows: overview.map((p) => ({
          programme: p.code,
          name: p.name,
          progress: Math.round(p.progress),
          status: p.status,
        })),
        totals: {
          programmes: overview.length,
          releasedReports: reports.length,
          milestones: milestones.length,
        },
        sections: { overview, milestones, reports, outputs },
      };
    }
    case "leadership_summary": {
      const kpis = leadership.kpis(state, {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      });
      const ids =
        params.programmeId != null
          ? programmeIds
          : params.dateFrom || params.dateTo
            ? programmeIds
            : Object.keys(state.programmes);

      const rows = ids.map((id) => {
        const p = state.programmes[id]!;
        const fin = programmeFinancials(state, id);
        return {
          code: p.code,
          name: p.name,
          status: p.status,
          progress: Math.round(programmeProgress(state, id) * 10) / 10,
          approved: fin.budget,
          reported: fin.reported,
          verified: fin.verified,
          pending: fin.pending,
        };
      });

      const useScoped = Boolean(
        params.programmeId || params.dateFrom || params.dateTo,
      );
      const totals = useScoped
        ? {
            programmes: rows.length,
            active: rows.filter((r) => r.status === "active").length,
            completed: rows.filter((r) => r.status === "completed").length,
            totalBudget: rows.reduce((s, r) => s + Number(r.approved), 0),
            verifiedExpenditure: rows.reduce(
              (s, r) => s + Number(r.verified),
              0,
            ),
            reportedExpenditure: rows.reduce(
              (s, r) => s + Number(r.reported),
              0,
            ),
            remaining: rows.reduce(
              (s, r) => s + (Number(r.approved) - Number(r.reported)),
              0,
            ),
            delayed: ids.reduce(
              (s, id) => s + delayedActivities(state, id).length,
              0,
            ),
            overallProgress:
              rows.length === 0
                ? 0
                : Math.round(
                    (rows.reduce((s, r) => s + Number(r.progress), 0) /
                      rows.length) *
                      10,
                  ) / 10,
          }
        : {
            programmes: kpis.totalProgrammes,
            active: kpis.active,
            completed: kpis.completed,
            totalBudget: kpis.totalBudget,
            verifiedExpenditure: kpis.verifiedExpenditure,
            reportedExpenditure: kpis.reportedExpenditure,
            remaining: kpis.remaining,
            delayed: kpis.delayedActivities,
            overallProgress: Math.round(kpis.overallProgress * 10) / 10,
          };

      return {
        id: reportId,
        ...meta,
        title: "Leadership Summary",
        columns: [
          "code",
          "name",
          "status",
          "progress",
          "approved",
          "reported",
          "verified",
          "pending",
        ],
        rows,
        totals,
      };
    }
    case "programme_closure": {
      const programmeId = params.programmeId;
      if (!programmeId) {
        return {
          id: reportId,
          ...meta,
          title: "Programme Closure",
          error: "programmeId required",
        };
      }
      const p = state.programmes[programmeId];
      const fin = programmeFinancials(state, programmeId);
      const checks = closureChecks(state, programmeId);
      const acts = Object.values(state.activities).filter(
        (a) => a.programmeId === programmeId,
      );
      const rows = acts.map((a) => {
        const af = activityFinancials(state, a.id);
        return {
          code: a.code,
          name: a.name,
          status: a.status,
          revised: af.revised,
          reported: af.reported,
          verified: af.verified,
        };
      });
      return {
        id: reportId,
        ...meta,
        title: "Programme Closure",
        columns: ["code", "name", "status", "revised", "reported", "verified"],
        rows,
        totals: {
          approved: fin.budget,
          reported: fin.reported,
          verified: fin.verified,
          pending: fin.pending,
          closureSurplus: fin.closureSurplus,
          ready: checks.ready ? 1 : 0,
        },
        sections: {
          programme: p
            ? { code: p.code, name: p.name, status: p.status }
            : null,
          financials: fin,
          closure: checks,
        },
      };
    }
    default:
      return {
        id: reportId,
        ...meta,
        title: "Unknown",
        error: "Unknown report",
      };
  }
}

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Flatten a built report to CSV (totals row first, then detail). */
export function reportToCsv(report: BuiltReport): string {
  const lines: string[] = [];
  lines.push(`Report,${csvEscape(report.title)}`);
  lines.push(`Data as of,${csvEscape(report.dataAsOf)}`);
  lines.push(`Generated by,${csvEscape(report.generatedBy)}`);
  lines.push(`Role,${csvEscape(report.role)}`);
  if (report.error) {
    lines.push(`Error,${csvEscape(report.error)}`);
    return lines.join("\n");
  }
  if (report.totals) {
    lines.push("");
    lines.push("Totals");
    lines.push(
      Object.keys(report.totals).map(csvEscape).join(","),
    );
    lines.push(
      Object.values(report.totals)
        .map((v) => csvEscape(v))
        .join(","),
    );
  }
  if (report.columns && report.rows) {
    lines.push("");
    lines.push("Detail");
    lines.push(report.columns.map(csvEscape).join(","));
    for (const row of report.rows) {
      lines.push(
        report.columns.map((c) => csvEscape(row[c])).join(","),
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

/** Parse totals block from CSV for tests. */
export function parseCsvTotals(csv: string): Record<string, number> {
  const lines = csv.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.trim() === "Totals");
  if (idx < 0 || !lines[idx + 1] || !lines[idx + 2]) return {};
  const keys = lines[idx + 1]!.split(",");
  const vals = lines[idx + 2]!.split(",");
  const out: Record<string, number> = {};
  keys.forEach((k, i) => {
    out[k] = Number(vals[i]);
  });
  return out;
}

export function catalogueForRole(role: string) {
  if (role === "client") {
    return REPORT_CATALOGUE.filter((r) => r.clientSafe);
  }
  return REPORT_CATALOGUE;
}
