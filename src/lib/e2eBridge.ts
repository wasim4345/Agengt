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

/** Exposes the live store for Playwright demo helpers (front-end only). */
export function E2EBridge() {
  const hydrated = useOsStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.__IIMCIP_OS__ = {
      getState: () => useOsStore.getState().state,
      getStore: () => useOsStore.getState(),
      flushPersist,
    };
    return () => {
      delete window.__IIMCIP_OS__;
    };
  }, [hydrated]);

  return null;
}
