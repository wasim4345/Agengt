"use client";

import { RoleGate } from "@/components/RoleGate";
import { FinanceDashboard } from "@/components/dashboards/FinanceDashboard";

export default function FinanceHomePage() {
  return (
    <RoleGate allow={["leadership", "programme_lead", "programme_manager"]}>
      <FinanceDashboard />
    </RoleGate>
  );
}
