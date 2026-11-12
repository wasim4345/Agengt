"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { useOsStore } from "@/store/store";
import { programmeFinancials } from "@/selectors/finance";

export default function FinanceHomePage() {
  const state = useOsStore((s) => s.state);
  const pending = Object.values(state.expenses).filter(
    (e) => e.status === "submitted",
  );
  const programmes = Object.values(state.programmes);

  return (
    <RoleGate allow={["finance"]}>
      <PageHeader
        title="Finance dashboard"
        description="Budgets and verification queue preview from live store data."
      />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">
            Pending verification ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {pending.slice(0, 8).map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span>{e.description}</span>
              <span className="font-medium">{formatINR(e.amount)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Programme budgets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {programmes.map((p) => {
            const fin = programmeFinancials(state, p.id);
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0"
              >
                <span>
                  {p.code}{" "}
                  <Badge tone="neutral" className="ml-2">
                    {p.status}
                  </Badge>
                </span>
                <span>
                  Verified {formatINR(fin.verified)} · Pending{" "}
                  {formatINR(fin.pending)}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </RoleGate>
  );
}
