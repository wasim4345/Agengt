"use client";

import { RoleGate } from "@/components/RoleGate";
import { ReportsCentre } from "@/components/reports/ReportsCentre";

export default function ClientReportsPage() {
  return (
    <RoleGate allow={[]}>
      <ReportsCentre lockedReportId="client_programme" />
    </RoleGate>
  );
}
