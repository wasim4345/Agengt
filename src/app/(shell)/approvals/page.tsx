"use client";

import { useState } from "react";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { RevisionHistory } from "@/components/finance/RevisionHistory";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Field,
  useToast,
} from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { formatINR } from "@/lib/format/inr";
import { useOsStore } from "@/store/store";

export default function ApprovalsPage() {
  const approvals = useOsStore((s) => Object.values(s.state.approvals));
  const programmes = useOsStore((s) => s.state.programmes);
  const budgetRevisions = useOsStore((s) =>
    Object.values(s.state.budgetRevisions),
  );
  const role = useOsStore((s) => s.state.meta.currentRole);
  const decideActivation = useOsStore((s) => s.decideActivation);
  const { push } = useToast();
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<
    "programmes" | "budgets" | "releases" | "closures"
  >("programmes");

  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");
  const pendingRevisions = budgetRevisions.filter(
    (r) =>
      r.status === "pending_finance" || r.status === "pending_leadership",
  );

  return (
    <RoleGate allow={["leadership", "finance"]}>
      <PageHeader
        title="Approvals"
        description="Programme activation, budget revisions, and lifecycle decisions."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["programmes", "Programme approvals"],
            ["budgets", "Budget revisions"],
            ["releases", "Report releases"],
            ["closures", "Cancellations / closures"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={tab === key ? "primary" : "secondary"}
            onClick={() => setTab(key)}
          >
            {label}
            {key === "budgets" && pendingRevisions.length
              ? ` (${pendingRevisions.length})`
              : ""}
            {key === "programmes" && pending.length
              ? ` (${pending.length})`
              : ""}
          </Button>
        ))}
      </div>

      {tab === "programmes" ? (
        <>
          <h2 className="mb-2 text-sm font-semibold">Pending</h2>
          <div className="mb-6 flex flex-col gap-2">
            {pending.length === 0 ? (
              <p className="text-sm text-muted">No pending approvals.</p>
            ) : (
              pending.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {a.type} ·{" "}
                          {programmes[a.programmeId]?.code ?? a.programmeId} ·{" "}
                          {programmes[a.programmeId]?.name}
                        </p>
                        <p className="text-xs text-muted">
                          Requested {formatDate(a.requestedAt.slice(0, 10))}
                          {a.reason ? ` — ${a.reason}` : ""}
                        </p>
                      </div>
                      <Badge tone="at-risk">{a.status}</Badge>
                    </div>
                    {a.type === "activation" && role === "leadership" ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <Field label="Remarks" className="flex-1">
                          <input
                            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                            value={remarks[a.id] ?? ""}
                            onChange={(e) =>
                              setRemarks((prev) => ({
                                ...prev,
                                [a.id]: e.target.value,
                              }))
                            }
                            placeholder="Optional remarks"
                          />
                        </Field>
                        <Button
                          onClick={() => {
                            const r = decideActivation(
                              a.id,
                              "approved",
                              remarks[a.id],
                            );
                            push({
                              title: r.ok
                                ? "Programme activated"
                                : (r.errors[0]?.message ?? "Failed"),
                              tone: r.ok ? "success" : "danger",
                            });
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const text = remarks[a.id]?.trim();
                            if (!text) {
                              push({
                                title: "Remarks required to reject",
                                tone: "danger",
                              });
                              return;
                            }
                            const r = decideActivation(a.id, "rejected", text);
                            push({
                              title: r.ok
                                ? "Returned to draft"
                                : (r.errors[0]?.message ?? "Failed"),
                              tone: r.ok ? "success" : "danger",
                            });
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <h2 className="mb-2 text-sm font-semibold">History</h2>
          <div className="flex flex-col gap-2">
            {decided.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm font-medium">
                      {a.type} ·{" "}
                      {programmes[a.programmeId]?.code ?? a.programmeId}
                    </p>
                    <p className="text-xs text-muted">
                      {a.decision?.remarks ?? a.reason ?? ""}
                    </p>
                  </div>
                  <Badge
                    tone={
                      a.status === "approved"
                        ? "on-track"
                        : a.status === "rejected"
                          ? "delayed"
                          : "neutral"
                    }
                  >
                    {a.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      {tab === "budgets" ? (
        <div className="flex flex-col gap-6">
          {pendingRevisions.length === 0 ? (
            <p className="text-sm text-muted">No pending budget revisions.</p>
          ) : null}
          {Object.values(programmes).map((p) => {
            const has = budgetRevisions.some((r) => r.programmeId === p.id);
            if (!has) return null;
            return (
              <div key={p.id}>
                <h2 className="mb-2 text-sm font-semibold">
                  {p.code} · {formatINR(p.totalBudget)}
                </h2>
                <RevisionHistory programmeId={p.id} />
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "releases" ? (
        <p className="text-sm text-muted">
          Report releases are decided from the activity workspace (Leadership).
        </p>
      ) : null}

      {tab === "closures" ? (
        <p className="text-sm text-muted">
          Run Finance closure checks on Budgets, then request Leadership
          closure in M11.
        </p>
      ) : null}
    </RoleGate>
  );
}
