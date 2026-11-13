"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportPaper } from "@/components/reports/ReportPaper";
import { ExportButtons } from "@/components/reports/ExportButtons";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
} from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import {
  buildReport,
  catalogueForRole,
  type ReportId,
  type ReportParams,
} from "@/selectors/reports";
import { useOsStore } from "@/store/store";

export function ReportsCentre({
  lockedReportId,
}: {
  /** When set (client route), only that report is available. */
  lockedReportId?: ReportId;
}) {
  const state = useOsStore((s) => s.state);
  const role = state.meta.currentRole;
  const catalogue = lockedReportId
    ? catalogueForRole(role).filter((r) => r.id === lockedReportId)
    : catalogueForRole(role);

  const [selected, setSelected] = useState<ReportId>(
    lockedReportId ?? catalogue[0]?.id ?? "leadership_summary",
  );
  const [programmeId, setProgrammeId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [includeOverview, setIncludeOverview] = useState(true);
  const [includeTables, setIncludeTables] = useState(true);

  const params: ReportParams = useMemo(
    () => ({
      programmeId: programmeId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sections: { overview: includeOverview, tables: includeTables },
    }),
    [programmeId, dateFrom, dateTo, includeOverview, includeTables],
  );

  const report = buildReport(state, selected, params);
  const programmes = Object.values(state.programmes);

  return (
    <div className="reports-centre">
      <div className="print:hidden">
        <PageHeader
          title="Reports centre"
          description={`Live previews from selectors · Data as of ${formatDate(state.meta.demoDate)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="flex flex-col gap-2 print:hidden">
          {catalogue.length === 0 ? (
            <EmptyState
              title="No reports"
              description="No report types available for this role."
            />
          ) : (
            catalogue.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelected(item.id);
                  if (item.id === "programme_closure" && !programmeId) {
                    setProgrammeId(programmes[0]?.id ?? "");
                  }
                }}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  selected === item.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface hover:bg-background"
                }`}
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted">{item.description}</p>
                {item.clientSafe ? (
                  <Badge tone="info" className="mt-2">
                    Client-safe
                  </Badge>
                ) : null}
              </button>
            ))
          )}
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="print:hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Parameters</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <Field label="Programme" className="min-w-[12rem]">
                <select
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={programmeId}
                  onChange={(e) => setProgrammeId(e.target.value)}
                >
                  <option value="">All programmes</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} · {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="From" className="min-w-[9rem]">
                <input
                  type="date"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </Field>
              <Field label="To" className="min-w-[9rem]">
                <input
                  type="date"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeOverview}
                  onChange={(e) => setIncludeOverview(e.target.checked)}
                />
                Overview
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeTables}
                  onChange={(e) => setIncludeTables(e.target.checked)}
                />
                Tables
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setProgrammeId("");
                  setDateFrom("");
                  setDateTo("");
                  setIncludeOverview(true);
                  setIncludeTables(true);
                }}
              >
                Clear
              </Button>
              <div className="ml-auto">
                <ExportButtons report={report} />
              </div>
            </CardContent>
          </Card>

          <ReportPaper
            report={
              includeTables
                ? report
                : {
                    ...report,
                    rows: [],
                    sections: includeOverview ? report.sections : undefined,
                  }
            }
          />
        </div>
      </div>
    </div>
  );
}
