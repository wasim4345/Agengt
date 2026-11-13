"use client";

import { RoleGate } from "@/components/RoleGate";
import { FinanceDashboard } from "@/components/dashboards/FinanceDashboard";

export default function FinanceHomePage() {
  return (
    <RoleGate allow={["finance"]}>
      <FinanceDashboard />
    </RoleGate>
  );
}
