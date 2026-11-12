import { describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { validateReportContent } from "@/lib/rules/report";
import type { ReportContent } from "@/types/domain";

function base(partial: Partial<ReportContent> = {}): ReportContent {
  return {
    activityStatus: "in_progress",
    conducted: "yes",
    percentComplete: 50,
    description: "d",
    whatConducted: "Work done",
    keyOutcomes: "Outcomes achieved",
    observations: "internal",
    additionalRemarks: "internal",
    clientSummary: "summary",
    expenseIncurred: false,
    ...partial,
  };
}

describe("report §6 rules — failing and passing pairs", () => {
  const state = buildDefaultSeed("2026-11-12");

  it("RPT_EXP_MISSING fail/pass", () => {
    const fail = validateReportContent(state, {
      type: "interim",
      content: base({ expenseIncurred: true }),
      linkedExpenseIds: [],
    });
    expect(fail.ok).toBe(false);
    expect(fail.errors[0]?.code).toBe("RPT_EXP_MISSING");

    const pass = validateReportContent(state, {
      type: "interim",
      content: base({ expenseIncurred: true }),
      linkedExpenseIds: ["exp_1"],
    });
    expect(pass.ok).toBe(true);
  });

  it("RPT_EXP_NONE fail/pass", () => {
    const fail = validateReportContent(state, {
      type: "interim",
      content: base({ expenseIncurred: false }),
      linkedExpenseIds: ["exp_1"],
    });
    expect(fail.errors[0]?.code).toBe("RPT_EXP_NONE");

    const pass = validateReportContent(state, {
      type: "interim",
      content: base({ expenseIncurred: false }),
      linkedExpenseIds: [],
    });
    expect(pass.ok).toBe(true);
  });

  it("RPT_DELAY fail/pass", () => {
    const fail = validateReportContent(state, {
      type: "interim",
      content: base({
        activityStatus: "delayed",
        delay: { reason: "", impact: "", corrective: "" },
      }),
      linkedExpenseIds: [],
    });
    expect(fail.errors.some((e) => e.code === "RPT_DELAY")).toBe(true);

    const pass = validateReportContent(state, {
      type: "interim",
      content: base({
        activityStatus: "delayed",
        delay: {
          reason: "Venue conflict",
          impact: "Downstream slip",
          corrective: "Reschedule sessions",
          revisedEnd: "2026-12-01",
        },
      }),
      linkedExpenseIds: [],
    });
    expect(pass.ok).toBe(true);
  });

  it("RPT_PARTIAL fail/pass", () => {
    const fail = validateReportContent(state, {
      type: "interim",
      content: base({
        activityStatus: "partially_completed",
        progressDetails: "",
      }),
      linkedExpenseIds: [],
    });
    expect(fail.errors[0]?.code).toBe("RPT_PARTIAL");

    const pass = validateReportContent(state, {
      type: "interim",
      content: base({
        activityStatus: "partially_completed",
        percentComplete: 40,
        progressDetails: "Half the workshops done",
      }),
      linkedExpenseIds: [],
    });
    expect(pass.ok).toBe(true);
  });

  it("RPT_COMPLETE fail/pass", () => {
    const fail = validateReportContent(state, {
      type: "interim",
      content: base({ activityStatus: "completed" }),
      linkedExpenseIds: [],
    });
    expect(fail.errors[0]?.code).toBe("RPT_COMPLETE");

    const pass = validateReportContent(state, {
      type: "final",
      content: base({
        activityStatus: "completed",
        whatConducted: "Full programme",
        keyOutcomes: "Cohort graduated",
      }),
      linkedExpenseIds: [],
    });
    expect(pass.ok).toBe(true);
  });

  it("RPT_CANCEL fail/pass", () => {
    const fail = validateReportContent(state, {
      type: "interim",
      content: base({
        activityStatus: "cancelled",
        cancellationReason: "",
      }),
      linkedExpenseIds: [],
    });
    expect(fail.errors[0]?.code).toBe("RPT_CANCEL");

    const pass = validateReportContent(state, {
      type: "interim",
      content: base({
        activityStatus: "cancelled",
        cancellationReason: "Sponsor withdrew",
      }),
      linkedExpenseIds: [],
    });
    expect(pass.ok).toBe(true);
  });

  it("RPT_CONSISTENCY fail/pass", () => {
    const fail = validateReportContent(state, {
      type: "final",
      content: base({
        activityStatus: "completed",
        conducted: "no",
        whatConducted: "x",
        keyOutcomes: "y",
      }),
      linkedExpenseIds: [],
    });
    expect(fail.errors[0]?.code).toBe("RPT_CONSISTENCY");

    const pass = validateReportContent(state, {
      type: "final",
      content: base({
        activityStatus: "completed",
        conducted: "yes",
        whatConducted: "x",
        keyOutcomes: "y",
      }),
      linkedExpenseIds: [],
    });
    expect(pass.ok).toBe(true);
  });

  it("RPT_DATE fail/pass", () => {
    const fail = validateReportContent(state, {
      type: "interim",
      content: base({
        activityStatus: "delayed",
        delay: {
          reason: "r",
          impact: "i",
          corrective: "c",
          revisedEnd: "2020-01-01",
        },
      }),
      linkedExpenseIds: [],
    });
    expect(fail.errors.some((e) => e.code === "RPT_DATE")).toBe(true);

    const pass = validateReportContent(state, {
      type: "interim",
      content: base({
        activityStatus: "delayed",
        delay: {
          reason: "r",
          impact: "i",
          corrective: "c",
          revisedEnd: "2026-12-15",
        },
      }),
      linkedExpenseIds: [],
    });
    expect(pass.ok).toBe(true);
  });
});
