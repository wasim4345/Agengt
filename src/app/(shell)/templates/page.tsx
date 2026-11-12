"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useOsStore } from "@/store/store";

export default function TemplatesPage() {
  const templates = useOsStore((s) => Object.values(s.state.templates));
  const categories = useOsStore((s) => s.state.categories);

  return (
    <RoleGate allow={["programme_manager"]}>
      <PageHeader
        title="Templates"
        description="Built-in and custom programme templates from seed data."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <Badge tone={t.builtIn ? "neutral" : "accent"}>
                  {t.builtIn ? "Built-in" : "Custom"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted">
              <p>{t.description}</p>
              <p className="mt-2">
                {categories[t.categoryId]?.name ?? "—"} · {t.activities.length}{" "}
                blocks · {t.milestones.length} milestones
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </RoleGate>
  );
}
