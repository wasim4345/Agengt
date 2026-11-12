"use client";

import { useState } from "react";
import {
  Button,
  Field,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@/components/ui";
import { useOsStore } from "@/store/store";
import type { DepType, ID } from "@/types/domain";

export function DependencyEditor({ programmeId }: { programmeId: ID }) {
  const state = useOsStore((s) => s.state);
  const addDependency = useOsStore((s) => s.addDependency);
  const deleteDependency = useOsStore((s) => s.deleteDependency);
  const { push } = useToast();

  const activities = Object.values(state.activities)
    .filter((a) => a.programmeId === programmeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const deps = Object.values(state.dependencies).filter(
    (d) => d.programmeId === programmeId,
  );

  const [successorId, setSuccessorId] = useState(activities[1]?.id ?? "");
  const [predecessorId, setPredecessorId] = useState(activities[0]?.id ?? "");
  const [type, setType] = useState<DepType>("FS");
  const [lagDays, setLagDays] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Field label="Predecessor">
          <select
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={predecessorId}
            onChange={(e) => setPredecessorId(e.target.value)}
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Successor">
          <select
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={successorId}
            onChange={(e) => setSuccessorId(e.target.value)}
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as DepType)}
          >
            {(["FS", "SS", "FF", "SF"] as DepType[]).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lag days">
          <input
            type="number"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={lagDays}
            onChange={(e) => setLagDays(Number(e.target.value))}
          />
        </Field>
        <div className="flex items-end">
          <Button
            onClick={() => {
              const r = addDependency({
                programmeId,
                successorId,
                predecessorId,
                type,
                lagDays,
              });
              if (!r.ok) {
                push({
                  title: r.errors[0]?.message ?? "Dependency rejected",
                  tone: "danger",
                });
              } else {
                push({ title: "Dependency added", tone: "success" });
              }
            }}
          >
            Add dependency
          </Button>
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Predecessor</TH>
            <TH>Successor</TH>
            <TH>Type</TH>
            <TH>Lag</TH>
            <TH />
          </TR>
        </THead>
        <TBody>
          {deps.length === 0 ? (
            <TR>
              <TD colSpan={5} className="text-muted">
                No dependencies yet.
              </TD>
            </TR>
          ) : (
            deps.map((d) => (
              <TR key={d.id}>
                <TD>
                  {d.predecessorId
                    ? `${state.activities[d.predecessorId]?.code ?? d.predecessorId}`
                    : d.predecessorMilestoneId}
                </TD>
                <TD>{state.activities[d.successorId]?.code ?? d.successorId}</TD>
                <TD>{d.type}</TD>
                <TD>{d.lagDays}</TD>
                <TD>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      deleteDependency(d.id);
                      push({ title: "Dependency removed", tone: "success" });
                    }}
                  >
                    Delete
                  </Button>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
