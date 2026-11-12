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
      colour: "#64748B",
      code: "IMM",
      builtIn: true,
    },
    {
      id: IDS.categories.pre,
      name: "Pre-incubation",
      colour: "#0F766E",
      code: "PRE",
      builtIn: true,
    },
    {
      id: IDS.categories.incubation,
      name: "Incubation",
      colour: "#2563EB",
      code: "INC",
      builtIn: true,
    },
    {
      id: IDS.categories.acceleration,
      name: "Acceleration",
      colour: "#B5543C",
      code: "ACC",
      builtIn: true,
    },
  ];
  return Object.fromEntries(list.map((c) => [c.id, c]));
}

export function buildActivityCategories(): Record<string, ActivityCategory> {
  const list: ActivityCategory[] = [
    { id: IDS.activityCategories.outreach, name: "Outreach", colour: "#0284C7" },
    {
      id: IDS.activityCategories.selection,
      name: "Selection",
      colour: "#7C3AED",
    },
    {
      id: IDS.activityCategories.capacity,
      name: "Capacity Building",
      colour: "#15803D",
    },
    {
      id: IDS.activityCategories.mentoring,
      name: "Mentoring",
      colour: "#CA8A04",
    },
    {
      id: IDS.activityCategories.networking,
      name: "Networking",
      colour: "#DB2777",
    },
    { id: IDS.activityCategories.events, name: "Events", colour: "#B5543C" },
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
    { id: IDS.expenseCategories.misc, name: "Miscellaneous" },
  ];
  return Object.fromEntries(list.map((c) => [c.id, c]));
}
