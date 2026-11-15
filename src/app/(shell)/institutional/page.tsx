"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui";

/** Placeholder — filled in Amendment 10 Step 6. */
export default function InstitutionalIntelligencePage() {
  return (
    <RoleGate allow={["leadership"]}>
      <PageHeader
        title="Institutional Intelligence"
        description="Rule-based analysis across the filtered portfolio."
      />
      <Card>
        <CardContent className="py-6 text-sm text-muted">
          Institutional Intelligence sections will appear here (Amendment 10).
          Programme Intelligence lives inside each programme workspace.
        </CardContent>
      </Card>
    </RoleGate>
  );
}
