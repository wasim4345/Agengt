"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { alerts } from "@/selectors/financeRole";
import { useOsStore } from "@/store/store";

export function OverspendAlerts() {
  const state = useOsStore((s) => s.state);
  const items = alerts(state);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Overspend alerts ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted">No overspend alerts.</p>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>{a.text}</span>
              <Badge
                tone={
                  a.level === "critical" || a.level === "breach"
                    ? "delayed"
                    : "at-risk"
                }
              >
                {a.level}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
