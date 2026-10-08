type AuthEnv = { clerkPublishableKey: string; convexUrl: string };

/** Reads the public auth settings; a missing one fails at startup, naming it (docs/ENVIRONMENT.md). */
export function readAuthEnv(env: Partial<Record<string, string | boolean>>): AuthEnv {
  const clerkPublishableKey = env.VITE_CLERK_PUBLISHABLE_KEY;
  const convexUrl = env.VITE_CONVEX_URL;
  if (typeof clerkPublishableKey !== "string" || clerkPublishableKey === "") {
    throw new Error(
      "VITE_CLERK_PUBLISHABLE_KEY is not set; see .env.example and docs/ENVIRONMENT.md",
    );
  }
  if (typeof convexUrl !== "string" || convexUrl === "") {
    throw new Error("VITE_CONVEX_URL is not set; run `npx convex dev` or see docs/ENVIRONMENT.md");
  }
  return { clerkPublishableKey, convexUrl };
}
