import { describe, expect, it } from "vitest";

import { readAuthEnv } from "./env";

describe("readAuthEnv", () => {
  it("requires the Clerk and Convex variables", () => {
    expect(() => readAuthEnv({})).toThrow("VITE_CLERK_PUBLISHABLE_KEY");
    expect(() => readAuthEnv({ VITE_CLERK_PUBLISHABLE_KEY: "pk_test_x" })).toThrow(
      "VITE_CONVEX_URL",
    );
    expect(
      readAuthEnv({
        VITE_CLERK_PUBLISHABLE_KEY: "pk_test_x",
        VITE_CONVEX_URL: "https://example.convex.cloud",
      }),
    ).toEqual({ clerkPublishableKey: "pk_test_x", convexUrl: "https://example.convex.cloud" });
  });
});
