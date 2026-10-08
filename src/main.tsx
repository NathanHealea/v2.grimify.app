import "@/styles/index.css";

import { ClerkProvider, useAuth } from "@clerk/react";
import { RouterProvider } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { readAuthEnv } from "@/features/auth/env";
import { StoreUser } from "@/features/auth/use-store-user";
import { ServiceWorkerUpdates } from "@/features/pwa/service-worker-updates";
import { createAppRouter } from "@/router";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root is missing from index.html");
}

let authEnv: ReturnType<typeof readAuthEnv>;
try {
  authEnv = readAuthEnv(import.meta.env);
} catch (error) {
  // A misconfigured build should say what's missing on screen, not render a blank page.
  rootElement.textContent = (error as Error).message;
  throw error;
}

const convex = new ConvexReactClient(authEnv.convexUrl);
const router = createAppRouter();

createRoot(rootElement).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={authEnv.clerkPublishableKey}
      // Clerk's redirects go through the router, so finishing sign-in doesn't reload the page.
      routerPush={(to) => router.navigate({ href: to })}
      routerReplace={(to) => router.navigate({ href: to, replace: true })}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <RouterProvider router={router} />
        <StoreUser />
      </ConvexProviderWithClerk>
    </ClerkProvider>
    <ServiceWorkerUpdates />
  </StrictMode>,
);
