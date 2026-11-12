"use client";

import { useState } from "react";
import { ChevronDown, UserRound } from "lucide-react";
import type { Role } from "@/types/domain";
import { ROLE_LABELS } from "@/lib/navConfig";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/cn";
import { usePathname } from "next/navigation";

const ROLES: Role[] = [
  "leadership",
  "programme_manager",
  "client",
  "marcom",
  "finance",
];

export function RoleSwitcher() {
  const { role, switchRole } = useRole();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]"
        aria-expanded={open}
        aria-haspopup="listbox"
        data-testid="role-switcher"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-muted">Role</span>
        <span className="font-medium" data-testid="current-role">
          {ROLE_LABELS[role]}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Switch role"
          className="absolute right-0 z-40 mt-2 min-w-[12rem] rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          {ROLES.map((r) => (
            <li key={r}>
              <button
                type="button"
                role="option"
                aria-selected={r === role}
                className={cn(
                  "flex w-full px-3 py-2 text-left text-sm hover:bg-background",
                  r === role && "bg-primary/5 font-medium text-primary",
                )}
                data-testid={`role-option-${r}`}
                onClick={() => {
                  switchRole(r, { preservePath: pathname });
                  setOpen(false);
                }}
              >
                {ROLE_LABELS[r]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function PersonaSwitcher() {
  const { user, personas, switchPersona } = useRole();
  const [open, setOpen] = useState(false);

  if (personas.length <= 1) {
    return (
      <div className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm">
        <UserRound className="h-4 w-4 text-muted" aria-hidden />
        <span className="font-medium">{user?.name ?? "—"}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm hover:bg-background"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <UserRound className="h-4 w-4 text-muted" aria-hidden />
        <span className="font-medium">{user?.name ?? "Persona"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Switch persona"
          className="absolute right-0 z-40 mt-2 min-w-[14rem] rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          {personas.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={p.id === user?.id}
                className={cn(
                  "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-background",
                  p.id === user?.id && "bg-primary/5",
                )}
                onClick={() => {
                  switchPersona(p.id);
                  setOpen(false);
                }}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted">{p.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
