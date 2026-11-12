"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card, CardContent } from "@/components/ui";
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
        description="Open a programme for budget, structure, or continue a draft wizard."
        actions={
          role === "programme_manager" ? (
            <Button
              size="sm"
              onClick={() => {
                window.location.href = "/programmes/new/";
              }}
            >
              New programme
            </Button>
          ) : null
        }
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
              <div className="flex items-center gap-2">
                <Badge tone="in-progress">{p.status}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (p.status === "draft" && p.wizardDraft) {
                      window.location.href = `/programmes/new/?id=${p.id}`;
                    } else {
                      window.location.href = `/programmes/view/?id=${p.id}`;
                    }
                  }}
                >
                  {p.status === "draft" && p.wizardDraft ? "Continue" : "Open"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
