import type { Office } from "@/types/domain";
import { IDS } from "./ids";

export function buildOffices(): Record<string, Office> {
  const list: Office[] = [
    {
      id: IDS.offices.kolkata,
      name: "Kolkata",
      state: "West Bengal",
      isHq: true,
    },
    { id: IDS.offices.guwahati, name: "Guwahati", state: "Assam" },
    { id: IDS.offices.nongpoh, name: "Nongpoh", state: "Meghalaya" },
    { id: IDS.offices.shillong, name: "Shillong", state: "Meghalaya" },
    { id: IDS.offices.agartala, name: "Agartala", state: "Tripura" },
    { id: IDS.offices.tura, name: "Tura", state: "Meghalaya" },
    { id: IDS.offices.ranchi, name: "Ranchi", state: "Jharkhand" },
    { id: IDS.offices.gangtok, name: "Gangtok", state: "Sikkim" },
  ];
  return Object.fromEntries(list.map((o) => [o.id, o]));
}
