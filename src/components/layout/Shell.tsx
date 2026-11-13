"use client";

import type { ReactNode } from "react";
import { Banner } from "./Banner";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="print:hidden">
        <Header />
        <Banner />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
