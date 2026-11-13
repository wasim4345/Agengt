import type { Client } from "@/types/domain";
import { IDS } from "./ids";

export function buildClients(): Record<string, Client> {
  const list: Client[] = [
    {
      id: IDS.clients.vanguard,
      name: "Vanguard Industries Foundation",
      sector: "Corporate CSR",
      contactName: "Rahul Mehta",
      contactEmail: "rahul.mehta@vanguard.demo",
    },
    {
      id: IDS.clients.eastern,
      name: "Eastern Rail Innovation Cell",
      sector: "Railtech",
      contactName: "Anita Kulkarni",
      contactEmail: "anita.kulkarni@eastern.demo",
    },
    {
      id: IDS.clients.greenfield,
      name: "Greenfield Agri Trust",
      sector: "Agritech",
      contactName: "Dev Malhotra",
      contactEmail: "dev.malhotra@greenfield.demo",
    },
    {
      id: IDS.clients.skills,
      name: "State Skills Mission",
      sector: "Skilling",
      contactName: "Sneha Iyer",
      contactEmail: "sneha.iyer@skills.demo",
    },
  ];
  return Object.fromEntries(list.map((c) => [c.id, c]));
}
