import { converter, differenceCiede2000 } from "culori";

type Lab = readonly [l: number, a: number, b: number];

export type MatchLabel = "Very close" | "Close" | "Similar";

const toLab = converter("lab65");
const ciede2000 = differenceCiede2000();

// ΔE00 ≈ 2 is the usual just-noticeable difference; hex values are approximate, so labels stay coarse (DECISIONS 022).
const LABELS: readonly (readonly [below: number, label: MatchLabel])[] = [
  [2, "Very close"],
  [5, "Close"],
  [10, "Similar"],
];

/** CIEDE2000 between two D65 Lab colors, the space `catalog.json` precomputes. */
export function deltaE([l1, a1, b1]: Lab, [l2, a2, b2]: Lab): number {
  return ciede2000({ mode: "lab65", l: l1, a: a1, b: b1 }, { mode: "lab65", l: l2, a: a2, b: b2 });
}

export function hexToLab(hex: string): Lab {
  const lab = toLab(hex);
  if (!lab) throw new Error(`culori could not parse ${hex}`);
  return [lab.l, lab.a, lab.b];
}

export function matchLabel(distance: number): MatchLabel | undefined {
  return LABELS.find(([below]) => distance < below)?.[1];
}
