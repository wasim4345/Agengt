"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent } from "@/components/ui";
import { useOsStore } from "@/store/store";

export default function StartupsPage() {
  const state = useOsStore((s) => s.state);
  const role = state.meta.currentRole;

  const rows = state.programmeStartups
    .filter((ps) => {
      if (role === "marcom" || role === "client") {
        return ["selected", "onboarded", "graduated"].includes(ps.status);
      }
      return true;
    })
    .map((ps) => ({
      ...ps,
      startup: state.startups[ps.startupId],
      programme: state.programmes[ps.programmeId],
    }));

  return (
    <RoleGate allow={["marcom", "leadership", "programme_manager"]}>
      <PageHeader
        title="Startups"
        description="Participation filtered by role visibility rules."
      />
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <Card key={`${row.programmeId}-${row.startupId}`}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">
                  {row.startup?.name ?? row.startupId}
                </p>
                <p className="text-xs text-muted">
                  {row.startup?.sector} · {row.programme?.code}
                </p>
              </div>
              <Badge tone="neutral">{row.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
