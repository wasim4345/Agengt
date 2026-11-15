"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { CHART } from "@/components/charts/colors";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { formatINR, formatINRCompact } from "@/lib/format/inr";
import { navigate } from "@/lib/basePath";
import { cn } from "@/lib/cn";
import * as manager from "@/selectors/manager";
import { useOsStore } from "@/store/store";

export function BudgetVsCostPanel() {
  const state = useOsStore((s) => s.state);
  const programmes = manager.myProgrammes(state);
  const defaultId =
    programmes.find((p) => p.programme.status === "active")?.programme.id ??
    programmes[0]?.programme.id ??
    "";
  const [programmeId, setProgrammeId] = useState(defaultId);

  const rows = useMemo(
    () =>
      programmeId
        ? manager.budgetVsCostByActivity(state, programmeId)
        : [],
    [state, programmeId],
  );
  const activityRows = rows.filter((r) => r.kind === "activity");
  const chartData = activityRows.map((r) => ({
    code: r.code,
    name: r.name,
    activityId: r.activityId,
    budget: r.budget,
    cost: r.cost,
    surplus: r.surplus,
    pctUsed: r.pctUsed,
    over: r.cost > r.budget,
  }));

  if (programmes.length === 0) return null;

  return (
    <Card className="mb-4" data-testid="budget-vs-cost-panel">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Budget vs cost by activity</CardTitle>
        <select
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
          value={programmeId}
          onChange={(e) => setProgrammeId(e.target.value)}
          aria-label="Programme"
        >
          {programmes.map((p) => (
            <option key={p.programme.id} value={p.programme.id}>
              {p.programme.code} · {p.programme.name}
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent className="space-y-4">
        {activityRows.length === 0 ? (
          <EmptyState
            title="No activities yet"
            description="Add activity blocks to see budget vs cost."
          />
        ) : (
          <>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatINRCompact(Number(v))}
                  />
                  <Tooltip
                    formatter={(v, name) => [
                      formatINR(typeof v === "number" ? v : Number(v)),
                      String(name),
                    ]}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        | (typeof chartData)[number]
                        | undefined;
                      if (!row) return "";
                      const pct =
                        row.pctUsed == null
                          ? "n/a"
                          : `${Math.round(row.pctUsed * 100)}%`;
                      const label =
                        row.surplus >= 0
                          ? `Surplus ${formatINR(row.surplus)}`
                          : `Deficit ${formatINR(Math.abs(row.surplus))}`;
                      return `${row.code} · ${row.name} · ${label} · ${pct} used`;
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="budget"
                    name="Budget approved"
                    fill={CHART.primary}
                    radius={3}
                    onClick={(d) => {
                      const id = (d as { activityId?: string }).activityId;
                      if (id) {
                        navigate(
                          `/programmes/activity/?programmeId=${programmeId}&activityId=${id}`,
                        );
                      }
                    }}
                  />
                  <Bar
                    dataKey="cost"
                    name="Cost incurred"
                    radius={3}
                    onClick={(d) => {
                      const id = (d as { activityId?: string }).activityId;
                      if (id) {
                        navigate(
                          `/programmes/activity/?programmeId=${programmeId}&activityId=${id}`,
                        );
                      }
                    }}
                  >
                    {chartData.map((row) => (
                      <Cell
                        key={row.activityId}
                        fill={row.over ? CHART.danger : CHART.info}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <Table>
              <THead>
                <TR>
                  <TH>Activity</TH>
                  <TH>Budget approved</TH>
                  <TH>Cost incurred</TH>
                  <TH>Surplus / Deficit</TH>
                  <TH>% used</TH>
                  <TH>Alert</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR
                    key={`${r.kind}-${r.activityId ?? r.name}`}
                    className={cn(
                      r.cancelled ? "opacity-50" : undefined,
                      r.kind === "activity" ? "cursor-pointer" : undefined,
                      r.surplus < 0 ? "bg-[var(--color-danger)]/5" : undefined,
                    )}
                    onClick={() => {
                      if (r.activityId) {
                        navigate(
                          `/programmes/activity/?programmeId=${programmeId}&activityId=${r.activityId}`,
                        );
                      }
                    }}
                  >
                    <TD>
                      {r.code ? `${r.code} · ` : ""}
                      {r.name}
                    </TD>
                    <TD>{formatINR(r.budget)}</TD>
                    <TD>{formatINR(r.cost)}</TD>
                    <TD
                      className={
                        r.surplus < 0
                          ? "font-medium text-[var(--color-danger)]"
                          : undefined
                      }
                    >
                      {r.surplus < 0 ? "Deficit " : "Surplus "}
                      {formatINR(Math.abs(r.surplus))}
                    </TD>
                    <TD>
                      {r.pctUsed == null
                        ? "n/a"
                        : `${Math.round(r.pctUsed * 100)}%`}
                    </TD>
                    <TD>
                      {r.alert === "ok" ? (
                        <Badge tone="neutral">—</Badge>
                      ) : (
                        <Badge
                          tone={r.alert === "breach" ? "delayed" : "at-risk"}
                        >
                          <AlertTriangle className="mr-1 inline h-3 w-3" />
                          {r.alert === "breach" ? "Over budget" : "90% used"}
                        </Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
