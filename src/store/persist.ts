import type { AppState, SnapshotRecord } from "@/types/domain";
import { STORAGE_KEYS } from "@/types/domain";
import { migrate } from "./migrations";

export function readPersistedState(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.state);
    if (!raw) return null;
    return migrate(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writePersistedState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(state));
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "QuotaExceededError"
    ) {
      throw error;
    }
    // ignore other write failures in prototype
  }
}

export function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.state);
}

export function readSnapshots(): SnapshotRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.snapshots);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SnapshotRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSnapshots(snapshots: SnapshotRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEYS.snapshots,
    JSON.stringify(snapshots.slice(0, 10)),
  );
}
