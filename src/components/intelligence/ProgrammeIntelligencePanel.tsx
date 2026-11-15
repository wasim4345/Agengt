"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
} from "@/components/ui";
import { InsightCard } from "@/components/intelligence/InsightCard";
import { formatDate } from "@/lib/format/dates";
import {
  insightRunDiff,
  lastInsightRun,
  severityCounts,
  visibleProgrammeInsights,
} from "@/selectors/intelligence";
import { useOsStore } from "@/store/store";
import type { ID, InsightCategory, InsightSeverity } from "@/types/domain";

const SECTIONS: { id: InsightCategory | "actions"; label: string }[] = [
  { id: "operational", label: "Operational" },
  { id: "financial", label: "Financial" },
  { id: "risk", label: "Risk" },
  { id: "performance", label: "Performance" },
  { id: "actions", label: "Recommended actions" },
];

export function ProgrammeIntelligencePanel({
  programmeId,
}: {
  programmeId: ID;
}) {
  const state = useOsStore((s) => s.state);
  const recordInsightRun = useOsStore((s) => s.recordInsightRun);
  const setInsightState = useOsStore((s) => s.setInsightState);
  const [severityFilter, setSeverityFilter] = useState<
    InsightSeverity | "all"
  >("all");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const insights = useMemo(
    () => visibleProgrammeInsights(state, programmeId),
    [state, programmeId],
  );
  const filtered =
    severityFilter === "all"
      ? insights
      : insights.filter((i) => i.severity === severityFilter);
  const counts = severityCounts(insights);
  const diff = insightRunDiff(state, insights, "programme", programmeId);
  const lastRun = lastInsightRun(state, "programme", programmeId);

  function refresh() {
    recordInsightRun({
      scope: "programme",
      programmeId,
      items: insights,
    });
    setGeneratedAt(`${state.meta.demoDate}T12:00:00.000Z`);
  }

  const actions = useMemo(() => {
    const byOwner = new Map<string, typeof filtered>();
    for (const i of filtered) {
      const key = i.suggestedOwnerId ?? "unassigned";
      const list = byOwner.get(key) ?? [];
      list.push(i);
      byOwner.set(key, list);
    }
    return [...byOwner.entries()].map(([ownerId, items]) => ({
      ownerId,
      ownerName: state.users[ownerId]?.name ?? "Unassigned",
      items: [...items].sort((a, b) =>
        a.suggestedDueDate.localeCompare(b.suggestedDueDate),
      ),
    }));
  }, [filtered, state.users]);

  return (
    <div data-testid="layer-intelligence" className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
          <div>
            <CardTitle className="text-base">Programme Intelligence</CardTitle>
            <p className="text-xs text-muted">
              Rule-based analysis · not AI · Generated{" "}
              {formatDate(generatedAt ?? lastRun?.at ?? state.meta.demoDate)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Field label="Severity" className="min-w-[8rem]">
              <select
                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                value={severityFilter}
                onChange={(e) =>
                  setSeverityFilter(e.target.value as InsightSeverity | "all")
                }
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
            <Button
              size="sm"
              data-testid="refresh-programme-insights"
              onClick={refresh}
            >
              Generate / Refresh insights
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge tone="danger">Critical {counts.critical}</Badge>
          <Badge tone="warning">High {counts.high}</Badge>
          <Badge tone="at-risk">Medium {counts.medium}</Badge>
          <Badge tone="neutral">Low {counts.low}</Badge>
          <span className="text-xs text-muted">
            New {diff.newCount} · Resolved {diff.resolvedCount} since last
            refresh
          </span>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No insights for this filter"
          description="Refresh after updating activities, expenses, or milestones — or insufficient data for the selected severity."
        />
      ) : (
        SECTIONS.map((section) => {
          if (section.id === "actions") {
            return (
              <div key={section.id} className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  {section.label}
                </h3>
                {actions.map((group) => (
                  <Card key={group.ownerId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Owner: {group.ownerName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 text-sm">
                      {group.items.map((i) => (
                        <div
                          key={i.key}
                          className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0"
                        >
                          <span>
                            <Badge tone="info">{i.ruleId}</Badge> {i.recommendation}
                          </span>
                          <span className="text-xs text-muted">
                            Due {formatDate(i.suggestedDueDate)}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          }
          const items = filtered.filter((i) => i.category === section.id);
          if (items.length === 0) return null;
          return (
            <div key={section.id} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {section.label}
              </h3>
              {items.map((i) => (
                <InsightCard
                  key={i.key}
                  insight={i}
                  state={state.insightStates[i.key]}
                  onAcknowledge={() =>
                    setInsightState({ key: i.key, status: "acknowledged" })
                  }
                  onAction={() =>
                    setInsightState({ key: i.key, status: "actioned" })
                  }
                  onDismiss={() =>
                    setInsightState({
                      key: i.key,
                      status: "dismissed",
                      severity: i.severity,
                    })
                  }
                />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
