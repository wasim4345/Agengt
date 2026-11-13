import type { AppState, ID, Kpi } from "@/types/domain";
import { formatINR } from "@/lib/format/inr";

export type KpiAchievement = {
  kpi: Kpi;
  achieved: number;
  fromReleased: number;
  fromSubmittedUnreleased: number;
};

function reportValues(
  state: AppState,
  programmeId: ID,
  modes: ("released" | "submitted")[],
): Map<ID, number> {
  const sums = new Map<ID, number>();
  for (const report of Object.values(state.reports)) {
    if (report.programmeId !== programmeId) continue;
    const includeReleased =
      modes.includes("released") && report.status === "released";
    const includeSubmitted =
      modes.includes("submitted") &&
      (report.status === "submitted" || report.status === "released");
    if (!includeReleased && !includeSubmitted) continue;
    // Prefer latest version content; fall back to draft for submitted without version push edge
    const content =
      report.versions.length > 0
        ? report.versions[report.versions.length - 1]!.content
        : report.draft;
    for (const row of content.kpiValues ?? []) {
      sums.set(row.kpiId, (sums.get(row.kpiId) ?? 0) + row.value);
    }
  }
  return sums;
}

/** Σ KPI values from released reports only (Client). */
export function achievedReleased(
  state: AppState,
  programmeId: ID,
): KpiAchievement[] {
  const released = reportValues(state, programmeId, ["released"]);
  return programmeKpis(state, programmeId).map((kpi) => ({
    kpi,
    achieved: released.get(kpi.id) ?? 0,
    fromReleased: released.get(kpi.id) ?? 0,
    fromSubmittedUnreleased: 0,
  }));
}

/**
 * Leadership: submitted + released. Label unreleased separately.
 * Spec: kpi.achieved(programmeId) = Σ released-or-submitted.
 */
export function achieved(
  state: AppState,
  programmeId: ID,
): KpiAchievement[] {
  const all = reportValues(state, programmeId, ["submitted"]);
  const released = reportValues(state, programmeId, ["released"]);
  return programmeKpis(state, programmeId).map((kpi) => {
    const total = all.get(kpi.id) ?? 0;
    const fromReleased = released.get(kpi.id) ?? 0;
    return {
      kpi,
      achieved: total,
      fromReleased,
      fromSubmittedUnreleased: Math.max(0, total - fromReleased),
    };
  });
}

export function programmeKpis(state: AppState, programmeId: ID): Kpi[] {
  return Object.values(state.kpis)
    .filter((k) => k.programmeId === programmeId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** Portfolio impact strip — aggregate matching KPI names across programmes. */
export function portfolioImpact(state: AppState): {
  name: string;
  target: number;
  achieved: number;
  unit: "count" | "inr";
  programmeCount: number;
}[] {
  const names = [
    "Startups selected",
    "Mentors engaged",
    "Investors engaged",
    "Grants disbursed",
    "Startups funded",
    "Fund disbursed",
  ];
  return names
    .map((name) => {
      const matching = Object.values(state.kpis).filter((k) => k.name === name);
      if (matching.length === 0) return null;
      let target = 0;
      let achievedSum = 0;
      const unit = matching[0]!.unit;
      for (const kpi of matching) {
        target += kpi.target;
        const row = achieved(state, kpi.programmeId).find(
          (a) => a.kpi.id === kpi.id,
        );
        achievedSum += row?.achieved ?? 0;
      }
      return {
        name,
        target,
        achieved: achievedSum,
        unit,
        programmeCount: matching.length,
      };
    })
    .filter(Boolean) as {
    name: string;
    target: number;
    achieved: number;
    unit: "count" | "inr";
    programmeCount: number;
  }[];
}

export function formatKpiValue(unit: "count" | "inr", value: number): string {
  return unit === "inr" ? formatINR(value) : String(Math.round(value));
}
