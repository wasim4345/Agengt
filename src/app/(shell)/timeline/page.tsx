"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { GanttChart } from "@/components/gantt";
import { Badge, Card, CardContent, Field } from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { IDS } from "@/seed/ids";
import { useOsStore } from "@/store/store";

export default function TimelinePage() {
  const state = useOsStore((s) => s.state);
  const role = state.meta.currentRole;
  const userId = state.meta.currentUserId;

  const programmes = useMemo(() => {
    const all = Object.values(state.programmes);
    if (role === "programme_manager") {
      return all.filter((p) => p.managerId === userId);
    }
    return all;
  }, [state.programmes, role, userId]);

  const [programmeId, setProgrammeId] = useState("");

  useEffect(() => {
    if (programmeId && programmes.some((p) => p.id === programmeId)) return;
    const preferred =
      programmes.find((p) => p.id === IDS.programmes.p1)?.id ??
      programmes[0]?.id ??
      "";
    setProgrammeId(preferred);
  }, [programmes, programmeId]);

  const selected =
    programmes.find((p) => p.id === programmeId) ?? programmes[0];

  return (
    <RoleGate allow={["leadership", "programme_manager"]}>
      <PageHeader
        title={
          role === "programme_manager"
            ? "Programme timeline"
            : "Portfolio timeline"
        }
        description="Interactive Gantt — drag bars, link dependencies, accept downstream shifts."
      />

      {programmes.length === 0 ? (
        <p className="text-sm text-muted">No programmes to show.</p>
      ) : (
        <>
          <div className="mb-4 max-w-md">
            <Field label="Programme">
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={selected?.id ?? ""}
                onChange={(e) => setProgrammeId(e.target.value)}
              >
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selected ? (
            <>
              <Card className="mb-4">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {selected.code} · {selected.name}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(selected.startDate)} →{" "}
                      {formatDate(selected.endDate)}
                    </p>
                  </div>
                  <Badge tone="in-progress">{selected.status}</Badge>
                </CardContent>
              </Card>
              <GanttChart programmeId={selected.id} />
            </>
          ) : null}
        </>
      )}
    </RoleGate>
  );
}
