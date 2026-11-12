"use client";

import { RoleGate } from "@/components/RoleGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui";
import { formatINR } from "@/lib/format/inr";
import { useOsStore } from "@/store/store";
import { programmeFinancials } from "@/selectors/finance";

export default function FinanceBudgetsPage() {
  const state = useOsStore((s) => s.state);

  return (
    <RoleGate allow={["finance"]}>
      <PageHeader
        title="Budgets"
        description="Programme approved / reported / verified / pending."
      />
      <div className="flex flex-col gap-2">
        {Object.values(state.programmes).map((p) => {
          const fin = programmeFinancials(state, p.id);
          return (
            <Card key={p.id}>
              <CardContent className="py-3 text-sm">
                <p className="font-medium">
                  {p.code} · {p.name}
                </p>
                <p className="mt-1 text-muted">
                  Approved {formatINR(fin.budget)} · Allocated{" "}
                  {formatINR(fin.allocated)} · Unallocated{" "}
                  {formatINR(fin.unallocated)}
                </p>
                <p className="text-muted">
                  Reported {formatINR(fin.reported)} · Verified{" "}
                  {formatINR(fin.verified)} · Pending {formatINR(fin.pending)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </RoleGate>
  );
}
