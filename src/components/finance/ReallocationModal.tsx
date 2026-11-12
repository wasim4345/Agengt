"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Field,
  Modal,
  MoneyInput,
  useToast,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { needsLeadershipForReallocation } from "@/lib/rules/budget";
import { activityFinancials, programmeFinancials } from "@/selectors/finance";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";

export function ReallocationModal({
  programmeId,
  open,
  onClose,
}: {
  programmeId: ID;
  open: boolean;
  onClose: () => void;
}) {
  const state = useOsStore((s) => s.state);
  const requestBudgetRevision = useOsStore((s) => s.requestBudgetRevision);
  const { push } = useToast();

  const activities = useMemo(
    () =>
      Object.values(state.activities)
        .filter((a) => a.programmeId === programmeId && a.status !== "cancelled")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [state.activities, programmeId],
  );

  const [fromId, setFromId] = useState(activities[0]?.id ?? "");
  const [toId, setToId] = useState(activities[1]?.id ?? activities[0]?.id ?? "");
  const [amount, setAmount] = useState<number | null>(50_000);
  const [reason, setReason] = useState("");

  const programme = state.programmes[programmeId];
  const fin = programmeFinancials(state, programmeId);
  const fromFin = fromId ? activityFinancials(state, fromId) : null;
  const toFin = toId ? activityFinancials(state, toId) : null;

  const needsLeadership =
    fromId && amount
      ? needsLeadershipForReallocation(state, fromId, amount)
      : false;

  if (!programme) return null;

  return (
    <Modal open={open} onClose={onClose} title="Request reallocation">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Unallocated {formatINR(fin.unallocated)} · Programme total stays{" "}
          {formatINR(programme.totalBudget)}
        </p>
        <Field label="From activity">
          <select
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.name} ({formatINR(state.activityBudgets[a.id]?.revised ?? 0)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="To activity">
          <select
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.name} ({formatINR(state.activityBudgets[a.id]?.revised ?? 0)})
              </option>
            ))}
          </select>
        </Field>
        <MoneyInput label="Amount" value={amount} onChange={setAmount} />
        {fromFin && toFin && amount ? (
          <p className="text-xs text-muted">
            After: {fromId === toId ? "no change" : (
              <>
                from {formatINR(fromFin.revised - amount)} · to{" "}
                {formatINR(toFin.revised + amount)}
              </>
            )}
            {needsLeadership ? " · Needs Leadership approval" : " · Finance only"}
          </p>
        ) : null}
        <Field label="Reason">
          <input
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why reallocate?"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!fromId || !toId || !amount || amount <= 0) {
                push({ title: "Choose activities and amount", tone: "danger" });
                return;
              }
              if (fromId === toId) {
                push({ title: "From and to must differ", tone: "danger" });
                return;
              }
              const fromBefore = state.activityBudgets[fromId]?.revised ?? 0;
              const toBefore = state.activityBudgets[toId]?.revised ?? 0;
              const r = requestBudgetRevision({
                programmeId,
                kind: "reallocation",
                reason,
                totalAfter: programme.totalBudget,
                lines: [
                  {
                    activityId: fromId,
                    before: fromBefore,
                    after: fromBefore - amount,
                  },
                  {
                    activityId: toId,
                    before: toBefore,
                    after: toBefore + amount,
                  },
                ],
              });
              if (r.ok) {
                push({
                  title: "Reallocation submitted to Finance",
                  tone: "success",
                });
                onClose();
              } else {
                push({
                  title: r.errors[0]?.message ?? "Request failed",
                  tone: "danger",
                });
              }
            }}
          >
            Submit request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
