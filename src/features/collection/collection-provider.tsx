import { useQuery } from "convex/react";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import { api } from "../../../convex/_generated/api";

export type PaintFlags = { owned: boolean; wishlisted: boolean };

const NO_FLAGS: PaintFlags = { owned: false, wishlisted: false };

const CollectionContext = createContext<ReadonlyMap<string, PaintFlags>>(new Map());

/** Subscribes to the signed-in user's collection once for the whole app; empty when signed out. */
export function CollectionProvider({ children }: { children: ReactNode }) {
  const rows = useQuery(api.userPaints.listMine);
  const flags = useMemo(
    () =>
      new Map(
        (rows ?? []).map(({ paintId, owned, wishlisted }) => [paintId, { owned, wishlisted }]),
      ),
    [rows],
  );
  return <CollectionContext.Provider value={flags}>{children}</CollectionContext.Provider>;
}

export function usePaintFlags(paintId: string): PaintFlags {
  return useContext(CollectionContext).get(paintId) ?? NO_FLAGS;
}
