"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Field,
  Modal,
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
import type { ID } from "@/types/domain";

export function ExpenseTable({
  programmeId,
  activityId,
  reportId,
}: {
  programmeId: ID;
  activityId: ID;
  reportId?: ID;
}) {
  const state = useOsStore((s) => s.state);
  const addExpense = useOsStore((s) => s.addExpense);
  const deleteExpense = useOsStore((s) => s.deleteExpense);
  const resubmitExpense = useOsStore((s) => s.resubmitExpense);
  const submitExpense = useOsStore((s) => s.submitExpense);
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: 10_000,
    categoryId: Object.keys(state.expenseCategories)[0] ?? "",
    date: state.meta.demoDate,
    justification: "",
  });

  const expenses = Object.values(state.expenses)
    .filter((e) => e.activityId === activityId)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between">
        <p className="text-sm text-muted">{expenses.length} expense entries</p>
        <Button size="sm" onClick={() => setOpen(true)}>
          Add expense
        </Button>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Date</TH>
            <TH>Description</TH>
            <TH>Category</TH>
            <TH>Amount</TH>
            <TH>Status</TH>
            <TH />
          </TR>
        </THead>
        <TBody>
          {expenses.length === 0 ? (
            <TR>
              <TD colSpan={6} className="text-muted">
                No expenses yet.
              </TD>
            </TR>
          ) : (
            expenses.map((e) => (
              <TR key={e.id}>
                <TD className="text-xs">{e.date}</TD>
                <TD>
                  {e.description}
                  {e.overspendFlag ? (
                    <Badge tone="delayed" className="ml-2">
                      Overspend
                    </Badge>
                  ) : null}
                  {e.decision?.remarks ? (
                    <p className="text-xs text-danger">
                      Rejection: {e.decision.remarks}
                    </p>
                  ) : null}
                </TD>
                <TD className="text-xs">
                  {state.expenseCategories[e.categoryId]?.name ?? e.categoryId}
                </TD>
                <TD className="text-xs">{formatINR(e.amount)}</TD>
                <TD>
                  <Badge
                    tone={
                      e.status === "verified"
                        ? "on-track"
                        : e.status === "rejected"
                          ? "delayed"
                          : e.status === "submitted"
                            ? "at-risk"
                            : "neutral"
                    }
                  >
                    {e.status}
                  </Badge>
                </TD>
                <TD>
                  {e.status === "draft" ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const r = submitExpense(e.id);
                          push({
                            title: r.ok
                              ? "Submitted to Finance"
                              : (r.errors[0]?.message ?? "Failed"),
                            tone: r.ok ? "success" : "danger",
                          });
                        }}
                      >
                        Submit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          deleteExpense(e.id);
                          push({ title: "Expense deleted", tone: "success" });
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : null}
                  {e.status === "rejected" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const r = resubmitExpense(e.id);
                        push({
                          title: r.ok
                            ? "Resubmission draft created"
                            : (r.errors[0]?.message ?? "Failed"),
                          tone: r.ok ? "success" : "danger",
                        });
                      }}
                    >
                      Resubmit
                    </Button>
                  ) : null}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add expense"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const r = addExpense({
                  programmeId,
                  activityId,
                  reportId,
                  categoryId: form.categoryId,
                  description: form.description,
                  date: form.date,
                  amount: form.amount,
                  justification: form.justification || undefined,
                });
                if (!r.ok) {
                  push({
                    title: r.errors[0]?.message ?? "Expense blocked",
                    tone: "danger",
                  });
                  return;
                }
                push({ title: "Expense added (draft)", tone: "success" });
                setOpen(false);
                setForm((f) => ({ ...f, description: "", amount: 10_000 }));
              }}
            >
              Save draft
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Description">
            <input
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Amount (₹)">
              <input
                type="number"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Category">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.categoryId}
              onChange={(e) =>
                setForm({ ...form, categoryId: e.target.value })
              }
            >
              {Object.values(state.expenseCategories).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Overspend justification (if needed)">
            <input
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.justification}
              onChange={(e) =>
                setForm({ ...form, justification: e.target.value })
              }
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
