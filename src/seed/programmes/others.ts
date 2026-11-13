import type { ISODate } from "@/types/domain";
import {
  addActivities,
  addExpense,
  buildProgrammeShell,
  emptyMaps,
  type ProgrammePack,
} from "../helpers";
import { IDS } from "../ids";

/** P2–P8 per doc 08 §4 (illustrative figures; keeps demo traps). */
export function buildOtherProgrammes(demoDate: ISODate): ProgrammePack {
  const pack = emptyMaps();
  const ac = IDS.activityCategories;
  const ec = IDS.expenseCategories;

  // P2 — HDFC Udgama Accelerator (active; grant-heavy)
  {
    const pid = IDS.programmes.p2;
    const owner = IDS.users.kavya;
    pack.programmes[pid] = buildProgrammeShell({
      id: pid,
      code: "IIMCIP-ACC-2026-002",
      name: "HDFC Udgama Accelerator",
      categoryId: IDS.categories.acceleration,
      clientId: IDS.clients.hdfc,
      officeId: IDS.offices.kolkata,
      managerId: owner,
      teamIds: [owner, IDS.users.arjun],
      start: -90,
      end: 120,
      budget: 40_00_000,
      status: "active",
      demoDate,
      createdBy: owner,
      createdFromTemplateId: IDS.templates.acceleration,
    });
    addActivities(
      pack,
      pid,
      owner,
      demoDate,
      [
        { id: "act_p2_a01", code: "A01", name: "Sourcing", categoryId: ac.outreach, start: -90, end: -60, budget: 2_00_000, status: "completed", percentComplete: 100, actualStart: -90, actualEnd: -60 },
        { id: "act_p2_a02", code: "A02", name: "Screening", categoryId: ac.selection, start: -60, end: -40, budget: 1_50_000, status: "completed", percentComplete: 100, actualStart: -60, actualEnd: -40 },
        { id: "act_p2_a03", code: "A03", name: "Selection", categoryId: ac.selection, start: -40, end: -20, budget: 1_50_000, status: "completed", percentComplete: 100, priority: "high", actualStart: -40, actualEnd: -20 },
        { id: "act_p2_a04", code: "A04", name: "Bootcamps", categoryId: ac.capacity, start: -20, end: 40, budget: 6_00_000, status: "in_progress", percentComplete: 55, priority: "high", actualStart: -20 },
        { id: "act_p2_a05", code: "A05", name: "Mentoring", categoryId: ac.mentoring, start: -10, end: 80, budget: 4_00_000, status: "in_progress", percentComplete: 40, actualStart: -10 },
        { id: "act_p2_a06", code: "A06", name: "Corporate / Market Pilots", categoryId: ac.market, start: 10, end: 70, budget: 5_00_000, status: "in_progress", percentComplete: 30, priority: "critical", actualStart: 10 },
        { id: "act_p2_a07", code: "A07", name: "Seed Disbursement Tranche 1", categoryId: ac.seedDisburse, start: -5, end: 30, budget: 14_00_000, status: "in_progress", percentComplete: 60, priority: "critical", actualStart: -5 },
        { id: "act_p2_a08", code: "A08", name: "Investor Showcase", categoryId: ac.investor, start: 90, end: 100, budget: 4_00_000, status: "not_started", percentComplete: 0, priority: "high" },
        { id: "act_p2_a09", code: "A09", name: "Closure", categoryId: ac.admin, start: 100, end: 120, budget: 2_00_000, status: "not_started", percentComplete: 0 },
      ],
      true,
    );
    addExpense(pack, {
      id: "exp_p2_grant_1",
      programmeId: pid,
      activityId: "act_p2_a07",
      categoryId: ec.startupGrant,
      description: "Seed grant — cohort startup A",
      day: -3,
      amount: 7_00_000,
      status: "verified",
      verifiedAmount: 7_00_000,
      demoDate,
      submittedBy: owner,
    });
    addExpense(pack, {
      id: "exp_p2_grant_2",
      programmeId: pid,
      activityId: "act_p2_a07",
      categoryId: ec.startupGrant,
      description: "Seed grant — cohort startup B",
      day: -1,
      amount: 5_00_000,
      status: "submitted",
      demoDate,
      submittedBy: owner,
    });
    // Demo trap: submitted amount exceeds remaining headroom on Tranche 1
    addExpense(pack, {
      id: "exp_p2_overspend",
      programmeId: pid,
      activityId: "act_p2_a07",
      categoryId: ec.startupGrant,
      description: "Seed grant — overspend demo (blocked on verify)",
      day: 0,
      amount: 8_00_000,
      status: "submitted",
      demoDate,
      submittedBy: owner,
      overspendFlag: true,
    });
  }

  // P3 — FOCUS NE Accelerator
  {
    const pid = IDS.programmes.p3;
    const owner = IDS.users.kavya;
    pack.programmes[pid] = buildProgrammeShell({
      id: pid,
      code: "IIMCIP-ACC-2026-003",
      name: "FOCUS: The North East Accelerator",
      categoryId: IDS.categories.acceleration,
      clientId: IDS.clients.tbcNe,
      officeId: IDS.offices.guwahati,
      managerId: owner,
      teamIds: [owner],
      start: -60,
      end: 180,
      budget: 30_00_000,
      status: "active",
      demoDate,
      createdBy: owner,
      createdFromTemplateId: IDS.templates.acceleration,
    });
    addActivities(
      pack,
      pid,
      owner,
      demoDate,
      [
        { id: "act_p3_a01", code: "A01", name: "Sourcing", categoryId: ac.outreach, start: -60, end: -30, budget: 3_00_000, status: "completed", percentComplete: 100, actualStart: -60, actualEnd: -30 },
        { id: "act_p3_a02", code: "A02", name: "Selection", categoryId: ac.selection, start: -30, end: 0, budget: 2_50_000, status: "completed", percentComplete: 100, actualStart: -30, actualEnd: 0 },
        { id: "act_p3_a03", code: "A03", name: "Capacity-building sessions", categoryId: ac.capacity, start: 0, end: 60, budget: 8_00_000, status: "in_progress", percentComplete: 35, actualStart: 0 },
        { id: "act_p3_a04", code: "A04", name: "Mentoring", categoryId: ac.mentoring, start: 10, end: 120, budget: 7_00_000, status: "in_progress", percentComplete: 20, actualStart: 10 },
        { id: "act_p3_a05", code: "A05", name: "Investor connects", categoryId: ac.investor, start: 40, end: 140, budget: 6_00_000, status: "not_started", percentComplete: 0 },
        { id: "act_p3_a06", code: "A06", name: "Closure", categoryId: ac.admin, start: 150, end: 180, budget: 3_50_000, status: "not_started", percentComplete: 0 },
      ],
      true,
    );
    addExpense(pack, {
      id: "exp_p3_02",
      programmeId: pid,
      activityId: "act_p3_a03",
      categoryId: ec.venue,
      description: "Guwahati venue hire — capacity sessions",
      day: -2,
      amount: 1_20_000,
      status: "submitted",
      demoDate,
      submittedBy: owner,
    });
  }

  // P4 — ReGen Innovation Accelerator
  {
    const pid = IDS.programmes.p4;
    const owner = IDS.users.rohit;
    pack.programmes[pid] = buildProgrammeShell({
      id: pid,
      code: "IIMCIP-ACC-2026-004",
      name: "ReGen Innovation Accelerator",
      categoryId: IDS.categories.acceleration,
      clientId: IDS.clients.tbcRegen,
      officeId: IDS.offices.kolkata,
      managerId: owner,
      teamIds: [owner, IDS.users.arjun],
      start: -30,
      end: 420,
      budget: 35_00_000,
      status: "active",
      demoDate,
      createdBy: owner,
      createdFromTemplateId: IDS.templates.acceleration,
      objectives: "15-month acceleration for regenerative innovation startups.",
    });
    addActivities(
      pack,
      pid,
      owner,
      demoDate,
      [
        { id: "act_p4_a01", code: "A01", name: "Sourcing", categoryId: ac.outreach, start: -30, end: 0, budget: 3_00_000, status: "completed", percentComplete: 100, actualStart: -30, actualEnd: 0 },
        { id: "act_p4_a02", code: "A02", name: "Screening", categoryId: ac.selection, start: 0, end: 30, budget: 2_50_000, status: "in_progress", percentComplete: 50, actualStart: 0 },
        { id: "act_p4_a03", code: "A03", name: "Bootcamps", categoryId: ac.capacity, start: 40, end: 100, budget: 8_00_000, status: "not_started", percentComplete: 0, priority: "high" },
        { id: "act_p4_a04", code: "A04", name: "Pilots", categoryId: ac.market, start: 120, end: 300, budget: 12_00_000, status: "not_started", percentComplete: 0, priority: "critical" },
        { id: "act_p4_a05", code: "A05", name: "Investor Showcase", categoryId: ac.investor, start: 360, end: 380, budget: 6_00_000, status: "not_started", percentComplete: 0 },
        { id: "act_p4_a06", code: "A06", name: "Closure", categoryId: ac.admin, start: 390, end: 420, budget: 3_50_000, status: "not_started", percentComplete: 0 },
      ],
      true,
    );
  }

  // P5 — Maruti Suzuki Nurture Idea Hunt (completed)
  {
    const pid = IDS.programmes.p5;
    const owner = IDS.users.rohit;
    pack.programmes[pid] = buildProgrammeShell({
      id: pid,
      code: "IIMCIP-CHAL-2025-005",
      name: "Maruti Suzuki Nurture Idea Hunt",
      categoryId: IDS.categories.challenge,
      clientId: IDS.clients.maruti,
      officeId: IDS.offices.kolkata,
      managerId: owner,
      teamIds: [owner],
      start: -200,
      end: -30,
      budget: 30_00_000,
      status: "completed",
      demoDate,
      createdBy: owner,
      createdFromTemplateId: IDS.templates.corporate,
    });
    addActivities(
      pack,
      pid,
      owner,
      demoDate,
      [
        { id: "act_p5_a01", code: "A01", name: "Outreach", categoryId: ac.outreach, start: -200, end: -150, budget: 5_00_000, status: "completed", percentComplete: 100, actualStart: -200, actualEnd: -150 },
        { id: "act_p5_a02", code: "A02", name: "Shortlisting", categoryId: ac.selection, start: -150, end: -100, budget: 4_00_000, status: "completed", percentComplete: 100, actualStart: -150, actualEnd: -100 },
        { id: "act_p5_a03", code: "A03", name: "Finals & prizes", categoryId: ac.events, start: -80, end: -40, budget: 17_00_000, status: "completed", percentComplete: 100, priority: "critical", actualStart: -80, actualEnd: -40 },
        { id: "act_p5_a04", code: "A04", name: "Closure", categoryId: ac.admin, start: -40, end: -30, budget: 4_00_000, status: "completed", percentComplete: 100, actualStart: -40, actualEnd: -30 },
      ],
      true,
    );
  }

  // P6 — SIDBI Seed Fund (active; ~85% grants)
  {
    const pid = IDS.programmes.p6;
    const owner = IDS.users.arjun;
    pack.programmes[pid] = buildProgrammeShell({
      id: pid,
      code: "IIMCIP-SEED-2026-006",
      name: "SIDBI Seed Fund Programme",
      categoryId: IDS.categories.seedFund,
      clientId: IDS.clients.sidbi,
      officeId: IDS.offices.kolkata,
      managerId: owner,
      teamIds: [owner],
      start: -100,
      end: 200,
      budget: 1_50_00_000,
      status: "active",
      demoDate,
      createdBy: owner,
    });
    addActivities(
      pack,
      pid,
      owner,
      demoDate,
      [
        { id: "act_p6_a01", code: "A01", name: "Deal flow & diligence", categoryId: ac.selection, start: -100, end: -40, budget: 8_00_000, status: "completed", percentComplete: 100, actualStart: -100, actualEnd: -40 },
        { id: "act_p6_a02", code: "A02", name: "Seed Disbursement Tranche A", categoryId: ac.seedDisburse, start: -40, end: 40, budget: 60_00_000, status: "in_progress", percentComplete: 70, priority: "critical", actualStart: -40 },
        { id: "act_p6_a03", code: "A03", name: "Seed Disbursement Tranche B", categoryId: ac.seedDisburse, start: 40, end: 140, budget: 67_00_000, status: "not_started", percentComplete: 0, priority: "critical" },
        { id: "act_p6_a04", code: "A04", name: "Monitoring & mentoring", categoryId: ac.mentoring, start: -20, end: 180, budget: 10_00_000, status: "in_progress", percentComplete: 25, actualStart: -20 },
        { id: "act_p6_a05", code: "A05", name: "Closure", categoryId: ac.admin, start: 180, end: 200, budget: 5_00_000, status: "not_started", percentComplete: 0 },
      ],
      true,
    );
    addExpense(pack, {
      id: "exp_p6_grant_1",
      programmeId: pid,
      activityId: "act_p6_a02",
      categoryId: ec.startupGrant,
      description: "SIDBI seed disbursement — Startup 1",
      day: -20,
      amount: 45_00_000,
      status: "verified",
      verifiedAmount: 45_00_000,
      demoDate,
      submittedBy: owner,
    });
    addExpense(pack, {
      id: "exp_p6_grant_2",
      programmeId: pid,
      activityId: "act_p6_a02",
      categoryId: ec.startupGrant,
      description: "SIDBI seed disbursement — Startup 2",
      day: -5,
      amount: 40_00_000,
      status: "submitted",
      demoDate,
      submittedBy: owner,
    });
    addExpense(pack, {
      id: "exp_p6_grant_3",
      programmeId: pid,
      activityId: "act_p6_a02",
      categoryId: ec.startupGrant,
      description: "SIDBI seed disbursement — Startup 3 (pending docs)",
      day: 0,
      amount: 25_00_000,
      status: "draft",
      demoDate,
      submittedBy: owner,
    });
  }

  // P7 — TITAN-NEST draft
  {
    const pid = IDS.programmes.p7;
    const owner = IDS.users.arjun;
    pack.programmes[pid] = buildProgrammeShell({
      id: pid,
      code: "IIMCIP-INC-2026-007",
      name: "TITAN-NEST",
      categoryId: IDS.categories.incubation,
      clientId: IDS.clients.titan,
      officeId: IDS.offices.kolkata,
      managerId: owner,
      teamIds: [owner],
      start: 30,
      end: 300,
      budget: 40_00_000,
      status: "draft",
      demoDate,
      createdBy: owner,
      createdFromTemplateId: IDS.templates.incubation,
      wizardDraft: { step: 5 },
    });
    addActivities(
      pack,
      pid,
      owner,
      demoDate,
      [
        { id: "act_p7_a01", code: "A01", name: "Call for Applications", categoryId: ac.outreach, start: 30, end: 80, budget: 4_00_000, status: "not_started", percentComplete: 0 },
        { id: "act_p7_a02", code: "A02", name: "Selection", categoryId: ac.selection, start: 80, end: 110, budget: 3_00_000, status: "not_started", percentComplete: 0 },
        { id: "act_p7_a03", code: "A03", name: "Curriculum & mentoring", categoryId: ac.capacity, start: 110, end: 250, budget: 25_00_000, status: "not_started", percentComplete: 0 },
        { id: "act_p7_a04", code: "A04", name: "Closure", categoryId: ac.admin, start: 250, end: 300, budget: 8_00_000, status: "not_started", percentComplete: 0 },
      ],
      false,
    );
  }

  // P8 — Tripura immersion pending approval
  {
    const pid = IDS.programmes.p8;
    const owner = IDS.users.kavya;
    pack.programmes[pid] = buildProgrammeShell({
      id: pid,
      code: "IIMCIP-IMM-2026-008",
      name: "Ideathon & Motivation Series — Tripura",
      categoryId: IDS.categories.immersion,
      clientId: IDS.clients.tripura,
      officeId: IDS.offices.agartala,
      managerId: owner,
      teamIds: [owner],
      start: 14,
      end: 60,
      budget: 8_00_000,
      status: "pending_approval",
      demoDate,
      createdBy: owner,
      createdFromTemplateId: IDS.templates.immersion,
    });
    addActivities(
      pack,
      pid,
      owner,
      demoDate,
      [
        { id: "act_p8_a01", code: "A01", name: "Outreach & Motivation Sessions", categoryId: ac.outreach, start: 14, end: 30, budget: 2_00_000, status: "not_started", percentComplete: 0 },
        { id: "act_p8_a02", code: "A02", name: "Ideathon / Hackathon", categoryId: ac.events, start: 28, end: 40, budget: 3_50_000, status: "not_started", percentComplete: 0, priority: "high" },
        { id: "act_p8_a03", code: "A03", name: "Shortlisting", categoryId: ac.selection, start: 40, end: 50, budget: 1_50_000, status: "not_started", percentComplete: 0 },
        { id: "act_p8_a04", code: "A04", name: "Closure", categoryId: ac.admin, start: 50, end: 60, budget: 1_00_000, status: "not_started", percentComplete: 0 },
      ],
      false,
    );
  }

  return pack;
}
