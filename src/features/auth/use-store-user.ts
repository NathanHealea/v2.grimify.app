import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "../../../convex/_generated/api";

/** Creates the Convex `users` row once per signed-in session (UX_FLOWS Flow 4); `users.store` is idempotent. */
export function useStoreUser() {
  const { isAuthenticated } = useConvexAuth();
  const store = useMutation(api.users.store);
  const stored = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      stored.current = false;
      return;
    }
    if (stored.current) return;
    stored.current = true;
    store({}).catch((error: unknown) => {
      stored.current = false;
      console.error("Couldn't store the signed-in user", error);
    });
  }, [isAuthenticated, store]);
}

/** Mount once inside the Convex provider. */
export function StoreUser() {
  useStoreUser();
  return null;
}
