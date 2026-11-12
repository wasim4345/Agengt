"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";

const REPORTS = [
  "Programme Progress",
  "Activity Completion",
  "Financial Utilisation",
  "Milestone Achievement",
  "Client Programme Report",
  "Leadership Summary",
  "Programme Closure",
];

export default function ReportsPage() {
  const demoDate = useOsStore((s) => s.state.meta.demoDate);
  const role = useOsStore((s) => s.state.meta.currentRole);
  const cards =
    role === "client"
      ? REPORTS.filter((r) => r === "Client Programme Report")
      : REPORTS;

  return (
    <RoleGate allow={["leadership", "programme_manager", "finance"]}>
      <PageHeader
        title="Reports centre"
        description={`Live previews arrive in M10. Data as of ${formatDate(demoDate)}.`}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((name) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="text-base">{name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">
                Will render from selectors in M10. Catalogue is role-filtered now.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
