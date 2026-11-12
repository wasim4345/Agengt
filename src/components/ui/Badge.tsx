import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "on-track"
  | "at-risk"
  | "delayed"
  | "in-progress"
  | "not-started";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-border/70 text-foreground",
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  "on-track": "bg-status-on-track/10 text-status-on-track",
  "at-risk": "bg-status-at-risk/10 text-status-at-risk",
  delayed: "bg-status-delayed/10 text-status-delayed",
  "in-progress": "bg-status-in-progress/10 text-status-in-progress",
  "not-started": "bg-status-not-started/10 text-status-not-started",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
