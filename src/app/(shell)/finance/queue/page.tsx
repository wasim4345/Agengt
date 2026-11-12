"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanceQueue } from "@/components/finance/FinanceQueue";

export default function FinanceQueuePage() {
  return (
    <RoleGate allow={["finance"]}>
      <PageHeader
        title="Approval queue"
        description="Verify, partially approve, or reject submitted expenses."
      />
      <FinanceQueue />
    </RoleGate>
  );
}
