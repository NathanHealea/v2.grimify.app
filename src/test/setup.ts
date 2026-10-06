import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when Vitest globals are enabled; they are not.
afterEach(cleanup);

// jsdom does not implement scrollTo; TanStack Router's scroll restoration calls it on navigation.
// Lint tests run in the node environment, where window does not exist.
if (typeof window !== "undefined") {
  window.scrollTo = () => {};
}
