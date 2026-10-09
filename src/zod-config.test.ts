import { describe, expect, it } from "vitest";
import { z } from "zod";

import viteConfigSource from "../vite.config.ts?raw";
import mainSource from "./main.tsx?raw";

const importSpecifiers = (source: string) =>
  [...source.matchAll(/^import\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["'];/gms)].map((match) => ({
    specifier: match[1],
    bare: !/\sfrom\s/.test(match[0]),
  }));

describe("zod config", () => {
  it("zod runs jitless before any schema is built", async () => {
    await import("@/zod-config");
    expect(z.config().jitless).toBe(true);

    const imports = importSpecifiers(mainSource);
    const index = imports.findIndex((entry) => entry.specifier === "@/zod-config");
    expect(index).toBeGreaterThanOrEqual(0);
    expect(
      imports.slice(0, index).every((entry) => entry.bare && entry.specifier.endsWith(".css")),
    ).toBe(true);

    const uncommented = viteConfigSource.replace(/^\s*\/\/.*$/gm, "");
    expect(uncommented).toMatch(
      /rolldownOptions:\s*\{\s*output:\s*\{\s*strictExecutionOrder:\s*true/,
    );
  });
});
