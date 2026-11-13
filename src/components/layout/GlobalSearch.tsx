"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useOsStore } from "@/store/store";
import { useRole } from "@/hooks/useRole";
import { isPathAllowed } from "@/lib/navConfig";

export function GlobalSearch() {
  const programmes = useOsStore((s) => s.state.programmes);
  const { role } = useRole();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const canOpenProgrammes = isPathAllowed(role, "/programmes/");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !canOpenProgrammes) return [];
    return Object.values(programmes)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [programmes, query, canOpenProgrammes]);

  return (
    <div className="relative min-w-[12rem] flex-1 max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        type="search"
        placeholder="Search programmes…"
        className="h-9 w-full rounded-[var(--radius-control)] border border-border bg-surface pl-9 pr-3 text-sm"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Search programmes"
      />
      {open && query.trim() ? (
        <div className="absolute left-0 right-0 z-40 mt-1 rounded-xl border border-border bg-surface shadow-lg">
          {!canOpenProgrammes ? (
            <p className="px-3 py-3 text-sm text-muted">
              Programme search is not available for this role.
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">No matches</p>
          ) : (
            <ul>
              {results.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/programmes/`}
                    className="block px-3 py-2 text-sm hover:bg-background"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="font-medium">{p.code}</span>
                    <span className="text-muted"> — {p.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
