"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent } from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";

export default function ApprovalsPage() {
  const approvals = useOsStore((s) => Object.values(s.state.approvals));
  const programmes = useOsStore((s) => s.state.programmes);

  return (
    <RoleGate allow={["leadership", "finance"]}>
      <PageHeader
        title="Approvals"
        description="Pending and decided approvals from the mock store."
      />
      <div className="flex flex-col gap-2">
        {approvals.length === 0 ? (
          <p className="text-sm text-muted">No approvals in the store.</p>
        ) : (
          approvals.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-medium">
                    {a.type} · {programmes[a.programmeId]?.code ?? a.programmeId}
                  </p>
                  <p className="text-xs text-muted">
                    Requested {formatDate(a.requestedAt.slice(0, 10))}
                    {a.reason ? ` — ${a.reason}` : ""}
                  </p>
                </div>
                <Badge
                  tone={
                    a.status === "pending"
                      ? "at-risk"
                      : a.status === "approved"
                        ? "on-track"
                        : "delayed"
                  }
                >
                  {a.status}
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </RoleGate>
  );
}
