import type {
  ActivityCategory,
  Category,
  ExpenseCategory,
} from "@/types/domain";
import { IDS } from "./ids";

export function buildCategories(): Record<string, Category> {
  const list: Category[] = [
    {
      id: IDS.categories.immersion,
      name: "Immersion",
      colour: "#6B7280",
      code: "IMM",
      builtIn: true,
      stage: "awareness",
    },
    {
      id: IDS.categories.pre,
      name: "Pre-incubation",
      colour: "#0F766E",
      code: "PRE",
      builtIn: true,
      stage: "idea_to_prototype",
    },
    {
      id: IDS.categories.incubation,
      name: "Incubation",
      colour: "#17719F",
      code: "INC",
      builtIn: true,
      stage: "prototype_to_revenue",
    },
    {
      id: IDS.categories.acceleration,
      name: "Acceleration",
      colour: "#104B92",
      code: "ACC",
      builtIn: true,
      stage: "growth",
    },
    {
      id: IDS.categories.seedFund,
      name: "Seed Fund",
      colour: "#C00000",
      code: "SEED",
      builtIn: false,
      stage: "prototype_to_revenue",
    },
    {
      id: IDS.categories.challenge,
      name: "Challenge / Idea Hunt",
      colour: "#E97132",
      code: "CHAL",
      builtIn: false,
      stage: "awareness",
    },
  ];
  return Object.fromEntries(list.map((c) => [c.id, c]));
}

export function buildActivityCategories(): Record<string, ActivityCategory> {
  const list: ActivityCategory[] = [
    { id: IDS.activityCategories.outreach, name: "Outreach", colour: "#0070C0" },
    {
      id: IDS.activityCategories.selection,
      name: "Selection",
      colour: "#104B92",
    },
    {
      id: IDS.activityCategories.capacity,
      name: "Capacity Building",
      colour: "#196B24",
    },
    {
      id: IDS.activityCategories.mentoring,
      name: "Mentoring",
      colour: "#E97132",
    },
    {
      id: IDS.activityCategories.market,
      name: "Market Connect",
      colour: "#17719F",
    },
    {
      id: IDS.activityCategories.investor,
      name: "Investor / Funding Connect",
      colour: "#0F2D51",
    },
    { id: IDS.activityCategories.events, name: "Events", colour: "#C00000" },
    {
      id: IDS.activityCategories.seedDisburse,
      name: "Seed Funding Disbursement",
      colour: "#DC1921",
    },
    {
      id: IDS.activityCategories.admin,
      name: "Administration",
      colour: "#6B7280",
    },
  ];
  return Object.fromEntries(list.map((c) => [c.id, c]));
}

export function buildExpenseCategories(): Record<string, ExpenseCategory> {
  const list: ExpenseCategory[] = [
    { id: IDS.expenseCategories.venue, name: "Venue" },
    { id: IDS.expenseCategories.travel, name: "Travel" },
    { id: IDS.expenseCategories.honorarium, name: "Honorarium" },
    { id: IDS.expenseCategories.marketing, name: "Marketing" },
    { id: IDS.expenseCategories.catering, name: "Catering" },
    { id: IDS.expenseCategories.technology, name: "Technology" },
    { id: IDS.expenseCategories.printing, name: "Printing" },
    {
      id: IDS.expenseCategories.startupGrant,
      name: "Startup Grant / Seed Disbursement",
    },
    { id: IDS.expenseCategories.misc, name: "Miscellaneous" },
  ];
  return Object.fromEntries(list.map((c) => [c.id, c]));
}
