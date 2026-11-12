"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { IDS } from "@/seed/ids";
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
  const outreach = state.activities["act_p1_a02"];

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
              <div className="flex gap-2">
                <Badge tone="in-progress">{p.status}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    window.location.href = `/programmes/view/?id=${p.id}`;
                  }}
                >
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {outreach && mine.some((p) => p.id === IDS.programmes.p1) ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Report now</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Demo step 7 — open Outreach Sessions workspace to file a delay
              report with expenses and photo evidence.
            </p>
            <Button
              onClick={() => {
                window.location.href = `/programmes/activity/?programmeId=${IDS.programmes.p1}&activityId=act_p1_a02`;
              }}
            >
              Open Outreach Sessions
            </Button>
          </CardContent>
        </Card>
      ) : null}

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
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {a.code} · {a.name}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      window.location.href = `/programmes/activity/?programmeId=${a.programmeId}&activityId=${a.id}`;
                    }}
                  >
                    Workspace
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </RoleGate>
  );
}
