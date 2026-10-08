import type { CollectionState } from "@/features/collection/collection-provider";

import {
  type Brand,
  type Catalog,
  type CatalogLine,
  HUE_FAMILIES,
  type HueFamily,
  PAINT_TYPES,
  type PaintType,
} from "./schema";

/** Filters chosen in the sheet; OR within a list, AND across lists and with the search box. */
export type Filters = {
  brands: string[];
  lines: string[];
  types: PaintType[];
  hues: HueFamily[];
  /** Signed-in only: restrict to part of the collection (DECISIONS 031). */
  show?: CollectionView;
};

export const COLLECTION_VIEWS = ["owned", "wishlist", "favorites"] as const;
export type CollectionView = (typeof COLLECTION_VIEWS)[number];

export const COLLECTION_VIEW_LABELS: Record<CollectionView, string> = {
  owned: "Owned",
  wishlist: "Wishlist",
  favorites: "Favorites",
};

type CollectionSets = Pick<CollectionState, "owned" | "wishlisted" | "favorites">;

export function collectionView(view: CollectionView, collection: CollectionSets) {
  if (view === "owned") return collection.owned;
  return view === "wishlist" ? collection.wishlisted : collection.favorites;
}

/** The URL form: comma-separated IDs, omitted when empty. */
export type FilterParams = {
  brand?: string;
  line?: string;
  type?: string;
  hue?: string;
  show?: string;
};

export const NO_FILTERS: Filters = { brands: [], lines: [], types: [], hues: [] };

export function parseFilterParams(params: FilterParams): Filters {
  return {
    brands: parseList(params.brand),
    lines: parseList(params.line),
    types: parseList(params.type).filter((t): t is PaintType => isOneOf(PAINT_TYPES, t)),
    hues: parseList(params.hue).filter((h): h is HueFamily => isOneOf(HUE_FAMILIES, h)),
    show:
      params.show !== undefined && isOneOf(COLLECTION_VIEWS, params.show) ? params.show : undefined,
  };
}

export function serializeFilters(filters: Filters): FilterParams {
  const params: FilterParams = {};
  if (filters.brands.length) params.brand = filters.brands.join(",");
  if (filters.lines.length) params.line = filters.lines.join(",");
  if (filters.types.length) params.type = filters.types.join(",");
  if (filters.show) params.show = filters.show;
  if (filters.hues.length) params.hue = filters.hues.join(",");
  return params;
}

/** Drops brand and line IDs the catalog doesn't know, and lines whose brand isn't selected. */
export function normalizeFilters(catalog: Catalog, filters: Filters): Filters {
  const brands = filters.brands.filter((id) => catalog.brands.some((brand) => brand.id === id));
  const lineBrands = new Map(catalog.lines.map((line) => [line.id, line.brandId]));
  const lines = filters.lines.filter((id) => brands.includes(lineBrands.get(id) ?? ""));
  return { ...filters, brands, lines };
}

export function lineOptions(
  catalog: Catalog,
  brandIds: readonly string[],
): { brand: Brand; lines: CatalogLine[] }[] {
  return catalog.brands
    .filter((brand) => brandIds.includes(brand.id))
    .map((brand) => ({ brand, lines: catalog.lines.filter((line) => line.brandId === brand.id) }));
}

export function countActive(filters: Filters): number {
  return (
    filters.brands.length +
    filters.lines.length +
    filters.types.length +
    filters.hues.length +
    (filters.show ? 1 : 0)
  );
}

function parseList(value: string | undefined): string[] {
  const items = (value ?? "").split(",").map((item) => item.trim());
  return [...new Set(items.filter(Boolean))];
}

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

/** The paints to search: the screen's own scope, narrowed by the Show only filter (DECISIONS 031). */
export function scopeFor(
  scope: ReadonlySet<string> | undefined,
  show: CollectionView | undefined,
  collection: CollectionSets,
): ReadonlySet<string> | undefined {
  if (!show) return scope;
  const shown = collectionView(show, collection);
  return scope ? new Set([...scope].filter((id) => shown.has(id))) : shown;
}
