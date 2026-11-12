"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, EmptyState, Button } from "@/components/ui";
import { useOsStore } from "@/store/store";

export default function NewProgrammePage() {
  const templates = useOsStore((s) => Object.values(s.state.templates));

  return (
    <RoleGate allow={["programme_manager"]}>
      <PageHeader
        title="New programme"
        description="Wizard arrives in M5. Templates below are live from the seed store."
      />
      <EmptyState
        title="Start from a template"
        description="The 7-step wizard is scheduled for M5. Template catalogue is available now."
        action={
          <Button
            onClick={() => {
              window.location.href = "/templates/";
            }}
          >
            Browse templates
          </Button>
        }
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardContent className="py-4">
              <p className="font-medium">{t.name}</p>
              <p className="text-sm text-muted">{t.description}</p>
              <p className="mt-2 text-xs text-muted">
                {t.activities.length} blocks
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
