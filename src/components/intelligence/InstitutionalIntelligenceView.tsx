"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { PageHeader } from "@/components/layout/PageHeader";
import { InsightCard } from "@/components/intelligence/InsightCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { CHART } from "@/components/charts/colors";
import { formatINR } from "@/lib/format/inr";
import { formatDate } from "@/lib/format/dates";
import { navigate } from "@/lib/basePath";
import {
  filtersFromSearchParams,
  searchParamsFromFilters,
} from "@/lib/leadershipFilters";
import { fyContaining, listFinancialYears } from "@/lib/fy";
import {
  institutionalFinancial,
  institutionalInsights,
  institutionalOperational,
  institutionalPerformance,
  interventionCentre,
} from "@/selectors/institutional";
import {
  insightRunDiff,
  lastInsightRun,
  severityCounts,
} from "@/selectors/intelligence";
import { resolveFy, type LeadershipFilters } from "@/selectors/leadership";
import { useOsStore } from "@/store/store";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

function pct(n: number | null): string {
  if (n == null) return "n/a";
  return `${Math.round(n * 100)}%`;
}

function InstitutionalInner() {
  const state = useOsStore((s) => s.state);
  const recordInsightRun = useOsStore((s) => s.recordInsightRun);
  const setInsightState = useOsStore((s) => s.setInsightState);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );
  const activeFy = resolveFy(state, filters);
  const filtersWithFy = useMemo(
    () => ({ ...filters, fy: filters.fy ?? activeFy.label }),
    [filters, activeFy.label],
  );
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  function setFilters(next: LeadershipFilters) {
    const q = searchParamsFromFilters(next).toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }

  const fyOptions = useMemo(() => {
    const programmes = Object.values(state.programmes);
    if (programmes.length === 0) return [fyContaining(state.meta.demoDate)];
    const starts = programmes.map((p) => p.startDate).sort();
    const ends = programmes.map((p) => p.endDate).sort();
    return listFinancialYears(starts[0]!, ends[ends.length - 1]!);
  }, [state.programmes, state.meta.demoDate]);

  const performance = institutionalPerformance(state, filtersWithFy);
  const financial = institutionalFinancial(state, filtersWithFy);
  const operational = institutionalOperational(state, filtersWithFy);
  const insights = institutionalInsights(state, filtersWithFy);
  const interventions = interventionCentre(state, filtersWithFy);
  const counts = severityCounts(insights);
  const diff = insightRunDiff(state, insights, "institution");
  const lastRun = lastInsightRun(state, "institution");

  function refresh() {
    recordInsightRun({ scope: "institution", items: insights });
    setGeneratedAt(`${state.meta.demoDate}T12:00:00.000Z`);
  }

  return (
    <>
      <PageHeader
        title="Institutional Intelligence"
        description={`Rule-based portfolio analysis · illustrative sample insights · Generated ${formatDate(generatedAt ?? lastRun?.at ?? state.meta.demoDate)}`}
        actions={
          <Button
            size="sm"
            data-testid="refresh-institutional-insights"
            onClick={refresh}
          >
            Generate / Refresh insights
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-3">
          <Field label="Financial year" className="min-w-[10rem]">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={filtersWithFy.fy}
              onChange={(e) =>
                setFilters({ ...filters, fy: e.target.value || undefined })
              }
            >
              {fyOptions.map((fy) => (
                <option key={fy.label} value={fy.label}>
                  FY {fy.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category" className="min-w-[10rem]">
            <select
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
          <Field label="Programme Lead" className="min-w-[10rem]">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={filters.leadId ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  leadId: e.target.value || undefined,
                })
              }
            >
              <option value="">All</option>
              {Object.values(state.users)
                .filter((u) => u.role === "programme_lead" && u.active)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      <div className="mb-2 flex flex-wrap gap-2 text-sm">
        <Badge tone="danger">Critical {counts.critical}</Badge>
        <Badge tone="warning">High {counts.high}</Badge>
        <Badge tone="at-risk">Medium {counts.medium}</Badge>
        <Badge tone="neutral">Low {counts.low}</Badge>
        <span className="text-xs text-muted">
          New {diff.newCount} · Resolved {diff.resolvedCount}
        </span>
      </div>

      <section className="mb-6" data-testid="inst-performance">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          A · Institutional performance
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Total programmes", performance.total],
              ["Completed", performance.completed],
              ["Ongoing", performance.ongoing],
              ["Upcoming", performance.upcoming],
              ["Delayed programmes", performance.delayed],
              ["Milestone achievement", pct(performance.milestoneAchievement)],
              ["Activity completion", pct(performance.activityCompletion)],
              ["Delivery performance", pct(performance.deliveryPerformance)],
            ] as const
          ).map(([label, value]) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <p className="text-xs text-muted">{label}</p>
                <CardTitle className="text-lg">{value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{performance.formula}</p>
      </section>

      <section className="mb-6" data-testid="inst-financial">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          B · Institutional financial intelligence
        </h2>
        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-xs text-muted">Approved portfolio budget</p>
              <CardTitle className="text-lg">
                {formatINR(financial.budget)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-xs text-muted">Verified expenditure</p>
              <CardTitle className="text-lg">
                {formatINR(financial.verified)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-xs text-muted">Pending verification</p>
              <CardTitle className="text-lg">
                {formatINR(financial.pending)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <p className="text-xs text-muted">Utilisation</p>
              <CardTitle className="text-lg">
                {pct(financial.utilisation)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
        <ChartCard
          title="Programme budget vs cost vs verified"
          empty={financial.byProgramme.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={financial.byProgramme.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="code" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) =>
                  formatINR(typeof value === "number" ? value : Number(value))
                }
              />
              <Legend />
              <Bar dataKey="budget" name="Budget" fill={CHART.primary} />
              <Bar dataKey="cost" name="Cost" fill={CHART.info} />
              <Bar dataKey="verified" name="Verified" fill={CHART.verified} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="mb-6" data-testid="inst-operational">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          C · Cross-programme operational intelligence
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Delayed programmes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {operational.delayedProgrammes.length === 0 ? (
                <EmptyState
                  title="No delayed programmes"
                  description="No delayed activities in the filtered portfolio."
                />
              ) : (
                operational.delayedProgrammes.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex justify-between text-left hover:underline"
                    onClick={() =>
                      navigate(
                        `/programmes/view/?id=${p.id}&layer=intelligence`,
                      )
                    }
                  >
                    <span>
                      {p.code} · {p.name}
                    </span>
                    <Badge tone="danger">{p.delayed} delayed</Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Reporting completion {pct(operational.reportingCompletion)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {operational.bottlenecks.length === 0 ? (
                <p className="text-muted">
                  No repeated activity bottlenecks (≥3 programmes).
                </p>
              ) : (
                operational.bottlenecks.map((b) => (
                  <div key={b.name} className="flex justify-between">
                    <span>{b.name}</span>
                    <Badge tone="warning">
                      {b.programmeCount} programmes
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-6" data-testid="inst-interventions">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          D · Risk & intervention centre
        </h2>
        <Card>
          <CardContent className="py-3">
            {interventions.length === 0 ? (
              <EmptyState
                title="No high-severity interventions"
                description="Critical and high insights will appear here."
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Programme</TH>
                    <TH>Category</TH>
                    <TH>Evidence</TH>
                    <TH>Severity</TH>
                    <TH>Intervention</TH>
                    <TH>Lead</TH>
                    <TH>Deadline</TH>
                  </TR>
                </THead>
                <TBody>
                  {interventions.map((row) => (
                    <TR
                      key={row.insightKey}
                      className="cursor-pointer hover:bg-background"
                      onClick={() => {
                        if (row.programmeId) {
                          navigate(
                            `/programmes/view/?id=${row.programmeId}&layer=intelligence`,
                          );
                        }
                      }}
                    >
                      <TD>
                        <div className="font-medium">{row.programmeCode}</div>
                        <div className="text-xs text-muted">
                          {row.programmeName}
                        </div>
                      </TD>
                      <TD>{row.category}</TD>
                      <TD className="max-w-xs text-xs">{row.evidence}</TD>
                      <TD>
                        <Badge
                          tone={
                            row.severity === "critical" ? "danger" : "warning"
                          }
                        >
                          {row.severity}
                        </Badge>
                      </TD>
                      <TD className="max-w-xs text-xs">{row.intervention}</TD>
                      <TD className="text-xs">{row.leadName ?? "—"}</TD>
                      <TD className="text-xs">
                        {formatDate(row.deadline)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mb-6" data-testid="inst-strategic">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          E · Strategic insights (illustrative)
        </h2>
        <div className="flex flex-col gap-3">
          {insights.length === 0 ? (
            <EmptyState
              title="No institutional insights"
              description="Insufficient data or no rules fired for the current filters."
            />
          ) : (
            insights.slice(0, 20).map((i) => (
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
            ))
          )}
        </div>
      </section>
    </>
  );
}

export function InstitutionalIntelligenceView() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted">Loading institutional intelligence…</p>
      }
    >
      <InstitutionalInner />
    </Suspense>
  );
}
