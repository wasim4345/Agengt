"use client";

import { RoleGate } from "@/components/RoleGate";
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard";

export default function ManagerHomePage() {
  return (
    <RoleGate allow={["programme_manager"]}>
      <ManagerDashboard />
    </RoleGate>
  );
}
