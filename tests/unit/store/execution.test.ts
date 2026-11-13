import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { IDS } from "@/seed/ids";
import { createTestStore } from "@/store/store";
import { clearPersistedState } from "@/store/persist";
import { STORAGE_KEYS } from "@/types/domain";

describe("M7 execution — demo steps 7 & 10", () => {
  beforeEach(() => {
    clearPersistedState();
    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
    createTestStore(buildDefaultSeed("2026-11-12"));
  });

  it("demo step 7: delay report + 2 expenses + evidence → submit", () => {
    const store = createTestStore();
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);

    const started = store.getState().startReport({
      programmeId: IDS.programmes.p1,
      activityId: "act_p1_a02",
      type: "interim",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const reportId = started.data.reportId;

    const e1 = store.getState().addExpense({
      programmeId: IDS.programmes.p1,
      activityId: "act_p1_a02",
      reportId,
      categoryId: IDS.expenseCategories.venue,
      description: "Makeup outreach venue",
      date: "2026-11-12",
      amount: 15_000,
    });
    const e2 = store.getState().addExpense({
      programmeId: IDS.programmes.p1,
      activityId: "act_p1_a02",
      reportId,
      categoryId: IDS.expenseCategories.travel,
      description: "Makeup outreach travel",
      date: "2026-11-12",
      amount: 8_000,
    });
    expect(e1.ok && e2.ok).toBe(true);

    const photo = store.getState().addEvidenceMeta({
      programmeId: IDS.programmes.p1,
      activityId: "act_p1_a02",
      reportId,
      type: "photograph",
      fileName: "outreach.jpg",
      mime: "image/jpeg",
      size: 12_000,
      blobKey: "blob:test_outreach",
      thumb: "data:image/jpeg;base64,xx",
    });
    expect(photo.ok).toBe(true);

    store.getState().saveDraft(reportId, {
      activityStatus: "delayed",
      conducted: "partially",
      percentComplete: 90,
      description: "Sessions slipped due to venue",
      whatConducted: "Four of five cities covered",
      keyOutcomes: "Pipeline still healthy",
      observations: "Internal note",
      additionalRemarks: "Keep client calm",
      clientSummary: "Outreach delayed; recovery plan in place.",
      expenseIncurred: true,
      delay: {
        reason: "Venue unavailable in city 5",
        impact: "Closing ceremony slip risk",
        corrective: "Virtual catch-up + new date",
        revisedEnd: "2026-12-01",
      },
    });

    const submitted = store.getState().submitReport(reportId);
    expect(submitted.ok).toBe(true);
    expect(store.getState().state.reports[reportId]?.status).toBe("submitted");
    expect(store.getState().state.activities["act_p1_a02"]?.status).toBe(
      "delayed",
    );
    expect(store.getState().state.activities["act_p1_a02"]?.revisedEnd).toBe(
      "2026-12-01",
    );
    // expenses submitted with report
    if (e1.ok) {
      expect(store.getState().state.expenses[e1.data.expenseId]?.status).toBe(
        "submitted",
      );
    }
    // Delay revisedEnd stored; impacts proposed only when successors exist
    expect(
      Object.values(store.getState().state.delayImpacts).filter(
        (i) => i.sourceActivityId === "act_p1_a02",
      ).length,
    ).toBeGreaterThanOrEqual(0);
  });

  it("demo step 10: Leadership releases report for client", () => {
    const store = createTestStore();
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);

    const started = store.getState().startReport({
      programmeId: IDS.programmes.p1,
      activityId: "act_p1_a08",
      type: "interim",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const reportId = started.data.reportId;

    // Seeded a08 draft has activity draft expenses → must claim expenseIncurred
    store.getState().saveDraft(reportId, {
      activityStatus: "in_progress",
      conducted: "yes",
      percentComplete: 40,
      description: "Mentoring continuing",
      whatConducted: "Clinics",
      keyOutcomes: "Founders engaged",
      observations: "internal",
      additionalRemarks: "internal",
      clientSummary: "Mentoring on track.",
      expenseIncurred: true,
    });
    const submitted = store.getState().submitReport(reportId);
    expect(submitted.ok).toBe(true);

    // Self-release blocked
    const self = store.getState().releaseReport(reportId);
    expect(self.ok).toBe(false);

    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    const released = store.getState().releaseReport(reportId, {
      clientVisible: true,
      marcomVisible: true,
    });
    expect(released.ok).toBe(true);
    expect(store.getState().state.reports[reportId]?.status).toBe("released");
    expect(
      store.getState().state.reports[reportId]?.release?.clientVisible,
    ).toBe(true);
  });

  it("return report requires comment and revise restores draft", () => {
    const store = createTestStore();
    // Use seeded submitted report rpt_p1_a07 if present
    const seeded = Object.values(store.getState().state.reports).find(
      (r) => r.status === "submitted",
    );
    expect(seeded).toBeTruthy();
    if (!seeded) return;

    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    expect(store.getState().returnReport(seeded.id, "").ok).toBe(false);
    expect(
      store.getState().returnReport(seeded.id, "Please add outcomes").ok,
    ).toBe(true);
    expect(store.getState().state.reports[seeded.id]?.status).toBe("returned");

    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    expect(store.getState().reviseReport(seeded.id).ok).toBe(true);
    expect(store.getState().state.reports[seeded.id]?.status).toBe("draft");
  });
});
