/** Domain types from prototype-blueprint doc 03 §3 (verbatim + additive only). */

export type ID = string;
export type ISODate = string; // 2026-11-12
export type ISODateTime = string;

export type Role =
  | "leadership"
  | "programme_manager"
  | "client"
  | "marcom"
  | "finance";

export interface User {
  id: ID;
  name: string;
  email: string;
  role: Role;
  title: string;
  clientId?: ID; // for role=client: which organisation they belong to
  avatarColor: string;
  active: boolean;
  /** Leadership only: false = view-only (hide Approve/Release). Default true. */
  canApprove?: boolean;
}

export type SponsorType =
  | "government"
  | "corporate"
  | "csr"
  | "psu"
  | "multilateral"
  | "ngo"
  | "other";

export interface Client {
  id: ID;
  name: string;
  type: SponsorType;
  sector?: string;
  contactName?: string;
  contactEmail?: string;
}

/** Programme stage for P-CTX-05 ribbon (editable for custom categories). */
export type ProgrammeStage =
  | "awareness"
  | "idea_to_prototype"
  | "prototype_to_revenue"
  | "growth"
  | "custom";

export interface Category {
  id: ID;
  name: string;
  colour: string;
  code: string;
  builtIn: boolean;
  stage: ProgrammeStage;
} // programme categories

export interface Office {
  id: ID;
  name: string;
  state: string;
  isHq?: boolean;
}

/** Programme output metric definition (P-CTX-01). */
export interface Kpi {
  id: ID;
  programmeId: ID;
  name: string;
  unit: "count" | "inr";
  target: number;
  sortOrder: number;
}

export interface ActivityCategory {
  id: ID;
  name: string;
  colour: string;
}

export interface ExpenseCategory {
  id: ID;
  name: string;
}

export type ProgrammeStatus =
  | "draft"
  | "pending_approval"
  | "active"
  | "on_hold"
  | "completed"
  | "closed"
  | "cancelled";

export interface Programme {
  id: ID;
  code: string; // IIMCIP-INC-2026-007 (auto)
  name: string;
  categoryId: ID;
  clientId: ID;
  officeId?: ID;
  managerId: ID;
  teamIds: ID[];
  startDate: ISODate;
  endDate: ISODate;
  baselineEndDate?: ISODate;
  totalBudget: number; // current approved total
  originalBudget: number; // frozen at activation (or creation if draft)
  objectives: string;
  expectedOutcomes: string;
  keyDeliverables: string[];
  reportingRequirements: {
    id: ID;
    type: string;
    frequency: "weekly" | "fortnightly" | "monthly" | "milestone" | "final";
  }[];
  status: ProgrammeStatus;
  statusReason?: string;
  clientBudgetSummaryVisible: boolean; // default false
  createdFromTemplateId?: ID;
  createdAt: ISODateTime;
  createdBy: ID;
  wizardDraft?: { step: number }; // only while draft
}

export type Priority = "low" | "medium" | "high" | "critical";
export type ActivityStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "partially_completed"
  | "delayed"
  | "on_hold"
  | "cancelled";

export interface Activity {
  id: ID;
  programmeId: ID;
  code: string; // A01
  name: string;
  description: string;
  categoryId?: ID;
  plannedStart: ISODate;
  plannedEnd: ISODate; // current plan
  baselineStart?: ISODate;
  baselineEnd?: ISODate; // frozen at activation
  revisedEnd?: ISODate; // from delay report (forecast)
  actualStart?: ISODate;
  actualEnd?: ISODate;
  ownerId: ID;
  supportIds: ID[];
  expectedOutput: string;
  priority: Priority;
  status: ActivityStatus;
  percentComplete: number; // 0-100, manager-reported in latest submitted report
  sortOrder: number;
  cancellationReason?: string;
}
// Budget lives in ActivityBudget so revisions are first-class (below)

export interface ActivityBudget {
  activityId: ID;
  original: number;
  revised: number;
} // revised===original until revised

export type DepType = "FS" | "SS" | "FF" | "SF";

export interface Dependency {
  id: ID;
  programmeId: ID;
  successorId: ID;
  predecessorId?: ID;
  predecessorMilestoneId?: ID; // exactly one set
  type: DepType;
  lagDays: number;
}

export interface Milestone {
  id: ID;
  programmeId: ID;
  name: string;
  description?: string;
  targetDate: ISODate;
  rule: "all_gating_complete" | "manual";
  manualAchievedAt?: ISODateTime;
  clientVisible: boolean;
  sortOrder: number;
}

export interface ActivityMilestone {
  activityId: ID;
  milestoneId: ID;
  gating: boolean;
}

export interface BudgetRevision {
  id: ID;
  programmeId: ID;
  no: number;
  kind: "reallocation" | "total_change" | "activity_change";
  reason: string;
  lines: { activityId?: ID; before: number; after: number }[]; // activityId undefined = programme total
  totalBefore: number;
  totalAfter: number;
  status:
    | "pending_finance"
    | "pending_leadership"
    | "approved"
    | "rejected"
    | "withdrawn";
  requestedBy: ID;
  requestedAt: ISODateTime;
  financeDecision?: Decision;
  leadershipDecision?: Decision;
  needsLeadership: boolean;
}

export interface Decision {
  by: ID;
  at: ISODateTime;
  approved: boolean;
  remarks?: string;
}

export type ExpenseStatus = "draft" | "submitted" | "verified" | "rejected";

export interface Expense {
  id: ID;
  programmeId: ID;
  activityId: ID;
  reportId?: ID;
  categoryId: ID;
  description: string;
  date: ISODate;
  amount: number;
  documentEvidenceId?: ID;
  status: ExpenseStatus;
  verifiedAmount?: number; // ≤ amount when partially approved
  submittedBy?: ID;
  submittedAt?: ISODateTime;
  decision?: Decision; // finance decision incl. remarks
  resubmissionOf?: ID;
  overspendFlag?: boolean;
}

export type Conducted = "yes" | "no" | "partially";

export interface ActivityReport {
  // a "report thread"
  id: ID;
  programmeId: ID;
  activityId: ID;
  type: "interim" | "final";
  status: "draft" | "submitted" | "returned" | "released"; // state of the latest version
  draft: ReportContent; // editable only when draft/returned
  versions: ReportVersion[]; // immutable once pushed
  release?: {
    clientVisible: boolean;
    marcomVisible: boolean;
    by: ID;
    at: ISODateTime;
    versionNo: number;
  };
  returnComment?: string;
  createdBy: ID;
  createdAt: ISODateTime;
}

export interface ReportContent {
  activityStatus: ActivityStatus;
  conducted: Conducted;
  percentComplete: number;
  description: string;
  whatConducted: string;
  keyOutcomes: string;
  participants?: number;
  startups?: number;
  /** Period values for programme KPIs (P-CTX-01). */
  kpiValues?: { kpiId: ID; value: number }[];
  observations: string; // INTERNAL
  additionalRemarks: string; // INTERNAL
  clientSummary: string; // shown to client/MarCom after release
  progressDetails?: string;
  expenseIncurred: boolean | null;
  delay?: {
    reason: string;
    impact: string;
    corrective: string;
    revisedEnd?: ISODate;
  };
  cancellationReason?: string;
}

export interface ReportVersion {
  no: number;
  content: ReportContent;
  expenseIds: ID[];
  evidenceIds: ID[];
  submittedBy: ID;
  submittedAt: ISODateTime;
}

export type EvidenceType =
  | "photograph"
  | "attendance_sheet"
  | "report"
  | "event_documentation"
  | "supporting_document"
  | "invoice";

export interface Evidence {
  id: ID;
  programmeId: ID;
  activityId: ID;
  reportId?: ID;
  type: EvidenceType;
  fileName: string;
  mime: string;
  size: number;
  blobKey?: string;
  thumb?: string; // data URL (images)
  caption?: string;
  uploadedBy: ID;
  uploadedAt: ISODateTime;
  clientApproved: boolean;
  marcomApproved: boolean;
  deleted?: { by: ID; at: ISODateTime; reason: string };
}

export interface Startup {
  id: ID;
  name: string;
  sector: string;
  city?: string;
  founders?: string;
  website?: string;
}

export interface ProgrammeStartup {
  programmeId: ID;
  startupId: ID;
  status:
    | "applied"
    | "shortlisted"
    | "selected"
    | "onboarded"
    | "graduated"
    | "rejected"
    | "withdrawn";
}

export interface Achievement {
  id: ID;
  startupId: ID;
  programmeId: ID;
  title: string;
  description: string;
  date: ISODate;
  type: "funding" | "award" | "pilot" | "customer" | "media" | "other";
  marcomApproved: boolean;
  clientApproved: boolean;
}

export interface Template {
  id: ID;
  name: string;
  description: string;
  categoryId: ID;
  builtIn: boolean;
  activities: {
    key: string;
    name: string;
    description: string;
    activityCategoryId?: ID;
    startOffsetDays: number;
    durationDays: number;
    budgetPct: number;
    expectedOutput: string;
    priority: Priority;
  }[];
  dependencies: {
    successorKey: string;
    predecessorKey: string;
    type: DepType;
    lagDays: number;
  }[];
  milestones: {
    key: string;
    name: string;
    offsetDays: number;
    gatingKeys: string[];
  }[];
}

export interface Approval {
  id: ID;
  programmeId: ID;
  type:
    | "activation"
    | "extension"
    | "hold"
    | "resume"
    | "cancellation"
    | "closure"
    | "structure_change";
  status: "pending" | "approved" | "rejected";
  requestedBy: ID;
  requestedAt: ISODateTime;
  reason?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
  decision?: Decision;
}

export interface DelayImpact {
  id: ID;
  programmeId: ID;
  sourceActivityId: ID;
  affectedActivityId: ID;
  originalStart: ISODate;
  originalEnd: ISODate;
  projectedStart: ISODate;
  projectedEnd: ISODate;
  shiftDays: number;
  exceedsProgrammeEnd: boolean;
  status: "proposed" | "applied" | "dismissed";
}

export interface Notification {
  id: ID;
  roleOrUserId: string;
  text: string;
  at: ISODateTime;
  read: boolean;
  link?: string;
}

export interface LogEntry {
  id: ID;
  at: ISODateTime;
  actorId: ID;
  role: Role;
  entity: string;
  entityId: ID;
  action: string;
  summary: string;
  programmeId?: ID;
}

export interface AppMeta {
  demoDate: ISODate;
  currentRole: Role;
  currentUserId: ID;
  allowRuleBreaking: boolean;
  seedVersion: string;
  settings: {
    warnPct: number /*0.9*/;
    reallocLeadershipPct: number /*0.10*/;
    reallocLeadershipAmount: number /*100000*/;
    upcomingDays: number /*14*/;
    staleReportDays: number /*14*/;
  };
}

export interface AppState {
  schemaVersion: 1 | 2;
  meta: AppMeta;
  users: Record<ID, User>;
  clients: Record<ID, Client>;
  offices: Record<ID, Office>;
  categories: Record<ID, Category>;
  activityCategories: Record<ID, ActivityCategory>;
  expenseCategories: Record<ID, ExpenseCategory>;
  templates: Record<ID, Template>;
  programmes: Record<ID, Programme>;
  activities: Record<ID, Activity>;
  activityBudgets: Record<ID, ActivityBudget>; // keyed by activityId
  dependencies: Record<ID, Dependency>;
  milestones: Record<ID, Milestone>;
  activityMilestones: ActivityMilestone[];
  budgetRevisions: Record<ID, BudgetRevision>;
  expenses: Record<ID, Expense>;
  reports: Record<ID, ActivityReport>;
  evidence: Record<ID, Evidence>;
  startups: Record<ID, Startup>;
  programmeStartups: ProgrammeStartup[];
  achievements: Record<ID, Achievement>;
  kpis: Record<ID, Kpi>;
  approvals: Record<ID, Approval>;
  delayImpacts: Record<ID, DelayImpact>;
  notifications: Record<ID, Notification>;
  log: LogEntry[];
}

export type ScenarioName =
  | "default"
  | "healthy"
  | "troubled"
  | "empty";

export interface SnapshotRecord {
  id: ID;
  name: string;
  createdAt: ISODateTime;
  state: AppState;
}

export const STORAGE_KEYS = {
  state: "iimcip-os:v1:state",
  snapshots: "iimcip-os:v1:snapshots",
} as const;

export const SEED_VERSION = "2.0.0";
export const CURRENT_SCHEMA_VERSION = 2 as const;
export const DEFAULT_DEMO_DATE = "2026-11-12";

export const STAGE_LABELS: Record<ProgrammeStage, string> = {
  awareness: "Awareness",
  idea_to_prototype: "Idea → Prototype",
  prototype_to_revenue: "Prototype → Revenue",
  growth: "Growth",
  custom: "Custom",
};
