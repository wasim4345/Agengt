"use client";

import { useState } from "react";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui";
import { ControlCentre } from "@/components/data/ControlCentre";
import { EntityTabList, EntityTable } from "@/components/data/EntityTable";
import type { EntityKind } from "@/components/data/entityRegistry";

export default function DataManagerPage() {
  const [entity, setEntity] = useState<EntityKind>("programmes");

  return (
    <RoleGate
      allow={[
        "leadership",
        "programme_manager",
        "client",
        "marcom",
        "finance",
      ]}
    >
      <PageHeader
        title="Data Manager"
        description="Presenter tools — entity CRUD, scenarios, snapshots, import/export."
        actions={<Badge tone="neutral">Presenter tools</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)_20rem]">
        <aside className="rounded-xl border border-border bg-surface p-2">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Entities
          </p>
          <EntityTabList active={entity} onChange={setEntity} />
        </aside>
        <section className="min-w-0">
          <EntityTable entity={entity} />
        </section>
        <aside className="min-w-0">
          <ControlCentre />
        </aside>
      </div>
    </RoleGate>
  );
}
