"use client";

import { RoleGate } from "@/components/RoleGate";
import { ReportsCentre } from "@/components/reports/ReportsCentre";

export default function ReportsPage() {
  return (
    <RoleGate allow={["leadership", "programme_manager", "finance", "client"]}>
      <ReportsCentre />
    </RoleGate>
  );
}
