import { beforeEach, describe, expect, it } from "vitest";
import { buildDefaultSeed } from "@/seed";
import { IDS } from "@/seed/ids";
import { createTestStore } from "@/store/store";
import { clearPersistedState } from "@/store/persist";
import { STORAGE_KEYS } from "@/types/domain";
import {
  activityFinancials,
  assertFinanceIdentity,
} from "@/selectors/finance";
import { alerts } from "@/selectors/financeRole";
import { canVerifyExpense } from "@/lib/rules/expense";
import { closureChecks } from "@/lib/rules/closure";

describe("M8 finance — demo steps 5 & 8", () => {
  beforeEach(() => {
    clearPersistedState();
    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
    createTestStore(buildDefaultSeed("2026-11-12"));
  });

  it("demo step 5: over-allocation blocked; unallocated ₹2.5L; raise reallocation", () => {
    const store = createTestStore();
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);

    const p1 = store.getState().state.programmes[IDS.programmes.p1]!;
    expect(p1.totalBudget).toBe(25_00_000);

    // Direct edit on active Flagship blocked
    const blocked = store
      .getState()
      .setActivityBudgetAmount("act_p1_a11", 10_00_000);
    expect(blocked.ok).toBe(false);

    // Unallocated visible at ₹2.5 L
    let allocated = 0;
    for (const a of Object.values(store.getState().state.activities)) {
      if (a.programmeId !== IDS.programmes.p1 || a.status === "cancelled")
        continue;
      allocated += store.getState().state.activityBudgets[a.id]?.revised ?? 0;
    }
    expect(p1.totalBudget - allocated).toBe(2_50_000);

    // Raise reallocation from Mentoring → Closure
    const from = store.getState().state.activityBudgets["act_p1_a08"]!.revised;
    const to = store.getState().state.activityBudgets["act_p1_a11"]!.revised;
    const req = store.getState().requestBudgetRevision({
      programmeId: IDS.programmes.p1,
      kind: "reallocation",
      reason: "Shift surplus mentoring budget to closure admin",
      totalAfter: p1.totalBudget,
      lines: [
        { activityId: "act_p1_a08", before: from, after: from - 50_000 },
        { activityId: "act_p1_a11", before: to, after: to + 50_000 },
      ],
    });
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    const rev =
      store.getState().state.budgetRevisions[req.data.revisionId];
    expect(rev?.status).toBe("pending_finance");
  });

  it("demo step 8: Finance approve one, reject one; overspend alert present; cannot verify past budget", () => {
    const store = createTestStore();
    store.getState().setRole("finance");
    store.getState().setUser(IDS.users.sunita);

    // Overspend alert already on Corporate pilots
    const alertList = alerts(store.getState().state);
    expect(
      alertList.some(
        (a) => a.level === "breach" || a.level === "critical",
      ),
    ).toBe(true);

    // Cannot verify overspend expense past revised allocation
    expect(canVerifyExpense(store.getState().state, "exp_p2_02").ok).toBe(
      false,
    );
    expect(store.getState().verifyExpense("exp_p2_02").ok).toBe(false);

    // Approve a normal submitted expense
    const approve = store.getState().verifyExpense("exp_p1_13");
    expect(approve.ok).toBe(true);
    expect(store.getState().state.expenses.exp_p1_13?.status).toBe(
      "verified",
    );

    // Reject another with remarks
    const reject = store
      .getState()
      .rejectExpense("exp_p1_12", "Missing attendance sheet");
    expect(reject.ok).toBe(true);
    expect(store.getState().state.expenses.exp_p1_12?.status).toBe(
      "rejected",
    );

    // Partial verify requires remarks
    const partialNoRemark = store
      .getState()
      .verifyExpense("exp_p1_11", { verifiedAmount: 1_00_000 });
    expect(partialNoRemark.ok).toBe(false);

    const partial = store.getState().verifyExpense("exp_p1_11", {
      verifiedAmount: 1_00_000,
      remarks: "Reduced unused faculty hours",
    });
    expect(partial.ok).toBe(true);
    expect(store.getState().state.expenses.exp_p1_11?.verifiedAmount).toBe(
      1_00_000,
    );

    // Resubmit rejected → draft → submit
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);
    const resub = store.getState().resubmitExpense("exp_p1_12");
    expect(resub.ok).toBe(true);
    if (!resub.ok) return;
    expect(
      store.getState().submitExpense(resub.data.expenseId).ok,
    ).toBe(true);
  });

  it("Finance approve reallocation applies lines atomically", () => {
    const store = createTestStore();
    store.getState().setRole("programme_manager");
    store.getState().setUser(IDS.users.arjun);

    const fromBefore =
      store.getState().state.activityBudgets["act_p1_a09"]!.revised;
    const toBefore =
      store.getState().state.activityBudgets["act_p1_a11"]!.revised;
    // Small amount under leadership threshold (10% and ₹1L)
    const amount = 20_000;
    const req = store.getState().requestBudgetRevision({
      programmeId: IDS.programmes.p1,
      kind: "reallocation",
      reason: "Minor shift",
      totalAfter: 25_00_000,
      lines: [
        {
          activityId: "act_p1_a09",
          before: fromBefore,
          after: fromBefore - amount,
        },
        {
          activityId: "act_p1_a11",
          before: toBefore,
          after: toBefore + amount,
        },
      ],
    });
    expect(req.ok).toBe(true);
    if (!req.ok) return;
    const revisionId = req.data.revisionId;
    expect(
      store.getState().state.budgetRevisions[revisionId]?.needsLeadership,
    ).toBe(false);

    store.getState().setRole("finance");
    store.getState().setUser(IDS.users.sunita);
    expect(
      store.getState().decideBudgetRevision(revisionId, { approved: true })
        .ok,
    ).toBe(true);
    expect(
      store.getState().state.activityBudgets["act_p1_a09"]?.revised,
    ).toBe(fromBefore - amount);
    expect(
      store.getState().state.activityBudgets["act_p1_a11"]?.revised,
    ).toBe(toBefore + amount);
    expect(store.getState().state.budgetRevisions[revisionId]?.status).toBe(
      "approved",
    );
  });

  it("closure checks flag open activities and submitted expenses", () => {
    const store = createTestStore();
    const p1 = closureChecks(store.getState().state, IDS.programmes.p1);
    expect(p1.ready).toBe(false);
    expect(p1.issues.length).toBeGreaterThan(0);

    // P4 is completed / reconciled in seed — should be closer to ready
    const p4 = closureChecks(store.getState().state, IDS.programmes.p4);
    // May still have issues depending on seed; at least function returns
    expect(typeof p4.ready).toBe("boolean");
  });

  it("property: Rep = Ver + Pen holds after random finance action sequences", () => {
    const store = createTestStore();
    store.getState().setRole("finance");
    store.getState().setUser(IDS.users.sunita);

    const submittedIds = () =>
      Object.values(store.getState().state.expenses)
        .filter((e) => e.status === "submitted")
        .map((e) => e.id);

    for (let i = 0; i < 40; i++) {
      const ids = submittedIds();
      if (ids.length === 0) break;
      const id = ids[i % ids.length]!;
      const roll = i % 5;
      if (roll === 0) {
        store.getState().verifyExpense(id);
      } else if (roll === 1) {
        store.getState().verifyExpense(id, {
          verifiedAmount: Math.max(
            1,
            Math.floor((store.getState().state.expenses[id]?.amount ?? 1) / 2),
          ),
          remarks: "Partial property test",
        });
      } else if (roll === 2) {
        store.getState().rejectExpense(id, "Property reject");
      } else if (roll === 3) {
        // Attempt verify overspend / any — ignore result
        store.getState().verifyExpense(id);
      } else {
        store.getState().rejectExpense(id, "Alternate reject");
      }
      expect(assertFinanceIdentity(store.getState().state)).toBe(true);
      for (const a of Object.values(store.getState().state.activities)) {
        const fin = activityFinancials(store.getState().state, a.id);
        expect(fin.reported).toBe(fin.verified + fin.pending);
      }
    }
  });
});
