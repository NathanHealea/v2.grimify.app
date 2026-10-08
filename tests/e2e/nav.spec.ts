import { expect, type Locator, type Page, test } from "@playwright/test";

type Rgba = { r: number; g: number; b: number; a: number };

const nav = (page: Page) => page.getByRole("navigation", { name: "Main" });

// Any CSS colour syntax (rgb, color(srgb …), oklab from color-mix) comes back as sRGB bytes once painted.
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

test("frosts the bar where it can", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "reduced transparency is emulated through Chromium's CDP");
  await page.goto("/paints");
  const bar = nav(page);
  await expect(bar).toBeVisible();

  expect(await bar.evaluate((el) => getComputedStyle(el).backdropFilter)).toContain("blur(16px)");
  expect((await computedColor(bar, "background-color")).a).toBeCloseTo(0.7, 2);

  // Playwright 1.63's emulateMedia has no reducedTransparency option, so set the media feature directly.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });
  expect(
    await page.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches),
  ).toBe(true);

  expect(await bar.evaluate((el) => getComputedStyle(el).backdropFilter)).toBe("none");
  expect((await computedColor(bar, "background-color")).a).toBe(1);
});

test("keeps nav text readable over any swatch", async ({ page }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/paints");
    const bar = nav(page);
    await expect(bar).toBeVisible();

    // A blur over one solid colour is that colour, so blending the glass over black and white
    // gives the same backdrop as rendering a solid swatch behind the bar.
    const glass = await computedColor(bar, "background-color");
    const backdrops = [
      over(glass, { r: 0, g: 0, b: 0, a: 1 }),
      over(glass, { r: 255, g: 255, b: 255, a: 1 }),
    ];
    const inactive = bar.locator('.app-shell__tab:not([aria-current="page"]) span');
    await expect(inactive).toHaveCount(2);
    const active = bar.locator('.app-shell__tab[aria-current="page"]');
    await expect(active).toHaveCount(1);

    const labels = await Promise.all((await inactive.all()).map((l) => computedColor(l, "color")));
    const pill = await computedColor(active, "background-color");

    for (const backdrop of backdrops) {
      for (const label of labels) {
        expect(
          contrast(over(label, backdrop), backdrop),
          `${colorScheme} label`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        contrast(over(pill, backdrop), backdrop),
        `${colorScheme} pill`,
      ).toBeGreaterThanOrEqual(3);
    }
  }
});
