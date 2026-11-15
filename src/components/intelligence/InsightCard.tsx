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
import { navigate } from "@/lib/basePath";
import type { Insight, InsightState } from "@/types/domain";

const SEVERITY_TONE = {
  critical: "danger",
  high: "warning",
  medium: "at-risk",
  low: "neutral",
} as const;

const KIND_LABEL = {
  fact: "Fact",
  calculated: "Calculated",
  estimate: "Estimate",
} as const;

export function InsightCard({
  insight,
  state,
  onAcknowledge,
  onAction,
  onDismiss,
}: {
  insight: Insight;
  state?: InsightState;
  onAcknowledge?: () => void;
  onAction?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <Card data-testid={`insight-${insight.key}`} className="border-border">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge tone={SEVERITY_TONE[insight.severity]}>
              {insight.severity}
            </Badge>
            <Badge tone="info">{insight.ruleId}</Badge>
            <Badge tone="neutral">{insight.category}</Badge>
            {state ? (
              <Badge tone="success">{state.status}</Badge>
            ) : null}
          </div>
          <CardTitle className="text-base">{insight.title}</CardTitle>
        </div>
        <p className="text-xs text-muted">
          Due {formatDate(insight.suggestedDueDate)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>{insight.explanation}</p>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
            Evidence
          </p>
          <ul className="space-y-1">
            {insight.evidence.map((e, idx) => (
              <li key={`${e.label}-${idx}`} className="flex flex-wrap gap-2">
                <Badge tone="neutral">{KIND_LABEL[e.kind]}</Badge>
                <span className="text-muted">{e.label}:</span>
                <span>{e.value}</span>
                {e.ref?.entity === "activity" && e.ref.id ? (
                  <button
                    type="button"
                    className="text-xs text-primary underline"
                    onClick={() =>
                      navigate(`/programmes/view/?id=${insight.programmeId}`)
                    }
                  >
                    Open source
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Recommendation
          </p>
          <p className="mt-1">{insight.recommendation}</p>
        </div>
        {(onAcknowledge || onAction || onDismiss) && (
          <div className="flex flex-wrap gap-2">
            {onAcknowledge ? (
              <Button size="sm" variant="secondary" onClick={onAcknowledge}>
                Acknowledge
              </Button>
            ) : null}
            {onAction ? (
              <Button size="sm" variant="secondary" onClick={onAction}>
                Mark actioned
              </Button>
            ) : null}
            {onDismiss ? (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Dismiss
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
