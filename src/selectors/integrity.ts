import type { AppState, ID } from "@/types/domain";
import {
  activityFinancials,
  portfolioSurplus,
  programmeAllocated,
  programmeFinancials,
} from "./finance";

export type IntegrityCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export type IntegrityReport = {
  ok: boolean;
  checks: IntegrityCheck[];
};

const INTERNAL_KEYS = [
  "observations",
  "additionalRemarks",
  "amount",
  "expenses",
] as const;

function findCycles(state: AppState): string[] {
  const successors = new Map<ID, ID[]>();
  for (const dep of Object.values(state.dependencies)) {
    if (!dep.predecessorId) continue;
    const list = successors.get(dep.predecessorId) ?? [];
    list.push(dep.successorId);
    successors.set(dep.predecessorId, list);
  }

  const cycles: string[] = [];
  const visiting = new Set<ID>();
  const visited = new Set<ID>();
  const stack: ID[] = [];

  function dfs(node: ID) {
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      cycles.push([...stack.slice(idx), node].join(" → "));
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of successors.get(node) ?? []) dfs(next);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const id of Object.keys(state.activities)) dfs(id);
  return cycles;
}

function orphanChecks(state: AppState): IntegrityCheck[] {
  const checks: IntegrityCheck[] = [];
  const orphans: string[] = [];

  for (const activity of Object.values(state.activities)) {
    if (!state.programmes[activity.programmeId]) {
      orphans.push(`activity ${activity.id} → programme`);
    }
    if (!state.users[activity.ownerId]) {
      orphans.push(`activity ${activity.id} → owner`);
    }
    if (!state.activityBudgets[activity.id]) {
      orphans.push(`activity ${activity.id} missing budget`);
    }
  }

  for (const expense of Object.values(state.expenses)) {
    if (!state.activities[expense.activityId]) {
      orphans.push(`expense ${expense.id} → activity`);
    }
    if (!state.programmes[expense.programmeId]) {
      orphans.push(`expense ${expense.id} → programme`);
    }
    if (!state.expenseCategories[expense.categoryId]) {
      orphans.push(`expense ${expense.id} → category`);
    }
  }

  for (const report of Object.values(state.reports)) {
    if (!state.activities[report.activityId]) {
      orphans.push(`report ${report.id} → activity`);
    }
  }

  for (const evidence of Object.values(state.evidence)) {
    if (!state.activities[evidence.activityId]) {
      orphans.push(`evidence ${evidence.id} → activity`);
    }
  }

  for (const link of state.programmeStartups) {
    if (!state.programmes[link.programmeId] || !state.startups[link.startupId]) {
      orphans.push(
        `programmeStartup ${link.programmeId}/${link.startupId}`,
      );
    }
  }

  for (const dep of Object.values(state.dependencies)) {
    if (!state.activities[dep.successorId]) {
      orphans.push(`dependency ${dep.id} → successor`);
    }
    if (dep.predecessorId && !state.activities[dep.predecessorId]) {
      orphans.push(`dependency ${dep.id} → predecessor`);
    }
  }

  checks.push({
    id: "orphans",
    label: "No orphan references",
    ok: orphans.length === 0,
    detail: orphans.length ? orphans.slice(0, 8).join("; ") : undefined,
  });
  return checks;
}

/** Client-safe projection used to detect internal field leaks. */
export function clientSafeReportProjection(state: AppState) {
  return Object.values(state.reports)
    .filter((r) => r.status === "released" && r.release?.clientVisible)
    .map((r) => {
      const version =
        r.versions.find((v) => v.no === r.release?.versionNo) ??
        r.versions[r.versions.length - 1];
      const content = version?.content ?? r.draft;
      return {
        id: r.id,
        clientSummary: content.clientSummary,
        keyOutcomes: content.keyOutcomes,
        whatConducted: content.whatConducted,
      };
    });
}

export function runIntegrityChecks(state: AppState): IntegrityReport {
  const checks: IntegrityCheck[] = [];

  checks.push(...orphanChecks(state));

  const overAlloc: string[] = [];
  for (const programme of Object.values(state.programmes)) {
    const allocated = programmeAllocated(state, programme.id);
    if (allocated > programme.totalBudget) {
      overAlloc.push(
        `${programme.code}: allocated ${allocated} > budget ${programme.totalBudget}`,
      );
    }
  }
  checks.push({
    id: "allocation",
    label: "Allocation ≤ programme budget",
    ok: overAlloc.length === 0,
    detail: overAlloc[0],
  });

  const cycles = findCycles(state);
  checks.push({
    id: "cycles",
    label: "No dependency cycles",
    ok: cycles.length === 0,
    detail: cycles[0],
  });

  const moneyBreaks: string[] = [];
  for (const activityId of Object.keys(state.activities)) {
    const fin = activityFinancials(state, activityId);
    if (fin.reported !== fin.verified + fin.pending) {
      moneyBreaks.push(
        `${activityId}: Rep ${fin.reported} ≠ Ver ${fin.verified} + Pen ${fin.pending}`,
      );
    }
  }
  checks.push({
    id: "finance-identity",
    label: "Financial identity Rep = Ver + Pen",
    ok: moneyBreaks.length === 0,
    detail: moneyBreaks[0],
  });

  const projections = clientSafeReportProjection(state);
  const leaks: string[] = [];
  for (const row of projections) {
    for (const key of INTERNAL_KEYS) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        leaks.push(`${row.id}.${key}`);
      }
    }
  }
  checks.push({
    id: "visibility",
    label: "Client projections omit internal fields",
    ok: leaks.length === 0,
    detail: leaks[0],
  });

  // Doc 09 §7 — surplus identities
  const programmeSurplusBreaks: string[] = [];
  for (const programme of Object.values(state.programmes)) {
    const fin = programmeFinancials(state, programme.id);
    let activitySurplus = 0;
    for (const activity of Object.values(state.activities)) {
      if (activity.programmeId !== programme.id) continue;
      if (activity.status === "cancelled") continue;
      activitySurplus += activityFinancials(state, activity.id).surplus;
    }
    const expected = activitySurplus + fin.unallocated;
    if (Math.abs(fin.surplus - expected) > 0.01) {
      programmeSurplusBreaks.push(
        `${programme.code}: surplus ${fin.surplus} ≠ Σ activity ${activitySurplus} + unallocated ${fin.unallocated}`,
      );
    }
  }
  checks.push({
    id: "surplus-programme",
    label: "Programme surplus = Σ activity surplus + unallocated",
    ok: programmeSurplusBreaks.length === 0,
    detail: programmeSurplusBreaks[0],
  });

  const allProgrammeIds = Object.keys(state.programmes);
  const portfolio = portfolioSurplus(state, allProgrammeIds);
  let sumProgrammeSurplus = 0;
  for (const id of allProgrammeIds) {
    sumProgrammeSurplus += programmeFinancials(state, id).surplus;
  }
  checks.push({
    id: "surplus-portfolio",
    label: "Portfolio surplus = Σ programme surplus",
    ok: Math.abs(portfolio.surplus - sumProgrammeSurplus) < 0.01,
    detail:
      Math.abs(portfolio.surplus - sumProgrammeSurplus) >= 0.01
        ? `portfolio ${portfolio.surplus} ≠ Σ ${sumProgrammeSurplus}`
        : undefined,
  });

  const photoBreaks: string[] = [];
  for (const evidence of Object.values(state.evidence)) {
    if (evidence.type !== "photograph" || evidence.deleted) continue;
    if (!evidence.blobKey) {
      photoBreaks.push(`${evidence.id}: missing blobKey`);
    }
    if (evidence.reportId && !state.reports[evidence.reportId]) {
      photoBreaks.push(`${evidence.id}: report missing`);
    }
  }
  checks.push({
    id: "event-photos",
    label: "Photograph evidence has blob keys and valid reports",
    ok: photoBreaks.length === 0,
    detail: photoBreaks[0],
  });

  return {
    ok: checks.every((c) => c.ok),
    checks,
  };
}
