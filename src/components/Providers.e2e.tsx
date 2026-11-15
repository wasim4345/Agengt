"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";
import { E2EBridgeMount } from "@/components/E2EBridgeMount";

/** E2E-only providers — swapped in by next.config when the e2e flag is set. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <HydrationGate>
        <E2EBridgeMount />
        {children}
      </HydrationGate>
    </ToastProvider>
  );
}
