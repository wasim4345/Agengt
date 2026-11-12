"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <HydrationGate>{children}</HydrationGate>
    </ToastProvider>
  );
}
