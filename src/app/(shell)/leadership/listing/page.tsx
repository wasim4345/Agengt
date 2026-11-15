"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProgrammeListingTable } from "@/components/dashboards/ProgrammeListingTable";
import { Button, Card, CardContent } from "@/components/ui";
import {
  filtersFromSearchParams,
  searchParamsFromFilters,
} from "@/lib/leadershipFilters";
import * as leadership from "@/selectors/leadership";
import { resolveFy } from "@/selectors/leadership";
import { useOsStore } from "@/store/store";

const CLASS_LABEL: Record<string, string> = {
  completed: "Completed",
  ongoing: "Ongoing",
  upcoming: "Upcoming",
};

function ListingInner() {
  const state = useOsStore((s) => s.state);
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );
  const activeFy = resolveFy(state, filters);
  const filtersWithFy = useMemo(
    () => ({ ...filters, fy: filters.fy ?? activeFy.label }),
    [filters, activeFy.label],
  );
  const rows = leadership.programmeRows(state, filtersWithFy);
  const classLabel = filters.classification
    ? CLASS_LABEL[filters.classification] ?? filters.classification
    : "All";

  function backToDashboard() {
    const next = { ...filtersWithFy, classification: undefined };
    const q = searchParamsFromFilters(next).toString();
    router.push(q ? `/leadership/?${q}` : "/leadership/");
  }

  return (
    <>
      <PageHeader
        title={`${classLabel} Programmes – FY ${filtersWithFy.fy}`}
        description={`${rows.length} programme${rows.length === 1 ? "" : "s"} · same FY filters as the Leadership dashboard`}
        actions={
          <Button size="sm" variant="secondary" onClick={backToDashboard}>
            Back to dashboard
          </Button>
        }
      />
      <Card>
        <CardContent className="py-4">
          <ProgrammeListingTable rows={rows} />
        </CardContent>
      </Card>
    </>
  );
}

export default function LeadershipListingPage() {
  return (
    <RoleGate allow={["leadership"]}>
      <Suspense
        fallback={
          <p className="text-sm text-muted">Loading programme listing…</p>
        }
      >
        <ListingInner />
      </Suspense>
    </RoleGate>
  );
}
