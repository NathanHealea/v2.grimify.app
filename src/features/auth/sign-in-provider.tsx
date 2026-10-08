import { useUser } from "@clerk/react";
import { useQuery } from "convex/react";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";

import { type FlagChange, useSetPaintFlags } from "@/features/collection/use-set-paint-flags";

import { api } from "../../../convex/_generated/api";
import { SignInSheet } from "./sign-in-sheet";

/** A toggle tapped while signed out, finished after sign-in (UX_FLOWS Flow 4 step 4, DECISIONS 030). */
export type PendingAction = { paintId: string; change: FlagChange };

const SignInContext = createContext<(pending?: PendingAction) => void>(() => {
  throw new Error("useSignIn must be used inside SignInProvider");
});

export function SignInProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useUser();
  const me = useQuery(api.users.me);
  const setFlags = useSetPaintFlags();
  const [open, setOpen] = useState(false);
  const [returnTo, setReturnTo] = useState("/");
  // A ref, not state: it's never rendered, only consumed once the user row exists.
  const pending = useRef<PendingAction | null>(null);

  // Signing in finishes inside Clerk's form; close the sheet as soon as Clerk reports it.
  if (open && isSignedIn) setOpen(false);

  useEffect(() => {
    // Wait for users.store (users.me non-null) so userPaints.set can't race it.
    if (!me || !pending.current) return;
    const { paintId, change } = pending.current;
    pending.current = null;
    setFlags(paintId, change);
  }, [me, setFlags]);

  const openSignIn = (action?: PendingAction) => {
    pending.current = action ?? null;
    setReturnTo(`${window.location.pathname}${window.location.search}`);
    setOpen(true);
  };

  return (
    <SignInContext.Provider value={openSignIn}>
      {children}
      <SignInSheet
        open={open}
        returnTo={returnTo}
        onOpenChange={(next) => {
          if (!next && !isSignedIn) pending.current = null;
          setOpen(next);
        }}
      />
    </SignInContext.Provider>
  );
}

/** Opens the app-wide sign-in sheet, optionally finishing a toggle afterwards. */
export function useSignIn() {
  return useContext(SignInContext);
}
