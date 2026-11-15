"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  Field,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { navigate } from "@/lib/basePath";
import type { programmeRows } from "@/selectors/leadership";

type Row = ReturnType<typeof programmeRows>[number];

export function ProgrammeListingTable({
  rows,
  testId = "programme-listing-table",
}: {
  rows: Row[];
  testId?: string;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<
    "name" | "progress" | "budget" | "delayed"
  >("name");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          (r.client ?? "").toLowerCase().includes(q) ||
          (r.lead ?? "").toLowerCase().includes(q) ||
          (r.manager ?? "").toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (sortKey === "progress") return b.progress - a.progress;
      if (sortKey === "budget") return b.budget - a.budget;
      if (sortKey === "delayed") return b.delayed - a.delayed;
      return a.name.localeCompare(b.name);
    });
  }, [rows, query, sortKey]);

  return (
    <div data-testid={testId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search" className="min-w-[14rem] flex-1">
          <input
            data-testid="listing-search"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            placeholder="Name, code, sponsor, lead…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Field label="Sort" className="min-w-[10rem]">
          <select
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={sortKey}
            onChange={(e) =>
              setSortKey(e.target.value as typeof sortKey)
            }
          >
            <option value="name">Name</option>
            <option value="progress">Progress</option>
            <option value="budget">Budget</option>
            <option value="delayed">Risk / delayed</option>
          </select>
        </Field>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No programmes"
          description="Adjust search or return to the dashboard filters."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Programme</TH>
              <TH>Category</TH>
              <TH>Sponsor</TH>
              <TH>Lead</TH>
              <TH>Manager</TH>
              <TH>Budget</TH>
              <TH>Utilisation</TH>
              <TH>Progress</TH>
              <TH>Status</TH>
              <TH>Risk</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((r) => (
              <TR
                key={r.id}
                className="cursor-pointer hover:bg-background"
                onClick={() => navigate(`/programmes/view/?id=${r.id}`)}
                data-testid={`listing-row-${r.id}`}
              >
                <TD>
                  <div className="font-medium">{r.name}</div>
                  <div className="font-mono text-xs text-muted">{r.code}</div>
                </TD>
                <TD>
                  <Badge tone="neutral">{r.category ?? "—"}</Badge>
                </TD>
                <TD className="text-xs">{r.client ?? "—"}</TD>
                <TD className="text-xs">{r.lead ?? "—"}</TD>
                <TD className="text-xs">{r.manager ?? "—"}</TD>
                <TD>{formatINR(r.budget)}</TD>
                <TD>
                  {r.utilised == null
                    ? "n/a"
                    : `${Math.round(r.utilised * 100)}%`}
                </TD>
                <TD>{Math.round(r.progress)}%</TD>
                <TD>
                  <Badge tone="in-progress">{r.status}</Badge>
                </TD>
                <TD>
                  <Badge
                    tone={
                      r.rag === "red"
                        ? "danger"
                        : r.rag === "amber"
                          ? "warning"
                          : "success"
                    }
                  >
                    {r.delayed > 0 ? `${r.delayed} delayed` : r.rag}
                  </Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
