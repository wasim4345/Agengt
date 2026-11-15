"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
} from "@/components/ui";
import { closureChecks } from "@/lib/rules/closure";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";

export function ClosureChecksPanel({
  defaultProgrammeId,
}: {
  defaultProgrammeId?: ID;
}) {
  const state = useOsStore((s) => s.state);
  const [programmeId, setProgrammeId] = useState(
    defaultProgrammeId ?? Object.keys(state.programmes)[0] ?? "",
  );
  const [result, setResult] = useState<{
    ready: boolean;
    issues: string[];
  } | null>(null);

  const programmes = Object.values(state.programmes);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Closure checks</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Field label="Programme">
          <select
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={programmeId}
            onChange={(e) => {
              setProgrammeId(e.target.value);
              setResult(null);
            }}
          >
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Button
          size="sm"
          onClick={() => setResult(closureChecks(state, programmeId))}
        >
          Run closure checks
        </Button>
        {result ? (
          <div className="flex flex-col gap-2">
            <Badge tone={result.ready ? "on-track" : "delayed"}>
              {result.ready ? "Ready for closure" : "Not ready"}
            </Badge>
            {result.issues.length === 0 ? (
              <p className="text-sm text-muted">
                No submitted expenses; all activities terminal; no pending
                revisions.
              </p>
            ) : (
              <ul className="list-disc pl-5 text-sm text-danger">
                {result.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
