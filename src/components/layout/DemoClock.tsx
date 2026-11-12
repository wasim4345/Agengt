"use client";

import { useState } from "react";
import { addDays, addMonths, format, parseISO } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export function DemoClock() {
  const demoDate = useOsStore((s) => s.state.meta.demoDate);
  const setDemoDate = useOsStore((s) => s.setDemoDate);
  const [open, setOpen] = useState(false);

  const shift = (days: number) => {
    const next = format(addDays(parseISO(demoDate), days), "yyyy-MM-dd");
    setDemoDate(next);
  };

  const shiftMonths = (months: number) => {
    const next = format(addMonths(parseISO(demoDate), months), "yyyy-MM-dd");
    setDemoDate(next);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm",
          "hover:bg-background",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarDays className="h-4 w-4 text-muted" aria-hidden />
        <span>
          Today: <span className="font-medium">{formatDate(demoDate)}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Demo clock"
          className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-border bg-surface p-3 shadow-lg"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Demo clock
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Set today</span>
            <input
              type="date"
              className="h-9 rounded-[var(--radius-control)] border border-border px-2"
              value={demoDate}
              onChange={(e) => {
                if (e.target.value) setDemoDate(e.target.value);
              }}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => shift(-7)}>
              −1 week
            </Button>
            <Button size="sm" variant="secondary" onClick={() => shift(7)}>
              +1 week
            </Button>
            <Button size="sm" variant="secondary" onClick={() => shiftMonths(-1)}>
              −1 month
            </Button>
            <Button size="sm" variant="secondary" onClick={() => shiftMonths(1)}>
              +1 month
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </div>
      ) : null}
    </div>
  );
}
