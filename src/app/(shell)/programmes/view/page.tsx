"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActivityBuilder } from "@/components/programme/ActivityBuilder";
import { AllocationGrid } from "@/components/programme/AllocationGrid";
import { DependencyEditor } from "@/components/programme/DependencyEditor";
import { MilestoneEditor } from "@/components/programme/MilestoneEditor";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Field,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { useOsStore } from "@/store/store";

function ProgrammeViewInner() {
  const search = useSearchParams();
  const id = search.get("id") ?? "";
  const state = useOsStore((s) => s.state);
  const saveProgrammeAsTemplate = useOsStore((s) => s.saveProgrammeAsTemplate);
  const { push } = useToast();
  const [tplName, setTplName] = useState("");

  const programme = state.programmes[id];
  const activityCount = useMemo(
    () =>
      Object.values(state.activities).filter((a) => a.programmeId === id)
        .length,
    [state.activities, id],
  );

  if (!id || !programme) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted">
          Programme not found. Open one from the programmes list.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={`${programme.code} · ${programme.name}`}
        description={`${programme.startDate} → ${programme.endDate} · ${formatINR(programme.totalBudget)}`}
        actions={<Badge tone="in-progress">{programme.status}</Badge>}
      />

      {programme.status === "draft" ? (
        <div className="mb-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              window.location.href = `/programmes/new/?id=${programme.id}`;
            }}
          >
            Continue wizard
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="deps">Dependencies</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="template">Save as template</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="space-y-2 py-4 text-sm">
              <p>
                Client: {state.clients[programme.clientId]?.name ?? "—"} ·
                Manager: {state.users[programme.managerId]?.name ?? "—"}
              </p>
              <p className="text-muted">
                {activityCount} activities · Category{" "}
                {state.categories[programme.categoryId]?.name}
              </p>
              <p>{programme.objectives || "No objectives set."}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          {programme.status === "draft" ? (
            <ActivityBuilder programmeId={id} />
          ) : (
            <Card>
              <CardContent className="py-4 text-sm text-muted">
                Activity editing is available on draft programmes. Active
                programmes use the activity workspace (M7).
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deps" className="mt-4 space-y-6">
          {programme.status === "draft" ? (
            <>
              <DependencyEditor programmeId={id} />
              <MilestoneEditor programmeId={id} />
            </>
          ) : (
            <p className="text-sm text-muted">
              Structure locked after activation.
            </p>
          )}
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          <AllocationGrid programmeId={id} />
        </TabsContent>

        <TabsContent value="template" className="mt-4">
          <Card>
            <CardContent className="flex flex-col gap-3 py-4">
              <Field label="Template name">
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder={`${programme.name} template`}
                />
              </Field>
              <Button
                onClick={() => {
                  const name =
                    tplName.trim() || `${programme.name} template`;
                  const r = saveProgrammeAsTemplate(id, name);
                  if (r.ok) {
                    push({
                      title: `Saved template ${r.data.templateId}`,
                      tone: "success",
                    });
                    window.location.href = "/templates/";
                  } else {
                    push({
                      title: r.errors[0]?.message ?? "Save failed",
                      tone: "danger",
                    });
                  }
                }}
              >
                Save programme as template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function ProgrammeViewPage() {
  return (
    <RoleGate allow={["leadership", "programme_manager", "finance"]}>
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <ProgrammeViewInner />
      </Suspense>
    </RoleGate>
  );
}
