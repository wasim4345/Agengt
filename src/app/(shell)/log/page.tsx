"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent } from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";

export default function ActivityLogPage() {
  const log = useOsStore((s) => s.state.log);

  return (
    <RoleGate allow={["leadership"]}>
      <PageHeader
        title="Activity log"
        description="Simulated audit trail of store mutations."
      />
      <Badge tone="neutral" className="mb-4">
        Simulated
      </Badge>
      <div className="flex flex-col gap-2">
        {log.slice(0, 40).map((entry) => (
          <Card key={entry.id}>
            <CardContent className="py-3">
              <p className="text-sm font-medium">{entry.summary}</p>
              <p className="text-xs text-muted">
                {entry.action} · {entry.entity}/{entry.entityId} ·{" "}
                {formatDate(entry.at.slice(0, 10))} · {entry.role}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
