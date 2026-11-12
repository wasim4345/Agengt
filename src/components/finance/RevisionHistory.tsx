"use client";

import { useState } from "react";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";

export function RevisionHistory({ programmeId }: { programmeId: ID }) {
  const state = useOsStore((s) => s.state);
  const decideBudgetRevision = useOsStore((s) => s.decideBudgetRevision);
  const withdrawBudgetRevision = useOsStore((s) => s.withdrawBudgetRevision);
  const role = state.meta.currentRole;
  const [expanded, setExpanded] = useState<ID | null>(null);
  const [remarks, setRemarks] = useState("");

  const revisions = Object.values(state.budgetRevisions)
    .filter((r) => r.programmeId === programmeId)
    .sort((a, b) => b.no - a.no);

  if (revisions.length === 0) {
    return (
      <p className="text-sm text-muted">No budget revisions yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {revisions.map((r) => {
        const open = expanded === r.id;
        const canFinance =
          role === "finance" && r.status === "pending_finance";
        const canLeadership =
          role === "leadership" && r.status === "pending_leadership";
        return (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-2 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    #{r.no} · {r.kind} · {formatDate(r.requestedAt.slice(0, 10))}
                  </p>
                  <p className="text-xs text-muted">{r.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      r.status === "approved"
                        ? "on-track"
                        : r.status === "rejected" || r.status === "withdrawn"
                          ? "delayed"
                          : "at-risk"
                    }
                  >
                    {r.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpanded(open ? null : r.id)}
                  >
                    {open ? "Hide" : "Details"}
                  </Button>
                </div>
              </div>
              {open ? (
                <div className="flex flex-col gap-2 border-t border-border pt-2 text-sm">
                  <p>
                    Total {formatINR(r.totalBefore)} → {formatINR(r.totalAfter)}
                    {r.needsLeadership ? " · Needs Leadership" : ""}
                  </p>
                  <ul className="list-disc pl-5 text-xs text-muted">
                    {r.lines.map((line, i) => (
                      <li key={`${r.id}-${i}`}>
                        {line.activityId
                          ? state.activities[line.activityId]?.code ??
                            line.activityId
                          : "Programme"}
                        : {formatINR(line.before)} → {formatINR(line.after)}
                      </li>
                    ))}
                  </ul>
                  {(canFinance || canLeadership) && (
                    <div className="flex flex-wrap items-end gap-2">
                      <input
                        className="min-w-[12rem] flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                        placeholder="Remarks (required to reject)"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() =>
                          decideBudgetRevision(r.id, { approved: true })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          decideBudgetRevision(r.id, {
                            approved: false,
                            remarks,
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {(r.status === "pending_finance" ||
                    r.status === "pending_leadership") &&
                  (r.requestedBy === state.meta.currentUserId ||
                    role === "leadership") ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => withdrawBudgetRevision(r.id)}
                    >
                      Withdraw
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
