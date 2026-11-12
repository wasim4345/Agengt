"use client";

import type { ReactNode } from "react";
import { useHydrateStore } from "@/hooks/useStore";
import { Skeleton } from "@/components/ui";

export function HydrationGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrateStore();

  if (!hydrated) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return children;
}
