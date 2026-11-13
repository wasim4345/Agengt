import type { Client } from "@/types/domain";
import { IDS } from "./ids";

export function buildClients(): Record<string, Client> {
  const list: Client[] = [
    {
      id: IDS.clients.balmer,
      name: "Balmer Lawrie & Co. Ltd.",
      type: "psu",
      sector: "PSU",
      contactName: "Rahul Mehta",
      contactEmail: "rahul.mehta@balmer.demo",
    },
    {
      id: IDS.clients.hdfc,
      name: "HDFC Bank",
      type: "csr",
      sector: "Corporate / CSR",
      contactName: "Anita Kulkarni",
      contactEmail: "anita.kulkarni@hdfc.demo",
    },
    {
      id: IDS.clients.sidbi,
      name: "SIDBI",
      type: "psu",
      sector: "Development finance",
      contactName: "Dev Malhotra",
      contactEmail: "dev.malhotra@sidbi.demo",
    },
    {
      id: IDS.clients.maruti,
      name: "Maruti Suzuki India Ltd.",
      type: "corporate",
      sector: "Automotive",
      contactName: "Sneha Iyer",
      contactEmail: "sneha.iyer@maruti.demo",
    },
    {
      id: IDS.clients.titan,
      name: "Titan Company Ltd.",
      type: "corporate",
      sector: "Consumer",
      contactName: "Neha Shah",
      contactEmail: "neha.shah@titan.demo",
    },
    {
      id: IDS.clients.tbcNe,
      name: "Sponsor TBC — North East",
      type: "government",
      sector: "North East schemes",
      contactName: "Vikram Das",
      contactEmail: "vikram.das@ne.demo",
    },
    {
      id: IDS.clients.tbcRegen,
      name: "Sponsor TBC — ReGen",
      type: "corporate",
      sector: "Corporate",
      contactName: "Farah Khan",
      contactEmail: "farah.khan@regen.demo",
    },
    {
      id: IDS.clients.tripura,
      name: "Government of Tripura (Rural Development)",
      type: "government",
      sector: "State government",
      contactName: "Imran Ali",
      contactEmail: "imran.ali@tripura.demo",
    },
  ];
  return Object.fromEntries(list.map((c) => [c.id, c]));
}
