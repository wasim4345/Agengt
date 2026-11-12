"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { validateProgramme } from "@/lib/rules/programme";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";

export function ValidationPanel({
  programmeId,
  acknowledgeUnallocated,
}: {
  programmeId: ID;
  acknowledgeUnallocated: boolean;
}) {
  const state = useOsStore((s) => s.state);
  const result = validateProgramme(state, programmeId, {
    acknowledgeUnallocated,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Validation</CardTitle>
          <Badge tone={result.ok ? "on-track" : "delayed"}>
            {result.ok ? "Ready" : `${result.errors.length} blocking`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {result.errors.length === 0 && result.warnings.length === 0 ? (
          <p className="text-muted">No issues — ready to submit.</p>
        ) : null}
        {result.errors.map((e) => (
          <div
            key={`${e.code}-${e.field}-${e.message}`}
            className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2"
          >
            <p className="font-medium text-danger">
              E · {e.code} — {e.message}
            </p>
            {e.field ? (
              <p className="text-xs text-muted">Field: {e.field}</p>
            ) : null}
          </div>
        ))}
        {result.warnings.map((w) => (
          <div
            key={`${w.code}-${w.field}-${w.message}`}
            className="rounded-md border border-border px-3 py-2"
          >
            <p className="font-medium">
              W · {w.code} — {w.message}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
