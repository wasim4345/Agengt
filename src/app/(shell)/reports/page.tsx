"use client";

import { Suspense } from "react";
import { RoleGate } from "@/components/RoleGate";
import { ReportsCentre } from "@/components/reports/ReportsCentre";
import { Skeleton } from "@/components/ui";

export default function ReportsPage() {
  return (
    <RoleGate allow={["leadership", "programme_manager", "finance", "client"]}>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <ReportsCentre />
      </Suspense>
    </RoleGate>
  );
}
