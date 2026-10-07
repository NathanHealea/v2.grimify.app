import "./catalog-gate.css";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

import type { Catalog } from "./schema";
import type { NameIndex } from "./search";
import { useCatalog } from "./use-catalog";

type Props = {
  children: (catalog: Catalog, index: NameIndex) => ReactNode;
};

/** Shows the download progress or the offline error until the catalog is ready. */
export function CatalogGate({ children }: Props) {
  const state = useCatalog();

  if (state.status === "loading") {
    return (
      <p className="catalog-gate" role="status">
        Downloading paint catalog…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="catalog-gate" role="alert">
        <p>Connect to the internet once to download the paint catalog.</p>
        <Button onClick={state.retry}>Retry</Button>
      </div>
    );
  }

  return children(state.catalog, state.index);
}
