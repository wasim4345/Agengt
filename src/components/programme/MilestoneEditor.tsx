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
import type { ID } from "@/types/domain";

export function MilestoneEditor({ programmeId }: { programmeId: ID }) {
  const state = useOsStore((s) => s.state);
  const addMilestone = useOsStore((s) => s.addMilestone);
  const updateMilestone = useOsStore((s) => s.updateMilestone);
  const deleteMilestone = useOsStore((s) => s.deleteMilestone);
  const { push } = useToast();
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState(
    state.programmes[programmeId]?.endDate ?? state.meta.demoDate,
  );

  const milestones = Object.values(state.milestones)
    .filter((m) => m.programmeId === programmeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Name">
          <input
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Milestone name"
          />
        </Field>
        <Field label="Target date">
          <input
            type="date"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </Field>
        <div className="flex items-end">
          <Button
            onClick={() => {
              const r = addMilestone(programmeId, {
                name: name || "New milestone",
                targetDate,
              });
              if (r.ok) {
                setName("");
                push({ title: "Milestone added", tone: "success" });
              } else {
                push({
                  title: r.errors[0]?.message ?? "Failed",
                  tone: "danger",
                });
              }
            }}
          >
            Add milestone
          </Button>
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Target</TH>
            <TH>Client visible</TH>
            <TH>Gating activities</TH>
            <TH />
          </TR>
        </THead>
        <TBody>
          {milestones.length === 0 ? (
            <TR>
              <TD colSpan={5} className="text-muted">
                No milestones yet.
              </TD>
            </TR>
          ) : (
            milestones.map((m) => {
              const gating = state.activityMilestones
                .filter((am) => am.milestoneId === m.id && am.gating)
                .map((am) => state.activities[am.activityId]?.code ?? am.activityId);
              return (
                <TR key={m.id}>
                  <TD>
                    <input
                      className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm"
                      value={m.name}
                      onChange={(e) =>
                        updateMilestone(m.id, { name: e.target.value })
                      }
                    />
                  </TD>
                  <TD>
                    <input
                      type="date"
                      className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                      value={m.targetDate}
                      onChange={(e) =>
                        updateMilestone(m.id, { targetDate: e.target.value })
                      }
                    />
                  </TD>
                  <TD>
                    <input
                      type="checkbox"
                      checked={m.clientVisible}
                      onChange={(e) =>
                        updateMilestone(m.id, {
                          clientVisible: e.target.checked,
                        })
                      }
                    />
                  </TD>
                  <TD className="text-xs text-muted">
                    {gating.length ? gating.join(", ") : "—"}
                  </TD>
                  <TD>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        deleteMilestone(m.id);
                        push({ title: "Milestone deleted", tone: "success" });
                      }}
                    >
                      Delete
                    </Button>
                  </TD>
                </TR>
              );
            })
          )}
        </TBody>
      </Table>
    </div>
  );
}
