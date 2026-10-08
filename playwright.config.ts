import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "tests/e2e",
  // Creates the Clerk test user and testing token; needs CLERK_SECRET_KEY (docs/TESTING.md).
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // Mobile profiles from TESTING §2: the app is used mostly on phones.
  projects: [
    { name: "iPhone 15", use: { ...devices["iPhone 15"] } },
    { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
  ],
  // Runs the production build, including the real catalog, only for the length of the test run.
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/paints`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
