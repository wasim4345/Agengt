"use client";

import { Badge, Card, CardContent } from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";
import type { ID, ReportContent } from "@/types/domain";

function diffContent(
  prev: ReportContent | undefined,
  next: ReportContent,
): string[] {
  if (!prev) return ["Initial version"];
  const keys: (keyof ReportContent)[] = [
    "activityStatus",
    "conducted",
    "percentComplete",
    "description",
    "whatConducted",
    "keyOutcomes",
    "clientSummary",
    "expenseIncurred",
    "progressDetails",
    "cancellationReason",
  ];
  const changes: string[] = [];
  for (const key of keys) {
    const a = prev[key];
    const b = next[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push(`${String(key)}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
    }
  }
  if (JSON.stringify(prev.delay) !== JSON.stringify(next.delay)) {
    changes.push("delay block updated");
  }
  return changes.length ? changes : ["No field changes"];
}

export function HistoryTimeline({ activityId }: { activityId: ID }) {
  const state = useOsStore((s) => s.state);
  const reports = Object.values(state.reports).filter(
    (r) => r.activityId === activityId,
  );
  const log = state.log.filter(
    (e) =>
      e.entityId === activityId ||
      reports.some((r) => r.id === e.entityId),
  );

  return (
    <div className="flex flex-col gap-4">
      {reports.map((report) => (
        <Card key={report.id}>
          <CardContent className="space-y-3 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">
                {report.type} report · {report.id}
              </p>
              <Badge
                tone={
                  report.status === "released"
                    ? "on-track"
                    : report.status === "submitted"
                      ? "at-risk"
                      : report.status === "returned"
                        ? "delayed"
                        : "neutral"
                }
              >
                {report.status}
              </Badge>
            </div>
            {report.returnComment ? (
              <p className="text-xs text-danger">
                Returned: {report.returnComment}
              </p>
            ) : null}
            {report.release ? (
              <p className="text-xs text-muted">
                Released v{report.release.versionNo} by {report.release.by} on{" "}
                {formatDate(report.release.at.slice(0, 10))} · client=
                {String(report.release.clientVisible)} · marcom=
                {String(report.release.marcomVisible)}
              </p>
            ) : null}
            <ol className="relative ml-2 border-l border-border pl-4">
              {report.versions.map((v, idx) => {
                const prev = report.versions[idx - 1]?.content;
                const changes = diffContent(prev, v.content);
                return (
                  <li key={v.no} className="mb-4">
                    <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-primary" />
                    <p className="text-sm font-medium">
                      Version {v.no} ·{" "}
                      {formatDate(v.submittedAt.slice(0, 10))} · by{" "}
                      {state.users[v.submittedBy]?.name ?? v.submittedBy}
                    </p>
                    <ul className="mt-1 text-xs text-muted">
                      {changes.map((c) => (
                        <li key={c}>• {c}</li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-muted">
                      {v.expenseIds.length} expenses · {v.evidenceIds.length}{" "}
                      evidence
                    </p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="py-4">
          <p className="mb-2 text-sm font-semibold">Related activity log</p>
          <ul className="flex flex-col gap-1 text-xs text-muted">
            {log.slice(0, 20).map((e) => (
              <li key={e.id}>
                {e.summary} · {e.action} · {formatDate(e.at.slice(0, 10))}
              </li>
            ))}
            {log.length === 0 ? <li>No related log entries.</li> : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
