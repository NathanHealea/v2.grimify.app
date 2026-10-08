import { clerk } from "@clerk/testing/playwright";
import { devices, expect, type Page, test } from "@playwright/test";

import { E2E_EMAIL } from "./global-setup";

// Each device profile uses a different paint so parallel runs don't race on the shared test user.
const PAINTS: Record<string, { id: string; name: string }> = {
  "iPhone 15": { id: "citadel-base-mephiston-red", name: "Mephiston Red" },
  "Pixel 7": { id: "citadel-base-macragge-blue", name: "Macragge Blue" },
};

const FLAGS = {
  owned: { tab: "owned", label: "owned" },
  favorite: { tab: "favorites", label: "favorite" },
} as const;
type Flag = keyof typeof FLAGS;

const toggle = (page: Page, name: string, flag: Flag) =>
  page.getByRole("button", { name: `Mark ${name} as ${FLAGS[flag].label}` }).first();

const collectionTabs = (page: Page) => page.getByRole("navigation", { name: "Collection" });

/**
 * Makes sure the server no longer has the flag set. My Paints is the source of truth: its tabs
 * only render once a collection has loaded. Changes sync from the device outbox in the background,
 * so the un-toggle is retried until a fresh load confirms the server has it.
 */
async function ensureCleared(page: Page, name: string, flag: Flag) {
  const row = page.locator(".paint-row").filter({ hasText: name });
  await expect(async () => {
    await page.goto(`/my-paints?tab=${FLAGS[flag].tab}`);
    await expect(collectionTabs(page)).toBeVisible({ timeout: 5000 });
    if ((await row.count()) > 0) {
      await toggle(page, name, flag).click();
      throw new Error(`${name} still had ${flag}; cleared it, checking again`);
    }
  }).toPass({ intervals: [1000, 2000], timeout: 30_000 });
}

async function ensureClean(page: Page, name: string) {
  await ensureCleared(page, name, "owned");
  await ensureCleared(page, name, "favorite");
}

test("marks a paint owned and favorite and finds it in My Paints", async ({ page }, info) => {
  const paint = PAINTS[info.project.name];
  await page.goto("/paints");
  await clerk.signIn({ page, emailAddress: E2E_EMAIL });
  await ensureClean(page, paint.name);

  await page.goto(`/paints/${paint.id}`);
  for (const flag of ["owned", "favorite"] as const) {
    const button = toggle(page, paint.name, flag);
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }

  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "My Paints" })
    .click();
  const row = page.locator(".paint-row").filter({ hasText: paint.name });
  await expect(row).toBeVisible();

  // The saves are queued on the device first; a fresh load must show them from the server too.
  for (const tab of ["owned", "favorites"]) {
    await expect(async () => {
      await page.goto(`/my-paints?tab=${tab}`);
      await expect(collectionTabs(page)).toBeVisible({ timeout: 5000 });
      await expect(row).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20_000 });
  }

  await ensureClean(page, paint.name);
});

test("queues a change offline and syncs it", async ({
  page,
  context,
  browser,
  browserName,
  baseURL,
}) => {
  test.skip(browserName !== "chromium", "service workers are tested in Chromium");
  // Not in PAINTS, so it doesn't race the other test on the shared user.
  const paint = { id: "citadel-base-averland-sunset", name: "Averland Sunset" };
  const banner = page.getByRole("banner");
  const pendingBadge = banner.getByRole("status").filter({ hasText: "waiting to sync" });
  const ownedRow = page.locator(".paint-row").filter({ hasText: paint.name });

  await page.goto("/paints");
  await clerk.signIn({ page, emailAddress: E2E_EMAIL });
  await ensureCleared(page, paint.name, "owned");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // A first install doesn't control the open page; one reload hands it over.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
  await page.goto("/my-paints?tab=owned");
  await expect(collectionTabs(page)).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(banner.getByRole("status").filter({ hasText: "Offline" })).toBeVisible();
  await expect(collectionTabs(page)).toBeVisible();
  await page.goto(`/paints/${paint.id}`);
  const button = toggle(page, paint.name, "owned");
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(pendingBadge).toHaveText("1 change waiting to sync");

  await page.reload();
  await expect(toggle(page, paint.name, "owned")).toHaveAttribute("aria-pressed", "true");
  await expect(pendingBadge).toHaveText("1 change waiting to sync");
  await page.goto("/my-paints?tab=owned");
  await expect(ownedRow).toBeVisible();

  await context.setOffline(false);
  await page.reload();
  await expect(pendingBadge).toBeHidden({ timeout: 20_000 });

  const other = await browser.newContext({ ...devices["Pixel 7"], baseURL });
  try {
    const otherPage = await other.newPage();
    await otherPage.goto("/paints");
    await clerk.signIn({ page: otherPage, emailAddress: E2E_EMAIL });
    await otherPage.goto("/my-paints?tab=owned");
    await expect(collectionTabs(otherPage)).toBeVisible();
    await expect(otherPage.locator(".paint-row").filter({ hasText: paint.name })).toBeVisible();
  } finally {
    await other.close();
  }

  await ensureCleared(page, paint.name, "owned");
});
