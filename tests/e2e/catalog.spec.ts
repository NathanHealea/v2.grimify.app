import { expect, type Page, test } from "@playwright/test";

const searchBox = (page: Page) => page.getByRole("searchbox", { name: "Search paints" });
const rowNames = (page: Page) => page.locator(".paint-row__name");

test("searches by name, hex, brand and hue", async ({ page }) => {
  await page.goto("/paints");
  await expect(page.getByRole("status")).toHaveText("2,837 paints");

  await searchBox(page).fill("mephston");
  await expect(rowNames(page).first()).toHaveText("Mephiston Red");

  await searchBox(page).fill("#9A1115");
  await expect(page.getByText("Paints closest to #9A1115")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Hex: #9A1115" })).toBeVisible();
  await expect(page.locator(".paint-row").first()).toContainText("Very close");

  await searchBox(page).fill("vallejo red-orange");
  await expect(page.getByRole("button", { name: "Remove Hue: Red-Orange" })).toBeVisible();
  const metas = await page.locator(".paint-row__meta").allTextContents();
  expect(metas.length).toBeGreaterThan(0);
  expect(metas.every((meta) => meta.startsWith("Vallejo ·"))).toBe(true);

  await page.getByRole("button", { name: "Remove Brand: Vallejo" }).click();
  await expect(page).toHaveURL(/\?q=red-orange$/);
  await expect(searchBox(page)).toHaveValue("red-orange");

  await page.getByRole("button", { name: "Remove Hue: Red-Orange" }).click();
  await page
    .getByRole("list", { name: "Browse by color" })
    .getByRole("button", { name: "Blue", exact: true })
    .click();
  await expect(page).toHaveURL(/\?q=blue$/);
  await expect(page.getByRole("button", { name: "Remove Hue: Blue" })).toBeVisible();
});

test("keeps the query across reload and back", async ({ page }) => {
  await page.goto("/paints");
  await searchBox(page).fill("citadel");
  await expect(page).toHaveURL(/\?q=citadel$/);

  await page.reload();
  await expect(searchBox(page)).toHaveValue("citadel");
  await expect(page.getByRole("button", { name: "Remove Brand: Citadel" })).toBeVisible();

  await page.getByRole("button", { name: "Remove Brand: Citadel" }).click();
  await expect(searchBox(page)).toHaveValue("");
  await page.goBack();
  await expect(searchBox(page)).toHaveValue("citadel");
});
