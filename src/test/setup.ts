import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { resetCatalogCache } from "@/features/catalog/load-catalog";

import { FakeIntersectionObserver } from "./intersection-observer";

// Clerk talks to its servers; tests use a signed-out, loaded user unless a test overrides these mocks.
vi.mock("@clerk/react", () => ({
  useUser: vi.fn(() => ({ isLoaded: true, isSignedIn: false, user: null })),
  useClerk: vi.fn(() => ({ signOut: vi.fn(() => Promise.resolve()) })),
  SignIn: () => "Clerk sign-in form",
}));

// No Convex backend in unit tests: signed out, empty collection, mutations that resolve. Tests that
// need other behavior mock convex/react themselves.
vi.mock("convex/react", () => {
  const mutation = Object.assign(
    vi.fn(() => Promise.resolve(null)),
    { withOptimisticUpdate: () => mutation },
  );
  return {
    useQuery: vi.fn(() => undefined),
    useMutation: vi.fn(() => mutation),
    useConvexAuth: vi.fn(() => ({ isLoading: false, isAuthenticated: false, isRefreshing: false })),
  };
});

// Testing Library only auto-cleans when Vitest globals are enabled; they are not.
afterEach(() => {
  cleanup();
  resetCatalogCache();
  vi.unstubAllGlobals();
  stubBrowserGlobals();
});

// jsdom does not implement scrollTo; TanStack Router's scroll restoration calls it on navigation.
// Lint tests run in the node environment, where window does not exist.
if (typeof window !== "undefined") {
  window.scrollTo = () => {};
}

// Screens that need the catalog stub fetch themselves; anywhere else it stays loading, never hitting the network.
function stubBrowserGlobals() {
  if (typeof window === "undefined") return;
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal("fetch", () => new Promise(() => {}));
}

stubBrowserGlobals();
