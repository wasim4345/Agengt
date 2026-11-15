"use client";

import { STAGE_LABELS, type ProgrammeStage } from "@/types/domain";
import { cn } from "@/lib/cn";

const ORDER: ProgrammeStage[] = [
  "awareness",
  "idea_to_prototype",
  "prototype_to_revenue",
  "growth",
];

export function StageRibbon({
  stage,
  className,
}: {
  stage?: ProgrammeStage;
  className?: string;
}) {
  const active = stage && stage !== "custom" ? stage : undefined;
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      data-testid="stage-ribbon"
      aria-label="Programme stage"
    >
      {ORDER.map((s, i) => {
        const on = active === s;
        return (
          <div key={s} className="flex items-center gap-1">
            {i > 0 ? (
              <span className="text-xs text-muted" aria-hidden>
                →
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                on
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-surface text-muted",
              )}
            >
              {STAGE_LABELS[s]}
            </span>
          </div>
        );
      })}
      {stage === "custom" ? (
        <span className="ml-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
          Custom stage
        </span>
      ) : null}
    </div>
  );
}
