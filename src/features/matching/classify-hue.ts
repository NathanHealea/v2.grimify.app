import { converter } from "culori";

import type { HueFamily, ValueBand } from "../catalog/schema";

// Also run by scripts/build-catalog.ts under plain Node: only package imports and type-only imports.

const toOklch = converter("oklch");

// Constants tuned on the 2,837-paint seed catalog; DATABASE §3 records the reasoning and distribution.

/** OKLCh chroma below this is neutral. */
export const NEUTRAL_CHROMA = 0.03;

/**
 * OKLCh hue angle where each family starts (inclusive). The artist's wheel spends half its circle on
 * red to yellow, which OKLCh fits into about 80°, so warm segments are narrow. Below 7.5° wraps to red-violet.
 */
export const HUE_SEGMENTS: readonly (readonly [start: number, family: HueFamily])[] = [
  [7.5, "red"],
  [32.5, "red-orange"],
  [47.5, "orange"],
  [65, "yellow-orange"],
  [87.5, "yellow"],
  [112.5, "yellow-green"],
  [137.5, "green"],
  [170, "blue-green"],
  [220, "blue"],
  [265, "blue-violet"],
  [295, "violet"],
  [325, "red-violet"],
];

/** OKLCh lightness below this is dark. */
export const DARK_BELOW = 0.4;

/** OKLCh lightness at or above this is light. */
export const LIGHT_FROM = 0.75;

export function classifyHue(hex: string): HueFamily {
  return hueFromOklch(oklchOf(hex));
}

export function classifyValue(hex: string): ValueBand {
  return valueFromLightness(oklchOf(hex).l);
}

export function hueFromOklch({ c, h }: { c: number; h?: number }): HueFamily {
  if (c < NEUTRAL_CHROMA || h === undefined) return "neutral";
  let family = HUE_SEGMENTS[HUE_SEGMENTS.length - 1][1];
  for (const [start, segmentFamily] of HUE_SEGMENTS) {
    if (h >= start) family = segmentFamily;
  }
  return family;
}

export function valueFromLightness(l: number): ValueBand {
  if (l < DARK_BELOW) return "dark";
  return l >= LIGHT_FROM ? "light" : "mid";
}

function oklchOf(hex: string) {
  const color = toOklch(hex);
  if (!color) throw new Error(`culori could not parse ${hex}`);
  return color;
}
