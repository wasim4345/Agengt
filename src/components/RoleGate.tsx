"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "@/types/domain";
import { ROLE_HOME, ROLE_LABELS } from "@/lib/navConfig";
import { useOsStore } from "@/store/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export type RoleGateProps = {
  allow: Role[];
  children: ReactNode;
};

/**
 * Route guard — forbidden roles see a friendly card (no gated data in the DOM).
 * Pages declare `allow`; gated children are not rendered for other roles.
 */
export function RoleGate({ allow, children }: RoleGateProps) {
  const role = useOsStore((s) => s.state.meta.currentRole);

  if (!allow.includes(role)) {
    return <NotAvailableCard role={role} />;
  }

  return children;
}

export function NotAvailableCard({ role }: { role: Role }) {
  const home = ROLE_HOME[role];
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Not available for this role</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          This screen is not part of the{" "}
          <span className="font-medium text-foreground">
            {ROLE_LABELS[role]}
          </span>{" "}
          workspace. Nothing sensitive was loaded.
        </p>
        <div>
          <Link
            href={home}
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Go to {ROLE_LABELS[role]} home
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
