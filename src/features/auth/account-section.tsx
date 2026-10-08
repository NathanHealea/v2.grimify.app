import "./account-section.css";

import { useClerk, useUser } from "@clerk/react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useClearDevice, useCollection } from "@/features/collection/collection-provider";
import { useOnlineStatus } from "@/features/pwa/use-online-status";

import { useSignIn } from "./sign-in-provider";

export function AccountSection() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const online = useOnlineStatus();
  const openSignIn = useSignIn();
  const { pending } = useCollection();
  const clearDevice = useClearDevice();
  const [confirming, setConfirming] = useState(false);
  const signOutButton = useRef<HTMLButtonElement>(null);

  // The device record belongs to this user, so it goes before Clerk forgets who they were.
  const signOutNow = () => {
    setConfirming(false);
    clearDevice();
    signOut().catch((error: unknown) => console.error("Sign out failed", error));
  };

  let body;
  if (isSignedIn) {
    body = (
      <>
        <p>Signed in as {user.primaryEmailAddress?.emailAddress ?? "your account"}</p>
        <Button
          ref={signOutButton}
          variant="outline"
          onClick={() => (pending > 0 ? setConfirming(true) : signOutNow())}
        >
          Sign out
        </Button>
        <Sheet open={confirming} onOpenChange={setConfirming}>
          <SheetContent
            // Radix only refocuses a SheetTrigger; this sheet opens from state, so focus is put back by hand.
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              signOutButton.current?.focus();
            }}
          >
            <SheetHeader>
              <SheetTitle>Discard unsynced changes?</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <SheetDescription>
                {pending === 1
                  ? "1 change hasn't synced. Sign out and discard it?"
                  : `${pending} changes haven't synced. Sign out and discard them?`}
              </SheetDescription>
            </SheetBody>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline">Cancel</Button>
              </SheetClose>
              <Button variant="destructive" onClick={signOutNow}>
                Sign out
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </>
    );
  } else if (!online) {
    // Clerk's script loads from Clerk's servers, so signing in can't work offline.
    body = (
      <>
        <p>Sign in to save the paints you own and want.</p>
        <p className="account-section__note">Signing in needs an internet connection.</p>
        <Button disabled>Sign in</Button>
      </>
    );
  } else if (!isLoaded) {
    body = <p className="account-section__note">Loading your account…</p>;
  } else {
    body = (
      <>
        <p>Sign in to save the paints you own and want.</p>
        <Button onClick={() => openSignIn()}>Sign in</Button>
      </>
    );
  }

  return (
    <section className="account-section" aria-labelledby="account-heading">
      <h2 id="account-heading">Account</h2>
      {body}
    </section>
  );
}
