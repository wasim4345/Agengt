"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { DemoClock } from "./DemoClock";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsBell } from "./NotificationsBell";
import { PersonaSwitcher, RoleSwitcher } from "./RoleSwitcher";
import { useRole } from "@/hooks/useRole";

export function Header({ navToggle }: { navToggle?: ReactNode }) {
  const { home } = useRole();

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-3 sm:gap-3 sm:px-4">
      {navToggle}
      <Link
        href={home}
        className="shrink-0 text-sm font-semibold tracking-tight text-primary sm:text-base"
        data-testid="wordmark"
      >
        IIMCIP · Programme OS
      </Link>
      <div className="hidden min-w-[12rem] flex-1 md:block">
        <GlobalSearch />
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <DemoClock />
        <RoleSwitcher />
        <PersonaSwitcher />
        <Link
          href="/data/"
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] hover:bg-background"
          title="Data Manager"
          data-testid="data-manager-link"
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Data</span>
        </Link>
        <NotificationsBell />
      </div>
    </header>
  );
}
