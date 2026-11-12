"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Drawer,
  Field,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { useOsStore } from "@/store/store";
import type { Activity, ID, Priority } from "@/types/domain";

export function ActivityBuilder({ programmeId }: { programmeId: ID }) {
  const state = useOsStore((s) => s.state);
  const {
    addActivity,
    updateActivity,
    deleteActivity,
    duplicateActivity,
    reorderActivity,
    bulkShiftDates,
    bulkAssignOwner,
    setActivityBudgetAmount,
    setActivityMilestones,
  } = useOsStore();
  const { push } = useToast();

  const activities = useMemo(
    () =>
      Object.values(state.activities)
        .filter((a) => a.programmeId === programmeId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.activities, programmeId],
  );
  const users = Object.values(state.users).filter((u) => u.active);
  const milestones = Object.values(state.milestones).filter(
    (m) => m.programmeId === programmeId,
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Activity | null>(null);
  const [shiftDays, setShiftDays] = useState(7);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openEdit(activity: Activity) {
    setEditing({ ...activity });
  }

  function saveEdit() {
    if (!editing) return;
    const r = updateActivity(editing.id, {
      name: editing.name,
      description: editing.description,
      plannedStart: editing.plannedStart,
      plannedEnd: editing.plannedEnd,
      ownerId: editing.ownerId,
      priority: editing.priority,
      expectedOutput: editing.expectedOutput,
      categoryId: editing.categoryId,
    });
    if (!r.ok) {
      push({ title: r.errors[0]?.message ?? "Save failed", tone: "danger" });
      return;
    }
    push({ title: "Activity updated", tone: "success" });
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              const r = addActivity(programmeId, { name: "New activity" });
              if (r.ok) push({ title: "Block added", tone: "success" });
              else
                push({
                  title: r.errors[0]?.message ?? "Add failed",
                  tone: "danger",
                });
            }}
          >
            <Plus className="mr-1 size-3.5" />
            Add block
          </Button>
          <Badge tone="neutral">{activities.length} blocks</Badge>
        </div>
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Field label="Shift days">
              <input
                type="number"
                className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm"
                value={shiftDays}
                onChange={(e) => setShiftDays(Number(e.target.value))}
              />
            </Field>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                bulkShiftDates([...selected], shiftDays);
                push({ title: `Shifted ${selected.size} blocks`, tone: "success" });
              }}
            >
              Shift dates
            </Button>
            <select
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                bulkAssignOwner([...selected], e.target.value);
                push({ title: "Owner assigned", tone: "success" });
                e.target.value = "";
              }}
            >
              <option value="">Assign owner…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <Table>
        <THead>
          <TR>
            <TH className="w-8" />
            <TH>ID</TH>
            <TH>Name</TH>
            <TH>Dates</TH>
            <TH>Owner</TH>
            <TH>Budget</TH>
            <TH>Priority</TH>
            <TH>Deps</TH>
            <TH />
          </TR>
        </THead>
        <TBody>
          {activities.length === 0 ? (
            <TR>
              <TD colSpan={9} className="text-muted">
                No activity blocks. Choose a template or add a blank block.
              </TD>
            </TR>
          ) : (
            activities.map((a) => {
              const depCount = Object.values(state.dependencies).filter(
                (d) =>
                  d.successorId === a.id || d.predecessorId === a.id,
              ).length;
              const budget = state.activityBudgets[a.id]?.revised ?? 0;
              return (
                <TR key={a.id}>
                  <TD>
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggle(a.id)}
                      aria-label={`Select ${a.code}`}
                    />
                  </TD>
                  <TD className="font-mono text-xs">{a.code}</TD>
                  <TD>{a.name}</TD>
                  <TD className="text-xs">
                    {a.plannedStart} → {a.plannedEnd}
                  </TD>
                  <TD className="text-xs">
                    {state.users[a.ownerId]?.name ?? "—"}
                  </TD>
                  <TD className="text-xs">{formatINR(budget)}</TD>
                  <TD>
                    <Badge tone="neutral">{a.priority}</Badge>
                  </TD>
                  <TD className="text-xs">{depCount}</TD>
                  <TD>
                    <div className="flex gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Edit"
                        onClick={() => openEdit(a)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Duplicate"
                        onClick={() => {
                          duplicateActivity(a.id);
                          push({ title: "Duplicated", tone: "success" });
                        }}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Move up"
                        onClick={() => reorderActivity(a.id, "up")}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Move down"
                        onClick={() => reorderActivity(a.id, "down")}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Delete"
                        onClick={() => {
                          const r = deleteActivity(a.id);
                          if (!r.ok && r.errors[0]?.code === "ACT_HAS_LINKS") {
                            if (
                              window.confirm(
                                "Has dependencies/reports/expenses. Cascade delete?",
                              )
                            ) {
                              deleteActivity(a.id, true);
                              push({ title: "Deleted (cascade)", tone: "success" });
                            } else {
                              push({
                                title: r.errors[0].message,
                                tone: "danger",
                              });
                            }
                          } else if (!r.ok) {
                            push({
                              title: r.errors[0]?.message ?? "Delete failed",
                              tone: "danger",
                            });
                          } else {
                            push({ title: "Deleted", tone: "success" });
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              );
            })
          )}
        </TBody>
      </Table>

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.code}` : "Edit activity"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </div>
        }
      >
        {editing ? (
          <div className="flex flex-col gap-3">
            <Field label="Name">
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                className="h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start">
                <input
                  type="date"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={editing.plannedStart}
                  onChange={(e) =>
                    setEditing({ ...editing, plannedStart: e.target.value })
                  }
                />
              </Field>
              <Field label="End">
                <input
                  type="date"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={editing.plannedEnd}
                  onChange={(e) =>
                    setEditing({ ...editing, plannedEnd: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Owner">
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={editing.ownerId}
                onChange={(e) =>
                  setEditing({ ...editing, ownerId: e.target.value })
                }
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={editing.priority}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    priority: e.target.value as Priority,
                  })
                }
              >
                {(["low", "medium", "high", "critical"] as Priority[]).map(
                  (p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Budget (₹)">
              <input
                type="number"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={state.activityBudgets[editing.id]?.revised ?? 0}
                onChange={(e) => {
                  const amount = Number(e.target.value);
                  const r = setActivityBudgetAmount(editing.id, amount);
                  if (!r.ok) {
                    push({
                      title: r.errors[0]?.message ?? "Budget blocked",
                      tone: "danger",
                    });
                  }
                }}
              />
            </Field>
            <Field label="Milestones">
              <div className="flex flex-col gap-1">
                {milestones.map((m) => {
                  const checked = state.activityMilestones.some(
                    (am) =>
                      am.activityId === editing.id && am.milestoneId === m.id,
                  );
                  return (
                    <label key={m.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = state.activityMilestones
                            .filter((am) => am.activityId === editing.id)
                            .map((am) => am.milestoneId);
                          const next = e.target.checked
                            ? [...current, m.id]
                            : current.filter((id) => id !== m.id);
                          setActivityMilestones(editing.id, next);
                        }}
                      />
                      {m.name}
                    </label>
                  );
                })}
                {milestones.length === 0 ? (
                  <p className="text-xs text-muted">
                    Add milestones in step 4.
                  </p>
                ) : null}
              </div>
            </Field>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
