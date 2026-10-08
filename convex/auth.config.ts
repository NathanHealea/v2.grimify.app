import type { AuthConfig } from "convex/server";

// The Clerk Frontend API URL, set on each deployment (docs/ENVIRONMENT.md); "convex" is the
// audience Clerk's Convex integration issues tokens for.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
