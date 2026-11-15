"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { normalisePath } from "@/lib/navConfig";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { nav } = useRole();
  const pathname = normalisePath(usePathname() ?? "/");

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col bg-surface">
      <nav aria-label="Role navigation" className="flex flex-col gap-1 p-3">
        {nav.map((item) => {
          const href = normalisePath(item.href);
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={cn(
                "flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-background",
              )}
            >
              {item.presenter ? (
                <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : null}
              <span className="flex-1">{item.label}</span>
              {item.presenter ? (
                <Badge
                  tone="neutral"
                  className={cn(
                    "text-[10px]",
                    active && "bg-white/20 text-primary-foreground",
                  )}
                >
                  Presenter tools
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
