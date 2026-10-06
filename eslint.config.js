import js from "@eslint/js";
import pluginRouter from "@tanstack/eslint-plugin-router";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

import styleProp from "./lint/style-prop-custom-properties-only.js";

const BANNED_IMPORTS = [
  { name: "react-router", message: "Use @tanstack/react-router (DECISIONS 006)." },
  { name: "react-router-dom", message: "Use @tanstack/react-router (DECISIONS 006)." },
  { name: "tailwindcss", message: "Styling uses plain CSS files (DECISIONS 012)." },
  {
    name: "class-variance-authority",
    message: "Use data-* attributes for variants (DECISIONS 012).",
  },
  { name: "clsx", message: "Build className strings directly (DECISIONS 012)." },
  { name: "tailwind-merge", message: "Styling uses plain CSS files (DECISIONS 012)." },
  { name: "styled-components", message: "No CSS-in-JS (DECISIONS 012)." },
];

export default defineConfig([
  globalIgnores(["dist", "coverage", "src/routeTree.gen.ts"]),
  {
    files: ["**/*.{js,ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      pluginRouter.configs["flat/recommended"],
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.browser,
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
      local: { rules: { "style-prop-custom-properties-only": styleProp } },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-restricted-imports": [
        "error",
        {
          paths: BANNED_IMPORTS,
          patterns: [
            { group: ["@emotion/*"], message: "No CSS-in-JS (DECISIONS 012)." },
            {
              group: ["next", "next/*"],
              message: "This is a Vite SPA, not Next.js (DECISIONS 001).",
            },
          ],
        },
      ],
      // TanStack Router's documented control flow is `throw redirect(...)`, which returns a Response.
      "@typescript-eslint/only-throw-error": [
        "error",
        { allow: [{ from: "lib", name: "Response" }] },
      ],
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "local/style-prop-custom-properties-only": "error",
    },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
]);
