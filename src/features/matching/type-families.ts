import type { Paint, PaintType } from "../catalog/schema";

/** Paints only match within a family by default, since hex can't capture sheen or transparency (DATABASE §3). */
export type TypeFamily = "opaque" | "tint" | "wash" | "metallic" | "special";

export const TYPE_FAMILIES: Record<PaintType, TypeFamily> = {
  acrylic: "opaque",
  base: "opaque",
  layer: "opaque",
  dry: "opaque",
  air: "opaque",
  primer: "opaque",
  contrast: "tint",
  speedpaint: "tint",
  shade: "wash",
  wash: "wash",
  ink: "wash",
  metallic: "metallic",
  technical: "special",
  other: "special",
};

export function typeFamily(paint: Pick<Paint, "type" | "finish">): TypeFamily {
  return paint.finish === "metallic" ? "metallic" : TYPE_FAMILIES[paint.type];
}
