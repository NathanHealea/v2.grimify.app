// @vitest-environment node
import { converter } from "culori";
import { describe, expect, it } from "vitest";

import { compileCatalog } from "./compile.ts";
import { brandFile, paint } from "./fixtures.ts";

describe("compileCatalog", () => {
  it("adds brandId and D65 Lab values", () => {
    const catalog = compileCatalog([
      brandFile("citadel", [
        paint("citadel-base-white", { hex: "#FFFFFF" }),
        paint("citadel-base-black", { hex: "#000000" }),
        paint("citadel-base-red", { hex: "#9A1115" }),
      ]),
    ]);

    const lab = Object.fromEntries(catalog.paints.map((p) => [p.id, p.lab]));
    expect(lab["citadel-base-white"]).toEqual([100, 0, 0]);
    expect(lab["citadel-base-black"]).toEqual([0, 0, 0]);
    const red = converter("lab65")("#9A1115")!;
    expect(lab["citadel-base-red"]).toEqual([
      Math.round(red.l * 100) / 100,
      Math.round(red.a * 100) / 100,
      Math.round(red.b * 100) / 100,
    ]);
    expect(catalog.paints.every((p) => p.brandId === "citadel")).toBe(true);
    expect(catalog.lines.every((l) => l.brandId === "citadel")).toBe(true);
  });

  it("adds hue and value, preferring hueOverride", () => {
    const catalog = compileCatalog([
      brandFile("citadel", [
        paint("citadel-base-red", { hex: "#9B130B" }),
        paint("citadel-base-overridden", { hex: "#9B130B", hueOverride: "orange" }),
      ]),
    ]);

    const byId = Object.fromEntries(catalog.paints.map((p) => [p.id, p]));
    expect(byId["citadel-base-red"]).toMatchObject({ hue: "red", value: "mid" });
    expect(byId["citadel-base-overridden"]).toMatchObject({ hue: "orange", value: "mid" });
  });

  it("produces a stable, content-based version", () => {
    const citadel = brandFile("citadel", [paint("citadel-base-b"), paint("citadel-base-a")]);
    const vallejo = brandFile("vallejo", [paint("vallejo-base-a")]);

    const first = compileCatalog([citadel, vallejo]);
    const reordered = compileCatalog([vallejo, citadel]);
    const changed = compileCatalog([
      brandFile("citadel", [paint("citadel-base-b"), paint("citadel-base-a", { hex: "#9A1116" })]),
      vallejo,
    ]);

    expect(reordered).toEqual(first);
    expect(first.version).toMatch(/^[0-9a-f]{16}$/);
    expect(first.paints.map((p) => p.id)).toEqual([
      "citadel-base-a",
      "citadel-base-b",
      "vallejo-base-a",
    ]);
    expect(changed.version).not.toBe(first.version);
  });

  it("compiles an empty catalog", () => {
    const catalog = compileCatalog([]);

    const { version, ...content } = catalog;
    expect(version).toMatch(/^[0-9a-f]{16}$/);
    expect(content).toEqual({ brands: [], lines: [], paints: [] });
  });
});
