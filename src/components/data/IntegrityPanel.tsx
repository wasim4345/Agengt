"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useIntegrity } from "@/hooks/useStore";

export function IntegrityPanel() {
  const integrity = useIntegrity();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Integrity</CardTitle>
          <Badge tone={integrity.ok ? "on-track" : "delayed"}>
            {integrity.ok ? "All pass" : "Issues"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {integrity.checks.map((c) => (
          <div key={c.id} className="rounded-md border border-border px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{c.label}</span>
              <Badge tone={c.ok ? "on-track" : "delayed"}>
                {c.ok ? "Pass" : "Fail"}
              </Badge>
            </div>
            {c.detail ? (
              <p className="mt-1 text-xs text-muted">{c.detail}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
