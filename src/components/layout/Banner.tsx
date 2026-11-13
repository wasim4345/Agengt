"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useOsStore } from "@/store/store";
import { Button } from "@/components/ui";

const keyFor = (role: string) => `iimcip-os:v1:banner-dismissed:${role}`;

export function Banner() {
  const role = useOsStore((s) => s.state.meta.currentRole);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(keyFor(role)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [role]);

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/5 px-4 py-2 text-sm">
      <p className="text-foreground">
        Prototype — illustrative mock data. Programme and sponsor names are
        real; figures are invented for demo.
      </p>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Dismiss banner"
        onClick={() => {
          try {
            window.localStorage.setItem(keyFor(role), "1");
          } catch {
            // ignore
          }
          setDismissed(true);
        }}
      >
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
