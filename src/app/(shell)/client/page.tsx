"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";

export default function ClientHomePage() {
  const state = useOsStore((s) => s.state);
  const user = state.users[state.meta.currentUserId];
  const clientId = user?.clientId;
  const programmes = Object.values(state.programmes).filter(
    (p) => p.clientId === clientId,
  );

  return (
    <RoleGate allow={["client"]}>
      <PageHeader
        title="Programme overview"
        description="Client-visible programmes for the current sponsor persona. Money and internal remarks are omitted."
      />
      <div className="flex flex-col gap-4">
        {programmes.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <Badge tone="on-track">{p.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p className="text-muted">
                {formatDate(p.startDate)} → {formatDate(p.endDate)}
              </p>
              <p>{p.objectives}</p>
              <ul className="list-disc pl-5 text-muted">
                {p.keyDeliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
