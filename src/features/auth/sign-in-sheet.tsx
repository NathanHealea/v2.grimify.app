import "./clerk-theme.css";

import { SignIn } from "@clerk/react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Clerk's own sign-in, email code only, in a bottom sheet so people never leave the app (UX_FLOWS Flow 4). */
export function SignInSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Sign in</Button>
      </SheetTrigger>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Sign in</SheetTitle>
        </SheetHeader>
        <SheetBody className="clerk-theme">
          {/* withSignUp: a new email signs up in the same email-code flow. Signing in unmounts this sheet. */}
          <SignIn
            routing="hash"
            withSignUp
            forceRedirectUrl="/settings"
            signUpForceRedirectUrl="/settings"
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
