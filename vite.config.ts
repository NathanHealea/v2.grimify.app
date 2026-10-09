import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

import { cspHeaders } from "./scripts/csp-headers.ts";

const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as {
  version: string;
};

export default defineConfig({
  // A deploy builds only from its own settings (scripts/deploy.ts); .env.local's dev values must not ship.
  envDir: process.env.GRIMIFY_DEPLOY ? false : undefined,
  // Settings › About shows it; `wi stage` bumps package.json, so the build always matches the release.
  define: { __APP_VERSION__: JSON.stringify(version) },
  // The router plugin must run before the React plugin.
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    VitePWA({
      // "prompt": a new version waits until the user taps Reload (ARCHITECTURE §9).
      registerType: "prompt",
      manifest: {
        name: "Grimify",
        short_name: "Grimify",
        description: "Search miniature paints across brands and find cross-brand equivalents.",
        lang: "en",
        start_url: "/paints",
        scope: "/",
        display: "standalone",
        background_color: "#FFFFFF",
        theme_color: "#FFFFFF",
        // Icons wait for the artwork (issue #3); until then Chrome won't offer install.
        icons: [],
      },
      workbox: {
        // json includes catalog.json, so search and equivalents work offline after one visit.
        globPatterns: ["**/*.{js,css,html,json,svg,woff2}"],
        navigateFallback: "/index.html",
      },
      devOptions: { enabled: false },
    }),
    cspHeaders(),
  ],
  // src/zod-config.ts must run before any schema is built; without this Rolldown runs the shared
  // chunk holding zod and the route schemas first (DECISIONS 042).
  build: { rolldownOptions: { output: { strictExecutionOrder: true } } },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "app",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}", "lint/**/*.test.js", "scripts/**/*.test.ts"],
        },
      },
      {
        // Convex functions run in Convex's own runtime, which convex-test emulates on edge-runtime.
        extends: true,
        test: {
          name: "convex",
          environment: "edge-runtime",
          include: ["convex/**/*.test.ts"],
          server: { deps: { inline: ["convex-test"] } },
        },
      },
    ],
  },
});
