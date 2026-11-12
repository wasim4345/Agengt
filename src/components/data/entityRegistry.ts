import type { AppState, ID } from "@/types/domain";

export type EntityKind =
  | "programmes"
  | "activities"
  | "activityBudgets"
  | "dependencies"
  | "milestones"
  | "activityMilestones"
  | "clients"
  | "users"
  | "categories"
  | "activityCategories"
  | "expenseCategories"
  | "templates"
  | "expenses"
  | "reports"
  | "evidence"
  | "startups"
  | "programmeStartups"
  | "achievements"
  | "approvals"
  | "budgetRevisions"
  | "delayImpacts";

export type EntityDef = {
  key: EntityKind;
  label: string;
  /** Record map vs array collection */
  shape: "record" | "array";
  /** Primary display fields for the table */
  columns: string[];
  idField?: string; // for records default "id"
  /** Composite id builder for array rows */
  rowId?: (row: Record<string, unknown>) => string;
};

export const ENTITY_TABS: EntityDef[] = [
  {
    key: "programmes",
    label: "Programmes",
    shape: "record",
    columns: ["id", "code", "name", "status", "totalBudget", "managerId"],
  },
  {
    key: "activities",
    label: "Activities",
    shape: "record",
    columns: ["id", "code", "name", "programmeId", "status", "ownerId"],
  },
  {
    key: "activityBudgets",
    label: "Activity budgets",
    shape: "record",
    columns: ["activityId", "original", "revised"],
    idField: "activityId",
  },
  {
    key: "dependencies",
    label: "Dependencies",
    shape: "record",
    columns: ["id", "programmeId", "predecessorId", "successorId", "type"],
  },
  {
    key: "milestones",
    label: "Milestones",
    shape: "record",
    columns: ["id", "programmeId", "name", "targetDate", "clientVisible"],
  },
  {
    key: "activityMilestones",
    label: "Activity↔Milestone",
    shape: "array",
    columns: ["activityId", "milestoneId", "gating"],
    rowId: (r) => `${r.activityId}__${r.milestoneId}`,
  },
  {
    key: "clients",
    label: "Clients",
    shape: "record",
    columns: ["id", "name", "sector", "contactName"],
  },
  {
    key: "users",
    label: "Users",
    shape: "record",
    columns: ["id", "name", "role", "email", "active"],
  },
  {
    key: "categories",
    label: "Categories",
    shape: "record",
    columns: ["id", "name", "code", "builtIn"],
  },
  {
    key: "activityCategories",
    label: "Activity categories",
    shape: "record",
    columns: ["id", "name", "colour"],
  },
  {
    key: "expenseCategories",
    label: "Expense categories",
    shape: "record",
    columns: ["id", "name"],
  },
  {
    key: "templates",
    label: "Templates",
    shape: "record",
    columns: ["id", "name", "categoryId", "builtIn"],
  },
  {
    key: "expenses",
    label: "Expenses",
    shape: "record",
    columns: ["id", "programmeId", "activityId", "amount", "status", "date"],
  },
  {
    key: "reports",
    label: "Reports",
    shape: "record",
    columns: ["id", "programmeId", "activityId", "type", "status"],
  },
  {
    key: "evidence",
    label: "Evidence",
    shape: "record",
    columns: ["id", "programmeId", "activityId", "type", "fileName"],
  },
  {
    key: "startups",
    label: "Startups",
    shape: "record",
    columns: ["id", "name", "sector", "city"],
  },
  {
    key: "programmeStartups",
    label: "Programme startups",
    shape: "array",
    columns: ["programmeId", "startupId", "status"],
    rowId: (r) => `${r.programmeId}__${r.startupId}`,
  },
  {
    key: "achievements",
    label: "Achievements",
    shape: "record",
    columns: ["id", "title", "startupId", "programmeId", "marcomApproved"],
  },
  {
    key: "approvals",
    label: "Approvals",
    shape: "record",
    columns: ["id", "programmeId", "type", "status", "requestedBy"],
  },
  {
    key: "budgetRevisions",
    label: "Budget revisions",
    shape: "record",
    columns: ["id", "programmeId", "kind", "status", "totalAfter"],
  },
  {
    key: "delayImpacts",
    label: "Delay impacts",
    shape: "record",
    columns: ["id", "programmeId", "sourceActivityId", "affectedActivityId", "status"],
  },
];

export function listEntityRows(
  state: AppState,
  def: EntityDef,
): { id: string; row: Record<string, unknown> }[] {
  if (def.shape === "record") {
    const map = state[def.key] as unknown as Record<string, Record<string, unknown>>;
    return Object.entries(map ?? {}).map(([id, row]) => ({
      id,
      row: {
        ...(row as object),
        [def.idField ?? "id"]: (row as { id?: string }).id ?? id,
      },
    }));
  }
  const arr =
    (state[def.key] as unknown as Record<string, unknown>[]) ?? [];
  return arr.map((row) => ({
    id: def.rowId!(row),
    row,
  }));
}

export function newEntityStub(def: EntityDef): Record<string, unknown> {
  const id = `${def.key.slice(0, 3)}_${Date.now().toString(36)}`;
  switch (def.key) {
    case "programmes":
      return {
        id,
        code: "IIMCIP-NEW-000",
        name: "New programme",
        categoryId: "cat_incubation",
        clientId: "cli_vanguard",
        managerId: "usr_arjun",
        teamIds: ["usr_arjun"],
        startDate: "2026-11-12",
        endDate: "2027-05-12",
        totalBudget: 10_00_000,
        originalBudget: 10_00_000,
        objectives: "",
        expectedOutcomes: "",
        keyDeliverables: [],
        reportingRequirements: [],
        status: "draft",
        clientBudgetSummaryVisible: false,
        createdAt: "2026-11-12T12:00:00.000Z",
        createdBy: "usr_arjun",
      };
    case "activities":
      return {
        id,
        programmeId: "prg_p1",
        code: "A99",
        name: "New activity",
        description: "",
        plannedStart: "2026-11-12",
        plannedEnd: "2026-12-12",
        ownerId: "usr_arjun",
        supportIds: [],
        expectedOutput: "",
        priority: "medium",
        status: "not_started",
        percentComplete: 0,
        sortOrder: 99,
      };
    case "activityBudgets":
      return { activityId: id, original: 0, revised: 0 };
    case "dependencies":
      return {
        id,
        programmeId: "prg_p1",
        successorId: "act_p1_a02",
        predecessorId: "act_p1_a01",
        type: "FS",
        lagDays: 0,
      };
    case "milestones":
      return {
        id,
        programmeId: "prg_p1",
        name: "New milestone",
        targetDate: "2026-12-01",
        rule: "manual",
        clientVisible: true,
        sortOrder: 99,
      };
    case "activityMilestones":
      return { activityId: "act_p1_a01", milestoneId: "ms_p1_m1", gating: true };
    case "clients":
      return { id, name: "New client", sector: "" };
    case "users":
      return {
        id,
        name: "New user",
        email: "new@demo.local",
        role: "programme_manager" as const,
        title: "Staff",
        avatarColor: "#2563EB",
        active: true,
      };
    case "categories":
      return {
        id,
        name: "New category",
        colour: "#64748B",
        code: "NEW",
        builtIn: false,
      };
    case "activityCategories":
      return { id, name: "New activity category", colour: "#64748B" };
    case "expenseCategories":
      return { id, name: "New expense category" };
    case "templates":
      return {
        id,
        name: "New template",
        description: "",
        categoryId: "cat_incubation",
        builtIn: false,
        activities: [],
        dependencies: [],
        milestones: [],
      };
    case "expenses":
      return {
        id,
        programmeId: "prg_p1",
        activityId: "act_p1_a01",
        categoryId: "ecat_misc",
        description: "New expense",
        date: "2026-11-12",
        amount: 1000,
        status: "draft",
      };
    case "reports":
      return {
        id,
        programmeId: "prg_p1",
        activityId: "act_p1_a01",
        type: "interim",
        status: "draft",
        draft: {
          activityStatus: "in_progress",
          conducted: "yes",
          percentComplete: 0,
          description: "",
          whatConducted: "",
          keyOutcomes: "",
          observations: "",
          additionalRemarks: "",
          clientSummary: "",
          expenseIncurred: false,
        },
        versions: [],
        createdBy: "usr_arjun",
        createdAt: "2026-11-12T12:00:00.000Z",
      };
    case "evidence":
      return {
        id,
        programmeId: "prg_p1",
        activityId: "act_p1_a01",
        type: "supporting_document",
        fileName: "file.txt",
        mime: "text/plain",
        size: 12,
        uploadedBy: "usr_arjun",
        uploadedAt: "2026-11-12T12:00:00.000Z",
        clientApproved: false,
        marcomApproved: false,
      };
    case "startups":
      return { id, name: "New startup", sector: "other" };
    case "programmeStartups":
      return {
        programmeId: "prg_p1",
        startupId: "st_01",
        status: "applied",
      };
    case "achievements":
      return {
        id,
        startupId: "st_01",
        programmeId: "prg_p1",
        title: "New win",
        description: "",
        date: "2026-11-12",
        type: "other",
        marcomApproved: false,
        clientApproved: false,
      };
    case "approvals":
      return {
        id,
        programmeId: "prg_p1",
        type: "activation",
        status: "pending",
        requestedBy: "usr_arjun",
        requestedAt: "2026-11-12T12:00:00.000Z",
      };
    case "budgetRevisions":
      return {
        id,
        programmeId: "prg_p1",
        no: 1,
        kind: "reallocation",
        reason: "",
        lines: [],
        totalBefore: 0,
        totalAfter: 0,
        status: "pending_finance",
        requestedBy: "usr_arjun",
        requestedAt: "2026-11-12T12:00:00.000Z",
        needsLeadership: false,
      };
    case "delayImpacts":
      return {
        id,
        programmeId: "prg_p1",
        sourceActivityId: "act_p1_a06",
        affectedActivityId: "act_p1_a07",
        originalStart: "2026-11-01",
        originalEnd: "2026-12-01",
        projectedStart: "2026-11-10",
        projectedEnd: "2026-12-10",
        shiftDays: 9,
        exceedsProgrammeEnd: false,
        status: "proposed",
      };
    default:
      return { id };
  }
}

export function resolveRecordId(
  def: EntityDef,
  row: Record<string, unknown>,
): ID {
  if (def.shape === "array") return def.rowId!(row);
  if (def.idField && typeof row[def.idField] === "string") {
    return row[def.idField] as string;
  }
  return String(row.id ?? "");
}
