"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Field,
  useToast,
} from "@/components/ui";
import { validateSubmitReport } from "@/lib/rules/report";
import { ImpactPanel } from "@/components/gantt/ImpactPanel";
import { useOsStore } from "@/store/store";
import type {
  ActivityStatus,
  Conducted,
  ID,
  ReportContent,
} from "@/types/domain";
import { ExpenseTable } from "./ExpenseTable";
import { EvidenceGrid } from "./EvidenceGrid";

const STATUSES: ActivityStatus[] = [
  "not_started",
  "in_progress",
  "delayed",
  "partially_completed",
  "completed",
  "on_hold",
  "cancelled",
];

export function ReportForm({
  programmeId,
  activityId,
  reportId,
}: {
  programmeId: ID;
  activityId: ID;
  reportId: ID;
}) {
  const state = useOsStore((s) => s.state);
  const saveDraft = useOsStore((s) => s.saveDraft);
  const submitReport = useOsStore((s) => s.submitReport);
  const reviseReport = useOsStore((s) => s.reviseReport);
  const { push } = useToast();

  const report = state.reports[reportId];
  const [content, setContent] = useState<ReportContent | null>(null);

  useEffect(() => {
    if (report) {
      setContent(JSON.parse(JSON.stringify(report.draft)) as ReportContent);
    }
  }, [reportId, report?.status]); // eslint-disable-line react-hooks/exhaustive-deps -- sync on status/id

  const linkedExpenseIds = useMemo(() => {
    if (!report) return [];
    return Object.values(state.expenses)
      .filter(
        (e) =>
          e.reportId === reportId ||
          (e.activityId === activityId && e.status === "draft"),
      )
      .map((e) => e.id);
  }, [state.expenses, reportId, activityId, report]);

  const liveValidation = useMemo(() => {
    if (!report || !content) return null;
    // Project draft into a temp-like validation via validateSubmitReport after save — use content path
    const projected = {
      ...state,
      reports: {
        ...state.reports,
        [reportId]: { ...report, draft: content },
      },
    };
    return validateSubmitReport(projected, reportId);
  }, [state, report, content, reportId]);

  if (!report || !content) {
    return <p className="text-sm text-muted">Report not found.</p>;
  }

  const readOnly =
    report.status === "submitted" || report.status === "released";

  function patch(partial: Partial<ReportContent>) {
    setContent((prev) => (prev ? { ...prev, ...partial } : prev));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{report.type}</Badge>
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
        {report.returnComment ? (
          <span className="text-xs text-danger">
            Return note: {report.returnComment}
          </span>
        ) : null}
      </div>

      {liveValidation && !liveValidation.ok ? (
        <Card className="border-danger/40">
          <CardContent className="space-y-1 py-3 text-sm">
            <p className="font-medium text-danger">Validation summary</p>
            {liveValidation.errors.map((e) => (
              <p key={`${e.code}-${e.field}`} className="text-xs text-danger">
                {e.code}: {e.message}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <details open className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          ① Status & conducted
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Activity status">
            <select
              disabled={readOnly}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={content.activityStatus}
              onChange={(e) =>
                patch({ activityStatus: e.target.value as ActivityStatus })
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Conducted">
            <select
              disabled={readOnly}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={content.conducted}
              onChange={(e) =>
                patch({ conducted: e.target.value as Conducted })
              }
            >
              <option value="yes">yes</option>
              <option value="partially">partially</option>
              <option value="no">no</option>
            </select>
          </Field>
          <Field label="% complete">
            <input
              disabled={readOnly}
              type="number"
              min={0}
              max={100}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={content.percentComplete}
              onChange={(e) =>
                patch({ percentComplete: Number(e.target.value) })
              }
            />
          </Field>
        </div>
      </details>

      <details open className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          ② Report
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Description">
            <textarea
              disabled={readOnly}
              className="h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={content.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>
          <Field label="What was conducted">
            <textarea
              disabled={readOnly}
              className="h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={content.whatConducted}
              onChange={(e) => patch({ whatConducted: e.target.value })}
            />
          </Field>
          <Field label="Key outcomes">
            <textarea
              disabled={readOnly}
              className="h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={content.keyOutcomes}
              onChange={(e) => patch({ keyOutcomes: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Participants">
              <input
                disabled={readOnly}
                type="number"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={content.participants ?? ""}
                onChange={(e) =>
                  patch({
                    participants: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </Field>
            <Field label="Startups">
              <input
                disabled={readOnly}
                type="number"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={content.startups ?? ""}
                onChange={(e) =>
                  patch({
                    startups: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </Field>
          </div>
          <Field label="Client summary (visible after release)">
            <textarea
              disabled={readOnly}
              className="h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={content.clientSummary}
              onChange={(e) => patch({ clientSummary: e.target.value })}
            />
          </Field>
          {content.activityStatus === "partially_completed" ? (
            <Field label="Progress details">
              <textarea
                disabled={readOnly}
                className="h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={content.progressDetails ?? ""}
                onChange={(e) => patch({ progressDetails: e.target.value })}
              />
            </Field>
          ) : null}
          {content.activityStatus === "cancelled" ? (
            <Field label="Cancellation reason">
              <textarea
                disabled={readOnly}
                className="h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={content.cancellationReason ?? ""}
                onChange={(e) =>
                  patch({ cancellationReason: e.target.value })
                }
              />
            </Field>
          ) : null}
        </div>
      </details>

      <details open className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          ③ Expense incurred
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                disabled={readOnly}
                checked={content.expenseIncurred === true}
                onChange={() => patch({ expenseIncurred: true })}
              />
              Yes
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                disabled={readOnly}
                checked={content.expenseIncurred === false}
                onChange={() => patch({ expenseIncurred: false })}
              />
              No
            </label>
          </div>
          {content.expenseIncurred ? (
            <>
              <p className="text-xs text-muted">
                Linked draft/report expenses: {linkedExpenseIds.length}
              </p>
              {!readOnly ? (
                <ExpenseTable
                  programmeId={programmeId}
                  activityId={activityId}
                  reportId={reportId}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </details>

      <details className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          ④ Evidence quick-add
        </summary>
        <div className="mt-3">
          {!readOnly ? (
            <EvidenceGrid
              programmeId={programmeId}
              activityId={activityId}
              reportId={reportId}
            />
          ) : (
            <p className="text-sm text-muted">
              Evidence locked after submit — see Evidence tab.
            </p>
          )}
        </div>
      </details>

      {content.activityStatus === "delayed" ? (
        <details open className="rounded-xl border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            ⑤ Delay
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Reason">
              <textarea
                disabled={readOnly}
                className="h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={content.delay?.reason ?? ""}
                onChange={(e) =>
                  patch({
                    delay: {
                      reason: e.target.value,
                      impact: content.delay?.impact ?? "",
                      corrective: content.delay?.corrective ?? "",
                      revisedEnd: content.delay?.revisedEnd,
                    },
                  })
                }
              />
            </Field>
            <Field label="Impact">
              <textarea
                disabled={readOnly}
                className="h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={content.delay?.impact ?? ""}
                onChange={(e) =>
                  patch({
                    delay: {
                      reason: content.delay?.reason ?? "",
                      impact: e.target.value,
                      corrective: content.delay?.corrective ?? "",
                      revisedEnd: content.delay?.revisedEnd,
                    },
                  })
                }
              />
            </Field>
            <Field label="Corrective action">
              <textarea
                disabled={readOnly}
                className="h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={content.delay?.corrective ?? ""}
                onChange={(e) =>
                  patch({
                    delay: {
                      reason: content.delay?.reason ?? "",
                      impact: content.delay?.impact ?? "",
                      corrective: e.target.value,
                      revisedEnd: content.delay?.revisedEnd,
                    },
                  })
                }
              />
            </Field>
            <Field label="Revised end">
              <input
                disabled={readOnly}
                type="date"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={content.delay?.revisedEnd ?? ""}
                onChange={(e) =>
                  patch({
                    delay: {
                      reason: content.delay?.reason ?? "",
                      impact: content.delay?.impact ?? "",
                      corrective: content.delay?.corrective ?? "",
                      revisedEnd: e.target.value,
                    },
                  })
                }
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-muted">
            On submit, downstream impacts are proposed automatically (not
            auto-applied).
          </p>
        </details>
      ) : null}

      <details className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          ⑥ Remarks 🔒 (internal)
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Observations (internal)">
            <textarea
              disabled={readOnly}
              className="h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={content.observations}
              onChange={(e) => patch({ observations: e.target.value })}
            />
          </Field>
          <Field label="Additional remarks (internal)">
            <textarea
              disabled={readOnly}
              className="h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={content.additionalRemarks}
              onChange={(e) => patch({ additionalRemarks: e.target.value })}
            />
          </Field>
        </div>
      </details>

      <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 border-t border-border bg-surface/95 py-3 backdrop-blur">
        {!readOnly ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                const r = saveDraft(reportId, content);
                push({
                  title: r.ok ? "Draft saved" : (r.errors[0]?.message ?? "Failed"),
                  tone: r.ok ? "success" : "danger",
                });
              }}
            >
              Save draft
            </Button>
            <Button
              onClick={() => {
                saveDraft(reportId, content);
                const r = submitReport(reportId);
                if (!r.ok) {
                  push({
                    title: r.errors[0]?.message ?? "Submit blocked",
                    tone: "danger",
                  });
                  return;
                }
                push({
                  title: "Report submitted",
                  tone: "success",
                });
              }}
            >
              Submit report
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              const r = reviseReport(reportId);
              push({
                title: r.ok ? "Opened for revision" : (r.errors[0]?.message ?? "Failed"),
                tone: r.ok ? "success" : "danger",
              });
            }}
          >
            Revise
          </Button>
        )}
      </div>

      <ImpactPanel sourceActivityId={activityId} />
    </div>
  );
}
