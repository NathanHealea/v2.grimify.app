import type { BrandFile, Paint } from "../../src/features/catalog/schema.ts";
import type { SourceFile } from "./validate.ts";

// Overrides are loosely typed so tests can feed in deliberately invalid values.
export function paint(id: string, overrides: Record<string, unknown> = {}): Paint {
  const brandId = id.split("-")[0];
  return {
    id,
    lineId: `${brandId}-base`,
    name: id,
    hex: "#9A1115",
    type: "base",
    ...overrides,
  };
}

export function brandFile(brandId: string, paints: Paint[]): BrandFile {
  return {
    brand: { id: brandId, name: brandId, manufacturer: `${brandId} maker` },
    lines: [
      { id: `${brandId}-base`, name: "Base" },
      { id: `${brandId}-layer`, name: "Layer" },
    ],
    paints,
  };
}

export function source(fileName: string, file: BrandFile): SourceFile {
  return { fileName, text: JSON.stringify(file) };
}
