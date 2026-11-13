"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent } from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";

export default function ClientMilestonesPage() {
  const state = useOsStore((s) => s.state);
  const clientId = state.users[state.meta.currentUserId]?.clientId;
  const programmeIds = new Set(
    Object.values(state.programmes)
      .filter((p) => p.clientId === clientId)
      .map((p) => p.id),
  );
  const milestones = Object.values(state.milestones).filter(
    (m) => m.clientVisible && programmeIds.has(m.programmeId),
  );

  return (
    <RoleGate allow={["client"]}>
      <PageHeader
        title="Milestones"
        description="Client-visible milestones only."
      />
      <div className="flex flex-col gap-2">
        {milestones.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted">
                  Target {formatDate(m.targetDate)}
                </p>
              </div>
              <Badge tone={m.manualAchievedAt ? "on-track" : "not-started"}>
                {m.manualAchievedAt ? "Achieved" : "Upcoming"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
