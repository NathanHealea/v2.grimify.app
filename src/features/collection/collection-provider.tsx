import { useUser } from "@clerk/react";
import { useConvexAuth, useQuery } from "convex/react";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import { api } from "../../../convex/_generated/api";

export type PaintFlags = { owned: boolean; wishlisted: boolean; favorite: boolean };

const NO_FLAGS: PaintFlags = { owned: false, wishlisted: false, favorite: false };

export type CollectionState = {
  /** True until listMine first answers (or while signed-in state settles). */
  loading: boolean;
  flags: ReadonlyMap<string, PaintFlags>;
  owned: ReadonlySet<string>;
  wishlisted: ReadonlySet<string>;
  favorites: ReadonlySet<string>;
};

const EMPTY: CollectionState = {
  loading: false,
  flags: new Map(),
  owned: new Set(),
  wishlisted: new Set(),
  favorites: new Set(),
};

const CollectionContext = createContext<CollectionState>(EMPTY);

/** Subscribes to the signed-in user's collection once for the whole app; empty when signed out. */
export function CollectionProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useUser();
  const { isAuthenticated } = useConvexAuth();
  // Skipped until Convex has the session: an unauthenticated listMine answers [] and would show a
  // signed-in user an empty collection for a moment after every load.
  const rows = useQuery(api.userPaints.listMine, isAuthenticated ? {} : "skip");
  const state = useMemo((): CollectionState => {
    const list = rows ?? [];
    return {
      // Loading while Clerk is still deciding, or while a signed-in user's collection hasn't arrived.
      loading: isSignedIn === undefined || (isSignedIn && rows === undefined),
      flags: new Map(
        list.map(({ paintId, owned, wishlisted, favorite }) => [
          paintId,
          { owned, wishlisted, favorite },
        ]),
      ),
      owned: new Set(list.filter((row) => row.owned).map((row) => row.paintId)),
      wishlisted: new Set(list.filter((row) => row.wishlisted).map((row) => row.paintId)),
      favorites: new Set(list.filter((row) => row.favorite).map((row) => row.paintId)),
    };
  }, [rows, isSignedIn]);
  return <CollectionContext.Provider value={state}>{children}</CollectionContext.Provider>;
}

export function usePaintFlags(paintId: string): PaintFlags {
  return useContext(CollectionContext).flags.get(paintId) ?? NO_FLAGS;
}

export function useCollection(): CollectionState {
  return useContext(CollectionContext);
}
