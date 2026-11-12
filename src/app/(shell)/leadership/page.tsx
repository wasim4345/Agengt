"use client";

import { RoleGate } from "@/components/RoleGate";
import { LeadershipDashboard } from "@/components/dashboards/LeadershipDashboard";

export default function LeadershipHomePage() {
  return (
    <RoleGate allow={["leadership"]}>
      <LeadershipDashboard />
    </RoleGate>
  );
}
