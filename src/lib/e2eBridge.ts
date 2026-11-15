"use client";

import { useEffect } from "react";
import { flushPersist, useOsStore, type OsStore } from "@/store/store";
import type { AppState } from "@/types/domain";

export type OsE2EApi = {
  getState: () => AppState;
  getStore: () => OsStore;
  flushPersist: () => void;
};

declare global {
  interface Window {
    __IIMCIP_OS__?: OsE2EApi;
  }
}

/**
 * Playwright-only store bridge. Mounted solely when the build was compiled
 * with NEXT_PUBLIC_ENABLE_E2E_BRIDGE=1. Production / published builds omit
 * this flag so window.__IIMCIP_OS__ is never assigned.
 */
export function E2EBridge() {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_E2E_BRIDGE === "1";
  const hydrated = useOsStore((s) => s.hydrated);

  useEffect(() => {
    if (!enabled || !hydrated || typeof window === "undefined") return;
    window.__IIMCIP_OS__ = {
      getState: () => useOsStore.getState().state,
      getStore: () => useOsStore.getState(),
      flushPersist,
    };
    return () => {
      delete window.__IIMCIP_OS__;
    };
  }, [enabled, hydrated]);

  if (!enabled) return null;
  return null;
}
