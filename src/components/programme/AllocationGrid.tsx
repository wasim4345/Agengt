"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MoneyInput,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { programmeFinancials } from "@/selectors/finance";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";

export function AllocationGrid({ programmeId }: { programmeId: ID }) {
  const state = useOsStore((s) => s.state);
  const setActivityBudgetAmount = useOsStore((s) => s.setActivityBudgetAmount);
  const updateProgramme = useOsStore((s) => s.updateProgramme);
  const { push } = useToast();
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const programme = state.programmes[programmeId];
  if (!programme) return null;

  const activities = Object.values(state.activities)
    .filter((a) => a.programmeId === programmeId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const fin = programmeFinancials(state, programmeId);
  const editable = programme.status === "draft";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Budget summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Programme budget</p>
            {editable ? (
              <MoneyInput
                label="Total"
                value={programme.totalBudget}
                onChange={(v) => {
                  if (v == null) return;
                  const r = updateProgramme(programmeId, {
                    totalBudget: v,
                    originalBudget: v,
                  });
                  if (!r.ok) {
                    push({
                      title: r.errors[0]?.message ?? "Budget update failed",
                      tone: "danger",
                    });
                  }
                }}
              />
            ) : (
              <p className="text-lg font-semibold">
                {formatINR(programme.totalBudget)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted">Allocated</p>
            <p className="text-lg font-semibold">{formatINR(fin.allocated)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Unallocated</p>
            <p
              className={`text-lg font-semibold ${
                fin.unallocated > 0 ? "text-accent" : ""
              }`}
            >
              {formatINR(fin.unallocated)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Allocation %</p>
            <Badge tone={fin.unallocated >= 0 ? "neutral" : "delayed"}>
              {programme.totalBudget
                ? Math.round((fin.allocated / programme.totalBudget) * 100)
                : 0}
              %
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Table>
        <THead>
          <TR>
            <TH>Activity</TH>
            <TH>Revised</TH>
            <TH>% of total</TH>
            <TH />
          </TR>
        </THead>
        <TBody>
          {activities.map((a) => {
            const revised = state.activityBudgets[a.id]?.revised ?? 0;
            return (
              <TR key={a.id}>
                <TD>
                  <span className="font-mono text-xs">{a.code}</span> {a.name}
                </TD>
                <TD className="min-w-[10rem]">
                  {editable ? (
                    <div className="flex flex-col gap-1">
                      <input
                        type="number"
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                        value={revised}
                        onChange={(e) => {
                          const amount = Number(e.target.value);
                          if (Number.isNaN(amount)) return;
                          const r = setActivityBudgetAmount(a.id, amount);
                          if (!r.ok) {
                            setErrorById((prev) => ({
                              ...prev,
                              [a.id]: r.errors[0]?.message ?? "Blocked",
                            }));
                            push({
                              title: r.errors[0]?.message ?? "Over-allocation blocked",
                              tone: "danger",
                            });
                          } else {
                            setErrorById((prev) => {
                              const next = { ...prev };
                              delete next[a.id];
                              return next;
                            });
                          }
                        }}
                      />
                      {errorById[a.id] ? (
                        <p className="text-xs text-danger">{errorById[a.id]}</p>
                      ) : null}
                    </div>
                  ) : (
                    formatINR(revised)
                  )}
                </TD>
                <TD>
                  {programme.totalBudget
                    ? `${((revised / programme.totalBudget) * 100).toFixed(1)}%`
                    : "—"}
                </TD>
                <TD>
                  {editable ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const r = setActivityBudgetAmount(a.id, revised + 1_00_000);
                        if (!r.ok) {
                          push({
                            title: r.errors[0]?.message ?? "Blocked",
                            tone: "danger",
                          });
                        }
                      }}
                    >
                      +₹1L test
                    </Button>
                  ) : null}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
