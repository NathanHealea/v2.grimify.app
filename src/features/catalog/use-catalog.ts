import { useEffect, useState } from "react";

import { loadCatalog } from "./load-catalog";
import type { Catalog } from "./schema";
import { createNameIndex, type NameIndex } from "./search";

export type CatalogState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; catalog: Catalog; index: NameIndex };

const indexes = new WeakMap<Catalog, NameIndex>();

function indexFor(catalog: Catalog): NameIndex {
  let index = indexes.get(catalog);
  if (!index) {
    index = createNameIndex(catalog.paints);
    indexes.set(catalog, index);
  }
  return index;
}

export function useCatalog(): CatalogState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CatalogState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    loadCatalog().then(
      (catalog) => {
        if (active) setState({ status: "ready", catalog, index: indexFor(catalog) });
      },
      (error: unknown) => {
        console.error(error);
        if (!active) return;
        setState({
          status: "error",
          retry: () => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
          },
        });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  return state;
}
