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

export function buildTemplates(): Record<string, Template> {
  const ac = IDS.activityCategories;
  const list: Template[] = [
    {
      id: IDS.templates.immersion,
      name: "Immersion",
      description: "6-block immersion programme template",
      categoryId: IDS.categories.immersion,
      builtIn: true,
      activities: [
        act("a1", "Orientation", 0, 5, 10, ac.admin),
        act("a2", "Sector Immersion", 5, 10, 20, ac.outreach),
        act("a3", "Problem Framing", 15, 10, 15, ac.capacity),
        act("a4", "Mentor Clinics", 20, 15, 20, ac.mentoring),
        act("a5", "Showcase", 35, 3, 25, ac.events, "high"),
        act("a6", "Closure", 38, 7, 10, ac.admin),
      ],
      dependencies: [
        { successorKey: "a2", predecessorKey: "a1", type: "FS", lagDays: 0 },
        { successorKey: "a3", predecessorKey: "a2", type: "FS", lagDays: 0 },
        { successorKey: "a5", predecessorKey: "a4", type: "FS", lagDays: 0 },
        { successorKey: "a6", predecessorKey: "a5", type: "FS", lagDays: 0 },
      ],
      milestones: [
        {
          key: "m1",
          name: "Problems framed",
          offsetDays: 25,
          gatingKeys: ["a3"],
        },
        {
          key: "m2",
          name: "Showcase delivered",
          offsetDays: 38,
          gatingKeys: ["a5"],
        },
      ],
    },
    {
      id: IDS.templates.pre,
      name: "Pre-incubation",
      description: "8-block pre-incubation template",
      categoryId: IDS.categories.pre,
      builtIn: true,
      activities: [
        act("a1", "Call for Ideas", 0, 20, 8, ac.outreach),
        act("a2", "Screening", 20, 10, 8, ac.selection),
        act("a3", "Diagnostics", 30, 15, 12, ac.capacity),
        act("a4", "Workshops", 40, 30, 20, ac.capacity, "high"),
        act("a5", "Mentoring", 45, 40, 18, ac.mentoring),
        act("a6", "Market Validation", 70, 20, 14, ac.networking),
        act("a7", "Demo Prep", 85, 10, 12, ac.events),
        act("a8", "Closure", 95, 10, 8, ac.admin),
      ],
      dependencies: [
        { successorKey: "a2", predecessorKey: "a1", type: "FS", lagDays: 0 },
        { successorKey: "a3", predecessorKey: "a2", type: "FS", lagDays: 0 },
        { successorKey: "a4", predecessorKey: "a3", type: "SS", lagDays: 0 },
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
      description: "11-block incubation template (matches flagship shape)",
      categoryId: IDS.categories.incubation,
      builtIn: true,
      activities: [
        act("a1", "Call for Applications", 0, 45, 4, ac.outreach),
        act("a2", "Outreach Sessions", 0, 40, 9, ac.outreach),
        act("a3", "Startup Evaluation", 46, 19, 7, ac.selection),
        act("a4", "Startup Selection", 66, 9, 2, ac.selection, "high"),
        act("a5", "Startup Onboarding", 76, 14, 4, ac.admin),
        act("a6", "Startup Diagnostics", 91, 24, 7, ac.capacity),
        act("a7", "Bootcamps", 100, 60, 22, ac.capacity, "high"),
        act("a8", "Mentoring", 100, 100, 18, ac.mentoring),
        act("a9", "Investor Meet", 165, 15, 11, ac.networking, "high"),
        act("a10", "Demo Day", 220, 5, 13, ac.events, "critical"),
        act("a11", "Programme Closure", 240, 30, 3, ac.admin),
      ],
      dependencies: [
        { successorKey: "a3", predecessorKey: "a1", type: "FS", lagDays: 0 },
        { successorKey: "a5", predecessorKey: "a4", type: "FS", lagDays: 0 },
        { successorKey: "a7", predecessorKey: "a5", type: "SS", lagDays: 0 },
        { successorKey: "a9", predecessorKey: "a7", type: "FS", lagDays: 0 },
        { successorKey: "a11", predecessorKey: "a10", type: "FS", lagDays: 0 },
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
          gatingKeys: ["a10"],
        },
      ],
    },
    {
      id: IDS.templates.acceleration,
      name: "Acceleration",
      description: "10-block acceleration template",
      categoryId: IDS.categories.acceleration,
      builtIn: true,
      activities: [
        act("a1", "Problem Sourcing", 0, 20, 8, ac.outreach),
        act("a2", "Screening", 20, 10, 6, ac.selection),
        act("a3", "Cohort Selection", 30, 10, 6, ac.selection, "high"),
        act("a4", "Product Sprint A", 40, 30, 14, ac.capacity, "high"),
        act("a5", "Product Sprint B", 40, 30, 14, ac.capacity, "high"),
        act("a6", "Corporate Pilots", 70, 40, 18, ac.networking, "critical"),
        act("a7", "Mentor Clinics", 50, 50, 10, ac.mentoring),
        act("a8", "Investor Showcase", 110, 5, 12, ac.events, "high"),
        act("a9", "Impact Review", 115, 15, 6, ac.admin),
        act("a10", "Closure", 130, 20, 6, ac.admin),
      ],
      dependencies: [
        { successorKey: "a2", predecessorKey: "a1", type: "FS", lagDays: 0 },
        { successorKey: "a3", predecessorKey: "a2", type: "FS", lagDays: 0 },
        { successorKey: "a4", predecessorKey: "a3", type: "FS", lagDays: 0 },
        { successorKey: "a6", predecessorKey: "a4", type: "FS", lagDays: 0 },
        { successorKey: "a10", predecessorKey: "a9", type: "FS", lagDays: 0 },
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
      name: "Corporate Sprint (custom)",
      description: "User-made custom sprint template",
      categoryId: IDS.categories.acceleration,
      builtIn: false,
      activities: [
        act("a1", "Briefing", 0, 5, 15, ac.admin),
        act("a2", "Sprint", 5, 20, 55, ac.capacity, "high"),
        act("a3", "Pitch", 25, 3, 20, ac.events, "high"),
        act("a4", "Wrap-up", 28, 7, 10, ac.admin),
      ],
      dependencies: [
        { successorKey: "a2", predecessorKey: "a1", type: "FS", lagDays: 0 },
        { successorKey: "a3", predecessorKey: "a2", type: "FS", lagDays: 0 },
        { successorKey: "a4", predecessorKey: "a3", type: "FS", lagDays: 0 },
      ],
      milestones: [
        {
          key: "m1",
          name: "Pitch complete",
          offsetDays: 28,
          gatingKeys: ["a3"],
        },
      ],
    },
  ];
  return Object.fromEntries(list.map((t) => [t.id, t]));
}
