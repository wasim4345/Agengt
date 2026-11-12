"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent } from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { useOsStore } from "@/store/store";

export default function ProgrammesPage() {
  const state = useOsStore((s) => s.state);
  const role = state.meta.currentRole;
  const userId = state.meta.currentUserId;
  const programmes = Object.values(state.programmes).filter((p) => {
    if (role === "programme_manager") return p.managerId === userId;
    return true;
  });

  return (
    <RoleGate allow={["leadership", "programme_manager", "finance"]}>
      <PageHeader
        title={role === "programme_manager" ? "My programmes" : "Programmes"}
        description="Live programme list from the central store."
      />
      <div className="flex flex-col gap-2">
        {programmes.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-medium">
                  {p.code} · {p.name}
                </p>
                <p className="text-xs text-muted">{formatINR(p.totalBudget)}</p>
              </div>
              <Badge tone="in-progress">{p.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
