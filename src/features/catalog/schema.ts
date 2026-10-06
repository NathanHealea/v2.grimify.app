import { z } from "zod";

// Imported by scripts/build-catalog.ts under plain Node, so this file may only import packages.

export const PAINT_TYPES = [
  "base",
  "layer",
  "shade",
  "wash",
  "contrast",
  "speedpaint",
  "dry",
  "technical",
  "metallic",
  "air",
  "ink",
  "primer",
  "other",
] as const;

export const FINISHES = ["matte", "satin", "gloss", "metallic"] as const;

export const HUE_FAMILIES = [
  "red",
  "red-orange",
  "orange",
  "yellow-orange",
  "yellow",
  "yellow-green",
  "green",
  "blue-green",
  "blue",
  "blue-violet",
  "violet",
  "red-violet",
  "neutral",
] as const;

// Same bounds as the Convex paintId check (DATABASE §8).
export const catalogIdSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be lowercase kebab-case ASCII");

const nameSchema = z.string().refine((value) => value.trim().length > 0, "must not be blank");

export const brandSchema = z.strictObject({
  id: catalogIdSchema,
  name: nameSchema,
  manufacturer: nameSchema,
  website: z.url().optional(),
});

export const lineSchema = z.strictObject({
  id: catalogIdSchema,
  name: nameSchema,
});

export const paintSchema = z.strictObject({
  id: catalogIdSchema,
  lineId: catalogIdSchema,
  name: nameSchema,
  sku: nameSchema.optional(),
  hex: z.string().regex(/^#[0-9A-F]{6}$/, "must be #RRGGBB with uppercase hex digits"),
  type: z.enum(PAINT_TYPES),
  finish: z.enum(FINISHES).optional(),
  discontinued: z.boolean().optional(),
  aliases: z.array(nameSchema).optional(),
  curatedEquivalents: z.array(catalogIdSchema).optional(),
  hueOverride: z.enum(HUE_FAMILIES).optional(),
});

export type PaintType = (typeof PAINT_TYPES)[number];
export type Finish = (typeof FINISHES)[number];
export type HueFamily = (typeof HUE_FAMILIES)[number];
export type Brand = z.infer<typeof brandSchema>;
export type Line = z.infer<typeof lineSchema>;
export type Paint = z.infer<typeof paintSchema>;

/** One `data/catalog/<brandId>.json` source file. */
export type BrandFile = { brand: Brand; lines: Line[]; paints: Paint[] };

export type CatalogLine = Line & { brandId: string };

/** `lab` is CIELAB with a D65 white point, rounded to 2 decimals. */
export type CatalogPaint = Paint & { brandId: string; lab: [number, number, number] };

/** The generated `public/catalog.json`. */
export type Catalog = {
  version: string;
  brands: Brand[];
  lines: CatalogLine[];
  paints: CatalogPaint[];
};
