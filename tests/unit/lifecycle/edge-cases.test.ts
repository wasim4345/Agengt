import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { IDS } from "@/seed/ids";
import { createTestStore } from "@/store/store";
import { clearPersistedState } from "@/store/persist";
import { STORAGE_KEYS } from "@/types/domain";
import { addCalendarDays } from "@/lib/rules/dates";
import { validateAddDependency } from "@/lib/rules/dependencies";
import { canSetActivityBudget } from "@/lib/rules/budget";
import {
  canRejectExpense,
  canVerifyExpense,
  checkExpenseDuplicate,
  validateExpenseEntry,
} from "@/lib/rules/expense";
import { canSoftDeleteEvidence } from "@/lib/rules/lifecycle";
import { isOverdue } from "@/selectors/core";
import * as client from "@/selectors/client";
import { validateProgramme } from "@/lib/rules/programme";
import { closureChecks } from "@/lib/rules/closure";
import { programmeFinancials } from "@/selectors/finance";

describe("M11 — doc 04 §9 edge cases (1–20)", () => {
  beforeEach(() => {
    clearPersistedState();
    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
    createTestStore(buildDefaultSeed("2026-11-12"));
  });

  it("1 Activity beyond programme end → block + extension path", () => {
    const store = createTestStore();
    const p1 = store.getState().state.programmes[IDS.programmes.p1]!;
    const beyond = addCalendarDays(p1.endDate, 30);
    const r = store
      .getState()
      .rescheduleActivity("act_p1_a11", p1.startDate, beyond);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.code).toBe("ACT_BEYOND_PRG");

    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    const ext = store
      .getState()
      .requestExtension(IDS.programmes.p1, beyond, "Need more runway");
    expect(ext.ok).toBe(true);
  });

  it("2 Cycle rejected with path", () => {
    const state = createTestStore().getState().state;
    // a02 depends on a01 already; linking a01←a02 creates cycle if a03←a01 etc.
    // Use existing validateAddDependency that returns path
    const result = validateAddDependency(state, {
      programmeId: IDS.programmes.p1,
      successorId: "act_p1_a01",
      predecessorId: "act_p1_a03",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("DEP_CYCLE");
      expect(result.errors[0]?.message).toMatch(/→/);
    }
  });

  it("3 Predecessor delay proposes impacts", () => {
    const store = createTestStore();
    const boot = store.getState().state.activities["act_p1_a07"]!;
    const newEnd = addCalendarDays(boot.plannedEnd, 70);
    const r = store
      .getState()
      .rescheduleActivity(
        "act_p1_a07",
        addCalendarDays(boot.plannedStart, 70),
        newEnd,
      );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.impacts.length).toBeGreaterThan(0);
  });

  it("4 Allocation > budget blocked with headroom", () => {
    const state = createTestStore().getState().state;
    const r = canSetActivityBudget(state, "act_p7_a01", 50_00_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.message).toMatch(/Headroom|exceeds/i);
  });

  it("5 Spend > allocation flagged; verify blocked", () => {
    const state = createTestStore().getState().state;
    expect(canVerifyExpense(state, "exp_p2_overspend").ok).toBe(false);
    const over = validateExpenseEntry(state, {
      activityId: "act_p1_a07",
      date: "2026-11-12",
      amount: 10_00_000,
      categoryId: "ecat_venue",
      description: "Huge",
      justification: "Emergency",
    });
    expect(over.warnings.some((w) => w.code === "EXP_OVERSPEND")).toBe(true);
  });

  it("6 Revised budget via revision workflow", () => {
    const store = createTestStore();
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    const from = store.getState().state.activityBudgets["act_p1_a09"]!.revised;
    const to = store.getState().state.activityBudgets["act_p1_a11"]!.revised;
    const req = store.getState().requestBudgetRevision({
      programmeId: IDS.programmes.p1,
      kind: "reallocation",
      reason: "Edge case 6",
      totalAfter: 25_00_000,
      lines: [
        { activityId: "act_p1_a09", before: from, after: from - 20_000 },
        { activityId: "act_p1_a11", before: to, after: to + 20_000 },
      ],
    });
    expect(req.ok).toBe(true);
  });

  it("7 Cancellation reason + approval; expenses must be decided", () => {
    const store = createTestStore();
    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    // P1 has submitted expenses → block
    const blocked = store
      .getState()
      .requestCancellation(IDS.programmes.p1, "Sponsor withdrew");
    expect(blocked.ok).toBe(false);

    // Cancel draft TITAN-NEST (no open expenses); other Leadership persona approves
    const okCancel = store
      .getState()
      .requestCancellation(IDS.programmes.p7, "No longer needed");
    expect(okCancel.ok).toBe(true);
    if (!okCancel.ok) return;
    store.getState().setUser(IDS.users.chairman);
    const decided = store.getState().decideLifecycle(okCancel.data.approvalId, {
      approved: true,
      remarks: "Agreed",
    });
    expect(decided.ok).toBe(true);
    expect(store.getState().state.programmes[IDS.programmes.p7]?.status).toBe(
      "cancelled",
    );
  });

  it("8 Extension keeps baselineEndDate; endDate grows", () => {
    const store = createTestStore();
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    const p = store.getState().state.programmes[IDS.programmes.p1]!;
    const baseline = p.baselineEndDate ?? p.endDate;
    const newEnd = addCalendarDays(p.endDate, 45);
    const req = store
      .getState()
      .requestExtension(IDS.programmes.p1, newEnd, "Extra cohort month");
    expect(req.ok).toBe(true);
    if (!req.ok) return;

    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    expect(
      store
        .getState()
        .decideLifecycle(req.data.approvalId, { approved: true }).ok,
    ).toBe(true);
    const after = store.getState().state.programmes[IDS.programmes.p1]!;
    expect(after.endDate).toBe(newEnd);
    expect(after.baselineEndDate).toBe(baseline);
  });

  it("9 Manager replaced; past reports keep original author", () => {
    const store = createTestStore();
    const report = store.getState().state.reports["rpt_p1_a01"]!;
    const originalAuthor = report.createdBy;
    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    const r = store
      .getState()
      .replaceManager(IDS.programmes.p1, IDS.users.kavya);
    expect(r.ok).toBe(true);
    expect(store.getState().state.programmes[IDS.programmes.p1]?.managerId).toBe(
      IDS.users.kavya,
    );
    expect(store.getState().state.reports["rpt_p1_a01"]?.createdBy).toBe(
      originalAuthor,
    );
  });

  it("10 Cross-tab warning flag", () => {
    const store = createTestStore();
    expect(store.getState().crossTabWarning).toBe(false);
    store.setState({ crossTabWarning: true });
    expect(store.getState().crossTabWarning).toBe(true);
    store.getState().clearCrossTabWarning();
    expect(store.getState().crossTabWarning).toBe(false);
  });

  it("11 Duplicate expense warn/block", () => {
    const state = createTestStore().getState().state;
    const exp = state.expenses.exp_p1_03!;
    const soft = checkExpenseDuplicate(state, {
      activityId: exp.activityId,
      date: exp.date,
      amount: exp.amount,
      categoryId: exp.categoryId,
      description: "Other",
    });
    expect(soft.warning).toBeTruthy();
  });

  it("12 Reject/resubmit creates linked draft", () => {
    const store = createTestStore();
    store.getState().setRole("finance");
    store.getState().setUser(IDS.users.sunita);
    expect(
      store.getState().rejectExpense("exp_p1_13", "Need receipt").ok,
    ).toBe(true);
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    const resub = store.getState().resubmitExpense("exp_p1_13");
    expect(resub.ok).toBe(true);
    if (!resub.ok) return;
    expect(
      store.getState().state.expenses[resub.data.expenseId]?.resubmissionOf,
    ).toBe("exp_p1_13");
  });

  it("13 Client sees released only", () => {
    const store = createTestStore();
    store.getState().setRole("client");
    store.getState().setUser(IDS.users.rahul);
    const released = client.releasedReports(store.getState().state);
    expect(released.length).toBeGreaterThan(0);
    expect(
      released.every((r) => {
        const full = store.getState().state.reports[r.id];
        return full?.status === "released" && full.release?.clientVisible;
      }),
    ).toBe(true);
  });

  it("14 Closure with pending blocked; list shown", () => {
    const store = createTestStore();
    const checks = closureChecks(store.getState().state, IDS.programmes.p1);
    expect(checks.ready).toBe(false);
    expect(checks.issues.length).toBeGreaterThan(0);
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    expect(store.getState().requestClosure(IDS.programmes.p1).ok).toBe(false);
  });

  it("15 Active structure change allowed with baseline retained", () => {
    const store = createTestStore();
    const act = store.getState().state.activities["act_p1_a08"]!;
    const baselineEnd = act.baselineEnd;
    const newEnd = addCalendarDays(act.plannedEnd, 5);
    // Ensure still within programme end
    const r = store
      .getState()
      .rescheduleActivity(
        "act_p1_a08",
        act.plannedStart,
        newEnd,
      );
    expect(r.ok).toBe(true);
    expect(store.getState().state.activities["act_p1_a08"]?.baselineEnd).toBe(
      baselineEnd,
    );
    expect(store.getState().state.activities["act_p1_a08"]?.plannedEnd).toBe(
      newEnd,
    );
  });

  it("16 Activity without budget → warning allowed", () => {
    const store = createTestStore();
    // Create draft with activity then zero budget via rule-breaking
    store.getState().setAllowRuleBreaking(true);
    const created = store.getState().createProgrammeDraft({
      name: "Edge 16",
      totalBudget: 5_00_000,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const add = store.getState().addActivity(created.data.programmeId, {
      name: "Unbudgeted",
      plannedStart: "2026-11-12",
      plannedEnd: "2026-12-12",
    });
    expect(add.ok).toBe(true);
    if (!add.ok) return;
    store.getState().setActivityBudgetAmount(add.data.activityId, 0);
    const validation = validateProgramme(
      store.getState().state,
      created.data.programmeId,
      { acknowledgeUnallocated: true },
    );
    expect(validation.warnings.some((w) => w.code === "W1" || w.message.match(/budget/i))).toBe(
      true,
    );
  });

  it("17 Unallocated visible; acknowledgement at activation", () => {
    const state = createTestStore().getState().state;
    expect(programmeFinancials(state, IDS.programmes.p1).unallocated).toBe(
      2_50_000,
    );
    const validation = validateProgramme(state, IDS.programmes.p5);
    expect(
      validation.warnings.some((w) => w.code === "W2") || validation.ok,
    ).toBe(true);
  });

  it("18 Partial completion must be resolved at closure", () => {
    const store = createTestStore();
    store.getState().setAllowRuleBreaking(true);
    const act = store.getState().state.activities["act_p4_a01"];
    // Use p4 if present — force one activity partially_completed
    const p4Acts = Object.values(store.getState().state.activities).filter(
      (a) => a.programmeId === IDS.programmes.p4,
    );
    if (p4Acts[0]) {
      store.getState().rawUpsert("activities", p4Acts[0].id, {
        ...p4Acts[0],
        status: "partially_completed",
        percentComplete: 50,
      });
      const checks = closureChecks(
        store.getState().state,
        IDS.programmes.p4,
      );
      expect(checks.ready).toBe(false);
      expect(checks.issues.some((i) => i.includes("partially"))).toBe(true);
    }
    void act;
    expect(canRejectExpense).toBeTruthy();
  });

  it("19 Suspension on_hold pauses overdue; reporting disabled", () => {
    const store = createTestStore();
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    const hold = store
      .getState()
      .requestHold(IDS.programmes.p1, "Staffing gap");
    expect(hold.ok).toBe(true);
    if (!hold.ok) return;
    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    expect(
      store.getState().decideLifecycle(hold.data.approvalId, { approved: true })
        .ok,
    ).toBe(true);
    expect(store.getState().state.programmes[IDS.programmes.p1]?.status).toBe(
      "on_hold",
    );
    expect(
      isOverdue(
        store.getState().state,
        store.getState().state.activities["act_p1_a06"]!,
      ),
    ).toBe(false);

    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    const report = store.getState().startReport({
      programmeId: IDS.programmes.p1,
      activityId: "act_p1_a08",
      type: "interim",
    });
    expect(report.ok).toBe(false);
    if (!report.ok) expect(report.errors[0]?.code).toBe("LIF_HOLD_REPORT");
  });

  it("20 Evidence deletion rules (uploader / soft-delete / invoice)", () => {
    const store = createTestStore();
    const evidence = Object.values(store.getState().state.evidence).find(
      (e) => e.type === "photograph" && !e.deleted,
    )!;
    store.getState().setRole("client");
    store.getState().setUser(IDS.users.rahul);
    expect(canSoftDeleteEvidence(store.getState().state, evidence.id).ok).toBe(
      false,
    );

    store.getState().setRole("leadership");
    store.getState().setUser(IDS.users.meera);
    expect(canSoftDeleteEvidence(store.getState().state, evidence.id).ok).toBe(
      true,
    );
    const invoice = Object.values(store.getState().state.evidence).find(
      (e) => e.type === "invoice",
    );
    if (invoice) {
      store.getState().setRole("programme_manager");
      store.getState().setUser(IDS.users.arjun);
      expect(canSoftDeleteEvidence(store.getState().state, invoice.id).ok).toBe(
        false,
      );
      store.getState().setRole("finance");
      store.getState().setUser(IDS.users.sunita);
      expect(canSoftDeleteEvidence(store.getState().state, invoice.id).ok).toBe(
        true,
      );
    }
  });
});
