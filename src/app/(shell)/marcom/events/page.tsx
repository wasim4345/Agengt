"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent } from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";

export default function MarcomEventsPage() {
  const activities = useOsStore((s) =>
    Object.values(s.state.activities).filter(
      (a) =>
        a.categoryId === "acat_events" ||
        a.categoryId === "acat_market" ||
        a.categoryId === "acat_investor" ||
        a.categoryId === "acat_events" ||
        a.categoryId === "acat_outreach",
    ),
  );

  return (
    <RoleGate allow={["marcom"]}>
      <PageHeader title="Events" description="Outreach, networking, and events." />
      <div className="flex flex-col gap-2">
        {activities.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted">
                  {formatDate(a.plannedStart)} → {formatDate(a.plannedEnd)}
                </p>
              </div>
              <Badge tone="neutral">{a.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
