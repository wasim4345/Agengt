"use client";

import { AlertTriangle } from "lucide-react";
import { formatINR, formatINRCompact } from "@/lib/format/inr";
import { cn } from "@/lib/cn";
import type { ActivityFinancials } from "@/selectors/finance";

function money(n: number, compact: boolean) {
  return compact ? formatINRCompact(n) : formatINR(n);
}

export function BudgetStrip({
  fin,
  compact = false,
  onCostClick,
  onBudgetClick,
  className,
}: {
  fin: ActivityFinancials;
  compact?: boolean;
  onCostClick?: () => void;
  onBudgetClick?: () => void;
  className?: string;
}) {
  const pct =
    fin.utilisation == null ? null : Math.round(fin.utilisation * 100);
  const deficit = fin.surplus < 0;
  const barPct = Math.min(120, Math.max(0, pct ?? 0));
  const barTone =
    fin.alert === "breach"
      ? "bg-[var(--color-danger)]"
      : fin.alert === "warning"
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-4",
        className,
      )}
      data-testid="budget-strip"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="text-left"
          onClick={onBudgetClick}
          disabled={!onBudgetClick}
        >
          <p className="text-xs uppercase tracking-wide text-muted">
            Budget approved
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
            {money(fin.revised, compact)}
          </p>
        </button>
        <button
          type="button"
          className="text-left"
          onClick={onCostClick}
          disabled={!onCostClick}
        >
          <p className="text-xs uppercase tracking-wide text-muted">
            Cost incurred
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
            {money(fin.reported, compact)}
          </p>
        </button>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {deficit ? "Deficit" : "Surplus"}
          </p>
          <p
            className={cn(
              "mt-1 text-xl font-semibold tabular-nums sm:text-2xl",
              deficit ? "text-[var(--color-danger)]" : "text-foreground",
            )}
          >
            {deficit ? "Deficit " : ""}
            {money(Math.abs(fin.surplus), compact)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border/60">
        <div
          className={cn("h-full transition-all", barTone)}
          style={{ width: `${Math.min(100, barPct)}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>
          {pct == null ? "n/a used" : `${pct}% used`}
          {fin.alert === "warning" ? " (amber ≥ 90%)" : null}
          {fin.alert === "breach" ? " (over budget)" : null}
        </span>
        {fin.alert !== "ok" ? (
          <span className="inline-flex items-center gap-1 text-foreground">
            <AlertTriangle
              className={cn(
                "h-3.5 w-3.5",
                fin.alert === "breach"
                  ? "text-[var(--color-danger)]"
                  : "text-amber-600",
              )}
              aria-hidden
            />
            {fin.alert === "breach" ? "Over budget" : "90% used"}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted">
        Verified {money(fin.verified, compact)} · Pending{" "}
        {money(fin.pending, compact)}
        {fin.original !== fin.revised
          ? ` · Original budget ${money(fin.original, compact)}`
          : null}
      </p>
    </div>
  );
}
