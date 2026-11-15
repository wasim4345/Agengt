"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";
import { E2EBridge } from "@/lib/e2eBridge";

/** Compile-time gate — production builds never mount the Playwright store bridge. */
const ENABLE_E2E_BRIDGE = process.env.NEXT_PUBLIC_ENABLE_E2E_BRIDGE === "1";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <HydrationGate>
        {ENABLE_E2E_BRIDGE ? <E2EBridge /> : null}
        {children}
      </HydrationGate>
    </ToastProvider>
  );
}
