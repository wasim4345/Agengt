"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProgrammeWizard } from "@/components/programme/ProgrammeWizard";
import { Button, Skeleton, useToast } from "@/components/ui";
import { useOsStore } from "@/store/store";
import type { ID } from "@/types/domain";

function NewProgrammeInner() {
  const search = useSearchParams();
  const router = useRouter();
  const createProgrammeDraft = useOsStore((s) => s.createProgrammeDraft);
  const programmes = useOsStore((s) => s.state.programmes);
  const hydrated = useOsStore((s) => s.hydrated);
  const { push } = useToast();
  const [programmeId, setProgrammeId] = useState<ID | null>(
    search.get("id"),
  );
  const creatingRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    const fromUrl = search.get("id");
    if (fromUrl && programmes[fromUrl]) {
      setProgrammeId(fromUrl);
      return;
    }
    if (fromUrl && !programmes[fromUrl]) {
      push({ title: "Draft not found — starting new", tone: "danger" });
    }
    if (!programmeId && !creatingRef.current) {
      creatingRef.current = true;
      const r = createProgrammeDraft({
        name: "New incubation programme",
      });
      if (r.ok) {
        setProgrammeId(r.data.programmeId);
        router.replace(`/programmes/new/?id=${r.data.programmeId}`);
      } else {
        creatingRef.current = false;
        push({
          title: r.errors[0]?.message ?? "Could not create draft",
          tone: "danger",
        });
      }
    }
  }, [
    hydrated,
    search,
    programmes,
    programmeId,
    createProgrammeDraft,
    router,
    push,
  ]);

  if (!programmeId) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return <ProgrammeWizard programmeId={programmeId} />;
}

export default function NewProgrammePage() {
  return (
    <RoleGate allow={["programme_manager", "leadership"]}>
      <PageHeader
        title="New programme"
        description="7-step wizard — templates, blocks, dependencies, budget, submit."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              window.location.href = "/templates/";
            }}
          >
            Template library
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <NewProgrammeInner />
      </Suspense>
    </RoleGate>
  );
}
