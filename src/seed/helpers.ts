import type {
  Activity,
  ActivityBudget,
  ActivityMilestone,
  ActivityReport,
  ActivityStatus,
  Dependency,
  Evidence,
  Expense,
  ExpenseStatus,
  ID,
  ISODate,
  Milestone,
  Priority,
  Programme,
  ProgrammeStatus,
  ReportContent,
} from "@/types/domain";
import { d, ts } from "./dates";

export function emptyMaps() {
  return {
    programmes: {} as Record<ID, Programme>,
    activities: {} as Record<ID, Activity>,
    activityBudgets: {} as Record<ID, ActivityBudget>,
    dependencies: {} as Record<ID, Dependency>,
    milestones: {} as Record<ID, Milestone>,
    activityMilestones: [] as ActivityMilestone[],
    expenses: {} as Record<ID, Expense>,
    reports: {} as Record<ID, ActivityReport>,
    evidence: {} as Record<ID, Evidence>,
  };
}

export type ProgrammePack = ReturnType<typeof emptyMaps>;

export function mergePacks(...packs: ProgrammePack[]): ProgrammePack {
  const out = emptyMaps();
  for (const pack of packs) {
    Object.assign(out.programmes, pack.programmes);
    Object.assign(out.activities, pack.activities);
    Object.assign(out.activityBudgets, pack.activityBudgets);
    Object.assign(out.dependencies, pack.dependencies);
    Object.assign(out.milestones, pack.milestones);
    out.activityMilestones.push(...pack.activityMilestones);
    Object.assign(out.expenses, pack.expenses);
    Object.assign(out.reports, pack.reports);
    Object.assign(out.evidence, pack.evidence);
  }
  return out;
}

type ActivitySpec = {
  id: ID;
  code: string;
  name: string;
  categoryId: ID;
  start: number;
  end: number;
  budget: number;
  status: ActivityStatus;
  percentComplete: number;
  priority?: Priority;
  description?: string;
  revisedEnd?: number;
  actualStart?: number;
  actualEnd?: number;
};

export function buildProgrammeShell(opts: {
  id: ID;
  code: string;
  name: string;
  categoryId: ID;
  clientId: ID;
  officeId?: ID;
  managerId: ID;
  teamIds: ID[];
  start: number;
  end: number;
  budget: number;
  status: ProgrammeStatus;
  demoDate: ISODate;
  createdBy: ID;
  createdFromTemplateId?: ID;
  objectives?: string;
  expectedOutcomes?: string;
  keyDeliverables?: string[];
  wizardDraft?: { step: number };
  statusReason?: string;
}): Programme {
  const {
    demoDate,
    start,
    end,
    budget,
    status,
    ...rest
  } = opts;
  const activeLike =
    status === "active" ||
    status === "completed" ||
    status === "closed" ||
    status === "on_hold";
  return {
    ...rest,
    startDate: d(demoDate, start),
    endDate: d(demoDate, end),
    baselineEndDate: activeLike ? d(demoDate, end) : undefined,
    totalBudget: budget,
    originalBudget: budget,
    objectives:
      opts.objectives ??
      `Objectives for ${opts.name}: strengthen startup capability and measurable outcomes.`,
    expectedOutcomes:
      opts.expectedOutcomes ??
      "Cohort progress, validated pilots, and documented learning outcomes.",
    keyDeliverables: opts.keyDeliverables ?? [
      "Activity completion reports",
      "Milestone evidence pack",
      "Financial utilisation summary",
    ],
    reportingRequirements: [
      {
        id: `${opts.id}_rr1`,
        type: "Progress",
        frequency: "monthly",
      },
      {
        id: `${opts.id}_rr2`,
        type: "Final",
        frequency: "final",
      },
    ],
    status,
    clientBudgetSummaryVisible: false,
    createdAt: ts(demoDate, start),
    createdBy: opts.createdBy,
    wizardDraft: opts.wizardDraft,
    statusReason: opts.statusReason,
  };
}

export function addActivities(
  pack: ProgrammePack,
  programmeId: ID,
  ownerId: ID,
  demoDate: ISODate,
  specs: ActivitySpec[],
  freezeBaseline: boolean,
): void {
  specs.forEach((spec, index) => {
    pack.activities[spec.id] = {
      id: spec.id,
      programmeId,
      code: spec.code,
      name: spec.name,
      description: spec.description ?? `${spec.name} activities and outputs.`,
      categoryId: spec.categoryId,
      plannedStart: d(demoDate, spec.start),
      plannedEnd: d(demoDate, spec.end),
      baselineStart: freezeBaseline ? d(demoDate, spec.start) : undefined,
      baselineEnd: freezeBaseline ? d(demoDate, spec.end) : undefined,
      revisedEnd:
        spec.revisedEnd !== undefined ? d(demoDate, spec.revisedEnd) : undefined,
      actualStart:
        spec.actualStart !== undefined
          ? d(demoDate, spec.actualStart)
          : undefined,
      actualEnd:
        spec.actualEnd !== undefined ? d(demoDate, spec.actualEnd) : undefined,
      ownerId,
      supportIds: [],
      expectedOutput: `${spec.name} deliverable pack`,
      priority: spec.priority ?? "medium",
      status: spec.status,
      percentComplete: spec.percentComplete,
      sortOrder: index + 1,
    };
    pack.activityBudgets[spec.id] = {
      activityId: spec.id,
      original: spec.budget,
      revised: spec.budget,
    };
  });
}

export function addDependency(
  pack: ProgrammePack,
  id: ID,
  programmeId: ID,
  successorId: ID,
  predecessorId: ID,
  type: Dependency["type"] = "FS",
  lagDays = 0,
): void {
  pack.dependencies[id] = {
    id,
    programmeId,
    successorId,
    predecessorId,
    type,
    lagDays,
  };
}

export function addMilestone(
  pack: ProgrammePack,
  milestone: Milestone,
  links: { activityId: ID; gating: boolean }[],
): void {
  pack.milestones[milestone.id] = milestone;
  for (const link of links) {
    pack.activityMilestones.push({
      activityId: link.activityId,
      milestoneId: milestone.id,
      gating: link.gating,
    });
  }
}

export function content(
  partial: Partial<ReportContent> &
    Pick<ReportContent, "activityStatus" | "conducted" | "percentComplete">,
): ReportContent {
  return {
    description: partial.description ?? "",
    whatConducted: partial.whatConducted ?? "",
    keyOutcomes: partial.keyOutcomes ?? "",
    observations: partial.observations ?? "",
    additionalRemarks: partial.additionalRemarks ?? "",
    clientSummary: partial.clientSummary ?? "",
    expenseIncurred: partial.expenseIncurred ?? null,
    participants: partial.participants,
    startups: partial.startups,
    kpiValues: partial.kpiValues,
    progressDetails: partial.progressDetails,
    delay: partial.delay,
    cancellationReason: partial.cancellationReason,
    activityStatus: partial.activityStatus,
    conducted: partial.conducted,
    percentComplete: partial.percentComplete,
  };
}

export function addExpense(
  pack: ProgrammePack,
  opts: {
    id: ID;
    programmeId: ID;
    activityId: ID;
    categoryId: ID;
    description: string;
    day: number;
    amount: number;
    status: ExpenseStatus;
    demoDate: ISODate;
    submittedBy: ID;
    verifiedAmount?: number;
    decisionRemarks?: string;
    reportId?: ID;
    overspendFlag?: boolean;
  },
): void {
  const submitted =
    opts.status === "submitted" ||
    opts.status === "verified" ||
    opts.status === "rejected";
  pack.expenses[opts.id] = {
    id: opts.id,
    programmeId: opts.programmeId,
    activityId: opts.activityId,
    reportId: opts.reportId,
    categoryId: opts.categoryId,
    description: opts.description,
    date: d(opts.demoDate, opts.day),
    amount: opts.amount,
    status: opts.status,
    verifiedAmount: opts.verifiedAmount,
    submittedBy: submitted ? opts.submittedBy : undefined,
    submittedAt: submitted ? ts(opts.demoDate, opts.day) : undefined,
    decision:
      opts.status === "verified" || opts.status === "rejected"
        ? {
            by: "usr_sunita",
            at: ts(opts.demoDate, opts.day + 1),
            approved: opts.status === "verified",
            remarks: opts.decisionRemarks,
          }
        : undefined,
    overspendFlag: opts.overspendFlag,
  };
}

/** Tiny SVG data-URL thumbnails — no remote images. */
export function placeholderThumb(label: string, colour: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="${colour}"/><text x="8" y="44" fill="#fff" font-size="12" font-family="sans-serif">${label}</text></svg>`;
  const encoded =
    typeof btoa === "function"
      ? btoa(svg)
      : Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

export function addEvidence(
  pack: ProgrammePack,
  opts: {
    id: ID;
    programmeId: ID;
    activityId: ID;
    reportId?: ID;
    type: Evidence["type"];
    fileName: string;
    mime: string;
    day: number;
    demoDate: ISODate;
    uploadedBy: ID;
    clientApproved: boolean;
    marcomApproved: boolean;
    caption?: string;
    colour?: string;
  },
): void {
  const thumb =
    opts.mime.startsWith("image/")
      ? placeholderThumb(opts.caption ?? opts.fileName, opts.colour ?? "#0B2545")
      : undefined;
  const size = thumb ? Math.ceil((thumb.length * 3) / 4) : 2048;
  pack.evidence[opts.id] = {
    id: opts.id,
    programmeId: opts.programmeId,
    activityId: opts.activityId,
    reportId: opts.reportId,
    type: opts.type,
    fileName: opts.fileName,
    mime: opts.mime,
    size,
    blobKey: `blob:${opts.id}`,
    thumb,
    caption: opts.caption,
    uploadedBy: opts.uploadedBy,
    uploadedAt: ts(opts.demoDate, opts.day),
    clientApproved: opts.clientApproved,
    marcomApproved: opts.marcomApproved,
  };
}
