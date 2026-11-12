import type { Patch } from "immer";

export type UndoEntry = {
  patches: Patch[];
  inversePatches: Patch[];
  label: string;
};

/** Keep only the last mutation for single-step undo (Gantt / reversible actions). */
export function replaceUndo(
  _current: UndoEntry | null,
  next: UndoEntry,
): UndoEntry {
  return next;
}
