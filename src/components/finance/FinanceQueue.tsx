"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Field,
  MoneyInput,
  useToast,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { formatDate } from "@/lib/format/dates";
import { canVerifyExpense } from "@/lib/rules/expense";
import { queue as selectQueue } from "@/selectors/financeRole";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";

export function FinanceQueue() {
  const state = useOsStore((s) => s.state);
  const verifyExpense = useOsStore((s) => s.verifyExpense);
  const rejectExpense = useOsStore((s) => s.rejectExpense);
  const { push } = useToast();

  const [programmeFilter, setProgrammeFilter] = useState("");
  const [expanded, setExpanded] = useState<ID | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [partial, setPartial] = useState<Record<string, number | null>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const items = useMemo(() => {
    return selectQueue(state).filter(
      (row) => !programmeFilter || row.expense.programmeId === programmeFilter,
    );
  }, [state, programmeFilter]);

  const programmes = Object.values(state.programmes);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function doVerify(id: ID, reduced?: boolean) {
    const amount = reduced ? partial[id] : undefined;
    const r = verifyExpense(id, {
      verifiedAmount: amount ?? undefined,
      remarks: remarks[id],
    });
    push({
      title: r.ok
        ? reduced
          ? "Partially verified"
          : "Expense verified"
        : (r.errors[0]?.message ?? "Verify failed"),
      tone: r.ok ? "success" : "danger",
    });
  }

  function doReject(id: ID) {
    const r = rejectExpense(id, remarks[id] ?? "");
    push({
      title: r.ok
        ? "Expense rejected"
        : (r.errors[0]?.message ?? "Reject failed"),
      tone: r.ok ? "success" : "danger",
    });
  }

  function bulkApprove() {
    let okCount = 0;
    let fail = 0;
    for (const id of selected) {
      const r = verifyExpense(id);
      if (r.ok) okCount += 1;
      else fail += 1;
    }
    setSelected(new Set());
    push({
      title: `Bulk verify: ${okCount} approved${fail ? `, ${fail} blocked` : ""}`,
      tone: fail ? "danger" : "success",
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Programme" className="min-w-[12rem]">
          <select
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={programmeFilter}
            onChange={(e) => setProgrammeFilter(e.target.value)}
          >
            <option value="">All programmes</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </select>
        </Field>
        <Button
          size="sm"
          variant="secondary"
          disabled={selected.size === 0}
          onClick={bulkApprove}
        >
          Bulk approve ({selected.size})
        </Button>
        <p className="text-sm text-muted">{items.length} in queue</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">No submitted expenses.</p>
      ) : (
        items.map((row) => {
          const e = row.expense;
          const verifyOk = canVerifyExpense(state, e.id);
          const open = expanded === e.id;
          return (
            <Card key={e.id}>
              <CardContent className="flex flex-col gap-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.has(e.id)}
                      onChange={() => toggleSelect(e.id)}
                      aria-label={`Select ${e.description}`}
                    />
                    <div>
                      <p className="text-sm font-medium">{e.description}</p>
                      <p className="text-xs text-muted">
                        {row.programme?.code} · {row.activity?.code} ·{" "}
                        {formatDate(e.date)} · age {row.ageDays}d
                        {e.overspendFlag ? " · Overspend flagged" : ""}
                      </p>
                      <p className="text-xs text-muted">
                        Activity: Reported {formatINR(row.activityFinancials.reported)}{" "}
                        / Revised {formatINR(row.activityFinancials.revised)} ·{" "}
                        Remaining {formatINR(row.activityFinancials.remaining)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatINR(e.amount)}
                    </span>
                    <Badge
                      tone={
                        row.activityFinancials.alert === "breach"
                          ? "delayed"
                          : e.overspendFlag
                            ? "at-risk"
                            : "neutral"
                      }
                    >
                      {row.activityFinancials.alert === "breach"
                        ? "breach"
                        : "submitted"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpanded(open ? null : e.id)}
                    >
                      {open ? "Hide" : "Review"}
                    </Button>
                  </div>
                </div>

                {open ? (
                  <div className="flex flex-col gap-3 border-t border-border pt-3">
                    {!verifyOk.ok ? (
                      <p className="text-xs text-danger">
                        {verifyOk.errors[0]?.message ??
                          "Raise a budget reallocation"}
                      </p>
                    ) : null}
                    <Field label="Remarks">
                      <input
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                        value={remarks[e.id] ?? ""}
                        onChange={(ev) =>
                          setRemarks((prev) => ({
                            ...prev,
                            [e.id]: ev.target.value,
                          }))
                        }
                        placeholder="Required for reject / partial verify"
                      />
                    </Field>
                    <div className="flex flex-wrap items-end gap-3">
                      <MoneyInput
                        label="Reduced amount (optional)"
                        value={partial[e.id] ?? null}
                        onChange={(v) =>
                          setPartial((prev) => ({ ...prev, [e.id]: v }))
                        }
                      />
                      <Button
                        size="sm"
                        disabled={!verifyOk.ok}
                        title={
                          !verifyOk.ok
                            ? "Raise a budget reallocation"
                            : undefined
                        }
                        onClick={() => doVerify(e.id, false)}
                      >
                        Approve full
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!verifyOk.ok || partial[e.id] == null}
                        onClick={() => doVerify(e.id, true)}
                      >
                        Approve reduced
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => doReject(e.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
