import { fileURLToPath, URL } from "node:url";

import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
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
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "lint/**/*.test.js", "scripts/**/*.test.ts"],
  },
});
