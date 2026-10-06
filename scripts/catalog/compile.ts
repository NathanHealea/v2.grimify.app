import { createHash } from "node:crypto";

import { converter } from "culori";

import type {
  BrandFile,
  Catalog,
  CatalogLine,
  CatalogPaint,
} from "../../src/features/catalog/schema.ts";

// D65 because culori's differenceCiede2000 compares in lab65 (DECISIONS 008).
const toLab = converter("lab65");

/** Compiles validated brand files into `catalog.json`. Output order is independent of input order. */
export function compileCatalog(files: BrandFile[]): Catalog {
  const brands = files.map(({ brand }) => brand).sort(byId);

  const lines: CatalogLine[] = files
    .flatMap(({ brand, lines }) => lines.map((line) => ({ ...line, brandId: brand.id })))
    .sort(byId);

  const paints: CatalogPaint[] = files
    .flatMap(({ brand, paints }) =>
      paints.map((paint) => ({ ...paint, brandId: brand.id, lab: labOf(paint.hex) })),
    )
    .sort(byId);

  const content = { brands, lines, paints };
  const version = createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 16);

  return { version, ...content };
}

function labOf(hex: string): [number, number, number] {
  const lab = toLab(hex);
  if (!lab) throw new Error(`culori could not parse ${hex}`);
  return [round(lab.l), round(lab.a), round(lab.b)];
}

function round(value: number) {
  return Math.round(value * 100) / 100 || 0;
}

function byId(a: { id: string }, b: { id: string }) {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
