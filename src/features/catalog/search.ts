import Fuse from "fuse.js";

import { deltaE, hexToLab, type MatchLabel, matchLabel } from "@/features/matching/delta-e";

import { type Filters, NO_FILTERS } from "./filters";
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
  filters: Filters = NO_FILTERS,
  /** Only these paint IDs are searched (e.g. My Paints); undefined searches the whole catalog. */
  scope?: ReadonlySet<string>,
): SearchResult[] {
  const passes = (paint: CatalogPaint) =>
    (scope === undefined || scope.has(paint.id)) &&
    matchesQuery(paint, query) &&
    matchesFilters(paint, filters);

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

  if (query.hues.length > 0 || filters.hues.length > 0) {
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

function matchesQuery(paint: CatalogPaint, query: ParsedQuery) {
  return (
    (query.brandIds.length === 0 || query.brandIds.includes(paint.brandId)) &&
    (query.hues.length === 0 || query.hues.includes(paint.hue))
  );
}

// A ticked line narrows only its own brand: other selected brands keep all their lines.
function matchesFilters(paint: CatalogPaint, filters: Filters) {
  const brandLines = filters.lines.filter((id) => id.startsWith(`${paint.brandId}-`));
  return (
    (filters.brands.length === 0 || filters.brands.includes(paint.brandId)) &&
    (brandLines.length === 0 || brandLines.includes(paint.lineId)) &&
    (filters.types.length === 0 || filters.types.includes(paint.type)) &&
    (filters.hues.length === 0 || filters.hues.includes(paint.hue))
  );
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

function byText(a: string, b: string) {
  return collator.compare(a, b);
}
