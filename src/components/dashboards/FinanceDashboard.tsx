"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import { CHART } from "@/components/charts/colors";
import { ClosureChecksPanel } from "@/components/finance/ClosureChecksPanel";
import { OverspendAlerts } from "@/components/finance/OverspendAlerts";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { formatDate } from "@/lib/format/dates";
import * as financeRole from "@/selectors/financeRole";
import { useOsStore } from "@/store/store";

export function FinanceDashboard() {
  const state = useOsStore((s) => s.state);
  const programmes = financeRole.programmeBudgets(state);
  const queue = financeRole.queue(state);
  const alerts = financeRole.alerts(state);
  const [programmeId, setProgrammeId] = useState(
    programmes[0]?.programme.id ?? "",
  );
  const allocations = financeRole.activityAllocations(
    state,
    programmeId || undefined,
  );

  const chartData = useMemo(
    () =>
      programmes.map(({ programme: p, financials: fin }) => ({
        code: p.code,
        verified: fin.verified,
        pending: fin.pending,
        remaining: Math.max(0, fin.remaining),
      })),
    [programmes],
  );

  return (
    <>
      <PageHeader
        title="Finance dashboard"
        description={`Budgets and verification · Data as of ${formatDate(state.meta.demoDate)}`}
        actions={
          <Link
            href="/finance/queue/"
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm text-primary-foreground"
          >
            Open queue
          </Link>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <OverspendAlerts />
        <ClosureChecksPanel defaultProgrammeId={programmeId || undefined} />
      </div>

      <ChartCard
        title="Reported / Verified / Pending by programme"
        empty={chartData.length === 0}
        className="mb-4"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="code" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v) =>
                formatINR(typeof v === "number" ? v : Number(v))
              }
            />
            <Legend />
            <Bar dataKey="verified" stackId="a" fill={CHART.verified} name="Verified" />
            <Bar dataKey="pending" stackId="a" fill={CHART.pending} name="Pending" />
            <Bar
              dataKey="remaining"
              stackId="a"
              fill={CHART.remaining}
              name="Remaining"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Queue preview ({queue.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {queue.length === 0 ? (
            <EmptyState
              title="Queue empty"
              description="Submitted expenses awaiting verification will appear here."
            />
          ) : (
            queue.slice(0, 8).map((row) => (
              <div
                key={row.expense.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {row.expense.description}
                  {row.expense.overspendFlag ? (
                    <Badge tone="warning" className="ml-2">
                      overspend
                    </Badge>
                  ) : null}
                </span>
                <span className="font-medium">
                  {formatINR(row.expense.amount)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Programme budgets</CardTitle>
        </CardHeader>
        <CardContent>
          {programmes.length === 0 ? (
            <EmptyState
              title="No programmes"
              description="Programme budgets will appear when seed data is loaded."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Programme</TH>
                  <TH>Approved</TH>
                  <TH>Reported</TH>
                  <TH>Verified</TH>
                  <TH>Pending</TH>
                  <TH>Variance</TH>
                  <TH>Alert</TH>
                </TR>
              </THead>
              <TBody>
                {programmes.map(({ programme: p, financials: fin }) => (
                  <TR key={p.id}>
                    <TD>
                      {p.code}{" "}
                      <Badge tone="neutral" className="ml-1">
                        {p.status}
                      </Badge>
                    </TD>
                    <TD>{formatINR(fin.budget)}</TD>
                    <TD>{formatINR(fin.reported)}</TD>
                    <TD>{formatINR(fin.verified)}</TD>
                    <TD>{formatINR(fin.pending)}</TD>
                    <TD>{formatINR(fin.remaining)}</TD>
                    <TD>
                      {fin.alert === "critical" ? (
                        <Badge tone="danger">critical</Badge>
                      ) : (
                        <Badge tone="neutral">ok</Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Activity allocations
            {alerts.length ? (
              <Badge tone="warning" className="ml-2">
                {alerts.length} alerts
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label="Programme" className="max-w-md">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
            >
              {programmes.map(({ programme: p }) => (
                <option key={p.id} value={p.id}>
                  {p.code}
                </option>
              ))}
            </select>
          </Field>
          {allocations.length === 0 ? (
            <EmptyState
              title="No allocations"
              description="Select a programme with activities."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Activity</TH>
                  <TH>Revised</TH>
                  <TH>Reported</TH>
                  <TH>Verified</TH>
                  <TH>Pending</TH>
                  <TH>Alert</TH>
                </TR>
              </THead>
              <TBody>
                {allocations.map(({ activity: a, financials: fin }) => (
                  <TR key={a.id}>
                    <TD>
                      <span className="font-mono text-xs">{a.code}</span>{" "}
                      {a.name}
                    </TD>
                    <TD>{formatINR(fin.revised)}</TD>
                    <TD>{formatINR(fin.reported)}</TD>
                    <TD>{formatINR(fin.verified)}</TD>
                    <TD>{formatINR(fin.pending)}</TD>
                    <TD>
                      <Badge
                        tone={
                          fin.alert === "breach"
                            ? "danger"
                            : fin.alert === "warning"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {fin.alert}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
