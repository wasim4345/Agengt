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
import { useIntegrity, useOsActions } from "@/hooks/useStore";
import { useOsStore } from "@/store/store";
import { useToast } from "@/components/ui";

export default function DataManagerPage() {
  const state = useOsStore((s) => s.state);
  const actions = useOsActions();
  const integrity = useIntegrity();
  const { push } = useToast();

  return (
    <RoleGate
      allow={[
        "leadership",
        "programme_manager",
        "client",
        "marcom",
        "finance",
      ]}
    >
      <PageHeader
        title="Data Manager"
        description="Presenter tools — full CRUD UI arrives in M4. Reset / scenarios work now."
        actions={<Badge tone="neutral">Presenter tools</Badge>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const r = actions.resetToSeed();
                push({
                  title: r.ok ? "Reset to seed" : "Reset failed",
                  tone: r.ok ? "success" : "danger",
                });
              }}
            >
              Reset to seed
            </Button>
            <Button
              variant="secondary"
              onClick={() => actions.loadScenario("healthy")}
            >
              Healthy
            </Button>
            <Button
              variant="secondary"
              onClick={() => actions.loadScenario("troubled")}
            >
              Troubled
            </Button>
            <Button variant="ghost" onClick={() => actions.clearAll()}>
              Clear all
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integrity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {integrity.checks.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between text-sm"
              >
                <span>{c.label}</span>
                <Badge tone={c.ok ? "on-track" : "delayed"}>
                  {c.ok ? "Pass" : "Fail"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted">
        Seed {state.meta.seedVersion} · {Object.keys(state.programmes).length}{" "}
        programmes · {state.log.length} log entries
      </p>
    </RoleGate>
  );
}
