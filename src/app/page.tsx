"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { formatINR, formatINRCompact } from "@/lib/format/inr";
import { useAppState, useIntegrity, useOsActions } from "@/hooks/useStore";
import { programmeFinancials } from "@/selectors/finance";

export default function HomePage() {
  const { push } = useToast();
  const state = useAppState();
  const integrity = useIntegrity();
  const actions = useOsActions();
  const [busy, setBusy] = useState(false);

  const programmeCount = Object.keys(state.programmes).length;
  const activityCount = Object.keys(state.activities).length;

  const rows = useMemo(
    () =>
      Object.values(state.programmes).map((programme) => {
        const fin = programmeFinancials(state, programme.id);
        return { programme, fin };
      }),
    [state],
  );

  const run = (label: string, fn: () => { ok: boolean }) => {
    setBusy(true);
    const result = fn();
    setBusy(false);
    push({
      title: result.ok ? label : `${label} failed`,
      tone: result.ok ? "success" : "danger",
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <p className="text-2xl font-semibold tracking-tight text-primary">
          IIMCIP · Programme OS
        </p>
        <p className="max-w-2xl text-sm text-muted">
          Milestone M1 — central mock store, persistence, seed data, and
          integrity checks. Demo date {formatDate(state.meta.demoDate)}.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone="primary">M1 Store & seed</Badge>
          <Badge tone={integrity.ok ? "on-track" : "delayed"}>
            Integrity {integrity.ok ? "all-green" : "issues"}
          </Badge>
          <Badge tone="neutral">
            {programmeCount} programmes · {activityCount} activities
          </Badge>
          <Badge tone="info">Seed {state.meta.seedVersion}</Badge>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Flagship budget</CardDescription>
            <CardTitle>{formatINR(25_00_000)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Compact KPI</CardDescription>
            <CardTitle>{formatINRCompact(25_00_000)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Integrity checks</CardDescription>
            <CardTitle>
              {integrity.checks.filter((c) => c.ok).length}/
              {integrity.checks.length} pass
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Store controls</CardTitle>
          <CardDescription>
            Reload the page to confirm persistence. Reset restores the exact
            default seed for the current demo date.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            disabled={busy}
            onClick={() =>
              run("Reset to seed", () => actions.resetToSeed())
            }
          >
            Reset to seed
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run("Load healthy", () => actions.loadScenario("healthy"))
            }
          >
            Healthy scenario
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run("Load troubled", () => actions.loadScenario("troubled"))
            }
          >
            Troubled scenario
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => run("Clear all", () => actions.clearAll())}
          >
            Clear all
          </Button>
          <Button
            variant="accent"
            disabled={busy}
            onClick={() => {
              const result = actions.rawUpsert("programmes", "prg_p1", {
                ...state.programmes.prg_p1!,
                name: `${state.programmes.prg_p1!.name} (edited)`,
              });
              run("Edit flagship name", () => result);
            }}
          >
            Edit flagship name
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted">
            Role: {state.meta.currentRole} · User:{" "}
            {state.users[state.meta.currentUserId]?.name ?? "—"} · Log entries:{" "}
            {state.log.length}
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {integrity.checks.map((check) => (
            <div
              key={check.id}
              className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0"
            >
              <div>
                <p className="text-sm font-medium">{check.label}</p>
                {check.detail ? (
                  <p className="text-xs text-muted">{check.detail}</p>
                ) : null}
              </div>
              <Badge tone={check.ok ? "on-track" : "delayed"}>
                {check.ok ? "Pass" : "Fail"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <section>
        <Table>
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Name</TH>
              <TH>Status</TH>
              <TH>Budget</TH>
              <TH>Unallocated</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map(({ programme, fin }) => (
              <TR key={programme.id}>
                <TD>{programme.code}</TD>
                <TD>{programme.name}</TD>
                <TD>
                  <Badge
                    tone={
                      programme.status === "active"
                        ? "in-progress"
                        : programme.status === "completed"
                          ? "on-track"
                          : programme.status === "draft"
                            ? "not-started"
                            : "at-risk"
                    }
                  >
                    {programme.status}
                  </Badge>
                </TD>
                <TD>{formatINR(programme.totalBudget)}</TD>
                <TD>{formatINR(fin.unallocated)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </section>
    </main>
  );
}
