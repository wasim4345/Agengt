"use client";

import { useEffect } from "react";
import { useOsStore } from "@/store/store";
import { runIntegrityChecks } from "@/selectors/integrity";

export function useHydrateStore() {
  const hydrate = useOsStore((s) => s.hydrate);
  const hydrated = useOsStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return hydrated;
}

export function useAppState() {
  return useOsStore((s) => s.state);
}

export function useOsActions() {
  return useOsStore((s) => ({
    resetToSeed: s.resetToSeed,
    loadScenario: s.loadScenario,
    clearAll: s.clearAll,
    saveSnapshot: s.saveSnapshot,
    restoreSnapshot: s.restoreSnapshot,
    deleteSnapshot: s.deleteSnapshot,
    exportJSON: s.exportJSON,
    importJSON: s.importJSON,
    setDemoDate: s.setDemoDate,
    setRole: s.setRole,
    setUser: s.setUser,
    setAllowRuleBreaking: s.setAllowRuleBreaking,
    undo: s.undo,
    rawUpsert: s.rawUpsert,
    rawDelete: s.rawDelete,
  }));
}

export function useIntegrity() {
  const state = useAppState();
  return runIntegrityChecks(state);
}
