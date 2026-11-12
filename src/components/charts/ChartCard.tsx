"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";

export function ChartCard({
  title,
  empty,
  children,
  className,
}: {
  title: string;
  empty?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState
            title="Nothing to show"
            description="No data for this widget with the current filters."
          />
        ) : (
          <div className="h-64 w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
