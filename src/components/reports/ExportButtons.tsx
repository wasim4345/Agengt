"use client";

import { Button, useToast } from "@/components/ui";
import type { BuiltReport } from "@/selectors/reports";
import { reportToCsv } from "@/selectors/reports";

export function ExportButtons({ report }: { report: BuiltReport }) {
  const { push } = useToast();

  function downloadCsv() {
    const csv = reportToCsv(report);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.id}-${report.dataAsOf}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    push({ title: "CSV downloaded", tone: "success" });
  }

  function exportPdf() {
    window.print();
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button size="sm" onClick={exportPdf}>
        Export PDF
      </Button>
      <Button size="sm" variant="secondary" onClick={downloadCsv}>
        Export CSV
      </Button>
    </div>
  );
}
