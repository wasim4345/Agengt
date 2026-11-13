"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { useOsStore } from "@/store/store";
import { programmeFinancials } from "@/selectors/finance";

export default function LeadershipHomePage() {
  const state = useOsStore((s) => s.state);
  const programmes = Object.values(state.programmes);
  const active = programmes.filter((p) => p.status === "active").length;
  const completed = programmes.filter((p) => p.status === "completed").length;
  const totalBudget = programmes.reduce((sum, p) => sum + p.totalBudget, 0);
  const verified = programmes.reduce(
    (sum, p) => sum + programmeFinancials(state, p.id).verified,
    0,
  );
  const delayed = Object.values(state.activities).filter(
    (a) => a.status === "delayed",
  ).length;

  return (
    <RoleGate allow={["leadership"]}>
      <PageHeader
        title="Leadership dashboard"
        description="Portfolio overview from the central mock store."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Programmes" value={String(programmes.length)} />
        <Kpi label="Active" value={String(active)} />
        <Kpi label="Completed" value={String(completed)} />
        <Kpi label="Delayed activities" value={String(delayed)} />
        <Kpi label="Total budget" value={formatINR(totalBudget)} />
        <Kpi label="Verified expenditure" value={formatINR(verified)} />
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Programmes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {programmes.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {p.code} · {p.name}
                </p>
                <p className="text-xs text-muted">{formatINR(p.totalBudget)}</p>
              </div>
              <Badge tone="in-progress">{p.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </RoleGate>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <p className="text-xs text-muted">{label}</p>
        <CardTitle className="text-lg">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
