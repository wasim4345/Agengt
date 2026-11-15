"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { GanttChart } from "@/components/gantt";
import { ActivityBuilder } from "@/components/programme/ActivityBuilder";
import { AllocationGrid } from "@/components/programme/AllocationGrid";
import { DependencyEditor } from "@/components/programme/DependencyEditor";
import { LifecyclePanel } from "@/components/programme/LifecyclePanel";
import { MilestoneEditor } from "@/components/programme/MilestoneEditor";
import { StageRibbon } from "@/components/programme/StageRibbon";
import { programmeFinancials } from "@/selectors/finance";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { navigate } from "@/lib/basePath";
import { cn } from "@/lib/cn";
import { useOsStore } from "@/store/store";
import * as kpiSel from "@/selectors/kpi";

type WorkspaceLayer = "financials" | "operational" | "intelligence";

function ProgrammeViewInner() {
  const search = useSearchParams();
  const id = search.get("id") ?? "";
  const state = useOsStore((s) => s.state);
  const saveProgrammeAsTemplate = useOsStore((s) => s.saveProgrammeAsTemplate);
  const { push } = useToast();
  const [tplName, setTplName] = useState("");
  const [layer, setLayer] = useState<WorkspaceLayer>("operational");
  const role = state.meta.currentRole;
  const canVerify =
    role === "leadership" || role === "programme_lead";

  const programme = state.programmes[id];
  const activityCount = useMemo(
    () =>
      Object.values(state.activities).filter((a) => a.programmeId === id)
        .length,
    [state.activities, id],
  );
  const category = programme
    ? state.categories[programme.categoryId]
    : undefined;
  const office = programme?.officeId
    ? state.offices[programme.officeId]
    : undefined;
  const kpiRows = programme ? kpiSel.achieved(state, programme.id) : [];
  const fin = programme ? programmeFinancials(state, programme.id) : null;

  if (!id || !programme) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted">
          Programme not found. Open one from the programmes list.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={`${programme.code} · ${programme.name}`}
        description={`${programme.startDate} → ${programme.endDate} · ${formatINR(programme.totalBudget)}${
          office ? ` · ${office.name}, ${office.state}` : ""
        }`}
        actions={<Badge tone="in-progress">{programme.status}</Badge>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StageRibbon stage={category?.stage} />
        {office ? (
          <Badge tone="neutral" data-testid="office-badge">
            {office.name} · {office.state}
          </Badge>
        ) : null}
        {state.clients[programme.clientId] ? (
          <Badge tone="neutral">
            Sponsor: {state.clients[programme.clientId]!.name} (
            {state.clients[programme.clientId]!.type})
          </Badge>
        ) : null}
      </div>

      {kpiRows.length > 0 ? (
        <Card className="mb-4">
          <CardContent className="grid gap-2 py-3 sm:grid-cols-2 lg:grid-cols-3">
            {kpiRows.map((row) => (
              <div key={row.kpi.id}>
                <p className="text-xs text-muted">{row.kpi.name}</p>
                <p className="text-sm font-medium">
                  {kpiSel.formatKpiValue(row.kpi.unit, row.achieved)}
                  <span className="font-normal text-muted">
                    {" "}
                    / {kpiSel.formatKpiValue(row.kpi.unit, row.kpi.target)}
                  </span>
                </p>
                {row.fromSubmittedUnreleased > 0 ? (
                  <p className="text-[11px] text-muted">incl. unreleased</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {programme.status === "draft" ? (
        <div className="mb-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              navigate(`/programmes/new/?id=${programme.id}`);
            }}
          >
            Continue wizard
          </Button>
        </div>
      ) : null}

      <div
        className="mb-4 inline-flex gap-1 rounded-[var(--radius-control)] border border-border bg-background p-1"
        role="tablist"
        aria-label="Programme workspace layers"
        data-testid="workspace-layers"
      >
        {(
          [
            ["financials", "A · Financials"],
            ["operational", "B · Operational Data"],
            ["intelligence", "C · Programme Intelligence"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={layer === key}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              layer === key
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
            onClick={() => setLayer(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {layer === "financials" ? (
        <div className="space-y-4" data-testid="layer-financials">
          {fin ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Budget summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted">Approved</p>
                  <p className="font-semibold tabular-nums">
                    {formatINR(fin.budget)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Cost incurred</p>
                  <p className="font-semibold tabular-nums">
                    {formatINR(fin.reported)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Verified · Pending</p>
                  <p className="font-semibold tabular-nums">
                    {formatINR(fin.verified)} · {formatINR(fin.pending)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">
                    {fin.surplus < 0 ? "Deficit" : "Surplus"} · Unallocated
                  </p>
                  <p className="font-semibold tabular-nums">
                    {formatINR(Math.abs(fin.surplus))} ·{" "}
                    {formatINR(fin.unallocated)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <AllocationGrid programmeId={id} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Expense history</CardTitle>
              {!canVerify ? (
                <p className="text-xs text-muted">
                  Verification is available to Programme Lead and Leadership
                  (queue under Financials).
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 w-fit"
                  onClick={() => navigate("/finance/queue/")}
                >
                  Open verification queue
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Activity</TH>
                    <TH>Description</TH>
                    <TH>Amount</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {Object.values(state.expenses)
                    .filter((e) => e.programmeId === id)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((e) => (
                      <TR key={e.id}>
                        <TD className="text-xs">{e.date}</TD>
                        <TD className="text-xs">
                          {state.activities[e.activityId]?.code ?? "—"}
                        </TD>
                        <TD className="text-sm">{e.description}</TD>
                        <TD className="tabular-nums">{formatINR(e.amount)}</TD>
                        <TD>
                          <Badge tone="neutral">{e.status}</Badge>
                        </TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {layer === "operational" ? (
        <Tabs defaultValue="overview" data-testid="layer-operational">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="deps">Dependencies</TabsTrigger>
            <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
            <TabsTrigger value="template">Save as template</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardContent className="space-y-2 py-4 text-sm">
                <p>
                  Client: {state.clients[programme.clientId]?.name ?? "—"} ·
                  Lead: {state.users[programme.leadId]?.name ?? "—"} · Manager:{" "}
                  {state.users[programme.managerId]?.name ?? "—"}
                </p>
                <p className="text-muted">
                  {activityCount} activities · Category{" "}
                  {state.categories[programme.categoryId]?.name}
                </p>
                <p>{programme.objectives || "No objectives set."}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            {programme.status === "draft" ? (
              <ActivityBuilder programmeId={id} />
            ) : (
              <div className="flex flex-col gap-2">
                {Object.values(state.activities)
                  .filter((a) => a.programmeId === id)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((a) => (
                    <Card key={a.id}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div>
                          <p className="text-sm font-medium">
                            {a.code} · {a.name}
                          </p>
                          <p className="text-xs text-muted">{a.status}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            navigate(
                              `/programmes/activity/?programmeId=${id}&activityId=${a.id}`,
                            );
                          }}
                        >
                          Open workspace
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <GanttChart programmeId={id} />
          </TabsContent>

          <TabsContent value="deps" className="mt-4 space-y-6">
            {programme.status === "draft" ? (
              <>
                <DependencyEditor programmeId={id} />
                <MilestoneEditor programmeId={id} />
              </>
            ) : (
              <p className="text-sm text-muted">
                Structure locked after activation.
              </p>
            )}
          </TabsContent>

          <TabsContent value="lifecycle" className="mt-4">
            <LifecyclePanel programmeId={id} />
          </TabsContent>

          <TabsContent value="template" className="mt-4">
            <Card>
              <CardContent className="flex flex-col gap-3 py-4">
                <Field label="Template name">
                  <input
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    placeholder={`${programme.name} template`}
                  />
                </Field>
                <Button
                  onClick={() => {
                    const name =
                      tplName.trim() || `${programme.name} template`;
                    const r = saveProgrammeAsTemplate(id, name);
                    if (r.ok) {
                      push({
                        title: `Saved template ${r.data.templateId}`,
                        tone: "success",
                      });
                      navigate("/templates/");
                    } else {
                      push({
                        title: r.errors[0]?.message ?? "Save failed",
                        tone: "danger",
                      });
                    }
                  }}
                >
                  Save programme as template
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}

      {layer === "intelligence" ? (
        <Card data-testid="layer-intelligence">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Programme Intelligence</CardTitle>
            <p className="text-xs text-muted">
              Rule-based analysis · Generate / Refresh lands in the next step
            </p>
          </CardHeader>
          <CardContent className="text-sm text-muted">
            Insights for this programme (operational, financial, risk,
            performance, recommended actions) will appear here. No AI — store
            rules only.
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

export default function ProgrammeViewPage() {
  return (
    <RoleGate allow={["leadership", "programme_manager", "programme_lead"]}>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <ProgrammeViewInner />
      </Suspense>
    </RoleGate>
  );
}
