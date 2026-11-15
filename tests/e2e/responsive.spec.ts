import { test, expect } from "@playwright/test";
import { waitForHydration } from "./helpers";

const VIEWPORTS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768", width: 768, height: 1024 },
] as const;

for (const vp of VIEWPORTS) {
  test(`shell usable at ${vp.name}px`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/leadership/");
    await waitForHydration(page);
    await expect(page.getByTestId("wordmark")).toBeVisible();
    await expect(page.getByTestId("role-switcher")).toBeVisible();
    if (vp.width < 1024) {
      await expect(page.getByTestId("nav-toggle")).toBeVisible();
      await page.getByTestId("nav-toggle").click();
      await expect(page.getByRole("navigation", { name: "Role navigation" })).toBeVisible();
    } else {
      await expect(
        page.getByRole("navigation", { name: "Role navigation" }),
      ).toBeVisible();
    }
  });
}
