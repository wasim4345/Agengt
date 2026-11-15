import type { Client } from "@/types/domain";
import { IDS } from "./ids";

/** Fictional demo sponsors only — no real organisations or personal contacts. */
export function buildClients(): Record<string, Client> {
  const list: Client[] = [
    {
      id: IDS.clients.balmer,
      name: "Demo Logistics PSU Sponsor",
      type: "psu",
      sector: "PSU (demo)",
      contactName: "Demo sponsor contact",
      contactEmail: "sponsor.contact1@example.invalid",
    },
    {
      id: IDS.clients.hdfc,
      name: "Demo CSR Bank Sponsor",
      type: "csr",
      sector: "Corporate / CSR (demo)",
      contactName: "Demo sponsor contact",
      contactEmail: "sponsor.contact2@example.invalid",
    },
    {
      id: IDS.clients.sidbi,
      name: "Demo Development Finance Sponsor",
      type: "psu",
      sector: "Development finance (demo)",
      contactName: "Demo sponsor contact",
      contactEmail: "sponsor.contact3@example.invalid",
    },
    {
      id: IDS.clients.maruti,
      name: "Demo Automotive OEM Sponsor",
      type: "corporate",
      sector: "Automotive (demo)",
      contactName: "Demo sponsor contact",
      contactEmail: "sponsor.contact4@example.invalid",
    },
    {
      id: IDS.clients.titan,
      name: "Demo Consumer Brand Sponsor",
      type: "corporate",
      sector: "Consumer (demo)",
      contactName: "Demo sponsor contact",
      contactEmail: "sponsor.contact5@example.invalid",
    },
    {
      id: IDS.clients.tbcNe,
      name: "Demo North East Scheme Sponsor",
      type: "government",
      sector: "Regional schemes (demo)",
      contactName: "Demo sponsor contact",
      contactEmail: "sponsor.contact6@example.invalid",
    },
    {
      id: IDS.clients.tbcRegen,
      name: "Demo ReGen Corporate Sponsor",
      type: "corporate",
      sector: "Corporate (demo)",
      contactName: "Demo sponsor contact",
      contactEmail: "sponsor.contact7@example.invalid",
    },
    {
      id: IDS.clients.tripura,
      name: "Demo State Rural Development Sponsor",
      type: "government",
      sector: "State government (demo)",
      contactName: "Demo sponsor contact",
      contactEmail: "sponsor.contact8@example.invalid",
    },
  ];
  return Object.fromEntries(list.map((c) => [c.id, c]));
}
