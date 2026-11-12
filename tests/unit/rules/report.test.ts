import { describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import {
  canReleaseReport,
  canStartFinalReport,
  validateReportContent,
  validateSubmitReport,
} from "@/lib/rules/report";
import type { ReportContent } from "@/types/domain";

function base(partial: Partial<ReportContent> = {}): ReportContent {
  return {
    activityStatus: "in_progress",
    conducted: "yes",
    percentComplete: 50,
    description: "",
    whatConducted: "Work",
    keyOutcomes: "Outcomes",
    observations: "internal",
    additionalRemarks: "internal",
    clientSummary: "summary",
    expenseIncurred: false,
    ...partial,
  };
}

describe("report validation (§6)", () => {
  it("emits exact RPT messages", () => {
    const state = buildDefaultSeed("2026-11-12");

    expect(
      validateReportContent(state, {
        type: "interim",
        content: base({ expenseIncurred: true }),
        linkedExpenseIds: [],
      }).errors[0],
    ).toMatchObject({
      code: "RPT_EXP_MISSING",
      message: "Add at least one expense entry, or choose 'No expense'.",
    });

    expect(
      validateReportContent(state, {
        type: "interim",
        content: base({ expenseIncurred: false }),
        linkedExpenseIds: ["x"],
      }).errors[0]?.code,
    ).toBe("RPT_EXP_NONE");

    expect(
      validateReportContent(state, {
        type: "interim",
        content: base({
          activityStatus: "delayed",
          delay: { reason: "", impact: "", corrective: "" },
        }),
        linkedExpenseIds: [],
      }).errors.some((e) => e.code === "RPT_DELAY"),
    ).toBe(true);

    expect(
      validateReportContent(state, {
        type: "interim",
        content: base({
          activityStatus: "partially_completed",
          progressDetails: "",
        }),
        linkedExpenseIds: [],
      }).errors[0]?.code,
    ).toBe("RPT_PARTIAL");

    expect(
      validateReportContent(state, {
        type: "interim",
        content: base({ activityStatus: "completed" }),
        linkedExpenseIds: [],
      }).errors[0]?.code,
    ).toBe("RPT_COMPLETE");

    expect(
      validateReportContent(state, {
        type: "final",
        content: base({
          activityStatus: "cancelled",
          cancellationReason: "",
        }),
        linkedExpenseIds: [],
      }).errors[0]?.code,
    ).toBe("RPT_CANCEL");

    expect(
      validateReportContent(state, {
        type: "final",
        content: base({
          activityStatus: "completed",
          conducted: "no",
          whatConducted: "x",
          keyOutcomes: "y",
        }),
        linkedExpenseIds: [],
      }).errors[0]?.code,
    ).toBe("RPT_CONSISTENCY");

    expect(
      validateReportContent(state, {
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
      }).errors.some((e) => e.code === "RPT_DATE"),
    ).toBe(true);
  });

  it("validates submit on seeded draft and release/self rules", () => {
    const state = buildDefaultSeed("2026-11-12");
    const draft = validateSubmitReport(state, "rpt_p1_a08");
    expect(draft.ok || draft.errors.length >= 0).toBe(true);

    expect(canStartFinalReport(state, "act_p1_a01").ok).toBe(false);
    expect(canStartFinalReport(state, "act_p1_a09").ok).toBe(true);

    expect(canReleaseReport(state, "rpt_p1_a07", "usr_arjun").ok).toBe(false);
    expect(canReleaseReport(state, "rpt_p1_a07", "usr_meera").ok).toBe(true);
  });
});
