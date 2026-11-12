"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent } from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";

export default function PortfolioTimelinePage() {
  const state = useOsStore((s) => s.state);
  const programmes = Object.values(state.programmes);

  return (
    <RoleGate allow={["leadership"]}>
      <PageHeader
        title="Portfolio timeline"
        description="Programme date ranges from the store. Interactive Gantt arrives in M6."
      />
      <div className="flex flex-col gap-2">
        {programmes.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted">
                  {formatDate(p.startDate)} → {formatDate(p.endDate)}
                </p>
              </div>
              <Badge tone="neutral">{p.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
