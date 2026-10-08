import "./account-section.css";

import { useClerk, useUser } from "@clerk/react";

import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/features/pwa/use-online-status";

import { SignInSheet } from "./sign-in-sheet";

export function AccountSection() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const online = useOnlineStatus();

  const signOutNow = () => {
    signOut().catch((error: unknown) => console.error("Sign out failed", error));
  };

  let body;
  if (isSignedIn) {
    body = (
      <>
        <p>Signed in as {user.primaryEmailAddress?.emailAddress ?? "your account"}</p>
        <Button variant="outline" onClick={signOutNow}>
          Sign out
        </Button>
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
        <SignInSheet />
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
