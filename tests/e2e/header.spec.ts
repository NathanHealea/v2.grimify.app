import { expect, type Locator, type Page, test } from "@playwright/test";

type Rgba = { r: number; g: number; b: number; a: number };

const header = (page: Page) => page.getByRole("banner");
const smallTitle = (page: Page) => header(page).locator(".app-shell__title");
const largeTitle = (page: Page) => page.locator("main h1.page-title");
const searchBox = (page: Page) => page.getByRole("searchbox", { name: "Search paints" });

// Copied from nav.spec.ts: any CSS colour syntax comes back as sRGB bytes once painted.
async function computedColor(target: Locator, property: string): Promise<Rgba> {
  return target.evaluate((element, prop) => {
    const value = getComputedStyle(element).getPropertyValue(prop);
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no 2d canvas context");
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  }, property);
}

function over(top: Rgba, bottom: Rgba): Rgba {
  const mix = (t: number, u: number) => t * top.a + u * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

// WCAG 2.1 relative luminance and contrast ratio (Understanding SC 1.4.3).
function luminance({ r, g, b }: Rgba): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

async function opacity(target: Locator): Promise<number> {
  return target.evaluate((el) => Number(getComputedStyle(el).opacity));
}

async function contentBox(target: Locator) {
  return target.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      left: rect.left + parseFloat(style.paddingLeft),
      right: rect.right - parseFloat(style.paddingRight),
    };
  });
}

async function rect(target: Locator) {
  return target.evaluate((el) => {
    const { left, right } = el.getBoundingClientRect();
    return { left, right };
  });
}

async function expectAligned(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  const column = await contentBox(page.locator("main"));
  const start = await rect(header(page).locator(".app-shell__header-start"));
  const end = await rect(header(page).locator(".app-shell__header-end"));
  const large = await rect(largeTitle(page));
  const search = await rect(searchBox(page));
  const small = await rect(smallTitle(page));

  expect
    .soft(Math.abs(large.left - column.left), `large title at ${width}px`)
    .toBeLessThanOrEqual(1);
  expect
    .soft(Math.abs(search.left - column.left), `search box at ${width}px`)
    .toBeLessThanOrEqual(1);
  expect
    .soft(Math.abs(start.left - column.left), `header start at ${width}px`)
    .toBeLessThanOrEqual(1);
  expect
    .soft(Math.abs(end.right - column.right), `header end at ${width}px`)
    .toBeLessThanOrEqual(1);
  const columnCentre = (column.left + column.right) / 2;
  const smallCentre = (small.left + small.right) / 2;
  expect
    .soft(Math.abs(smallCentre - columnCentre), `small title centred at ${width}px`)
    .toBeLessThanOrEqual(2);

  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const bar = await rect(header(page));
  expect.soft(bar.left, `header starts at the window edge at ${width}px`).toBeCloseTo(0, 0);
  expect
    .soft(bar.right, `header ends at the window edge at ${width}px`)
    .toBeCloseTo(viewportWidth, 0);
}

test("collapses the title and lines the header up", async ({ page, browserName }) => {
  await page.goto("/paints");
  await expect(largeTitle(page)).toHaveText("Paints");
  await expect(page.getByRole("main").getByRole("status")).toHaveText("2,837 paints");

  await expect(smallTitle(page)).toHaveText("Paints");
  await expect.poll(() => opacity(smallTitle(page))).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect.poll(() => opacity(smallTitle(page))).toBe(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => opacity(smallTitle(page))).toBe(0);

  await expectAligned(page, 1440);
  await expectAligned(page, 768);

  if (browserName === "chromium") {
    expect(await header(page).evaluate((el) => getComputedStyle(el).backdropFilter)).toContain(
      "blur(16px)",
    );
  }
});

test("keeps the header title readable", async ({ page }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/paints");
    await expect(smallTitle(page)).toHaveText("Paints");

    // A blur over one solid colour is that colour, so blending the glass over black and white
    // gives the same backdrop as a solid swatch scrolled under the header.
    const glass = await computedColor(header(page), "background-color");
    const text = await computedColor(smallTitle(page), "color");
    for (const backdrop of [
      over(glass, { r: 0, g: 0, b: 0, a: 1 }),
      over(glass, { r: 255, g: 255, b: 255, a: 1 }),
    ]) {
      expect(
        contrast(over(text, backdrop), backdrop),
        `${colorScheme} title`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
});
