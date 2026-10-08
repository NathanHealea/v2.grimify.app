import "./clerk-theme.css";

import { SignIn } from "@clerk/react";

import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where Clerk lands after signing in: the page the person started from. */
  returnTo: string;
};

/** Clerk's own sign-in, email code only, in a bottom sheet so people never leave the app (UX_FLOWS Flow 4). */
export function SignInSheet({ open, onOpenChange, returnTo }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Sign in</SheetTitle>
        </SheetHeader>
        <SheetBody className="clerk-theme">
          {/* withSignUp: a new email signs up in the same email-code flow. */}
          <SignIn
            routing="hash"
            withSignUp
            forceRedirectUrl={returnTo}
            signUpForceRedirectUrl={returnTo}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
