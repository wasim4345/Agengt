"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import { CHART } from "@/components/charts/colors";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { formatDate } from "@/lib/format/dates";
import { IDS } from "@/seed/ids";
import * as manager from "@/selectors/manager";
import { useOsStore } from "@/store/store";

export function ManagerDashboard() {
  const state = useOsStore((s) => s.state);
  const programmes = manager.myProgrammes(state);
  const pending = manager.myPendingReports(state);
  const upcoming = manager.myUpcoming(state);
  const delayed = manager.myDelayed(state);
  const budget = manager.budgetSummary(state);
  const blocks = manager.activityBlocksByProgramme(state);
  const outreach = state.activities["act_p1_a02"];

  const budgetChart = [
    { name: "Allocated", value: budget.allocated },
    { name: "Reported", value: budget.reported },
    { name: "Remaining", value: budget.remaining },
    { name: "Unallocated", value: budget.unallocated },
  ];

  return (
    <>
      <PageHeader
        title="My dashboard"
        description={`Assigned programmes · Data as of ${formatDate(state.meta.demoDate)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                window.location.href = "/programmes/new/";
              }}
            >
              New programme
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                window.location.href = "/programmes/";
              }}
            >
              Report activity
            </Button>
          </div>
        }
      />

      {programmes.length === 0 ? (
        <EmptyState
          title="No assigned programmes"
          description="Switch persona or create a programme."
          action={
            <Button
              size="sm"
              onClick={() => {
                window.location.href = "/programmes/new/";
              }}
            >
              New programme
            </Button>
          }
        />
      ) : (
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          {programmes.map((row) => (
            <Card key={row.programme.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {row.programme.code} · {row.programme.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{Math.round(row.progress)}% progress</span>
                  <Badge tone="in-progress">{row.programme.status}</Badge>
                </div>
                <p className="text-muted">
                  Budget {formatINR(row.budget.budget)} · Reported{" "}
                  {formatINR(row.budget.reported)}
                </p>
                {row.nextMilestone ? (
                  <p className="text-xs text-muted">
                    Next: {row.nextMilestone.name} (
                    {formatDate(row.nextMilestone.targetDate)})
                  </p>
                ) : null}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    window.location.href = `/programmes/view/?id=${row.programme.id}`;
                  }}
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Budget panel" empty={budget.budget === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) =>
                  formatINR(typeof v === "number" ? v : Number(v))
                }
              />
              <Bar dataKey="value" fill={CHART.accent} radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Pending reports ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pending.length === 0 ? (
              <EmptyState
                title="No pending reports"
                description="Activities that need a report will appear here."
              />
            ) : (
              pending.slice(0, 8).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {a.code} · {a.name}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      window.location.href = `/programmes/activity/?programmeId=${a.programmeId}&activityId=${a.id}`;
                    }}
                  >
                    Report now
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {outreach &&
      programmes.some((p) => p.programme.id === IDS.programmes.p1) ? (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Demo — Report now</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Open Outreach Sessions to file a delay report (demo step 7).
            </p>
            <Button
              onClick={() => {
                window.location.href = `/programmes/activity/?programmeId=${IDS.programmes.p1}&activityId=act_p1_a02`;
              }}
            >
              Open Outreach Sessions
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Upcoming activities (14d)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcoming.length === 0 ? (
              <EmptyState
                title="Nothing upcoming"
                description="No not-started activities in the next window."
              />
            ) : (
              upcoming.slice(0, 8).map((a) => (
                <div
                  key={a.id}
                  className="flex justify-between gap-2 text-sm"
                >
                  <span>
                    {a.code} · {a.name}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDate(a.plannedStart)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Delayed activities ({delayed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {delayed.length === 0 ? (
              <EmptyState
                title="No delays"
                description="Delayed or overdue activities will list here."
              />
            ) : (
              delayed.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {a.code} · {a.name}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      window.location.href = `/programmes/activity/?programmeId=${a.programmeId}&activityId=${a.id}`;
                    }}
                  >
                    Workspace
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity blocks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {blocks.length === 0 ? (
            <EmptyState
              title="No activities"
              description="Assigned programmes have no activity blocks yet."
            />
          ) : (
            blocks.map((block) => (
              <div key={block.programme.id}>
                <p className="mb-2 text-sm font-medium">
                  {block.programme.code}
                </p>
                <div className="flex flex-wrap gap-2">
                  {block.activities.map((a) => (
                    <Badge
                      key={a.id}
                      tone={
                        a.status === "delayed"
                          ? "delayed"
                          : a.status === "completed"
                            ? "on-track"
                            : a.status === "in_progress"
                              ? "in-progress"
                              : "neutral"
                      }
                    >
                      {a.code} {a.status}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
