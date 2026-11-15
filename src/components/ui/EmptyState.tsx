import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "./Card";

export type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

/** Illustration-free empty state card (doc 05 §3). */
export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-start gap-3 py-8">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="max-w-prose text-sm text-muted">{description}</p>
        {action ? <div className="pt-1">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
