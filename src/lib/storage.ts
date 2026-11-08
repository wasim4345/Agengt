import { STORAGE_KEY } from "./limits";
import { emptyState } from "./workflow";
import type { AppState } from "./types";

export function loadState(): AppState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || parsed.version !== 1) return emptyState();
    return { ...emptyState(), ...parsed, version: 1 };
  } catch {
    return emptyState();
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
