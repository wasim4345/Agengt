"use client";

import { useEffect } from "react";
import { useOsStore } from "@/store/store";
import { installE2EBridge } from "@/lib/e2eBridge";

/**
 * Only imported when NEXT_PUBLIC_ENABLE_E2E_BRIDGE=1 so production bundles
 * never contain the window.__IIMCIP_OS__ installer.
 */
export function E2EBridgeMount() {
  const hydrated = useOsStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    return installE2EBridge();
  }, [hydrated]);

  return null;
}
