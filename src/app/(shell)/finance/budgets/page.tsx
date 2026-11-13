"use client";

import { useState } from "react";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClosureChecksPanel } from "@/components/finance/ClosureChecksPanel";
import { OverspendAlerts } from "@/components/finance/OverspendAlerts";
import { RevisionHistory } from "@/components/finance/RevisionHistory";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import {
  activityAllocations,
  programmeBudgets,
} from "@/selectors/financeRole";
import { useOsStore } from "@/store/store";

export default function FinanceBudgetsPage() {
  const state = useOsStore((s) => s.state);
  const programmes = programmeBudgets(state);
  const [programmeId, setProgrammeId] = useState(
    programmes[0]?.programme.id ?? "",
  );
  const allocations = activityAllocations(state, programmeId || undefined);

  return (
    <RoleGate allow={["finance"]}>
      <PageHeader
        title="Budgets"
        description="Approved / reported / verified / pending with revision history."
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <OverspendAlerts />
        <ClosureChecksPanel defaultProgrammeId={programmeId || undefined} />
      </div>

      <div className="mb-4 flex flex-col gap-2">
        {programmes.map(({ programme: p, financials: fin }) => (
          <Card key={p.id}>
            <CardContent className="py-3 text-sm">
              <p className="font-medium">
                {p.code} · {p.name}{" "}
                <Badge tone="neutral" className="ml-2">
                  {p.status}
                </Badge>
              </p>
              <p className="mt-1 text-muted">
                Approved {formatINR(fin.budget)} · Allocated{" "}
                {formatINR(fin.allocated)} · Unallocated{" "}
                {formatINR(fin.unallocated)}
              </p>
              <p className="text-muted">
                Reported {formatINR(fin.reported)} · Verified{" "}
                {formatINR(fin.verified)} · Pending {formatINR(fin.pending)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity allocations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label="Programme">
            <select
              className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm"
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
                    <span className="font-mono text-xs">{a.code}</span> {a.name}
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
        </CardContent>
      </Card>

      {programmeId ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revision history</CardTitle>
          </CardHeader>
          <CardContent>
            <RevisionHistory programmeId={programmeId} />
          </CardContent>
        </Card>
      ) : null}
    </RoleGate>
  );
}
