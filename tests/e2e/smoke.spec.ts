import { test, expect } from "@playwright/test";

test.describe("M0 smoke", () => {
  test("home page shows Programme OS wordmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("IIMCIP · Programme OS")).toBeVisible();
  });
});
