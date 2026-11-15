"use client";

import { RoleGate } from "@/components/RoleGate";
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard";

/** Programme Lead overview — reuses PM dashboard scoped via lead selectors later. */
export default function LeadHomePage() {
  return (
    <RoleGate allow={["programme_lead"]}>
      <ManagerDashboard />
    </RoleGate>
  );
}
