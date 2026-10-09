import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Plugin } from "vite";

export const CONVEX_HOST_PLACEHOLDER = "{{CONVEX_HOST}}";

const CONVEX_HOST = /^[a-z0-9-]+\.convex\.cloud$/;

export function convexHost(url: string | undefined): string {
  if (!url) throw new Error("VITE_CONVEX_URL is not set; the CSP needs the Convex host");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`VITE_CONVEX_URL is not a URL: ${url}`);
  }
  if (
    parsed.protocol !== "https:" ||
    !CONVEX_HOST.test(parsed.hostname) ||
    parsed.port !== "" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error(`VITE_CONVEX_URL must be https://<deployment>.convex.cloud, got ${url}`);
  }
  return parsed.hostname;
}

export function renderHeaders(template: string, convexUrl: string | undefined): string {
  if (!template.includes(CONVEX_HOST_PLACEHOLDER)) {
    throw new Error(`public/_headers has no ${CONVEX_HOST_PLACEHOLDER} placeholder`);
  }
  return template.replaceAll(CONVEX_HOST_PLACEHOLDER, convexHost(convexUrl));
}

// Each environment builds against its own Convex deployment, so the CSP host is filled in per build (DECISIONS 044).
export function cspHeaders(): Plugin {
  let convexUrl: string | undefined;
  let headersPath = "";
  return {
    name: "grimify:csp-headers",
    apply: "build",
    configResolved(config) {
      convexUrl = config.env.VITE_CONVEX_URL as string | undefined;
      headersPath = resolve(config.root, config.build.outDir, "_headers");
    },
    buildStart() {
      convexHost(convexUrl);
    },
    async writeBundle() {
      const template = await readFile(headersPath, "utf8");
      await writeFile(headersPath, renderHeaders(template, convexUrl));
    },
  };
}
