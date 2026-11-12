"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";
import { DemoClock } from "./DemoClock";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsBell } from "./NotificationsBell";
import { PersonaSwitcher, RoleSwitcher } from "./RoleSwitcher";
import { useRole } from "@/hooks/useRole";

export function Header() {
  const { home } = useRole();

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3">
      <Link
        href={home}
        className="shrink-0 text-base font-semibold tracking-tight text-primary"
      >
        IIMCIP · Programme OS
      </Link>
      <GlobalSearch />
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <DemoClock />
        <RoleSwitcher />
        <PersonaSwitcher />
        <Link
          href="/data/"
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm hover:bg-background"
          title="Data Manager"
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Data</span>
        </Link>
        <NotificationsBell />
      </div>
    </header>
  );
}
