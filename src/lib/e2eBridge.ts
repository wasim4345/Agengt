"use client";

/**
 * Playwright store bridge — installed only from builds that compile with
 * NEXT_PUBLIC_ENABLE_E2E_BRIDGE=1 (see Providers). Production publishes must
 * never call installE2EBridge().
 */
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

export function installE2EBridge(): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.__IIMCIP_OS__ = {
    getState: () => useOsStore.getState().state,
    getStore: () => useOsStore.getState(),
    flushPersist,
  };
  return () => {
    delete window.__IIMCIP_OS__;
  };
}
