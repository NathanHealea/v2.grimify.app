// @vitest-environment node
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { convexHost, cspHeaders, renderHeaders } from "./csp-headers.ts";

const template = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");

function parseCsp(value: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const part of value.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (!name) continue;
    directives.set(name.toLowerCase(), sources);
  }
  return directives;
}

function cspOf(headersText: string): Map<string, string[]> {
  const line = headersText.split(/\r?\n/).find((l) => /^\s+content-security-policy:/i.test(l));
  if (line === undefined) throw new Error("No Content-Security-Policy line");
  return parseCsp(line.slice(line.indexOf(":") + 1));
}

describe("renderHeaders", () => {
  it("writes the build's Convex host into the CSP", () => {
    const rendered = renderHeaders(template, "https://happy-otter-123.convex.cloud");
    const expected: Record<string, string[]> = {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "https://clerk.grimify.app",
        "https://challenges.cloudflare.com",
        "https://*.protect.clerk.com",
      ],
      "connect-src": [
        "'self'",
        "https://happy-otter-123.convex.cloud",
        "wss://happy-otter-123.convex.cloud",
        "https://clerk.grimify.app",
        "https://*.protect.clerk.com:*",
      ],
      "img-src": ["'self'", "data:", "https://img.clerk.com"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "worker-src": ["'self'", "blob:"],
      "frame-src": ["https://challenges.cloudflare.com", "https://*.protect.clerk.com"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "base-uri": ["'self'"],
      "object-src": ["'none'"],
      "manifest-src": ["'self'"],
    };

    const directives = cspOf(rendered);

    expect(new Set(directives.keys())).toEqual(new Set(Object.keys(expected)));
    for (const [name, sources] of Object.entries(expected)) {
      expect(new Set(directives.get(name)), name).toEqual(new Set(sources));
    }
    expect(rendered).not.toContain("{{");
    expect(rendered).not.toContain("nautical-toucan-398");
  });
});

describe("convexHost", () => {
  it("rejects a missing or non-Convex URL", () => {
    for (const url of [
      undefined,
      "http://happy-otter-123.convex.cloud",
      "https://evil.example",
      "https://a.convex.cloud.evil.example",
      "https://a.b.convex.cloud",
      "https://x.convex.cloud:8443",
      "https://x.convex.cloud/api",
      "https://xconvex.cloud",
    ]) {
      expect(() => convexHost(url), String(url)).toThrow(/VITE_CONVEX_URL/);
    }
  });
});

describe("renderHeaders without a placeholder", () => {
  it("refuses a template with a hard-coded host", () => {
    expect(() =>
      renderHeaders(
        "/*\n  Content-Security-Policy: default-src 'self'\n",
        "https://happy-otter-123.convex.cloud",
      ),
    ).toThrow(/placeholder/);
  });
});

describe("cspHeaders plugin", () => {
  async function pluginWith(convexUrl: string | undefined) {
    const root = await mkdtemp(join(tmpdir(), "csp-headers-"));
    await mkdir(join(root, "dist"));
    await writeFile(join(root, "dist", "_headers"), template);
    const plugin = cspHeaders();
    const call = (hook: unknown, ...args: unknown[]) =>
      (hook as (...a: unknown[]) => unknown).call({}, ...args);
    call(plugin.configResolved, {
      root,
      env: { VITE_CONVEX_URL: convexUrl },
      build: { outDir: "dist" },
    });
    return { root, plugin, call };
  }

  it("fails the build at start on a bad Convex URL", async () => {
    const { plugin, call } = await pluginWith("https://evil.example");

    expect(() => call(plugin.buildStart)).toThrow(/VITE_CONVEX_URL/);
  });

  it("writes the build's host into dist/_headers", async () => {
    const { root, plugin, call } = await pluginWith("https://happy-otter-123.convex.cloud");

    call(plugin.buildStart);
    await call(plugin.writeBundle);
    const written = await readFile(join(root, "dist", "_headers"), "utf8");

    expect(written).toContain("wss://happy-otter-123.convex.cloud");
    expect(written).not.toContain("{{");
  });
});
