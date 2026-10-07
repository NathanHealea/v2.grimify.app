import Fuse from "fuse.js";

import { deltaE, hexToLab, type MatchLabel, matchLabel } from "@/features/matching/delta-e";

import type { ParsedQuery } from "./parse-query";
import type { Catalog, CatalogPaint } from "./schema";

export type SearchResult = { paint: CatalogPaint; distance?: number; label?: MatchLabel };

export type NameIndex = Fuse<CatalogPaint>;

export function createNameIndex(paints: readonly CatalogPaint[]): NameIndex {
  return new Fuse(paints, {
    keys: [
      { name: "name", weight: 2 },
      { name: "aliases", weight: 1 },
    ],
    // Loose enough for "mephston" → Mephiston Red; ignoreLocation so a match late in a long name counts.
    threshold: 0.35,
    ignoreLocation: true,
  });
}

export function searchPaints(
  catalog: Catalog,
  index: NameIndex,
  query: ParsedQuery,
): SearchResult[] {
  const brands = new Set(query.brandIds);
  const hues = new Set(query.hues);
  const passes = (paint: CatalogPaint) =>
    (brands.size === 0 || brands.has(paint.brandId)) && (hues.size === 0 || hues.has(paint.hue));

  const candidates = query.text
    ? index
        .search(query.text)
        .map(({ item }) => item)
        .filter(passes)
    : catalog.paints.filter(passes);

  if (query.hex) {
    const target = hexToLab(query.hex);
    return candidates
      .map((paint) => {
        const distance = deltaE(target, paint.lab);
        return { paint, distance, label: matchLabel(distance) };
      })
      .sort((a, b) => a.distance - b.distance);
  }

  if (query.text) return candidates.map((paint) => ({ paint }));

  if (hues.size > 0) {
    return [...candidates].sort((a, b) => b.lab[0] - a.lab[0]).map((paint) => ({ paint }));
  }

  const brandNames = new Map(catalog.brands.map((brand) => [brand.id, brand.name]));
  return [...candidates]
    .sort(
      (a, b) =>
        byText(a.name, b.name) ||
        byText(brandNames.get(a.brandId) ?? "", brandNames.get(b.brandId) ?? ""),
    )
    .map((paint) => ({ paint }));
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

function byText(a: string, b: string) {
  return collator.compare(a, b);
}
