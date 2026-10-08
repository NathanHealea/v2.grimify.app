import { expect, test } from "@playwright/test";

// Playwright's WebKit has limited service-worker support; real iPhone offline checks stay manual (TESTING §2).
test.skip(
  ({ browserName }) => browserName !== "chromium",
  "service workers are tested in Chromium",
);

test("works offline after the first visit", async ({ page, context }) => {
  await page.goto("/paints");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // A first install doesn't control the open page; one reload hands it over.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("banner").getByRole("status").filter({ hasText: "Offline" }),
  ).toHaveText("Offline");
  await page.getByRole("searchbox", { name: "Search paints" }).fill("mephston");
  await expect(page.locator(".paint-row__name").first()).toHaveText("Mephiston Red");

  await page.goto("/paints/citadel-base-mephiston-red");
  await expect(page.getByRole("heading", { level: 1, name: "Mephiston Red" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Equivalents" })).toBeVisible();
  await context.setOffline(false);
});
