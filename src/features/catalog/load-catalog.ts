import type { Catalog } from "./schema";

let pending: Promise<Catalog> | undefined;

/** Fetches `catalog.json` once per session; a failed fetch is forgotten so the next call retries. */
export function loadCatalog(): Promise<Catalog> {
  pending ??= fetch(`${import.meta.env.BASE_URL}catalog.json`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`catalog.json: HTTP ${response.status}`);
      return (await response.json()) as Catalog;
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
}

/** For tests: forget the cached catalog so each test fetches its own. */
export function resetCatalogCache() {
  pending = undefined;
}
