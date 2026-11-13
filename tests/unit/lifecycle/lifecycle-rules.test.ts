import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { IDS } from "@/seed/ids";
import { createTestStore } from "@/store/store";
import { clearPersistedState } from "@/store/persist";
import { STORAGE_KEYS } from "@/types/domain";
import { addCalendarDays } from "@/lib/rules/dates";
import {
  canReportOnProgramme,
  canReplaceManager,
  canRequestCancellation,
  canRequestClosureResult,
  canRequestExtension,
  canRequestHold,
  canRequestResume,
  canSetActivityDates,
  canSoftDeleteEvidence,
} from "@/lib/rules/lifecycle";

describe("lifecycle rules coverage", () => {
  beforeEach(() => {
    clearPersistedState();
    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
    createTestStore(buildDefaultSeed("2026-11-12"));
  });

  it("canSetActivityDates covers order/bounds", () => {
    const state = createTestStore().getState().state;
    expect(canSetActivityDates(state, "missing", "2026-01-01", "2026-02-01").ok).toBe(
      false,
    );
    const act = state.activities["act_p1_a08"]!;
    const p = state.programmes[act.programmeId]!;
    expect(
      canSetActivityDates(state, act.id, "2026-03-01", "2026-02-01").ok,
    ).toBe(false);
    expect(
      canSetActivityDates(
        state,
        act.id,
        addCalendarDays(p.startDate, -1),
        act.plannedEnd,
      ).ok,
    ).toBe(false);
    expect(
      canSetActivityDates(
        state,
        act.id,
        act.plannedStart,
        addCalendarDays(p.endDate, 1),
      ).ok,
    ).toBe(false);
    expect(
      canSetActivityDates(state, act.id, act.plannedStart, act.plannedEnd).ok,
    ).toBe(true);
  });

  it("hold / resume / extension status gates", () => {
    const store = createTestStore();
    let state = store.getState().state;
    expect(canRequestHold(state, "missing").ok).toBe(false);
    expect(canRequestHold(state, IDS.programmes.p5).ok).toBe(false);
    expect(canRequestHold(state, IDS.programmes.p1).ok).toBe(true);

    expect(canRequestResume(state, "missing").ok).toBe(false);
    expect(canRequestResume(state, IDS.programmes.p1).ok).toBe(false);

    expect(canRequestExtension(state, "missing", "2030-01-01").ok).toBe(false);
    expect(
      canRequestExtension(state, IDS.programmes.p5, "2030-01-01").ok,
    ).toBe(false);
    expect(
      canRequestExtension(
        state,
        IDS.programmes.p1,
        state.programmes[IDS.programmes.p1]!.endDate,
      ).ok,
    ).toBe(false);
    expect(
      canRequestExtension(
        state,
        IDS.programmes.p1,
        addCalendarDays(state.programmes[IDS.programmes.p1]!.endDate, 30),
      ).ok,
    ).toBe(true);

    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    const hold = store.getState().requestHold(IDS.programmes.p1, "pause");
    expect(hold.ok).toBe(true);
    if (!hold.ok) return;
    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    store.getState().decideLifecycle(hold.data.approvalId, { approved: true });
    state = store.getState().state;
    expect(canRequestResume(state, IDS.programmes.p1).ok).toBe(true);
    expect(canReportOnProgramme(state, IDS.programmes.p1).ok).toBe(false);

    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    const resume = store.getState().requestResume(IDS.programmes.p1, "ready");
    expect(resume.ok).toBe(true);
    if (!resume.ok) return;
    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    store
      .getState()
      .decideLifecycle(resume.data.approvalId, { approved: true });
    expect(
      store.getState().state.programmes[IDS.programmes.p1]?.status,
    ).toBe("active");
  });

  it("cancellation reasons, expenses, and leadership decide", () => {
    const store = createTestStore();
    const state = store.getState().state;
    expect(canRequestCancellation(state, "missing").ok).toBe(false);
    expect(canRequestCancellation(state, IDS.programmes.p1).ok).toBe(false);
    expect(
      canRequestCancellation(state, IDS.programmes.p1, "   ").ok,
    ).toBe(false);

    // p1 has open/submitted expenses → blocked
    const blocked = canRequestCancellation(
      state,
      IDS.programmes.p1,
      "Wind down",
    );
    expect(blocked.ok).toBe(false);

    // draft p7 can cancel without open expenses
    const draftOk = canRequestCancellation(
      state,
      IDS.programmes.p7,
      "No longer needed",
    );
    expect(draftOk.ok).toBe(true);

    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    const cancel = store
      .getState()
      .requestCancellation(IDS.programmes.p7, "No longer needed");
    expect(cancel.ok).toBe(true);
    if (!cancel.ok) return;
    // Same persona cannot approve; Chairman decides (doc 08 §5b)
    store.getState().setUser(IDS.users.chairman);
    const decided = store
      .getState()
      .decideLifecycle(cancel.data.approvalId, {
        approved: true,
        remarks: "Board concurs",
      });
    expect(decided.ok).toBe(true);
    expect(store.getState().state.programmes[IDS.programmes.p7]?.status).toBe(
      "cancelled",
    );
    expect(canReportOnProgramme(store.getState().state, IDS.programmes.p7).ok).toBe(
      false,
    );
  });

  it("closure result + manager replace", () => {
    const store = createTestStore();
    const state = store.getState().state;
    expect(canRequestClosureResult(state, "missing").ok).toBe(false);
    expect(canRequestClosureResult(state, IDS.programmes.p7).ok).toBe(false);
    expect(canRequestClosureResult(state, IDS.programmes.p1).ok).toBe(false);

    expect(canReplaceManager(state, "missing", IDS.users.kavya).ok).toBe(false);
    expect(
      canReplaceManager(state, IDS.programmes.p1, IDS.users.meera).ok,
    ).toBe(false);
    expect(
      canReplaceManager(state, IDS.programmes.p1, IDS.users.arjun).ok,
    ).toBe(false);
    expect(
      canReplaceManager(state, IDS.programmes.p1, IDS.users.kavya).ok,
    ).toBe(true);

    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    const replace = store
      .getState()
      .replaceManager(IDS.programmes.p1, IDS.users.kavya);
    expect(replace.ok).toBe(true);
    expect(store.getState().state.programmes[IDS.programmes.p1]?.managerId).toBe(
      IDS.users.kavya,
    );
  });

  it("report status + evidence soft-delete branches", () => {
    const store = createTestStore();
    expect(canReportOnProgramme(store.getState().state, "missing").ok).toBe(
      false,
    );
    expect(
      canReportOnProgramme(store.getState().state, IDS.programmes.p1).ok,
    ).toBe(true);

    expect(canSoftDeleteEvidence(store.getState().state, "missing").ok).toBe(
      false,
    );

    const photo = Object.values(store.getState().state.evidence).find(
      (e) => e.type === "photograph" && !e.deleted && !e.reportId,
    );
    if (photo) {
      store.getState().setRole("client");
      store.getState().setUser(IDS.users.rahul);
      expect(canSoftDeleteEvidence(store.getState().state, photo.id).ok).toBe(
        false,
      );
      store.getState().setRole("programme_manager");
      store.getState().setUser(IDS.users.arjun);
      expect(canSoftDeleteEvidence(store.getState().state, photo.id).ok).toBe(
        true,
      );
    }

    const linked = Object.values(store.getState().state.evidence).find((e) => {
      if (e.deleted || e.type === "invoice" || !e.reportId) return false;
      const report = store.getState().state.reports[e.reportId];
      return (
        report &&
        (report.status === "submitted" ||
          report.status === "released" ||
          report.versions.length > 0)
      );
    });
    if (linked) {
      store.getState().setRole("client");
      store.getState().setUser(IDS.users.rahul);
      expect(canSoftDeleteEvidence(store.getState().state, linked.id).ok).toBe(
        false,
      );
      store.getState().setRole("programme_manager");
      store.getState().setUser(IDS.users.arjun);
      expect(canSoftDeleteEvidence(store.getState().state, linked.id).ok).toBe(
        true,
      );
    }

    const invoice = Object.values(store.getState().state.evidence).find(
      (e) => e.type === "invoice" && !e.deleted,
    );
    if (invoice) {
      store.getState().setRole("marcom");
      store.getState().setUser(IDS.users.sneha);
      expect(canSoftDeleteEvidence(store.getState().state, invoice.id).ok).toBe(
        false,
      );
      store.getState().setAllowRuleBreaking(true);
      expect(canSoftDeleteEvidence(store.getState().state, invoice.id).ok).toBe(
        true,
      );
    }
  });

  it("extension approve + reject paths via decideLifecycle", () => {
    const store = createTestStore();
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    const end = addCalendarDays(
      store.getState().state.programmes[IDS.programmes.p1]!.endDate,
      45,
    );
    const ext = store
      .getState()
      .requestExtension(IDS.programmes.p1, end, "Need runway");
    expect(ext.ok).toBe(true);
    if (!ext.ok) return;
    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    expect(
      store
        .getState()
        .decideLifecycle(ext.data.approvalId, {
          approved: false,
          remarks: "Too soon",
        }).ok,
    ).toBe(true);
    expect(
      store.getState().state.approvals[ext.data.approvalId]?.status,
    ).toBe("rejected");

    const ext2 = (() => {
      store.getState().setRole("programme_manager");
      store.getState().setUser(IDS.users.arjun);
      return store
        .getState()
        .requestExtension(IDS.programmes.p1, end, "Need runway again");
    })();
    expect(ext2.ok).toBe(true);
    if (!ext2.ok) return;
    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    expect(
      store
        .getState()
        .decideLifecycle(ext2.data.approvalId, { approved: true }).ok,
    ).toBe(true);
    expect(store.getState().state.programmes[IDS.programmes.p1]?.endDate).toBe(
      end,
    );
  });
});
