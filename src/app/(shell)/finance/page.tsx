"use client";

import Link from "next/link";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { OverspendAlerts } from "@/components/finance/OverspendAlerts";
import { ClosureChecksPanel } from "@/components/finance/ClosureChecksPanel";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { programmeBudgets, queue } from "@/selectors/financeRole";
import { useOsStore } from "@/store/store";

export default function FinanceHomePage() {
  const state = useOsStore((s) => s.state);
  const pending = queue(state);
  const programmes = programmeBudgets(state);

  return (
    <RoleGate allow={["finance"]}>
      <PageHeader
        title="Finance dashboard"
        description="Budgets, overspend alerts, and verification queue."
        actions={
          <Link
            href="/finance/queue/"
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm text-primary-foreground"
          >
            Open queue
          </Link>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <OverspendAlerts />
        <ClosureChecksPanel />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">
            Queue preview ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {pending.slice(0, 6).map((row) => (
            <div
              key={row.expense.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span>
                {row.expense.description}
                {row.expense.overspendFlag ? (
                  <Badge tone="warning" className="ml-2">
                    overspend
                  </Badge>
                ) : null}
              </span>
              <span className="font-medium">
                {formatINR(row.expense.amount)}
              </span>
            </div>
          ))}
          {pending.length === 0 ? (
            <p className="text-sm text-muted">Queue is empty.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Programme budgets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {programmes.map(({ programme: p, financials: fin }) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0"
            >
              <span>
                {p.code}{" "}
                <Badge tone="neutral" className="ml-2">
                  {p.status}
                </Badge>
                {fin.alert === "critical" ? (
                  <Badge tone="danger" className="ml-2">
                    critical
                  </Badge>
                ) : null}
              </span>
              <span>
                Approved {formatINR(fin.budget)} · Reported{" "}
                {formatINR(fin.reported)} · Verified {formatINR(fin.verified)} ·
                Pending {formatINR(fin.pending)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </RoleGate>
  );
}
