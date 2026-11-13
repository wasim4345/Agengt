"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { clientSafeReportProjection } from "@/selectors/integrity";
import { useOsStore } from "@/store/store";

export default function ClientReportsPage() {
  const state = useOsStore((s) => s.state);
  const clientId = state.users[state.meta.currentUserId]?.clientId;
  const programmeIds = new Set(
    Object.values(state.programmes)
      .filter((p) => p.clientId === clientId)
      .map((p) => p.id),
  );
  const reports = clientSafeReportProjection(state).filter((r) => {
    const full = state.reports[r.id];
    return full && programmeIds.has(full.programmeId);
  });

  return (
    <RoleGate allow={["client"]}>
      <PageHeader
        title="Reports"
        description="Released client summaries only — no internal remarks."
      />
      <div className="flex flex-col gap-3">
        {reports.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {r.clientSummary || "Released report"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">
              <p>{r.whatConducted}</p>
              <p className="mt-2">{r.keyOutcomes}</p>
              <p className="mt-2 text-xs">
                Released · {formatDate(state.meta.demoDate)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
