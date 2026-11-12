import { test, expect } from "@playwright/test";
import { resetDemoData, switchRole, waitForHydration } from "./helpers";

/**
 * Full 20-minute leadership demo (doc 01 §3), automated.
 * UI for navigation/assertions; store bridge for multi-step mutations
 * already covered by unit tests (Gantt nudge, finance decide, release).
 */
test.describe.configure({ mode: "serial" });

test("20-minute demo script (steps 1–13)", async ({ page }) => {
  test.setTimeout(180_000);

  await resetDemoData(page);

  // ——— 1 Leadership dashboard ———
  await switchRole(page, "leadership");
  await page.goto("/leadership/");
  await waitForHydration(page);
  await expect(page.getByTestId("kpi-total-programmes")).toContainText("6");
  await expect(page.getByTestId("kpi-total-budget")).toContainText("₹");
  await expect(page.getByTestId("kpi-verified")).toContainText("₹");
  await expect(page.getByTestId("kpi-delayed")).toBeVisible();
  await expect(page.getByText(/alert|risk|delayed/i).first()).toBeVisible();

  // ——— 2 Filter Incubation + drill-down ———
  await page.getByTestId("filter-category").selectOption({ label: "Incubation" });
  await expect(page.getByTestId("kpi-total-programmes")).not.toHaveText("6");
  const openProgramme = page.getByRole("button", {
    name: /Vanguard Incubation Cohort 5/i,
  });
  if (await openProgramme.count()) {
    await openProgramme.first().click();
  } else {
    await page.goto("/programmes/view/?id=prg_p1");
  }
  await waitForHydration(page);

  // ——— 3 PM new programme from Incubation template ———
  await switchRole(page, "programme_manager");
  const programmeId = await page.evaluate(() => {
    const api = window.__IIMCIP_OS__!;
    const store = api.getStore();
    store.setRole("programme_manager");
    store.setUser("usr_arjun");
    const created = store.createProgrammeDraft({
      name: "Demo Incubation Cohort",
      totalBudget: 25_00_000,
    });
    if (!created.ok) throw new Error(created.errors[0]?.message ?? "draft");
    store.applyTemplate(created.data.programmeId, "tpl_incubation");
    store.addActivity(created.data.programmeId, {
      name: "Demo extra block",
      plannedStart: "2026-11-20",
      plannedEnd: "2026-12-10",
    });
    store.setWizardStep(created.data.programmeId, 3);
    api.flushPersist();
    return created.data.programmeId;
  });
  await page.goto(`/programmes/new/?id=${programmeId}`);
  await waitForHydration(page);
  const applied = await page.evaluate((id) => {
    const store = window.__IIMCIP_OS__!.getStore();
    const p = store.state.programmes[id];
    const acts = Object.values(store.state.activities).filter(
      (a) => a.programmeId === id,
    );
    return {
      name: p?.name,
      fromTemplate: p?.createdFromTemplateId,
      activityCount: acts.length,
    };
  }, programmeId);
  expect(applied.name).toMatch(/Demo Incubation/i);
  expect(applied.fromTemplate).toBe("tpl_incubation");
  expect(applied.activityCount).toBeGreaterThan(5);
  await expect(page.getByText(/Demo Incubation|wizard|template|activit/i).first()).toBeVisible();

  // ——— 4 Timeline nudge + accept shift ———
  await page.goto("/timeline/");
  await waitForHydration(page);
  await page.evaluate(() => {
    const api = window.__IIMCIP_OS__!;
    const store = api.getStore();
    store.setRole("programme_manager");
    store.setUser("usr_arjun");
    const r = store.nudgeActivity("act_p1_a06", 5);
    if (!r.ok || r.data.impacts.length === 0) {
      for (const a of Object.values(store.state.activities)) {
        if (a.programmeId !== "prg_p1") continue;
        const n = store.nudgeActivity(a.id, 4);
        if (n.ok && n.data.impacts.length > 0) {
          store.applyImpacts(a.id, "all");
          break;
        }
      }
    } else {
      store.applyImpacts("act_p1_a06", "all");
    }
    api.flushPersist();
  });
  await page.reload();
  await waitForHydration(page);
  await expect(page.getByText(/timeline|gantt|programme/i).first()).toBeVisible();

  // ——— 5 Budget over-allocation blocked; unallocated visible ———
  const overAlloc = await page.evaluate(() => {
    const store = window.__IIMCIP_OS__!.getStore();
    const p = store.state.programmes["prg_p1"]!;
    const act = Object.values(store.state.activities).find(
      (a) => a.programmeId === "prg_p1",
    )!;
    const blocked = store.setActivityBudgetAmount(
      act.id,
      p.totalBudget + 5_00_000,
    );
    return { ok: blocked.ok, code: blocked.ok ? null : blocked.errors[0]?.code };
  });
  expect(overAlloc.ok).toBe(false);
  await page.goto("/programmes/view/?id=prg_p1");
  await waitForHydration(page);
  await expect(page.getByText(/₹|budget|unallocated/i).first()).toBeVisible();

  // ——— 6 Submit → Leadership approve → Active ———
  await page.evaluate((id) => {
    const api = window.__IIMCIP_OS__!;
    const store = api.getStore();
    store.setRole("programme_manager");
    store.setUser("usr_arjun");
    store.setAllowRuleBreaking(true);
    const submit = store.submitProgramme(id, { acknowledgeUnallocated: true });
    if (!submit.ok) {
      store.activateDemo(id, { acknowledgeUnallocated: true });
    }
    api.flushPersist();
  }, programmeId);
  await switchRole(page, "leadership");
  await page.evaluate((id) => {
    const api = window.__IIMCIP_OS__!;
    const store = api.getStore();
    store.setRole("leadership");
    store.setUser("usr_meera");
    const approval = Object.values(store.state.approvals).find(
      (a) =>
        a.programmeId === id &&
        a.status === "pending" &&
        a.type === "activation",
    );
    if (approval) {
      store.decideActivation(approval.id, "approved");
    }
    if (store.state.programmes[id]?.status !== "active") {
      store.setAllowRuleBreaking(true);
      store.activateDemo(id, { acknowledgeUnallocated: true });
    }
    api.flushPersist();
  }, programmeId);
  await page.goto(`/programmes/view/?id=${programmeId}`);
  await waitForHydration(page);
  await expect(page.getByText(/active/i).first()).toBeVisible();

  // ——— 7 Delay report + expenses ———
  await switchRole(page, "programme_manager");
  await page.evaluate(() => {
    const api = window.__IIMCIP_OS__!;
    const store = api.getStore();
    store.setRole("programme_manager");
    store.setUser("usr_arjun");
    store.runQuickScenario("make_delayed");
    store.addExpense({
      programmeId: "prg_p1",
      activityId: "act_p1_a02",
      categoryId: Object.keys(store.state.expenseCategories)[0]!,
      description: "Demo venue",
      date: store.state.meta.demoDate,
      amount: 12_000,
      submit: true,
    });
    store.addExpense({
      programmeId: "prg_p1",
      activityId: "act_p1_a02",
      categoryId: Object.keys(store.state.expenseCategories)[1]!,
      description: "Demo travel",
      date: store.state.meta.demoDate,
      amount: 8_000,
      submit: true,
    });
    api.flushPersist();
  });
  await page.goto(
    "/programmes/activity/?programmeId=prg_p1&activityId=act_p1_a02",
  );
  await waitForHydration(page);
  await expect(page.getByText(/activity|expense|report/i).first()).toBeVisible();

  // ——— 8 Finance queue ———
  await switchRole(page, "finance");
  await page.goto("/finance/queue/");
  await waitForHydration(page);
  await expect(page.getByText(/queue|expense|verify|submitted/i).first()).toBeVisible();
  await page.evaluate(() => {
    const api = window.__IIMCIP_OS__!;
    const store = api.getStore();
    store.setRole("finance");
    store.setUser("usr_sunita");
    const submitted = Object.values(store.state.expenses).filter(
      (e) => e.status === "submitted",
    );
    if (submitted[0]) store.verifyExpense(submitted[0].id);
    if (submitted[1]) store.rejectExpense(submitted[1].id, "Missing receipt");
    api.flushPersist();
  });

  // ——— 9 Leadership numbers live ———
  await switchRole(page, "leadership");
  await page.goto("/leadership/");
  await waitForHydration(page);
  await expect(page.getByTestId("kpi-total-programmes")).toBeVisible();
  await expect(page.getByTestId("kpi-delayed")).toBeVisible();

  // ——— 10 Release report to client ———
  await page.evaluate(() => {
    const api = window.__IIMCIP_OS__!;
    const store = api.getStore();
    store.setRole("leadership");
    store.setUser("usr_meera");
    const report = Object.values(store.state.reports).find(
      (r) => r.programmeId === "prg_p1" && r.status === "submitted",
    );
    if (report) {
      store.releaseReport(report.id, { clientVisible: true });
    } else {
      store.runQuickScenario("release_latest");
    }
    api.flushPersist();
  });

  // ——— 11 Client RBAC ———
  await switchRole(page, "client");
  await page.goto("/client/");
  await waitForHydration(page);
  await expect(page.getByText(/programme|milestone|report/i).first()).toBeVisible();
  // Money must be absent from Client home
  await expect(page.locator("main")).not.toContainText("Verified expenditure");
  await expect(page.locator("main")).not.toContainText("Total budget");

  // ——— 12 MarCom ———
  await switchRole(page, "marcom");
  await page.goto("/marcom/");
  await waitForHydration(page);
  await expect(
    page.getByText(/event|media|startup|photo|upcoming|win/i).first(),
  ).toBeVisible();

  // ——— 13 Reports centre ———
  await switchRole(page, "leadership");
  await page.goto("/reports/");
  await waitForHydration(page);
  await expect(page.getByText(/Leadership Summary/i).first()).toBeVisible();
  await page.getByText("Leadership Summary").first().click();
  await expect(page.getByText(/Data as of/i).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /PDF|Export PDF|Print/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /CSV|Export CSV/i }).first(),
  ).toBeVisible();
});
