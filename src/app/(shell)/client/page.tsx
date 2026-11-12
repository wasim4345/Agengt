"use client";

import { RoleGate } from "@/components/RoleGate";
import { ClientDashboard } from "@/components/dashboards/ClientDashboard";

export default function ClientHomePage() {
  return (
    <RoleGate allow={["client"]}>
      <ClientDashboard />
    </RoleGate>
  );
}
