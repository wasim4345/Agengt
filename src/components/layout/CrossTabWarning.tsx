"use client";

import { Button } from "@/components/ui";
import { useOsStore } from "@/store/store";

export function CrossTabWarning() {
  const warning = useOsStore((s) => s.crossTabWarning);
  const clear = useOsStore((s) => s.clearCrossTabWarning);

  if (!warning) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/40 bg-warning/10 px-4 py-2 text-sm print:hidden">
      <p>
        Data changed in another tab — reload to pick up the latest prototype
        state.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload
        </Button>
        <Button size="sm" variant="ghost" onClick={() => clear()}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
