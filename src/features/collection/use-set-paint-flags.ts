import type { OptimisticLocalStore } from "convex/browser";
import { useConvexAuth, useMutation } from "convex/react";
import { useCallback } from "react";

import { useToast } from "@/features/feedback/toast-provider";

import { api } from "../../../convex/_generated/api";

export type FlagChange = { owned?: boolean; wishlisted?: boolean; favorite?: boolean };

type SetArgs = FlagChange & { paintId: string; clientUpdatedAt: number };

export const SAVE_FAILED_MESSAGE = "Couldn't save. Check your connection.";

/** Mirrors userPaints.set on the cached listMine so toggles change instantly; Convex rolls it back if the call fails. */
export function applyOptimisticFlags(store: OptimisticLocalStore, args: SetArgs) {
  const current = store.getQuery(api.userPaints.listMine, {});
  if (current === undefined) return;
  const previous = current.find((row) => row.paintId === args.paintId);
  const owned = args.owned ?? previous?.owned ?? false;
  const wishlisted = args.wishlisted ?? previous?.wishlisted ?? false;
  const favorite = args.favorite ?? previous?.favorite ?? false;
  const others = current.filter((row) => row.paintId !== args.paintId);
  store.setQuery(
    api.userPaints.listMine,
    {},
    owned || wishlisted || favorite
      ? [
          ...others,
          { paintId: args.paintId, owned, wishlisted, favorite, updatedAt: args.clientUpdatedAt },
        ]
      : others,
  );
}

/**
 * The only way the app writes to a collection (AGENTS §3); the offline outbox will extend it.
 * Callers must handle signed-out users first (e.g. open sign-in); calling it signed out is a bug.
 */
export function useSetPaintFlags() {
  const { isAuthenticated } = useConvexAuth();
  const toast = useToast();
  const set = useMutation(api.userPaints.set).withOptimisticUpdate(applyOptimisticFlags);

  return useCallback(
    (paintId: string, change: FlagChange) => {
      if (!isAuthenticated) throw new Error("useSetPaintFlags called while signed out");
      set({ paintId, ...change, clientUpdatedAt: Date.now() }).catch((error: unknown) => {
        console.error("Saving paint flags failed", error);
        toast(SAVE_FAILED_MESSAGE);
      });
    },
    [isAuthenticated, set, toast],
  );
}

/** Whether writes can be sent now; when false, toggles open sign-in instead. */
export function useCanSavePaints() {
  return useConvexAuth().isAuthenticated;
}
