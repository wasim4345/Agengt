"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActivityWorkspace } from "@/components/execution/ActivityWorkspace";
import { Skeleton } from "@/components/ui";

function ActivityInner() {
  const search = useSearchParams();
  const programmeId = search.get("programmeId") ?? "";
  const activityId = search.get("activityId") ?? "";

  if (!programmeId || !activityId) {
    return (
      <p className="text-sm text-muted">
        Missing programmeId or activityId query params.
      </p>
    );
  }

  return (
    <ActivityWorkspace programmeId={programmeId} activityId={activityId} />
  );
}

export default function ActivityWorkspacePage() {
  return (
    <RoleGate allow={["leadership", "programme_manager", "finance"]}>
      <PageHeader
        title="Activity workspace"
        description="Report updates, expenses, evidence, history, and release workflow."
      />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <ActivityInner />
      </Suspense>
    </RoleGate>
  );
}
