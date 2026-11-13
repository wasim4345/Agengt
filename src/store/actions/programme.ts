import type {
  Activity,
  AppState,
  Approval,
  Dependency,
  DepType,
  ID,
  ISODate,
  Milestone,
  Priority,
  Programme,
  Template,
} from "@/types/domain";
import { err, ok, type Result } from "@/types/result";
import { addCalendarDays, dayDiff } from "@/lib/rules/dates";
import { validateAddDependency } from "@/lib/rules/dependencies";
import { canSetActivityBudget, canSetProgrammeBudget } from "@/lib/rules/budget";
import { validateProgramme } from "@/lib/rules/programme";
import { canSelfApprove } from "@/lib/approvals";

function nid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function categoryCode(state: AppState, categoryId: ID): string {
  return state.categories[categoryId]?.code ?? "GEN";
}

function nextProgrammeCode(state: AppState, categoryId: ID): string {
  const year = state.meta.demoDate.slice(0, 4);
  const cat = categoryCode(state, categoryId);
  const count =
    Object.values(state.programmes).filter((p) => p.categoryId === categoryId)
      .length + 1;
  return `IIMCIP-${cat}-${year}-${String(count).padStart(3, "0")}`;
}

function activityCode(sortOrder: number): string {
  return `A${String(sortOrder).padStart(2, "0")}`;
}

export function clearProgrammeChildren(draft: AppState, programmeId: ID) {
  for (const [id, a] of Object.entries(draft.activities)) {
    if (a.programmeId === programmeId) {
      delete draft.activities[id];
      delete draft.activityBudgets[id];
    }
  }
  for (const [id, d] of Object.entries(draft.dependencies)) {
    if (d.programmeId === programmeId) delete draft.dependencies[id];
  }
  const milestoneIds = new Set(
    Object.values(draft.milestones)
      .filter((m) => m.programmeId === programmeId)
      .map((m) => m.id),
  );
  for (const id of milestoneIds) delete draft.milestones[id];
  draft.activityMilestones = draft.activityMilestones.filter(
    (am) => !milestoneIds.has(am.milestoneId),
  );
}

export function applyCreateProgrammeDraft(
  draft: AppState,
  input?: {
    name?: string;
    categoryId?: ID;
    clientId?: ID;
    startDate?: ISODate;
    endDate?: ISODate;
    totalBudget?: number;
  },
): Result<{ programmeId: ID }> {
  const categoryId = input?.categoryId ?? Object.keys(draft.categories)[0]!;
  const clientId = input?.clientId ?? Object.keys(draft.clients)[0]!;
  const startDate = input?.startDate ?? draft.meta.demoDate;
  const endDate =
    input?.endDate ?? addCalendarDays(startDate, 180);
  const totalBudget = input?.totalBudget ?? 25_00_000;
  const id = nid("prg");
  const programme: Programme = {
    id,
    code: nextProgrammeCode(draft, categoryId),
    name: input?.name ?? "Untitled programme",
    categoryId,
    clientId,
    managerId: draft.meta.currentUserId,
    teamIds: [draft.meta.currentUserId],
    startDate,
    endDate,
    totalBudget,
    originalBudget: totalBudget,
    objectives: "",
    expectedOutcomes: "",
    keyDeliverables: [],
    reportingRequirements: [],
    status: "draft",
    clientBudgetSummaryVisible: false,
    createdAt: `${draft.meta.demoDate}T12:00:00.000Z`,
    createdBy: draft.meta.currentUserId,
    wizardDraft: { step: 1 },
  };
  draft.programmes[id] = programme;
  return ok({ programmeId: id });
}

export function applyUpdateProgramme(
  draft: AppState,
  programmeId: ID,
  patch: Partial<Programme>,
): Result<Programme> {
  const programme = draft.programmes[programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  if (programme.status !== "draft") {
    return err({
      code: "PRG_LOCKED",
      message: "Only draft programmes can be edited in the wizard.",
    });
  }
  if (patch.totalBudget != null) {
    const check = canSetProgrammeBudget(draft, programmeId, patch.totalBudget);
    if (!check.ok) return check;
  }
  const prevCategory = programme.categoryId;
  Object.assign(programme, patch);
  if (patch.categoryId && patch.categoryId !== prevCategory) {
    programme.code = nextProgrammeCode(draft, patch.categoryId);
  }
  if (patch.totalBudget != null) {
    programme.originalBudget = programme.totalBudget;
  }
  return ok(programme);
}

export function applySetWizardStep(
  draft: AppState,
  programmeId: ID,
  step: number,
): Result<number> {
  const programme = draft.programmes[programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  programme.wizardDraft = { step: Math.min(7, Math.max(1, step)) };
  return ok(programme.wizardDraft.step);
}

export function applyTemplateToProgramme(
  draft: AppState,
  programmeId: ID,
  templateId: ID | null,
): Result<{ activityCount: number }> {
  const programme = draft.programmes[programmeId];
  if (!programme || programme.status !== "draft") {
    return err({
      code: "PRG_LOCKED",
      message: "Template can only be applied to a draft programme.",
    });
  }

  clearProgrammeChildren(draft, programmeId);

  if (!templateId) {
    programme.createdFromTemplateId = undefined;
    return ok({ activityCount: 0 });
  }

  const template = draft.templates[templateId];
  if (!template) {
    return err({ code: "TPL_MISSING", message: "Template not found" });
  }

  programme.createdFromTemplateId = templateId;
  programme.categoryId = template.categoryId;

  // Ensure programme end covers the farthest template offset
  const maxOffset = Math.max(
    0,
    ...template.activities.map(
      (a) => a.startOffsetDays + Math.max(0, a.durationDays - 1),
    ),
    ...template.milestones.map((m) => m.offsetDays),
  );
  const neededEnd = addCalendarDays(programme.startDate, maxOffset);
  if (neededEnd > programme.endDate) {
    programme.endDate = neededEnd;
  }

  const keyToActivityId = new Map<string, ID>();
  const keyToMilestoneId = new Map<string, ID>();

  template.activities.forEach((ta, index) => {
    const id = `${programmeId}_${ta.key}`;
    const sortOrder = index + 1;
    const plannedStart = addCalendarDays(
      programme.startDate,
      ta.startOffsetDays,
    );
    const plannedEnd = addCalendarDays(
      plannedStart,
      Math.max(0, ta.durationDays - 1),
    );
    const activity: Activity = {
      id,
      programmeId,
      code: activityCode(sortOrder),
      name: ta.name,
      description: ta.description,
      categoryId: ta.activityCategoryId,
      plannedStart,
      plannedEnd,
      ownerId: programme.managerId,
      supportIds: [],
      expectedOutput: ta.expectedOutput,
      priority: ta.priority,
      status: "not_started",
      percentComplete: 0,
      sortOrder,
    };
    draft.activities[id] = activity;
    const amount = Math.round((programme.totalBudget * ta.budgetPct) / 100);
    draft.activityBudgets[id] = {
      activityId: id,
      original: amount,
      revised: amount,
    };
    keyToActivityId.set(ta.key, id);
  });

  template.milestones.forEach((tm, index) => {
    const id = `${programmeId}_${tm.key}`;
    const milestone: Milestone = {
      id,
      programmeId,
      name: tm.name,
      targetDate: addCalendarDays(programme.startDate, tm.offsetDays),
      rule: "all_gating_complete",
      clientVisible: true,
      sortOrder: index + 1,
    };
    draft.milestones[id] = milestone;
    keyToMilestoneId.set(tm.key, id);
    for (const gk of tm.gatingKeys) {
      const activityId = keyToActivityId.get(gk);
      if (activityId) {
        draft.activityMilestones.push({
          activityId,
          milestoneId: id,
          gating: true,
        });
      }
    }
  });

  for (const td of template.dependencies) {
    const successorId = keyToActivityId.get(td.successorKey);
    const predecessorId = keyToActivityId.get(td.predecessorKey);
    if (!successorId || !predecessorId) continue;
    const depId = nid("dep");
    draft.dependencies[depId] = {
      id: depId,
      programmeId,
      successorId,
      predecessorId,
      type: td.type,
      lagDays: td.lagDays,
    };
  }

  return ok({ activityCount: template.activities.length });
}

export function applyAddActivity(
  draft: AppState,
  programmeId: ID,
  partial?: Partial<Activity> & { budget?: number },
): Result<{ activityId: ID }> {
  const programme = draft.programmes[programmeId];
  if (!programme || programme.status !== "draft") {
    return err({ code: "PRG_LOCKED", message: "Activities locked" });
  }
  const existing = Object.values(draft.activities).filter(
    (a) => a.programmeId === programmeId,
  );
  const sortOrder =
    existing.reduce((m, a) => Math.max(m, a.sortOrder), 0) + 1;
  const id = nid("act");
  const budget = partial?.budget ?? 0;
  const activity: Activity = {
    id,
    programmeId,
    code: activityCode(sortOrder),
    name: partial?.name ?? "New activity",
    description: partial?.description ?? "",
    categoryId: partial?.categoryId,
    plannedStart: partial?.plannedStart ?? programme.startDate,
    plannedEnd: partial?.plannedEnd ?? addCalendarDays(programme.startDate, 13),
    ownerId: partial?.ownerId ?? programme.managerId,
    supportIds: partial?.supportIds ?? [],
    expectedOutput: partial?.expectedOutput ?? "",
    priority: partial?.priority ?? "medium",
    status: "not_started",
    percentComplete: 0,
    sortOrder,
  };

  draft.activities[id] = activity;
  draft.activityBudgets[id] = {
    activityId: id,
    original: 0,
    revised: 0,
  };
  if (budget > 0) {
    const recheck = canSetActivityBudget(draft, id, budget);
    if (!recheck.ok) {
      delete draft.activities[id];
      delete draft.activityBudgets[id];
      return recheck;
    }
    draft.activityBudgets[id] = {
      activityId: id,
      original: budget,
      revised: budget,
    };
  }

  return ok({ activityId: id });
}

const ACTIVE_ACTIVITY_FIELDS = new Set([
  "status",
  "percentComplete",
  "revisedEnd",
  "actualStart",
  "actualEnd",
  "cancellationReason",
]);

export function applyUpdateActivity(
  draft: AppState,
  activityId: ID,
  patch: Partial<Activity>,
): Result<Activity> {
  const activity = draft.activities[activityId];
  if (!activity) {
    return err({ code: "ACT_MISSING", message: "Activity not found" });
  }
  const programme = draft.programmes[activity.programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  if (programme.status === "draft") {
    Object.assign(activity, patch);
    return ok(activity);
  }
  // Active/pending: only execution fields (structure edits stay on draft / Gantt reschedule)
  const keys = Object.keys(patch);
  if (keys.some((k) => !ACTIVE_ACTIVITY_FIELDS.has(k))) {
    return err({
      code: "PRG_LOCKED",
      message: "Structure fields are locked after activation. Use Gantt to reschedule.",
    });
  }
  Object.assign(activity, patch);
  return ok(activity);
}

export function applyDeleteActivity(
  draft: AppState,
  activityId: ID,
  cascade = false,
): Result<true> {
  const activity = draft.activities[activityId];
  if (!activity) {
    return err({ code: "ACT_MISSING", message: "Activity not found" });
  }
  const programme = draft.programmes[activity.programmeId];
  if (!programme || programme.status !== "draft") {
    return err({ code: "PRG_LOCKED", message: "Activities locked" });
  }

  const deps = Object.values(draft.dependencies).filter(
    (d) =>
      d.successorId === activityId || d.predecessorId === activityId,
  );
  const hasReports = Object.values(draft.reports).some(
    (r) => r.activityId === activityId,
  );
  const hasExpenses = Object.values(draft.expenses).some(
    (e) => e.activityId === activityId,
  );

  if ((deps.length > 0 || hasReports || hasExpenses) && !cascade) {
    return err({
      code: "ACT_HAS_LINKS",
      message:
        "Activity has dependencies, reports, or expenses. Confirm cascade delete.",
      field: "cascade",
    });
  }

  for (const dep of deps) delete draft.dependencies[dep.id];
  draft.activityMilestones = draft.activityMilestones.filter(
    (am) => am.activityId !== activityId,
  );
  delete draft.activityBudgets[activityId];
  delete draft.activities[activityId];

  // Re-code remaining
  const remaining = Object.values(draft.activities)
    .filter((a) => a.programmeId === activity.programmeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  remaining.forEach((a, i) => {
    a.sortOrder = i + 1;
    a.code = activityCode(i + 1);
  });

  return ok(true);
}

export function applyDuplicateActivity(
  draft: AppState,
  activityId: ID,
): Result<{ activityId: ID }> {
  const source = draft.activities[activityId];
  if (!source) {
    return err({ code: "ACT_MISSING", message: "Activity not found" });
  }
  return applyAddActivity(draft, source.programmeId, {
    ...source,
    name: `${source.name} (copy)`,
    budget: 0, // avoid over-alloc; user can allocate
  });
}

export function applyReorderActivity(
  draft: AppState,
  activityId: ID,
  direction: "up" | "down",
): Result<true> {
  const activity = draft.activities[activityId];
  if (!activity) {
    return err({ code: "ACT_MISSING", message: "Activity not found" });
  }
  const list = Object.values(draft.activities)
    .filter((a) => a.programmeId === activity.programmeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = list.findIndex((a) => a.id === activityId);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapWith < 0 || swapWith >= list.length) {
    return ok(true);
  }
  const a = list[idx]!;
  const b = list[swapWith]!;
  const tmp = a.sortOrder;
  a.sortOrder = b.sortOrder;
  b.sortOrder = tmp;
  list
    .sort((x, y) => x.sortOrder - y.sortOrder)
    .forEach((row, i) => {
      row.sortOrder = i + 1;
      row.code = activityCode(i + 1);
    });
  return ok(true);
}

export function applyBulkShiftDates(
  draft: AppState,
  activityIds: ID[],
  days: number,
): Result<number> {
  let count = 0;
  for (const id of activityIds) {
    const a = draft.activities[id];
    if (!a) continue;
    const programme = draft.programmes[a.programmeId];
    if (!programme || programme.status !== "draft") continue;
    a.plannedStart = addCalendarDays(a.plannedStart, days);
    a.plannedEnd = addCalendarDays(a.plannedEnd, days);
    count += 1;
  }
  return ok(count);
}

export function applyBulkAssignOwner(
  draft: AppState,
  activityIds: ID[],
  ownerId: ID,
): Result<number> {
  if (!draft.users[ownerId]) {
    return err({ code: "USER_MISSING", message: "Owner not found" });
  }
  let count = 0;
  for (const id of activityIds) {
    const a = draft.activities[id];
    if (!a) continue;
    const programme = draft.programmes[a.programmeId];
    if (!programme || programme.status !== "draft") continue;
    a.ownerId = ownerId;
    count += 1;
  }
  return ok(count);
}

export function applyAddDependency(
  draft: AppState,
  input: {
    programmeId: ID;
    successorId: ID;
    predecessorId?: ID;
    predecessorMilestoneId?: ID;
    type?: DepType;
    lagDays?: number;
  },
): Result<{ dependencyId: ID }> {
  const check = validateAddDependency(draft, input);
  if (!check.ok) return check;
  const id = nid("dep");
  const dep: Dependency = {
    id,
    programmeId: input.programmeId,
    successorId: input.successorId,
    predecessorId: input.predecessorId,
    predecessorMilestoneId: input.predecessorMilestoneId,
    type: input.type ?? "FS",
    lagDays: input.lagDays ?? 0,
  };
  draft.dependencies[id] = dep;
  return ok({ dependencyId: id });
}

export function applyDeleteDependency(
  draft: AppState,
  dependencyId: ID,
): Result<true> {
  if (!draft.dependencies[dependencyId]) {
    return err({ code: "DEP_MISSING", message: "Dependency not found" });
  }
  delete draft.dependencies[dependencyId];
  return ok(true);
}

export function applyAddMilestone(
  draft: AppState,
  programmeId: ID,
  input?: Partial<Milestone> & { gatingActivityIds?: ID[] },
): Result<{ milestoneId: ID }> {
  const programme = draft.programmes[programmeId];
  if (!programme || programme.status !== "draft") {
    return err({ code: "PRG_LOCKED", message: "Milestones locked" });
  }
  const id = nid("ms");
  const sortOrder =
    Object.values(draft.milestones).filter((m) => m.programmeId === programmeId)
      .length + 1;
  draft.milestones[id] = {
    id,
    programmeId,
    name: input?.name ?? "New milestone",
    description: input?.description,
    targetDate: input?.targetDate ?? programme.endDate,
    rule: input?.rule ?? "all_gating_complete",
    clientVisible: input?.clientVisible ?? true,
    sortOrder,
  };
  for (const activityId of input?.gatingActivityIds ?? []) {
    draft.activityMilestones.push({
      activityId,
      milestoneId: id,
      gating: true,
    });
  }
  return ok({ milestoneId: id });
}

export function applyUpdateMilestone(
  draft: AppState,
  milestoneId: ID,
  patch: Partial<Milestone>,
): Result<Milestone> {
  const milestone = draft.milestones[milestoneId];
  if (!milestone) {
    return err({ code: "MS_MISSING", message: "Milestone not found" });
  }
  Object.assign(milestone, patch);
  return ok(milestone);
}

export function applyDeleteMilestone(
  draft: AppState,
  milestoneId: ID,
): Result<true> {
  if (!draft.milestones[milestoneId]) {
    return err({ code: "MS_MISSING", message: "Milestone not found" });
  }
  delete draft.milestones[milestoneId];
  draft.activityMilestones = draft.activityMilestones.filter(
    (am) => am.milestoneId !== milestoneId,
  );
  for (const [id, dep] of Object.entries(draft.dependencies)) {
    if (dep.predecessorMilestoneId === milestoneId) {
      delete draft.dependencies[id];
    }
  }
  return ok(true);
}

export function applySetActivityMilestones(
  draft: AppState,
  activityId: ID,
  milestoneIds: ID[],
): Result<true> {
  const activity = draft.activities[activityId];
  if (!activity) {
    return err({ code: "ACT_MISSING", message: "Activity not found" });
  }
  draft.activityMilestones = draft.activityMilestones.filter(
    (am) => am.activityId !== activityId,
  );
  for (const milestoneId of milestoneIds) {
    if (!draft.milestones[milestoneId]) continue;
    draft.activityMilestones.push({
      activityId,
      milestoneId,
      gating: true,
    });
  }
  return ok(true);
}

export function applySetActivityBudgetAmount(
  draft: AppState,
  activityId: ID,
  amount: number,
): Result<true> {
  if (!draft.meta.allowRuleBreaking) {
    const check = canSetActivityBudget(draft, activityId, amount);
    if (!check.ok) return check;
  }
  const existing = draft.activityBudgets[activityId];
  if (existing) {
    existing.revised = amount;
    if (draft.programmes[draft.activities[activityId]!.programmeId]?.status === "draft") {
      existing.original = amount;
    }
  } else {
    draft.activityBudgets[activityId] = {
      activityId,
      original: amount,
      revised: amount,
    };
  }
  return ok(true);
}

export function applySubmitProgramme(
  draft: AppState,
  programmeId: ID,
  options?: { acknowledgeUnallocated?: boolean },
): Result<{ approvalId: ID }> {
  const programme = draft.programmes[programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  if (programme.status !== "draft") {
    return err({
      code: "PRG_STATUS",
      message: "Only draft programmes can be submitted.",
    });
  }

  if (!draft.meta.allowRuleBreaking) {
    const validation = validateProgramme(draft, programmeId, {
      acknowledgeUnallocated: options?.acknowledgeUnallocated,
    });
    if (!validation.ok) {
      return err(validation.errors);
    }
  }

  programme.status = "pending_approval";
  programme.wizardDraft = undefined;

  const approvalId = nid("apr");
  const approval: Approval = {
    id: approvalId,
    programmeId,
    type: "activation",
    status: "pending",
    requestedBy: draft.meta.currentUserId,
    requestedAt: `${draft.meta.demoDate}T12:00:00.000Z`,
    reason: "Submit programme for activation",
  };
  draft.approvals[approvalId] = approval;

  // Notify leadership
  const ntf = nid("ntf");
  draft.notifications[ntf] = {
    id: ntf,
    roleOrUserId: "leadership",
    text: `${programme.code} awaiting activation approval`,
    at: `${draft.meta.demoDate}T12:00:00.000Z`,
    read: false,
    link: "/approvals/",
  };

  return ok({ approvalId });
}

function freezeBaselines(draft: AppState, programmeId: ID) {
  const programme = draft.programmes[programmeId]!;
  programme.baselineEndDate = programme.endDate;
  programme.originalBudget = programme.totalBudget;
  for (const activity of Object.values(draft.activities)) {
    if (activity.programmeId !== programmeId) continue;
    activity.baselineStart = activity.plannedStart;
    activity.baselineEnd = activity.plannedEnd;
    const budget = draft.activityBudgets[activity.id];
    if (budget) budget.original = budget.revised;
  }
}

export function applyDecideActivation(
  draft: AppState,
  approvalId: ID,
  decision: "approved" | "rejected",
  remarks?: string,
): Result<true> {
  const approval = draft.approvals[approvalId];
  if (!approval || approval.type !== "activation") {
    return err({ code: "APR_MISSING", message: "Activation approval not found" });
  }
  if (approval.status !== "pending") {
    return err({ code: "APR_DECIDED", message: "Already decided" });
  }
  if (draft.meta.currentRole !== "leadership" && !draft.meta.allowRuleBreaking) {
    return err({
      code: "APR_ROLE",
      message: "Only Leadership can decide activation.",
    });
  }
  const self = canSelfApprove(draft, approval.requestedBy);
  if (!self.ok && !draft.meta.allowRuleBreaking) return self;

  const programme = draft.programmes[approval.programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }

  approval.status = decision;
  approval.decision = {
    by: draft.meta.currentUserId,
    at: `${draft.meta.demoDate}T12:00:00.000Z`,
    approved: decision === "approved",
    remarks: remarks ?? (decision === "approved" ? "Approved" : "Rejected"),
  };

  if (decision === "approved") {
    programme.status = "active";
    freezeBaselines(draft, programme.id);
  } else {
    programme.status = "draft";
    programme.wizardDraft = { step: 7 };
    programme.statusReason = remarks ?? "Returned for edits";
  }
  return ok(true);
}

export function applyActivateDemo(
  draft: AppState,
  programmeId: ID,
  options?: { acknowledgeUnallocated?: boolean },
): Result<true> {
  const programme = draft.programmes[programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  if (programme.status !== "draft" && programme.status !== "pending_approval") {
    return err({
      code: "PRG_STATUS",
      message: "Activate (demo) only for draft/pending programmes.",
    });
  }

  if (programme.status === "draft" && !draft.meta.allowRuleBreaking) {
    const validation = validateProgramme(draft, programmeId, {
      acknowledgeUnallocated: options?.acknowledgeUnallocated,
    });
    if (!validation.ok) return err(validation.errors);
  }

  // Simulated leadership approval
  const approvalId = nid("apr");
  draft.approvals[approvalId] = {
    id: approvalId,
    programmeId,
    type: "activation",
    status: "approved",
    requestedBy: draft.meta.currentUserId,
    requestedAt: `${draft.meta.demoDate}T12:00:00.000Z`,
    reason: "Activate (demo) shortcut",
    decision: {
      by: draft.meta.currentUserId,
      at: `${draft.meta.demoDate}T12:00:00.000Z`,
      approved: true,
      remarks: "Simulated Leadership approval (demo)",
    },
  };
  programme.status = "active";
  programme.wizardDraft = undefined;
  freezeBaselines(draft, programmeId);
  return ok(true);
}

export function programmeToTemplate(
  state: AppState,
  programmeId: ID,
  name: string,
): Result<Template> {
  const programme = state.programmes[programmeId];
  if (!programme) {
    return err({ code: "PRG_MISSING", message: "Programme not found" });
  }
  const activities = Object.values(state.activities)
    .filter((a) => a.programmeId === programmeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const keyById = new Map(activities.map((a) => [a.id, `a${a.sortOrder}`]));
  const total = programme.totalBudget || 1;

  const milestones = Object.values(state.milestones)
    .filter((m) => m.programmeId === programmeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const template: Template = {
    id: nid("tpl"),
    name,
    description: `Saved from ${programme.code}`,
    categoryId: programme.categoryId,
    builtIn: false,
    activities: activities.map((a) => {
      const budget = state.activityBudgets[a.id]?.revised ?? 0;
      return {
        key: keyById.get(a.id)!,
        name: a.name,
        description: a.description,
        activityCategoryId: a.categoryId,
        startOffsetDays: dayDiff(programme.startDate, a.plannedStart),
        durationDays: Math.max(1, dayDiff(a.plannedStart, a.plannedEnd) + 1),
        budgetPct: Math.round((budget / total) * 1000) / 10,
        expectedOutput: a.expectedOutput,
        priority: a.priority as Priority,
      };
    }),
    dependencies: Object.values(state.dependencies)
      .filter(
        (d) =>
          d.programmeId === programmeId &&
          d.predecessorId &&
          keyById.has(d.successorId) &&
          keyById.has(d.predecessorId),
      )
      .map((d) => ({
        successorKey: keyById.get(d.successorId)!,
        predecessorKey: keyById.get(d.predecessorId!)!,
        type: d.type,
        lagDays: d.lagDays,
      })),
    milestones: milestones.map((m, i) => {
      const gatingKeys = state.activityMilestones
        .filter((am) => am.milestoneId === m.id && am.gating)
        .map((am) => keyById.get(am.activityId))
        .filter((k): k is string => !!k);
      return {
        key: `m${i + 1}`,
        name: m.name,
        offsetDays: dayDiff(programme.startDate, m.targetDate),
        gatingKeys,
      };
    }),
  };
  return ok(template);
}
