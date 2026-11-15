"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLE_HOME } from "@/lib/navConfig";
import { useOsStore } from "@/store/store";
import { Skeleton } from "@/components/ui";

/** Root redirects to the current role home. */
export default function RootRedirectPage() {
  const role = useOsStore((s) => s.state.meta.currentRole);
  const hydrated = useOsStore((s) => s.hydrated);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(ROLE_HOME[role]);
  }, [hydrated, role, router]);

  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
