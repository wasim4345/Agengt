"use client";

import { useMemo } from "react";
import type { Role } from "@/types/domain";
import { useOsStore } from "@/store/store";
import * as leadership from "@/selectors/leadership";
import * as manager from "@/selectors/manager";
import * as client from "@/selectors/client";
import * as marcom from "@/selectors/marcom";
import * as financeRole from "@/selectors/financeRole";
import * as reports from "@/selectors/reports";
import * as integrity from "@/selectors/integrity";
import * as finance from "@/selectors/finance";
import * as core from "@/selectors/core";

/**
 * Role-scoped selector surface. Client/MarCom bundles never expose
 * functions that return internal money/remarks fields.
 */
export function useRoleSelectors() {
  const role = useOsStore((s) => s.state.meta.currentRole);
  const state = useOsStore((s) => s.state);

  return useMemo(() => {
    const shared = {
      role,
      state,
      finance,
      core,
      reports,
      integrity,
    };

    switch (role as Role) {
      case "leadership":
        return { ...shared, leadership, kind: "leadership" as const };
      case "programme_manager":
        return { ...shared, manager, kind: "manager" as const };
      case "client":
        return {
          role,
          state,
          client,
          reports: {
            buildReport: (id: reports.ReportId, programmeId?: string) => {
              if (id !== "client_programme") {
                throw new Error("Client may only build the Client Programme Report");
              }
              return reports.buildReport(state, id, programmeId);
            },
            REPORT_CATALOGUE: reports.REPORT_CATALOGUE.filter((r) => r.clientSafe),
          },
          kind: "client" as const,
        };
      case "marcom":
        return { role, state, marcom, kind: "marcom" as const };
      case "finance":
        return {
          ...shared,
          financeRole,
          kind: "finance" as const,
        };
      default:
        return { ...shared, kind: "leadership" as const, leadership };
    }
  }, [role, state]);
}
