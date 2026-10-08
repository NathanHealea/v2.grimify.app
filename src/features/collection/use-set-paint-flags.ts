import { useConvexAuth } from "convex/react";

import { useCollectionWriter } from "./collection-provider";

export type FlagChange = { owned?: boolean; wishlisted?: boolean; favorite?: boolean };

/**
 * The only way the app writes to a collection (AGENTS §3): queues the change in the device outbox,
 * shows it at once and sends it when Convex is ready. Throws when no user is known on the device.
 */
export function useSetPaintFlags() {
  return useCollectionWriter();
}

/** Whether writes can be sent now; when false, toggles open sign-in instead. */
export function useCanSavePaints() {
  return useConvexAuth().isAuthenticated;
}
