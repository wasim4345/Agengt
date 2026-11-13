"use client";

import { RoleGate } from "@/components/RoleGate";
import { ReportsCentre } from "@/components/reports/ReportsCentre";

export default function ClientReportsPage() {
  return (
    <RoleGate allow={["client"]}>
      <ReportsCentre lockedReportId="client_programme" />
    </RoleGate>
  );
}
