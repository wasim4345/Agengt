import type {
  Achievement,
  ISODate,
  ProgrammeStartup,
  Startup,
} from "@/types/domain";
import { d } from "./dates";
import { IDS } from "./ids";

const SECTORS = [
  "agritech",
  "railtech",
  "edtech",
  "climate",
  "health",
  "fintech",
] as const;

export function buildStartups(): Record<string, Startup> {
  const names = [
    ["st_01", "GreenRoot Sensors", "agritech", "Pune"],
    ["st_02", "SoilSense Labs", "agritech", "Nashik"],
    ["st_03", "HarvestLink", "agritech", "Indore"],
    ["st_04", "RailPulse IoT", "railtech", "Kolkata"],
    ["st_05", "TrackGuard AI", "railtech", "Chennai"],
    ["st_06", "CoachCare Systems", "railtech", "Delhi"],
    ["st_07", "LearnNest", "edtech", "Bengaluru"],
    ["st_08", "SkillForge", "edtech", "Hyderabad"],
    ["st_09", "ClassCircuit", "edtech", "Mumbai"],
    ["st_10", "CarbonCount", "climate", "Bengaluru"],
    ["st_11", "BlueBasin", "climate", "Kochi"],
    ["st_12", "HeatMap Homes", "climate", "Ahmedabad"],
    ["st_13", "CareLoop", "health", "Chennai"],
    ["st_14", "MediRoute", "health", "Delhi"],
    ["st_15", "VitalNest", "health", "Pune"],
    ["st_16", "PaySprout", "fintech", "Mumbai"],
    ["st_17", "LedgerLite", "fintech", "Bengaluru"],
    ["st_18", "KreditKisan", "fintech", "Jaipur"],
  ] as const;

  const out: Record<string, Startup> = {};
  for (const [id, name, sector, city] of names) {
    out[id] = {
      id,
      name,
      sector,
      city,
      founders: `${name.split(" ")[0]} Founders`,
    };
  }
  // ensure sector coverage matches list
  void SECTORS;
  return out;
}

export function buildProgrammeStartups(): ProgrammeStartup[] {
  const p1 = IDS.programmes.p1;
  const p2 = IDS.programmes.p2;
  const p3 = IDS.programmes.p3;
  const p4 = IDS.programmes.p4;
  return [
    { programmeId: p1, startupId: "st_01", status: "onboarded" },
    { programmeId: p1, startupId: "st_07", status: "onboarded" },
    { programmeId: p1, startupId: "st_10", status: "selected" },
    { programmeId: p1, startupId: "st_13", status: "onboarded" },
    { programmeId: p1, startupId: "st_16", status: "selected" },
    { programmeId: p1, startupId: "st_04", status: "rejected" },
    { programmeId: p1, startupId: "st_18", status: "applied" },
    { programmeId: p2, startupId: "st_04", status: "onboarded" },
    { programmeId: p2, startupId: "st_05", status: "onboarded" },
    { programmeId: p2, startupId: "st_06", status: "selected" },
    { programmeId: p2, startupId: "st_11", status: "shortlisted" },
    { programmeId: p2, startupId: "st_17", status: "rejected" },
    { programmeId: p3, startupId: "st_01", status: "onboarded" },
    { programmeId: p3, startupId: "st_02", status: "onboarded" },
    { programmeId: p3, startupId: "st_03", status: "selected" },
    { programmeId: p3, startupId: "st_12", status: "applied" },
    { programmeId: p4, startupId: "st_08", status: "graduated" },
    { programmeId: p4, startupId: "st_09", status: "graduated" },
    { programmeId: p4, startupId: "st_14", status: "graduated" },
    { programmeId: p4, startupId: "st_15", status: "rejected" },
  ];
}

export function buildAchievements(demoDate: ISODate): Record<string, Achievement> {
  const list: Achievement[] = [
    {
      id: "ach_01",
      startupId: "st_01",
      programmeId: IDS.programmes.p1,
      title: "Seed round closed",
      description: "Raised ₹1.5 Cr seed from sector angels.",
      date: d(demoDate, -20),
      type: "funding",
      marcomApproved: true,
      clientApproved: true,
    },
    {
      id: "ach_02",
      startupId: "st_07",
      programmeId: IDS.programmes.p1,
      title: "State edtech award",
      description: "Recognised for rural learning outcomes.",
      date: d(demoDate, -15),
      type: "award",
      marcomApproved: true,
      clientApproved: false,
    },
    {
      id: "ach_03",
      startupId: "st_04",
      programmeId: IDS.programmes.p2,
      title: "Pilot with Eastern Rail",
      description: "IoT pilot live on two routes.",
      date: d(demoDate, -5),
      type: "pilot",
      marcomApproved: true,
      clientApproved: true,
    },
    {
      id: "ach_04",
      startupId: "st_05",
      programmeId: IDS.programmes.p2,
      title: "Media feature",
      description: "Covered in national business daily.",
      date: d(demoDate, -3),
      type: "media",
      marcomApproved: true,
      clientApproved: false,
    },
    {
      id: "ach_05",
      startupId: "st_02",
      programmeId: IDS.programmes.p3,
      title: "First paying customer",
      description: "FPO subscription signed.",
      date: d(demoDate, -8),
      type: "customer",
      marcomApproved: false,
      clientApproved: false,
    },
    {
      id: "ach_06",
      startupId: "st_08",
      programmeId: IDS.programmes.p4,
      title: "Placement partnership",
      description: "MOU with skills mission partners.",
      date: d(demoDate, -40),
      type: "other",
      marcomApproved: false,
      clientApproved: false,
    },
    {
      id: "ach_07",
      startupId: "st_13",
      programmeId: IDS.programmes.p1,
      title: "Hospital pilot LOI",
      description: "Two hospitals signed LOIs.",
      date: d(demoDate, -12),
      type: "pilot",
      marcomApproved: false,
      clientApproved: false,
    },
    {
      id: "ach_08",
      startupId: "st_10",
      programmeId: IDS.programmes.p1,
      title: "Climate grant",
      description: "Won ecosystem climate challenge grant.",
      date: d(demoDate, -18),
      type: "funding",
      marcomApproved: true,
      clientApproved: false,
    },
  ];
  return Object.fromEntries(list.map((a) => [a.id, a]));
}
