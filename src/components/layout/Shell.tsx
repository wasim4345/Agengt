"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Banner } from "./Banner";
import { CrossTabWarning } from "./CrossTabWarning";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export function Shell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setNavOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="print:hidden">
        <Header
          navToggle={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="lg:hidden"
              aria-expanded={navOpen}
              aria-controls="app-sidebar"
              onClick={() => setNavOpen((v) => !v)}
              data-testid="nav-toggle"
            >
              {navOpen ? (
                <X className="h-4 w-4" aria-hidden />
              ) : (
                <Menu className="h-4 w-4" aria-hidden />
              )}
              <span className="sr-only">{navOpen ? "Close menu" : "Open menu"}</span>
            </Button>
          }
        />
        <CrossTabWarning />
        <Banner />
      </div>
      <div className="relative flex min-h-0 flex-1">
        {navOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-primary/20 lg:hidden"
            aria-label="Close navigation overlay"
            onClick={() => setNavOpen(false)}
          />
        ) : null}
        <div
          id="app-sidebar"
          className={cn(
            "print:hidden z-40 shrink-0 border-r border-border bg-surface transition-transform lg:static lg:translate-x-0",
            "fixed inset-y-0 left-0 w-56 lg:relative",
            navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            "max-lg:top-[var(--header-offset,4.5rem)]",
          )}
        >
          <Sidebar onNavigate={() => setNavOpen(false)} />
        </div>
        <main
          id="main-content"
          className="min-w-0 flex-1 overflow-auto p-4 sm:p-5 lg:p-6 print:overflow-visible print:p-0"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
