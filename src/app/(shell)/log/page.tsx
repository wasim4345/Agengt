"use client";

import { useMemo, useState } from "react";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent, Field } from "@/components/ui";
import { formatDate } from "@/lib/format/dates";
import { useOsStore } from "@/store/store";
import type { Role } from "@/types/domain";

const ROLES: Array<Role | "all"> = [
  "all",
  "leadership",
  "programme_manager",
  "finance",
  "marcom",
  "client",
];

export default function ActivityLogPage() {
  const log = useOsStore((s) => s.state.log);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");

  const entities = useMemo(() => {
    const set = new Set(log.map((e) => e.entity));
    return ["", ...Array.from(set).sort()];
  }, [log]);

  const actions = useMemo(() => {
    const set = new Set(log.map((e) => e.action));
    return ["", ...Array.from(set).sort()];
  }, [log]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return log.filter((entry) => {
      if (role !== "all" && entry.role !== role) return false;
      if (entity && entry.entity !== entity) return false;
      if (action && entry.action !== action) return false;
      if (!q) return true;
      const hay = `${entry.summary} ${entry.action} ${entry.entity} ${entry.entityId}`.toLowerCase();
      return hay.includes(q);
    });
  }, [log, query, role, entity, action]);

  return (
    <RoleGate allow={["leadership"]}>
      <PageHeader
        title="Activity log"
        description="Simulated audit trail of store mutations — filterable."
      />
      <Badge tone="neutral" className="mb-4">
        Simulated
      </Badge>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Field label="Search">
          <input
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Summary, entity…"
          />
        </Field>
        <Field label="Role">
          <select
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as Role | "all")}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Entity">
          <select
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
          >
            {entities.map((e) => (
              <option key={e || "all"} value={e}>
                {e || "all"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Action">
          <select
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            {actions.map((a) => (
              <option key={a || "all"} value={a}>
                {a || "all"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p className="mb-2 text-xs text-muted">
        Showing {filtered.length} of {log.length}
      </p>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted">
              No log entries match these filters.
            </CardContent>
          </Card>
        ) : (
          filtered.slice(0, 100).map((entry) => (
            <Card key={entry.id}>
              <CardContent className="py-3">
                <p className="text-sm font-medium">{entry.summary}</p>
                <p className="text-xs text-muted">
                  {entry.action} · {entry.entity}/{entry.entityId} ·{" "}
                  {formatDate(entry.at.slice(0, 10))} · {entry.role}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </RoleGate>
  );
}
