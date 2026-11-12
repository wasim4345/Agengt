import type { ISODate } from "@/types/domain";
import {
  addActivities,
  addDependency,
  addExpense,
  addMilestone,
  buildProgrammeShell,
  content,
  emptyMaps,
  mergePacks,
  type ProgrammePack,
} from "../helpers";
import { d, ts } from "../dates";
import { IDS } from "../ids";
import type { ActivityReport } from "@/types/domain";

function buildP2(demoDate: ISODate): ProgrammePack {
  const pack = emptyMaps();
  const pid = IDS.programmes.p2;
  const owner = IDS.users.kavya;
  const ac = IDS.activityCategories;
  const ec = IDS.expenseCategories;

  pack.programmes[pid] = buildProgrammeShell({
    id: pid,
    code: "IIMCIP-ACC-2026-002",
    name: "Eastern Rail Acceleration Sprint",
    categoryId: IDS.categories.acceleration,
    clientId: IDS.clients.eastern,
    managerId: owner,
    teamIds: [owner, IDS.users.arjun],
    start: -60,
    end: 120,
    budget: 40_00_000,
    status: "active",
    demoDate,
    createdBy: owner,
    createdFromTemplateId: IDS.templates.acceleration,
  });

  const acts = [
    { id: "act_p2_a01", code: "A01", name: "Problem Sourcing", categoryId: ac.outreach, start: -60, end: -40, budget: 3_00_000, status: "completed" as const, percentComplete: 100, actualStart: -60, actualEnd: -40 },
    { id: "act_p2_a02", code: "A02", name: "Screening", categoryId: ac.selection, start: -40, end: -30, budget: 2_00_000, status: "completed" as const, percentComplete: 100, actualStart: -40, actualEnd: -30 },
    { id: "act_p2_a03", code: "A03", name: "Cohort Selection", categoryId: ac.selection, start: -30, end: -20, budget: 2_00_000, status: "completed" as const, percentComplete: 100, priority: "high" as const, actualStart: -30, actualEnd: -20 },
    { id: "act_p2_a04", code: "A04", name: "Product Sprint A", categoryId: ac.capacity, start: -20, end: 10, budget: 5_00_000, status: "in_progress" as const, percentComplete: 70, priority: "high" as const, actualStart: -20 },
    { id: "act_p2_a05", code: "A05", name: "Product Sprint B", categoryId: ac.capacity, start: -20, end: 10, budget: 5_00_000, status: "in_progress" as const, percentComplete: 65, priority: "high" as const, actualStart: -20 },
    { id: "act_p2_a06", code: "A06", name: "Corporate Pilots", categoryId: ac.networking, start: 10, end: 50, budget: 7_00_000, status: "in_progress" as const, percentComplete: 40, priority: "critical" as const, actualStart: 10 },
    { id: "act_p2_a07", code: "A07", name: "Mentor Clinics", categoryId: ac.mentoring, start: -10, end: 40, budget: 4_00_000, status: "in_progress" as const, percentComplete: 50, actualStart: -10 },
    { id: "act_p2_a08", code: "A08", name: "Investor Showcase", categoryId: ac.events, start: 50, end: 55, budget: 5_00_000, status: "not_started" as const, percentComplete: 0, priority: "high" as const },
    { id: "act_p2_a09", code: "A09", name: "Impact Review", categoryId: ac.admin, start: 55, end: 70, budget: 2_00_000, status: "not_started" as const, percentComplete: 0 },
    { id: "act_p2_a10", code: "A10", name: "Closure", categoryId: ac.admin, start: 70, end: 120, budget: 2_00_000, status: "not_started" as const, percentComplete: 0 },
  ];
  // sum = 37,00,000; unallocated 3,00,000
  addActivities(pack, pid, owner, demoDate, acts, true);
  addDependency(pack, "dep_p2_1", pid, "act_p2_a02", "act_p2_a01");
  addDependency(pack, "dep_p2_2", pid, "act_p2_a03", "act_p2_a02");
  addDependency(pack, "dep_p2_3", pid, "act_p2_a04", "act_p2_a03");
  addDependency(pack, "dep_p2_4", pid, "act_p2_a06", "act_p2_a04");
  addDependency(pack, "dep_p2_5", pid, "act_p2_a10", "act_p2_a09");

  addMilestone(
    pack,
    {
      id: "ms_p2_m1",
      programmeId: pid,
      name: "Cohort locked",
      targetDate: d(demoDate, -20),
      rule: "all_gating_complete",
      clientVisible: true,
      sortOrder: 1,
      manualAchievedAt: ts(demoDate, -20),
    },
    [{ activityId: "act_p2_a03", gating: true }],
  );
  addMilestone(
    pack,
    {
      id: "ms_p2_m2",
      programmeId: pid,
      name: "Pilots live",
      targetDate: d(demoDate, 5),
      rule: "all_gating_complete",
      clientVisible: true,
      sortOrder: 2,
    },
    [{ activityId: "act_p2_a06", gating: true }],
  );

  // Corporate pilots overspend: verified/submitted ~108% of 7L
  addExpense(pack, {
    id: "exp_p2_01",
    programmeId: pid,
    activityId: "act_p2_a06",
    categoryId: ec.venue,
    description: "Pilot site setup",
    day: 12,
    amount: 4_00_000,
    status: "verified",
    demoDate,
    submittedBy: owner,
  });
  addExpense(pack, {
    id: "exp_p2_02",
    programmeId: pid,
    activityId: "act_p2_a06",
    categoryId: ec.technology,
    description: "Pilot tooling",
    day: 15,
    amount: 3_56_000,
    status: "submitted",
    demoDate,
    submittedBy: owner,
    overspendFlag: true,
  });
  // 756k / 700k = 108%

  // 6 pending expenses for finance queue
  const pending = [
    ["exp_p2_03", "act_p2_a04", 80_000, "Sprint A cloud credits"],
    ["exp_p2_04", "act_p2_a04", 45_000, "Sprint A prototyping"],
    ["exp_p2_05", "act_p2_a05", 70_000, "Sprint B lab hire"],
    ["exp_p2_06", "act_p2_a05", 55_000, "Sprint B materials"],
    ["exp_p2_07", "act_p2_a07", 60_000, "Mentor clinic fees"],
    ["exp_p2_08", "act_p2_a07", 40_000, "Clinic travel"],
  ] as const;
  pending.forEach(([id, activityId, amount, description], i) => {
    addExpense(pack, {
      id,
      programmeId: pid,
      activityId,
      categoryId: ec.misc,
      description,
      day: -5 + i,
      amount,
      status: "submitted",
      demoDate,
      submittedBy: owner,
    });
  });

  return pack;
}

function buildP3(demoDate: ISODate): ProgrammePack {
  const pack = emptyMaps();
  const pid = IDS.programmes.p3;
  const owner = IDS.users.rohit;
  const ac = IDS.activityCategories;
  const ec = IDS.expenseCategories;

  pack.programmes[pid] = buildProgrammeShell({
    id: pid,
    code: "IIMCIP-PRE-2026-003",
    name: "Greenfield Agri Pre-Incubation",
    categoryId: IDS.categories.pre,
    clientId: IDS.clients.greenfield,
    managerId: owner,
    teamIds: [owner],
    start: -45,
    end: 75,
    budget: 12_00_000,
    status: "active",
    demoDate,
    createdBy: owner,
    createdFromTemplateId: IDS.templates.pre,
  });

  const acts = [
    { id: "act_p3_a01", code: "A01", name: "Call for Ideas", categoryId: ac.outreach, start: -45, end: -25, budget: 1_00_000, status: "completed" as const, percentComplete: 100, actualStart: -45, actualEnd: -25 },
    { id: "act_p3_a02", code: "A02", name: "Screening", categoryId: ac.selection, start: -25, end: -15, budget: 80_000, status: "completed" as const, percentComplete: 100, actualStart: -25, actualEnd: -15 },
    { id: "act_p3_a03", code: "A03", name: "Diagnostics", categoryId: ac.capacity, start: -15, end: 0, budget: 1_50_000, status: "completed" as const, percentComplete: 100, actualStart: -15, actualEnd: 0 },
    { id: "act_p3_a04", code: "A04", name: "Workshops", categoryId: ac.capacity, start: 0, end: 30, budget: 2_50_000, status: "in_progress" as const, percentComplete: 40, priority: "high" as const, actualStart: 0 },
    { id: "act_p3_a05", code: "A05", name: "Mentoring", categoryId: ac.mentoring, start: 5, end: 45, budget: 2_00_000, status: "in_progress" as const, percentComplete: 25, actualStart: 5 },
    { id: "act_p3_a06", code: "A06", name: "Market Validation", categoryId: ac.networking, start: 30, end: 50, budget: 1_50_000, status: "not_started" as const, percentComplete: 0 },
    { id: "act_p3_a07", code: "A07", name: "Demo Prep", categoryId: ac.events, start: 50, end: 60, budget: 1_20_000, status: "not_started" as const, percentComplete: 0 },
    { id: "act_p3_a08", code: "A08", name: "Closure", categoryId: ac.admin, start: 60, end: 75, budget: 50_000, status: "not_started" as const, percentComplete: 0 },
  ];
  // allocated 11,00,000
  addActivities(pack, pid, owner, demoDate, acts, true);
  addDependency(pack, "dep_p3_1", pid, "act_p3_a02", "act_p3_a01");
  addDependency(pack, "dep_p3_2", pid, "act_p3_a03", "act_p3_a02");
  addDependency(pack, "dep_p3_3", pid, "act_p3_a08", "act_p3_a07");

  addExpense(pack, {
    id: "exp_p3_01",
    programmeId: pid,
    activityId: "act_p3_a01",
    categoryId: ec.marketing,
    description: "Idea call ads",
    day: -40,
    amount: 40_000,
    status: "verified",
    demoDate,
    submittedBy: owner,
  });
  addExpense(pack, {
    id: "exp_p3_02",
    programmeId: pid,
    activityId: "act_p3_a04",
    categoryId: ec.venue,
    description: "Workshop venue",
    day: 2,
    amount: 55_000,
    status: "submitted",
    demoDate,
    submittedBy: owner,
  });

  const report: ActivityReport = {
    id: "rpt_p3_a03",
    programmeId: pid,
    activityId: "act_p3_a03",
    type: "final",
    status: "submitted",
    draft: content({
      activityStatus: "completed",
      conducted: "yes",
      percentComplete: 100,
      whatConducted: "Diagnostics complete for cohort.",
      keyOutcomes: "12 ventures diagnosed.",
      clientSummary: "Diagnostics report ready for release.",
      observations: "Awaiting leadership release.",
      additionalRemarks: "",
      expenseIncurred: false,
    }),
    versions: [
      {
        no: 1,
        content: content({
          activityStatus: "completed",
          conducted: "yes",
          percentComplete: 100,
          whatConducted: "Diagnostics complete for cohort.",
          keyOutcomes: "12 ventures diagnosed.",
          clientSummary: "Diagnostics report ready for release.",
          observations: "Awaiting leadership release.",
          additionalRemarks: "",
          expenseIncurred: false,
        }),
        expenseIds: [],
        evidenceIds: [],
        submittedBy: owner,
        submittedAt: ts(demoDate, 1),
      },
    ],
    createdBy: owner,
    createdAt: ts(demoDate, 0),
  };
  pack.reports[report.id] = report;
  return pack;
}

function buildP4(demoDate: ISODate): ProgrammePack {
  const pack = emptyMaps();
  const pid = IDS.programmes.p4;
  const owner = IDS.users.kavya;
  const ac = IDS.activityCategories;
  const ec = IDS.expenseCategories;

  pack.programmes[pid] = buildProgrammeShell({
    id: pid,
    code: "IIMCIP-IMM-2026-004",
    name: "Skills Mission Startup Immersion",
    categoryId: IDS.categories.immersion,
    clientId: IDS.clients.skills,
    managerId: owner,
    teamIds: [owner],
    start: -200,
    end: -20,
    budget: 8_00_000,
    status: "completed",
    demoDate,
    createdBy: owner,
    createdFromTemplateId: IDS.templates.immersion,
  });

  const acts = [
    { id: "act_p4_a01", code: "A01", name: "Orientation", categoryId: ac.admin, start: -200, end: -190, budget: 80_000, status: "completed" as const, percentComplete: 100, actualStart: -200, actualEnd: -190 },
    { id: "act_p4_a02", code: "A02", name: "Sector Immersion", categoryId: ac.outreach, start: -190, end: -160, budget: 1_50_000, status: "completed" as const, percentComplete: 100, actualStart: -190, actualEnd: -160 },
    { id: "act_p4_a03", code: "A03", name: "Problem Framing", categoryId: ac.capacity, start: -160, end: -130, budget: 1_20_000, status: "completed" as const, percentComplete: 100, actualStart: -160, actualEnd: -130 },
    { id: "act_p4_a04", code: "A04", name: "Mentor Clinics", categoryId: ac.mentoring, start: -130, end: -80, budget: 1_60_000, status: "completed" as const, percentComplete: 100, actualStart: -130, actualEnd: -80 },
    { id: "act_p4_a05", code: "A05", name: "Showcase", categoryId: ac.events, start: -80, end: -50, budget: 2_00_000, status: "completed" as const, percentComplete: 100, priority: "high" as const, actualStart: -80, actualEnd: -50 },
    { id: "act_p4_a06", code: "A06", name: "Closure", categoryId: ac.admin, start: -50, end: -20, budget: 48_000, status: "completed" as const, percentComplete: 100, actualStart: -50, actualEnd: -20 },
  ];
  // allocated 7,58,000; verified spend will leave surplus 42,000 on verified basis vs B
  addActivities(pack, pid, owner, demoDate, acts, true);
  addDependency(pack, "dep_p4_1", pid, "act_p4_a02", "act_p4_a01");
  addDependency(pack, "dep_p4_2", pid, "act_p4_a06", "act_p4_a05");

  // Total verified = 7,58,000 → surplus vs B (8,00,000) = 42,000
  const verifiedLines: [string, string, number, string][] = [
    ["exp_p4_01", "act_p4_a01", 70_000, "Orientation logistics"],
    ["exp_p4_02", "act_p4_a02", 1_90_000, "Immersion visits"],
    ["exp_p4_03", "act_p4_a03", 1_10_000, "Framing workshops"],
    ["exp_p4_04", "act_p4_a04", 1_50_000, "Mentor fees"],
    ["exp_p4_05", "act_p4_a05", 1_90_000, "Showcase production"],
    ["exp_p4_06", "act_p4_a06", 48_000, "Closure admin"],
  ];

  verifiedLines.forEach(([id, activityId, amount, description], i) => {
    addExpense(pack, {
      id,
      programmeId: pid,
      activityId,
      categoryId: ec.misc,
      description,
      day: -180 + i * 20,
      amount,
      status: "verified",
      demoDate,
      submittedBy: owner,
      verifiedAmount: amount,
    });
  });

  pack.reports["rpt_p4_closure"] = {
    id: "rpt_p4_closure",
    programmeId: pid,
    activityId: "act_p4_a06",
    type: "final",
    status: "released",
    draft: content({
      activityStatus: "completed",
      conducted: "yes",
      percentComplete: 100,
      whatConducted: "Programme closed and reconciled.",
      keyOutcomes: "Immersion completed with surplus.",
      clientSummary: "Skills Mission immersion successfully closed.",
      observations: "Surplus ₹42,000 on verified basis.",
      additionalRemarks: "Ready for formal closure approval.",
      expenseIncurred: true,
    }),
    versions: [
      {
        no: 1,
        content: content({
          activityStatus: "completed",
          conducted: "yes",
          percentComplete: 100,
          whatConducted: "Programme closed and reconciled.",
          keyOutcomes: "Immersion completed with surplus.",
          clientSummary: "Skills Mission immersion successfully closed.",
          observations: "Surplus ₹42,000 on verified basis.",
          additionalRemarks: "Ready for formal closure approval.",
          expenseIncurred: true,
        }),
        expenseIds: ["exp_p4_06"],
        evidenceIds: [],
        submittedBy: owner,
        submittedAt: ts(demoDate, -21),
      },
    ],
    release: {
      clientVisible: true,
      marcomVisible: true,
      by: IDS.users.meera,
      at: ts(demoDate, -20),
      versionNo: 1,
    },
    createdBy: owner,
    createdAt: ts(demoDate, -25),
  };

  return pack;
}

function buildP5(demoDate: ISODate): ProgrammePack {
  const pack = emptyMaps();
  const pid = IDS.programmes.p5;
  const owner = IDS.users.arjun;
  const ac = IDS.activityCategories;

  pack.programmes[pid] = buildProgrammeShell({
    id: pid,
    code: "IIMCIP-INC-2026-005",
    name: "Vanguard Incubation Cohort 6",
    categoryId: IDS.categories.incubation,
    clientId: IDS.clients.vanguard,
    managerId: owner,
    teamIds: [owner],
    start: 30,
    end: 330,
    budget: 30_00_000,
    status: "draft",
    demoDate,
    createdBy: owner,
    createdFromTemplateId: IDS.templates.incubation,
    wizardDraft: { step: 4 },
  });

  // Half-filled from template — few blocks, large unallocated
  addActivities(
    pack,
    pid,
    owner,
    demoDate,
    [
      { id: "act_p5_a01", code: "A01", name: "Call for Applications", categoryId: ac.outreach, start: 30, end: 75, budget: 1_20_000, status: "not_started", percentComplete: 0 },
      { id: "act_p5_a02", code: "A02", name: "Outreach Sessions", categoryId: ac.outreach, start: 30, end: 70, budget: 2_00_000, status: "not_started", percentComplete: 0 },
      { id: "act_p5_a03", code: "A03", name: "Startup Evaluation", categoryId: ac.selection, start: 76, end: 95, budget: 1_50_000, status: "not_started", percentComplete: 0 },
    ],
    false,
  );
  return pack;
}

function buildP6(demoDate: ISODate): ProgrammePack {
  const pack = emptyMaps();
  const pid = IDS.programmes.p6;
  const owner = IDS.users.rohit;
  const ac = IDS.activityCategories;

  pack.programmes[pid] = buildProgrammeShell({
    id: pid,
    code: "IIMCIP-ACC-2026-006",
    name: "Greenfield Scale-Up Track",
    categoryId: IDS.categories.acceleration,
    clientId: IDS.clients.greenfield,
    managerId: owner,
    teamIds: [owner],
    start: 10,
    end: 190,
    budget: 35_00_000,
    status: "pending_approval",
    demoDate,
    createdBy: owner,
    createdFromTemplateId: IDS.templates.acceleration,
  });

  const acts = [
    { id: "act_p6_a01", code: "A01", name: "Problem Sourcing", categoryId: ac.outreach, start: 10, end: 30, budget: 2_50_000, status: "not_started" as const, percentComplete: 0 },
    { id: "act_p6_a02", code: "A02", name: "Screening", categoryId: ac.selection, start: 30, end: 40, budget: 2_00_000, status: "not_started" as const, percentComplete: 0 },
    { id: "act_p6_a03", code: "A03", name: "Cohort Selection", categoryId: ac.selection, start: 40, end: 50, budget: 2_00_000, status: "not_started" as const, percentComplete: 0, priority: "high" as const },
    { id: "act_p6_a04", code: "A04", name: "Product Sprint A", categoryId: ac.capacity, start: 50, end: 80, budget: 5_00_000, status: "not_started" as const, percentComplete: 0, priority: "high" as const },
    { id: "act_p6_a05", code: "A05", name: "Product Sprint B", categoryId: ac.capacity, start: 50, end: 80, budget: 5_00_000, status: "not_started" as const, percentComplete: 0, priority: "high" as const },
    { id: "act_p6_a06", code: "A06", name: "Corporate Pilots", categoryId: ac.networking, start: 80, end: 120, budget: 6_00_000, status: "not_started" as const, percentComplete: 0, priority: "critical" as const },
    { id: "act_p6_a07", code: "A07", name: "Mentor Clinics", categoryId: ac.mentoring, start: 60, end: 110, budget: 3_50_000, status: "not_started" as const, percentComplete: 0 },
    { id: "act_p6_a08", code: "A08", name: "Investor Showcase", categoryId: ac.events, start: 120, end: 125, budget: 4_00_000, status: "not_started" as const, percentComplete: 0, priority: "high" as const },
    { id: "act_p6_a09", code: "A09", name: "Impact Review", categoryId: ac.admin, start: 125, end: 150, budget: 2_00_000, status: "not_started" as const, percentComplete: 0 },
    { id: "act_p6_a10", code: "A10", name: "Closure", categoryId: ac.admin, start: 150, end: 190, budget: 2_00_000, status: "not_started" as const, percentComplete: 0 },
  ];
  // allocated 34,00,000
  addActivities(pack, pid, owner, demoDate, acts, false);
  addDependency(pack, "dep_p6_1", pid, "act_p6_a02", "act_p6_a01");
  addDependency(pack, "dep_p6_2", pid, "act_p6_a03", "act_p6_a02");
  addDependency(pack, "dep_p6_3", pid, "act_p6_a04", "act_p6_a03");

  return pack;
}

export function buildOtherProgrammes(demoDate: ISODate): ProgrammePack {
  return mergePacks(
    buildP2(demoDate),
    buildP3(demoDate),
    buildP4(demoDate),
    buildP5(demoDate),
    buildP6(demoDate),
  );
}
