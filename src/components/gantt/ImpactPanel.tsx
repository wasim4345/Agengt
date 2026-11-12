"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";

export function ImpactPanel({
  sourceActivityId,
  onApplied,
  onDismissed,
}: {
  sourceActivityId: ID | null;
  onApplied?: () => void;
  onDismissed?: () => void;
}) {
  const state = useOsStore((s) => s.state);
  const applyImpacts = useOsStore((s) => s.applyImpacts);
  const dismissImpacts = useOsStore((s) => s.dismissImpacts);

  if (!sourceActivityId) return null;

  const proposals = Object.values(state.delayImpacts).filter(
    (i) =>
      i.sourceActivityId === sourceActivityId && i.status === "proposed",
  );

  if (proposals.length === 0) return null;

  const source = state.activities[sourceActivityId];

  return (
    <Card className="border-accent/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            Downstream impact
            {source ? ` from ${source.code}` : ""}
          </CardTitle>
          <Badge tone="delayed">{proposals.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto text-sm">
          {proposals.map((p) => {
            const act = state.activities[p.affectedActivityId];
            return (
              <li
                key={p.id}
                className="rounded-md border border-border px-3 py-2"
              >
                <p className="font-medium">
                  {act?.code} {act?.name}
                </p>
                <p className="text-xs text-muted">
                  {formatDate(p.originalStart)} → {formatDate(p.originalEnd)}{" "}
                  becomes {formatDate(p.projectedStart)} →{" "}
                  {formatDate(p.projectedEnd)} (+{p.shiftDays}d)
                  {p.exceedsProgrammeEnd ? " · exceeds programme end" : ""}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              applyImpacts(sourceActivityId, "all");
              onApplied?.();
            }}
          >
            Apply all / Accept shift
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              dismissImpacts(sourceActivityId, "all");
              onDismissed?.();
            }}
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
