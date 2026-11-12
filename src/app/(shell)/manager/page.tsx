"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { useOsStore } from "@/store/store";

export default function ManagerHomePage() {
  const state = useOsStore((s) => s.state);
  const userId = state.meta.currentUserId;
  const mine = Object.values(state.programmes).filter(
    (p) => p.managerId === userId,
  );
  const delayed = Object.values(state.activities).filter(
    (a) =>
      a.status === "delayed" &&
      mine.some((p) => p.id === a.programmeId),
  );

  return (
    <RoleGate allow={["programme_manager"]}>
      <PageHeader
        title="My dashboard"
        description="Programmes assigned to the current persona."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {mine.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {p.code} · {p.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted">
                {formatINR(p.totalBudget)}
              </span>
              <Badge tone="in-progress">{p.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Delayed activities</CardTitle>
        </CardHeader>
        <CardContent>
          {delayed.length === 0 ? (
            <p className="text-sm text-muted">No delayed activities.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {delayed.map((a) => (
                <li key={a.id} className="text-sm">
                  {a.code} · {a.name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </RoleGate>
  );
}
