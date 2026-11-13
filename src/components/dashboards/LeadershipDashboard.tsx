"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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
import {
  filtersFromSearchParams,
  hasAnyFilter,
  searchParamsFromFilters,
} from "@/lib/leadershipFilters";
import * as leadership from "@/selectors/leadership";
import type { LeadershipFilters } from "@/selectors/leadership";
import { useOsStore } from "@/store/store";
import type { ProgrammeStatus } from "@/types/domain";

function Kpi({
  label,
  value,
  sub,
  testId,
}: {
  label: string;
  value: string;
  sub?: string;
  testId?: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-2">
        <p className="text-xs text-muted">{label}</p>
        <CardTitle className="text-lg">{value}</CardTitle>
        {sub ? <p className="text-xs text-muted">{sub}</p> : null}
      </CardHeader>
    </Card>
  );
}

function LeadershipInner() {
  const state = useOsStore((s) => s.state);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );
  const [sortKey, setSortKey] = useState<"code" | "progress" | "budget" | "delayed">(
    "code",
  );

  function setFilters(next: LeadershipFilters) {
    const q = searchParamsFromFilters(next).toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }

  const kpis = leadership.kpis(state, filters);
  const rows = leadership.programmeRows(state, filters);
  const financial = leadership.financialOverview(state, filters);
  const milestones = leadership.upcomingMilestones(state);
  const risks = leadership.riskAlerts(state);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const name = row.category ?? "Other";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value], i) => ({
      name,
      value,
      fill: CHART.categories[i % CHART.categories.length],
    }));
  }, [rows]);

  const progressBars = rows.map((r) => ({
    name: r.code,
    progress: Math.round(r.progress),
  }));

  const sortedRows = [...rows].sort((a, b) => {
    if (sortKey === "progress") return b.progress - a.progress;
    if (sortKey === "budget") return b.budget - a.budget;
    if (sortKey === "delayed") return b.delayed - a.delayed;
    return a.code.localeCompare(b.code);
  });

  const recentReports = Object.values(state.reports)
    .filter((r) => r.status === "submitted" || r.status === "released")
    .sort((a, b) => {
      const at =
        a.release?.at ??
        a.versions[a.versions.length - 1]?.submittedAt ??
        a.createdAt;
      const bt =
        b.release?.at ??
        b.versions[b.versions.length - 1]?.submittedAt ??
        b.createdAt;
      return bt.localeCompare(at);
    })
    .slice(0, 8);

  const statuses: ProgrammeStatus[] = [
    "draft",
    "pending_approval",
    "active",
    "on_hold",
    "completed",
    "closed",
    "cancelled",
  ];

  return (
    <>
      <PageHeader
        title="Leadership dashboard"
        description={`Portfolio overview · Data as of ${formatDate(state.meta.demoDate)}`}
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              window.location.href = "/reports/";
            }}
          >
            Export to Reports
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-3">
          <Field label="Category" className="min-w-[10rem]">
            <select
              data-testid="filter-category"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={filters.categoryId ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  categoryId: e.target.value || undefined,
                })
              }
            >
              <option value="">All</option>
              {Object.values(state.categories).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Client" className="min-w-[10rem]">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={filters.clientId ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  clientId: e.target.value || undefined,
                })
              }
            >
              <option value="">All</option>
              {Object.values(state.clients).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Manager" className="min-w-[10rem]">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={filters.managerId ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  managerId: e.target.value || undefined,
                })
              }
            >
              <option value="">All</option>
              {Object.values(state.users)
                .filter((u) => u.role === "programme_manager")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Status" className="min-w-[10rem]">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={filters.status ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: (e.target.value || undefined) as
                    | ProgrammeStatus
                    | undefined,
                })
              }
            >
              <option value="">All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From" className="min-w-[9rem]">
            <input
              type="date"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={filters.dateFrom ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateFrom: e.target.value || undefined,
                })
              }
            />
          </Field>
          <Field label="To" className="min-w-[9rem]">
            <input
              type="date"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={filters.dateTo ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  dateTo: e.target.value || undefined,
                })
              }
            />
          </Field>
          {hasAnyFilter(filters) ? (
            <Button size="sm" variant="ghost" onClick={() => setFilters({})}>
              Clear
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div
        className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="leadership-kpis"
      >
        <Kpi
          testId="kpi-total-programmes"
          label="Total programmes"
          value={String(kpis.totalProgrammes)}
        />
        <Kpi label="Active" value={String(kpis.active)} />
        <Kpi label="Completed" value={String(kpis.completed)} />
        <Kpi
          testId="kpi-delayed"
          label="Delayed activities"
          value={String(kpis.delayedActivities)}
        />
        <Kpi
          testId="kpi-total-budget"
          label="Total budget"
          value={formatINR(kpis.totalBudget)}
        />
        <Kpi
          testId="kpi-verified"
          label="Verified expenditure"
          value={formatINR(kpis.verifiedExpenditure)}
          sub={`Reported ${formatINR(kpis.reportedExpenditure)}`}
        />
        <Kpi label="Remaining" value={formatINR(kpis.remaining)} />
        <Kpi
          label="Overall progress"
          value={`${Math.round(kpis.overallProgress)}%`}
          sub={`Budget-weighted ${Math.round(kpis.overallProgressBudgetWeighted)}%`}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Programmes by category" empty={byCategory.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {byCategory.map((d) => (
                  <Cell key={d.name} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Programme progress"
          empty={progressBars.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressBars} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={72}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="progress" fill={CHART.primary} radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard
        title="Financial overview"
        empty={financial.length === 0}
        className="mb-4"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={financial}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="code" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) =>
                formatINR(typeof value === "number" ? value : Number(value))
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
            <Bar
              dataKey="unallocated"
              stackId="a"
              fill={CHART.unallocated}
              name="Unallocated"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Card className="mb-4">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Programme overview</CardTitle>
          <div className="flex gap-2">
            {(
              [
                ["code", "Code"],
                ["progress", "Progress"],
                ["budget", "Budget"],
                ["delayed", "Delayed"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={sortKey === key ? "primary" : "ghost"}
                onClick={() => setSortKey(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {sortedRows.length === 0 ? (
            <EmptyState
              title="No programmes"
              description="Adjust or clear filters to see programmes."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Name</TH>
                  <TH>Category</TH>
                  <TH>Client</TH>
                  <TH>Status</TH>
                  <TH>Progress</TH>
                  <TH>Budget</TH>
                  <TH>Verified</TH>
                  <TH>Utilised</TH>
                  <TH>Delayed</TH>
                  <TH>RAG</TH>
                </TR>
              </THead>
              <TBody>
                {sortedRows.map((r) => (
                  <TR
                    key={r.id}
                    className="cursor-pointer hover:bg-background"
                    onClick={() => {
                      window.location.href = `/programmes/view/?id=${r.id}`;
                    }}
                  >
                    <TD className="font-mono text-xs">{r.code}</TD>
                    <TD>{r.name}</TD>
                    <TD>
                      <Badge tone="neutral">{r.category ?? "—"}</Badge>
                    </TD>
                    <TD className="text-xs">{r.client ?? "—"}</TD>
                    <TD>
                      <Badge tone="in-progress">{r.status}</Badge>
                    </TD>
                    <TD>{Math.round(r.progress)}%</TD>
                    <TD>{formatINR(r.budget)}</TD>
                    <TD>{formatINR(r.verified)}</TD>
                    <TD>
                      {r.utilised == null
                        ? "n/a"
                        : `${Math.round(r.utilised * 100)}%`}
                    </TD>
                    <TD>{r.delayed}</TD>
                    <TD>
                      <Badge
                        tone={
                          r.rag === "red"
                            ? "danger"
                            : r.rag === "amber"
                              ? "warning"
                              : "success"
                        }
                      >
                        {r.rag}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upcoming milestones (30d)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {milestones.length === 0 ? (
              <EmptyState
                title="No upcoming milestones"
                description="Nothing due in the next 30 days."
              />
            ) : (
              milestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {m.programmeCode} · {m.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">
                      {formatDate(m.targetDate)}
                    </span>
                    <Badge
                      tone={
                        m.health === "achieved"
                          ? "on-track"
                          : m.health === "at_risk" || m.health === "missed"
                            ? "delayed"
                            : "neutral"
                      }
                    >
                      {m.health}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Risk alerts ({risks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {risks.length === 0 ? (
              <EmptyState
                title="No risks"
                description="Portfolio alerts are clear."
              />
            ) : (
              risks.slice(0, 12).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="flex items-start justify-between gap-2 text-left text-sm hover:underline"
                  onClick={() => {
                    if (a.link) window.location.href = a.link;
                  }}
                >
                  <span>{a.text}</span>
                  <Badge tone="warning">{a.kind}</Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent programme updates</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recentReports.length === 0 ? (
            <EmptyState
              title="No recent updates"
              description="Submitted or released reports will appear here."
            />
          ) : (
            recentReports.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>
                  {state.programmes[r.programmeId]?.code} ·{" "}
                  {state.activities[r.activityId]?.name} · {r.type}
                </span>
                <Badge
                  tone={r.status === "released" ? "on-track" : "at-risk"}
                >
                  {r.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function LeadershipDashboard() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted">Loading leadership dashboard…</p>
      }
    >
      <LeadershipInner />
    </Suspense>
  );
}
