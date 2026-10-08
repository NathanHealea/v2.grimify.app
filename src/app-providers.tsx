import type { ReactNode } from "react";

import { SignInProvider } from "@/features/auth/sign-in-provider";
import { StoreUser } from "@/features/auth/use-store-user";
import { CollectionProvider } from "@/features/collection/collection-provider";
import { ToastProvider } from "@/features/feedback/toast-provider";

/** App-wide state that needs Convex and Clerk; mounted inside their providers (main.tsx) and in route tests. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CollectionProvider>
        <SignInProvider>
          {children}
          <StoreUser />
        </SignInProvider>
      </CollectionProvider>
    </ToastProvider>
  );
}
