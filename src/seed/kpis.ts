import type { Kpi } from "@/types/domain";
import { IDS } from "./ids";

/** Per-programme KPI targets from deck benchmarks (doc 08 §4). */
export function buildKpis(): Record<string, Kpi> {
  const list: Kpi[] = [
    // P1 Balmer Lawrie
    { id: "kpi_p1_1", programmeId: IDS.programmes.p1, name: "Startups supported", unit: "count", target: 4, sortOrder: 1 },
    { id: "kpi_p1_2", programmeId: IDS.programmes.p1, name: "Bootcamps conducted", unit: "count", target: 4, sortOrder: 2 },
    { id: "kpi_p1_3", programmeId: IDS.programmes.p1, name: "Mentors engaged", unit: "count", target: 20, sortOrder: 3 },
    { id: "kpi_p1_4", programmeId: IDS.programmes.p1, name: "Investors engaged", unit: "count", target: 10, sortOrder: 4 },
    { id: "kpi_p1_5", programmeId: IDS.programmes.p1, name: "Grants disbursed", unit: "inr", target: 10_00_000, sortOrder: 5 },
    // P2 HDFC Udgama
    { id: "kpi_p2_1", programmeId: IDS.programmes.p2, name: "Applications received", unit: "count", target: 97, sortOrder: 1 },
    { id: "kpi_p2_2", programmeId: IDS.programmes.p2, name: "Startups selected", unit: "count", target: 20, sortOrder: 2 },
    { id: "kpi_p2_3", programmeId: IDS.programmes.p2, name: "Startups funded", unit: "count", target: 4, sortOrder: 3 },
    { id: "kpi_p2_4", programmeId: IDS.programmes.p2, name: "Grants disbursed", unit: "inr", target: 28_00_000, sortOrder: 4 },
    // P3 FOCUS NE
    { id: "kpi_p3_1", programmeId: IDS.programmes.p3, name: "Startups selected", unit: "count", target: 12, sortOrder: 1 },
    { id: "kpi_p3_2", programmeId: IDS.programmes.p3, name: "Capacity-building sessions", unit: "count", target: 8, sortOrder: 2 },
    { id: "kpi_p3_3", programmeId: IDS.programmes.p3, name: "Mentors engaged", unit: "count", target: 25, sortOrder: 3 },
    { id: "kpi_p3_4", programmeId: IDS.programmes.p3, name: "Investors engaged", unit: "count", target: 11, sortOrder: 4 },
    // P4 ReGen
    { id: "kpi_p4_1", programmeId: IDS.programmes.p4, name: "Applications received", unit: "count", target: 134, sortOrder: 1 },
    { id: "kpi_p4_2", programmeId: IDS.programmes.p4, name: "Startups selected", unit: "count", target: 20, sortOrder: 2 },
    { id: "kpi_p4_3", programmeId: IDS.programmes.p4, name: "Bootcamps conducted", unit: "count", target: 2, sortOrder: 3 },
    // P5 Maruti
    { id: "kpi_p5_1", programmeId: IDS.programmes.p5, name: "Applications received", unit: "count", target: 700, sortOrder: 1 },
    { id: "kpi_p5_2", programmeId: IDS.programmes.p5, name: "Prize money awarded", unit: "inr", target: 17_00_000, sortOrder: 2 },
    // P6 SIDBI
    { id: "kpi_p6_1", programmeId: IDS.programmes.p6, name: "Startups funded", unit: "count", target: 3, sortOrder: 1 },
    { id: "kpi_p6_2", programmeId: IDS.programmes.p6, name: "Fund disbursed", unit: "inr", target: 1_38_00_000, sortOrder: 2 },
    // P7 TITAN
    { id: "kpi_p7_1", programmeId: IDS.programmes.p7, name: "Startups to be selected", unit: "count", target: 40, sortOrder: 1 },
    { id: "kpi_p7_2", programmeId: IDS.programmes.p7, name: "Valid entries screened", unit: "count", target: 650, sortOrder: 2 },
    // P8 Tripura
    { id: "kpi_p8_1", programmeId: IDS.programmes.p8, name: "Participants reached", unit: "count", target: 200, sortOrder: 1 },
    { id: "kpi_p8_2", programmeId: IDS.programmes.p8, name: "Ideas shortlisted", unit: "count", target: 30, sortOrder: 2 },
  ];
  return Object.fromEntries(list.map((k) => [k.id, k]));
}
