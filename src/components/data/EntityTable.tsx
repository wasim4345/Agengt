"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { useOsStore } from "@/store/store";
import {
  ENTITY_TABS,
  listEntityRows,
  newEntityStub,
  resolveRecordId,
  type EntityDef,
  type EntityKind,
} from "./entityRegistry";

function cellPreview(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function EntityTable({ entity }: { entity: EntityKind }) {
  const state = useOsStore((s) => s.state);
  const rawUpsert = useOsStore((s) => s.rawUpsert);
  const rawDelete = useOsStore((s) => s.rawDelete);
  const upsertArrayItem = useOsStore((s) => s.upsertArrayItem);
  const deleteArrayItem = useOsStore((s) => s.deleteArrayItem);
  const { push } = useToast();

  const def = ENTITY_TABS.find((t) => t.key === entity)!;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<{
    mode: "add" | "edit";
    json: string;
    id: string;
  } | null>(null);

  const rows = useMemo(() => {
    const all = listEntityRows(state, def);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(({ id, row }) => {
      const hay = `${id} ${JSON.stringify(row)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [state, def, query]);

  function openAdd() {
    const stub = newEntityStub(def);
    setEditor({
      mode: "add",
      id: resolveRecordId(def, stub),
      json: JSON.stringify(stub, null, 2),
    });
  }

  function openEdit(id: string, row: Record<string, unknown>) {
    setEditor({
      mode: "edit",
      id,
      json: JSON.stringify(row, null, 2),
    });
  }

  function saveEditor() {
    if (!editor) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(editor.json) as Record<string, unknown>;
    } catch {
      push({ title: "Invalid JSON", tone: "danger" });
      return;
    }

    if (def.shape === "record") {
      const id = resolveRecordId(def, parsed) || editor.id;
      const result = rawUpsert(def.key, id, parsed);
      if (!result.ok) {
        push({
          title: result.errors[0]?.message ?? "Save failed",
          tone: "danger",
        });
        return;
      }
    } else {
      const matchId = editor.mode === "edit" ? editor.id : resolveRecordId(def, parsed);
      const result = upsertArrayItem(
        def.key,
        (row) => def.rowId!(row) === matchId || def.rowId!(row) === resolveRecordId(def, parsed),
        parsed,
      );
      if (!result.ok) {
        push({
          title: result.errors[0]?.message ?? "Save failed",
          tone: "danger",
        });
        return;
      }
    }

    push({
      title: editor.mode === "add" ? "Row added" : "Row updated",
      tone: "success",
    });
    setEditor(null);
  }

  function deleteOne(id: string, row: Record<string, unknown>) {
    if (!window.confirm(`Delete ${def.label} row ${id}?`)) return;
    const result =
      def.shape === "record"
        ? rawDelete(def.key, id)
        : deleteArrayItem(def.key, (r) => def.rowId!(r) === id);
    if (!result.ok) {
      push({
        title: result.errors[0]?.message ?? "Delete failed",
        tone: "danger",
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    push({ title: `Deleted ${id}`, tone: "success" });
    void row;
  }

  function bulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected row(s)?`)) return;
    for (const id of selected) {
      if (def.shape === "record") rawDelete(def.key, id);
      else deleteArrayItem(def.key, (r) => def.rowId!(r) === id);
    }
    setSelected(new Set());
    push({ title: "Bulk delete complete", tone: "success" });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Search" className="min-w-[14rem] flex-1">
          <input
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${def.label.toLowerCase()}…`}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">{rows.length} rows</Badge>
          {selected.size > 0 ? (
            <Button variant="secondary" size="sm" onClick={bulkDelete}>
              <Trash2 className="mr-1 size-3.5" />
              Delete ({selected.size})
            </Button>
          ) : null}
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH className="w-10">
              <span className="sr-only">Select</span>
            </TH>
            {def.columns.map((col) => (
              <TH key={col}>{col}</TH>
            ))}
            <TH className="w-28">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {rows.length === 0 ? (
            <TR>
              <TD colSpan={def.columns.length + 2} className="text-muted">
                No rows. Add one or clear the search filter.
              </TD>
            </TR>
          ) : (
            rows.map(({ id, row }) => (
              <TR key={id}>
                <TD>
                  <input
                    type="checkbox"
                    checked={selected.has(id)}
                    onChange={() => toggleSelect(id)}
                    aria-label={`Select ${id}`}
                  />
                </TD>
                {def.columns.map((col) => (
                  <TD key={col} className="max-w-[12rem] truncate font-mono text-xs">
                    {cellPreview(row[col])}
                  </TD>
                ))}
                <TD>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(id, row)}
                      aria-label={`Edit ${id}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteOne(id, row)}
                      aria-label={`Delete ${id}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <Modal
        open={!!editor}
        onClose={() => setEditor(null)}
        title={editor?.mode === "add" ? `Add ${def.label}` : `Edit ${def.label}`}
        className="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button onClick={saveEditor}>Save</Button>
          </div>
        }
      >
        <p className="mb-2 text-xs text-muted">
          JSON editor — same validators as product screens unless rule-breaking is on.
        </p>
        <textarea
          className="h-80 w-full rounded-md border border-border bg-background p-3 font-mono text-xs"
          value={editor?.json ?? ""}
          onChange={(e) =>
            setEditor((prev) => (prev ? { ...prev, json: e.target.value } : prev))
          }
          spellCheck={false}
        />
      </Modal>
    </div>
  );
}

export function EntityTabList({
  active,
  onChange,
}: {
  active: EntityKind;
  onChange: (key: EntityKind) => void;
}) {
  return (
    <div className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto pr-1">
      {ENTITY_TABS.map((tab: EntityDef) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
            active === tab.key
              ? "bg-primary text-white"
              : "text-foreground hover:bg-background"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
