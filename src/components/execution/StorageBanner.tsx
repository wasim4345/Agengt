"use client";

export function StorageBanner() {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted">
      Prototype storage: files stay in this browser only (IndexedDB, 5 MB per
      file).
    </div>
  );
}
