import { describe, expect, it } from "vitest";
import { isEventCategoryName } from "@/lib/eventPhotos";
import { buildDefaultSeed } from "@/seed";
import { validateSubmitReport } from "@/lib/rules/report";

describe("event photo helpers", () => {
  it("recognises event-like category names", () => {
    expect(isEventCategoryName("Events")).toBe(true);
    expect(isEventCategoryName("Outreach")).toBe(true);
    expect(isEventCategoryName("Capacity Building")).toBe(true);
    expect(isEventCategoryName("Networking")).toBe(true);
    expect(isEventCategoryName("Market Pilots")).toBe(true);
    expect(isEventCategoryName("Admin")).toBe(false);
    expect(isEventCategoryName(undefined)).toBe(false);
  });

  it("warns when completed event report has zero photos (soft)", () => {
    const state = buildDefaultSeed("2026-11-12");
    // Draft mentoring report — not event category; force isEvent + completed
    const report = state.reports["rpt_p1_a08"];
    expect(report).toBeTruthy();
    state.reports["rpt_p1_a08"] = {
      ...report,
      draft: {
        ...report.draft,
        isEvent: true,
        activityStatus: "completed",
        conducted: "yes",
        percentComplete: 100,
        whatConducted: "Mentoring wrap event",
        keyOutcomes: "Done",
        clientSummary: "Done",
      },
    };
    // Strip any photos on this report
    for (const [id, e] of Object.entries(state.evidence)) {
      if (e.reportId === "rpt_p1_a08") {
        delete state.evidence[id];
      }
    }
    state.meta.settings.requireEventPhotos = false;
    const soft = validateSubmitReport(state, "rpt_p1_a08");
    expect(soft.warnings.some((w) => w.code === "RPT_EVENT_PHOTOS")).toBe(true);

    state.meta.settings.requireEventPhotos = true;
    const hard = validateSubmitReport(state, "rpt_p1_a08");
    expect(hard.errors.some((e) => e.code === "RPT_EVENT_PHOTOS")).toBe(true);
  });
});
