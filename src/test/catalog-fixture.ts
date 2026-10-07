import type { Brand, Catalog, CatalogPaint, Paint } from "@/features/catalog/schema";
import { classifyHue, classifyValue } from "@/features/matching/classify-hue";
import { hexToLab } from "@/features/matching/delta-e";

export const BRANDS: Brand[] = [
  { id: "citadel", name: "Citadel", manufacturer: "Games Workshop" },
  { id: "vallejo", name: "Vallejo", manufacturer: "Acrílicos Vallejo" },
  { id: "army-painter", name: "The Army Painter", manufacturer: "The Army Painter" },
  { id: "green-stuff-world", name: "Green Stuff World", manufacturer: "Green Stuff World" },
];

type PaintInput = Pick<Paint, "name" | "hex"> & Partial<Paint> & { brandId: string };

/** Builds catalog paints the way the pipeline does, using the real classifier and Lab conversion. */
export function catalogPaint({ brandId, name, hex, ...rest }: PaintInput): CatalogPaint {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: `${brandId}-base-${slug}`,
    lineId: `${brandId}-base`,
    name,
    hex,
    type: "base",
    ...rest,
    brandId,
    lab: hexToLab(hex) as [number, number, number],
    hue: rest.hueOverride ?? classifyHue(hex),
    value: classifyValue(hex),
  };
}

export function catalogOf(paints: CatalogPaint[]): Catalog {
  return {
    version: "test",
    brands: BRANDS,
    lines: BRANDS.map((brand) => ({ id: `${brand.id}-base`, name: "Base", brandId: brand.id })),
    paints,
  };
}
