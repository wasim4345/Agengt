import { expect, type Page } from "@playwright/test";

export async function waitForHydration(page: Page) {
  await page.waitForFunction(() => Boolean(window.__IIMCIP_OS__), null, {
    timeout: 30_000,
  });
}

export async function switchRole(
  page: Page,
  role:
    | "leadership"
    | "programme_manager"
    | "client"
    | "marcom"
    | "finance",
  userId?: string,
) {
  await waitForHydration(page);
  await page.evaluate(
    ({ role, userId }) => {
      const api = window.__IIMCIP_OS__!;
      const store = api.getStore();
      store.setRole(role);
      if (userId) {
        store.setUser(userId);
      } else {
        const match = Object.values(store.state.users).find((u) => u.role === role);
        if (match) store.setUser(match.id);
      }
      api.flushPersist();
    },
    { role, userId },
  );
  // Trigger client navigation home for the role
  const homes: Record<string, string> = {
    leadership: "/leadership/",
    programme_manager: "/manager/",
    client: "/client/",
    marcom: "/marcom/",
    finance: "/finance/",
  };
  await page.goto(homes[role]!);
  await waitForHydration(page);
  await expect(page.getByTestId("current-role")).toBeVisible();
}

export async function resetDemoData(page: Page) {
  await page.goto("/data/");
  await waitForHydration(page);
  await page.getByPlaceholder("RESET").fill("RESET");
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(page.getByText(/Reset to seed/i).first()).toBeVisible({
    timeout: 10_000,
  });
}
