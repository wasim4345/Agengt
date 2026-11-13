import type { Template } from "@/types/domain";
import { IDS } from "./ids";

type Act = Template["activities"][number];

function act(
  key: string,
  name: string,
  startOffsetDays: number,
  durationDays: number,
  budgetPct: number,
  activityCategoryId: string,
  priority: Act["priority"] = "medium",
): Act {
  return {
    key,
    name,
    description: `${name} block`,
    activityCategoryId,
    startOffsetDays,
    durationDays,
    budgetPct,
    expectedOutput: `${name} deliverables`,
    priority,
  };
}

/** Templates refreshed per doc 08 P-CTX-06. */
export function buildTemplates(): Record<string, Template> {
  const ac = IDS.activityCategories;
  const list: Template[] = [
    {
      id: IDS.templates.immersion,
      name: "Immersion",
      description:
        "Awareness — outreach & motivation, ideathon/hackathon, shortlisting, closure",
      categoryId: IDS.categories.immersion,
      builtIn: true,
      activities: [
        act("a1", "Outreach & Motivation Sessions", 0, 20, 25, ac.outreach),
        act("a2", "Ideathon / Hackathon", 15, 10, 35, ac.events, "high"),
        act("a3", "Shortlisting", 25, 10, 20, ac.selection),
        act("a4", "Closure", 35, 10, 20, ac.admin),
      ],
      dependencies: [
        { successorKey: "a2", predecessorKey: "a1", type: "SS", lagDays: 0 },
        { successorKey: "a3", predecessorKey: "a2", type: "FS", lagDays: 0 },
        { successorKey: "a4", predecessorKey: "a3", type: "FS", lagDays: 0 },
      ],
      milestones: [
        {
          key: "m1",
          name: "Ideathon delivered",
          offsetDays: 25,
          gatingKeys: ["a2"],
        },
        {
          key: "m2",
          name: "Shortlist locked",
          offsetDays: 35,
          gatingKeys: ["a3"],
        },
      ],
    },
    {
      id: IDS.templates.pre,
      name: "Pre-incubation",
      description:
        "Idea→Prototype — mentoring, market connect, funding connect",
      categoryId: IDS.categories.pre,
      builtIn: true,
      activities: [
        act("a1", "Call for Ideas", 0, 20, 8, ac.outreach),
        act("a2", "Screening", 20, 10, 8, ac.selection),
        act("a3", "Diagnostics", 30, 15, 12, ac.capacity),
        act("a4", "Workshops", 40, 30, 16, ac.capacity, "high"),
        act("a5", "Mentoring", 45, 40, 18, ac.mentoring),
        act("a6", "Market Connect", 70, 20, 14, ac.market),
        act("a7", "Funding Connect", 80, 15, 14, ac.investor, "high"),
        act("a8", "Closure", 95, 10, 10, ac.admin),
      ],
      dependencies: [
        { successorKey: "a2", predecessorKey: "a1", type: "FS", lagDays: 0 },
        { successorKey: "a3", predecessorKey: "a2", type: "FS", lagDays: 0 },
        { successorKey: "a6", predecessorKey: "a5", type: "SS", lagDays: 0 },
        { successorKey: "a8", predecessorKey: "a7", type: "FS", lagDays: 0 },
      ],
      milestones: [
        {
          key: "m1",
          name: "Cohort onboarded",
          offsetDays: 45,
          gatingKeys: ["a3"],
        },
        {
          key: "m2",
          name: "Validation complete",
          offsetDays: 90,
          gatingKeys: ["a6"],
        },
      ],
    },
    {
      id: IDS.templates.incubation,
      name: "Incubation",
      description:
        "Prototype→Revenue — curriculum, seed disbursement, investor meet, demo day",
      categoryId: IDS.categories.incubation,
      builtIn: true,
      activities: [
        act("a1", "Call for Applications", 0, 45, 4, ac.outreach),
        act("a2", "Outreach Sessions", 0, 40, 8, ac.outreach),
        act("a3", "Startup Evaluation", 46, 19, 6, ac.selection),
        act("a4", "Startup Selection", 66, 9, 2, ac.selection, "high"),
        act("a5", "Startup Onboarding", 76, 14, 4, ac.admin),
        act("a6", "Capacity Building Curriculum", 91, 40, 12, ac.capacity, "high"),
        act("a7", "Bootcamps", 100, 60, 16, ac.capacity, "high"),
        act("a8", "Mentoring", 100, 100, 14, ac.mentoring),
        act("a9", "Seed Funding Disbursement", 120, 60, 12, ac.seedDisburse, "critical"),
        act("a10", "Investor Meet", 165, 15, 10, ac.investor, "high"),
        act("a11", "Demo Day", 220, 5, 8, ac.events, "critical"),
        act("a12", "Programme Closure", 240, 30, 4, ac.admin),
      ],
      dependencies: [
        { successorKey: "a3", predecessorKey: "a1", type: "FS", lagDays: 0 },
        { successorKey: "a5", predecessorKey: "a4", type: "FS", lagDays: 0 },
        { successorKey: "a7", predecessorKey: "a5", type: "SS", lagDays: 0 },
        { successorKey: "a10", predecessorKey: "a7", type: "FS", lagDays: 0 },
        { successorKey: "a12", predecessorKey: "a11", type: "FS", lagDays: 0 },
      ],
      milestones: [
        {
          key: "m1",
          name: "Cohort selected",
          offsetDays: 75,
          gatingKeys: ["a4"],
        },
        {
          key: "m5",
          name: "Demo Day delivered",
          offsetDays: 225,
          gatingKeys: ["a11"],
        },
      ],
    },
    {
      id: IDS.templates.acceleration,
      name: "Acceleration",
      description:
        "Growth — sourcing, screening, selection, bootcamps, pilots, investor showcase",
      categoryId: IDS.categories.acceleration,
      builtIn: true,
      activities: [
        act("a1", "Sourcing", 0, 20, 8, ac.outreach),
        act("a2", "Screening", 20, 10, 6, ac.selection),
        act("a3", "Selection", 30, 10, 6, ac.selection, "high"),
        act("a4", "Bootcamps", 40, 30, 16, ac.capacity, "high"),
        act("a5", "Mentoring", 50, 50, 12, ac.mentoring),
        act("a6", "Corporate / Market Pilots", 70, 40, 20, ac.market, "critical"),
        act("a7", "Investor Showcase", 110, 5, 14, ac.investor, "high"),
        act("a8", "Impact Review", 115, 15, 8, ac.admin),
        act("a9", "Closure", 130, 20, 10, ac.admin),
      ],
      dependencies: [
        { successorKey: "a2", predecessorKey: "a1", type: "FS", lagDays: 0 },
        { successorKey: "a3", predecessorKey: "a2", type: "FS", lagDays: 0 },
        { successorKey: "a4", predecessorKey: "a3", type: "FS", lagDays: 0 },
        { successorKey: "a6", predecessorKey: "a4", type: "FS", lagDays: 0 },
        { successorKey: "a9", predecessorKey: "a8", type: "FS", lagDays: 0 },
      ],
      milestones: [
        {
          key: "m1",
          name: "Cohort locked",
          offsetDays: 40,
          gatingKeys: ["a3"],
        },
        {
          key: "m2",
          name: "Pilots live",
          offsetDays: 100,
          gatingKeys: ["a6"],
        },
      ],
    },
    {
      id: IDS.templates.corporate,
      name: "Corporate custom",
      description: "Lightweight custom template for CSR / idea-hunt variants",
      categoryId: IDS.categories.challenge,
      builtIn: false,
      activities: [
        act("a1", "Briefing", 0, 10, 15, ac.outreach),
        act("a2", "Delivery Sprint", 10, 40, 55, ac.capacity, "high"),
        act("a3", "Review", 50, 15, 20, ac.admin),
        act("a4", "Handover", 65, 10, 10, ac.admin),
      ],
      dependencies: [
        { successorKey: "a2", predecessorKey: "a1", type: "FS", lagDays: 0 },
        { successorKey: "a3", predecessorKey: "a2", type: "FS", lagDays: 0 },
        { successorKey: "a4", predecessorKey: "a3", type: "FS", lagDays: 0 },
      ],
      milestones: [
        {
          key: "m1",
          name: "Sprint complete",
          offsetDays: 50,
          gatingKeys: ["a2"],
        },
      ],
    },
  ];
  return Object.fromEntries(list.map((t) => [t.id, t]));
}
