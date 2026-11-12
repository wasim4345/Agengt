"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";
import { E2EBridge } from "@/lib/e2eBridge";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <HydrationGate>
        <E2EBridge />
        {children}
      </HydrationGate>
    </ToastProvider>
  );
}
