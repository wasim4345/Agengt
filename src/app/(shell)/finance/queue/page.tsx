"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent } from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";

export default function FinanceQueuePage() {
  const state = useOsStore((s) => s.state);
  const queue = Object.values(state.expenses).filter(
    (e) => e.status === "submitted",
  );

  return (
    <RoleGate allow={["finance"]}>
      <PageHeader
        title="Approval queue"
        description="Submitted expenses awaiting verification."
      />
      <div className="flex flex-col gap-2">
        {queue.map((e) => (
          <Card key={e.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">{e.description}</p>
                <p className="text-xs text-muted">
                  {formatDate(e.date)}
                  {e.overspendFlag ? " · Overspend flagged" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {formatINR(e.amount)}
                </span>
                <Badge tone="at-risk">submitted</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
