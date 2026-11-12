"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { formatDate } from "@/lib/format/dates";
import { activityFinancials } from "@/selectors/finance";
import { ImpactPanel } from "@/components/gantt/ImpactPanel";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";
import { EvidenceGrid } from "./EvidenceGrid";
import { ExpenseTable } from "./ExpenseTable";
import { HistoryTimeline } from "./HistoryTimeline";
import { ReportForm } from "./ReportForm";

export function ActivityWorkspace({
  programmeId,
  activityId,
}: {
  programmeId: ID;
  activityId: ID;
}) {
  const state = useOsStore((s) => s.state);
  const startReport = useOsStore((s) => s.startReport);
  const releaseReport = useOsStore((s) => s.releaseReport);
  const returnReport = useOsStore((s) => s.returnReport);
  const role = state.meta.currentRole;
  const { push } = useToast();
  const [reportId, setReportId] = useState<ID | null>(null);
  const [returnComment, setReturnComment] = useState("");

  const activity = state.activities[activityId];
  const programme = state.programmes[programmeId];
  const fin = activityFinancials(state, activityId);

  const openReport = useMemo(() => {
    return Object.values(state.reports).find(
      (r) =>
        r.activityId === activityId &&
        (r.status === "draft" ||
          r.status === "returned" ||
          r.status === "submitted" ||
          r.status === "released"),
    );
  }, [state.reports, activityId]);

  useEffect(() => {
    if (openReport) setReportId(openReport.id);
  }, [openReport]);

  if (!activity || !programme) {
    return (
      <p className="text-sm text-muted">Activity or programme not found.</p>
    );
  }

  const deps = Object.values(state.dependencies).filter(
    (d) =>
      d.successorId === activityId || d.predecessorId === activityId,
  );
  const milestones = state.activityMilestones
    .filter((am) => am.activityId === activityId)
    .map((am) => state.milestones[am.milestoneId])
    .filter(Boolean);

  const submittedReports = Object.values(state.reports).filter(
    (r) => r.activityId === activityId && r.status === "submitted",
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">
              {programme.code} · {activity.code}
            </p>
            <h1 className="text-xl font-semibold">{activity.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {formatDate(activity.plannedStart)} →{" "}
              {formatDate(activity.revisedEnd ?? activity.plannedEnd)}
              {activity.revisedEnd ? " (revised)" : ""} · Owner{" "}
              {state.users[activity.ownerId]?.name ?? "—"} · Priority{" "}
              {activity.priority}
            </p>
          </div>
          <Badge tone="in-progress">{activity.status}</Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          <div>
            <p className="text-muted">Revised</p>
            <p className="font-semibold">{formatINR(fin.revised)}</p>
          </div>
          <div>
            <p className="text-muted">Reported</p>
            <p className="font-semibold">{formatINR(fin.reported)}</p>
          </div>
          <div>
            <p className="text-muted">Verified</p>
            <p className="font-semibold">{formatINR(fin.verified)}</p>
          </div>
          <div>
            <p className="text-muted">Pending</p>
            <p className="font-semibold">{formatINR(fin.pending)}</p>
          </div>
          <div>
            <p className="text-muted">Remaining</p>
            <p className="font-semibold">{formatINR(fin.remaining)}</p>
          </div>
        </div>
      </header>

      {role === "leadership" && submittedReports.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-sm font-semibold">Release / return (demo step 10)</p>
            {submittedReports.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
              >
                <div className="flex-1 text-sm">
                  <p>
                    {r.type} · {r.id} · v
                    {r.versions[r.versions.length - 1]?.no ?? 0}
                  </p>
                  <input
                    className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    placeholder="Return comment"
                    value={returnComment}
                    onChange={(e) => setReturnComment(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const res = releaseReport(r.id, {
                      clientVisible: true,
                      marcomVisible: true,
                    });
                    push({
                      title: res.ok
                        ? "Report released to client"
                        : (res.errors[0]?.message ?? "Release failed"),
                      tone: res.ok ? "success" : "danger",
                    });
                  }}
                >
                  Release to client
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const res = returnReport(r.id, returnComment);
                    push({
                      title: res.ok
                        ? "Report returned"
                        : (res.errors[0]?.message ?? "Return failed"),
                      tone: res.ok ? "success" : "danger",
                    });
                  }}
                >
                  Return
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="update">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="update">Update</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="deps">Dependencies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-3">
          <Card>
            <CardContent className="space-y-2 py-4 text-sm">
              <p>{activity.description || "No description."}</p>
              <p className="text-muted">
                Expected output: {activity.expectedOutput || "—"}
              </p>
              <p className="text-muted">
                Milestones:{" "}
                {milestones.map((m) => m!.name).join(", ") || "—"}
              </p>
            </CardContent>
          </Card>
          <ImpactPanel sourceActivityId={activityId} />
        </TabsContent>

        <TabsContent value="update" className="mt-4 space-y-3">
          {!reportId ? (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  const r = startReport({
                    programmeId,
                    activityId,
                    type: "interim",
                  });
                  if (r.ok) setReportId(r.data.reportId);
                  push({
                    title: r.ok
                      ? "Interim report started"
                      : (r.errors[0]?.message ?? "Failed"),
                    tone: r.ok ? "success" : "danger",
                  });
                }}
              >
                Start interim report
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const r = startReport({
                    programmeId,
                    activityId,
                    type: "final",
                  });
                  if (r.ok) setReportId(r.data.reportId);
                  push({
                    title: r.ok
                      ? "Final report started"
                      : (r.errors[0]?.message ?? "Failed"),
                    tone: r.ok ? "success" : "danger",
                  });
                }}
              >
                Start final report
              </Button>
            </div>
          ) : (
            <ReportForm
              programmeId={programmeId}
              activityId={activityId}
              reportId={reportId}
            />
          )}
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <ExpenseTable
            programmeId={programmeId}
            activityId={activityId}
            reportId={reportId ?? undefined}
          />
        </TabsContent>

        <TabsContent value="evidence" className="mt-4">
          <EvidenceGrid
            programmeId={programmeId}
            activityId={activityId}
            reportId={reportId ?? undefined}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTimeline activityId={activityId} />
        </TabsContent>

        <TabsContent value="deps" className="mt-4">
          <Card>
            <CardContent className="py-4 text-sm">
              {deps.length === 0 ? (
                <p className="text-muted">No dependencies.</p>
              ) : (
                <ul className="space-y-2">
                  {deps.map((d) => (
                    <li key={d.id}>
                      {d.predecessorId
                        ? state.activities[d.predecessorId]?.code
                        : d.predecessorMilestoneId}{" "}
                      → {state.activities[d.successorId]?.code} ({d.type}, lag{" "}
                      {d.lagDays})
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
