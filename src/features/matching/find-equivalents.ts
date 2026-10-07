import type { Brand, Catalog, CatalogPaint } from "../catalog/schema";
import { deltaE, type MatchLabel, matchLabel } from "./delta-e";
import { typeFamily } from "./type-families";

// Presentation defaults from DECISIONS 025.
export const MATCHES_PER_BRAND = 3;
/** The edge of "Similar" (DECISIONS 022): anything at or beyond it isn't a close match. */
export const CLOSE_MATCH_BELOW = 10;

export type Equivalent = { paint: CatalogPaint; distance: number; label?: MatchLabel };

export type BrandEquivalents = {
  brand: Brand;
  /** True when nothing is under the threshold; `matches` then holds only the nearest paint, unlabelled. */
  noCloseMatch: boolean;
  matches: Equivalent[];
};

export type EquivalentsResult = {
  /** Technical and other special paints only ever get curated equivalents. */
  special: boolean;
  curated: CatalogPaint[];
  groups: BrandEquivalents[];
};

export function findEquivalents(
  paint: CatalogPaint,
  catalog: Catalog,
  { allTypes = false }: { allTypes?: boolean } = {},
): EquivalentsResult {
  const byId = new Map(catalog.paints.map((p) => [p.id, p]));
  const curated = (paint.curatedEquivalents ?? []).flatMap((id) => byId.get(id) ?? []);
  const family = typeFamily(paint);

  if (family === "special") return { special: true, curated, groups: [] };

  const byBrand = new Map<string, Equivalent[]>();
  for (const candidate of catalog.paints) {
    if (candidate.brandId === paint.brandId) continue;
    const candidateFamily = typeFamily(candidate);
    if (candidateFamily === "special" || (!allTypes && candidateFamily !== family)) continue;
    const distance = deltaE(paint.lab, candidate.lab);
    const list = byBrand.get(candidate.brandId) ?? [];
    list.push({ paint: candidate, distance });
    byBrand.set(candidate.brandId, list);
  }

  const groups = catalog.brands.flatMap((brand): BrandEquivalents[] => {
    const ranked = (byBrand.get(brand.id) ?? []).sort((a, b) => a.distance - b.distance);
    if (ranked.length === 0) return [];
    const close = ranked.filter((match) => match.distance < CLOSE_MATCH_BELOW);
    return close.length > 0
      ? [
          {
            brand,
            noCloseMatch: false,
            matches: close
              .slice(0, MATCHES_PER_BRAND)
              .map((match) => ({ ...match, label: matchLabel(match.distance) })),
          },
        ]
      : [{ brand, noCloseMatch: true, matches: [ranked[0]] }];
  });

  groups.sort((a, b) => a.matches[0].distance - b.matches[0].distance);
  return { special: false, curated, groups };
}
