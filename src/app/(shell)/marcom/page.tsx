"use client";

import { RoleGate } from "@/components/RoleGate";
import { MarcomDashboard } from "@/components/dashboards/MarcomDashboard";

export default function MarcomHomePage() {
  return (
    <RoleGate allow={["marcom"]}>
      <MarcomDashboard />
    </RoleGate>
  );
}
