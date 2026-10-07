// @vitest-environment node
import { describe, expect, it } from "vitest";

import { brandFile, paint, source } from "./fixtures.ts";
import { validateCatalog } from "./validate.ts";

function messages(result: ReturnType<typeof validateCatalog>) {
  return result.errors.map((e) => `${e.file} ${e.path}: ${e.message}`);
}

describe("validateCatalog", () => {
  it("accepts a valid brand file", () => {
    const file = brandFile("citadel", [
      paint("citadel-base-mephiston-red"),
      paint("citadel-layer-evil-sunz-scarlet", { lineId: "citadel-layer" }),
      paint("citadel-base-leadbelcher", {
        sku: "21-13",
        finish: "metallic",
        type: "metallic",
        discontinued: true,
        aliases: ["Boltgun Metal"],
        curatedEquivalents: ["citadel-base-mephiston-red"],
        hueOverride: "neutral",
      }),
    ]);
    const ids = file.paints.map((p) => p.id);

    const result = validateCatalog([source("citadel.json", file)], ids);

    expect(result.errors).toEqual([]);
    expect(result.files).toEqual([file]);
  });

  it("accepts acrylic as a paint type", () => {
    const file = brandFile("vallejo", [paint("vallejo-base-white", { type: "acrylic" })]);

    const result = validateCatalog([source("vallejo.json", file)], ["vallejo-base-white"]);

    expect(result.errors).toEqual([]);
  });

  it("rejects unknown keys and malformed JSON", () => {
    const file = brandFile("citadel", [paint("citadel-base-a", { discontinue: true })]);

    const result = validateCatalog(
      [source("citadel.json", file), { fileName: "vallejo.json", text: "{ nope" }],
      ["citadel-base-a"],
    );

    expect(messages(result)).toEqual([
      expect.stringMatching(/^citadel\.json paints\[0\]: .*discontinue/),
      expect.stringMatching(/^vallejo\.json : is not valid JSON/),
    ]);
  });

  it("rejects a file whose name differs from the brand id", () => {
    const result = validateCatalog([source("vallejo.json", brandFile("citadel", []))], []);

    expect(messages(result)).toEqual([
      'vallejo.json brand.id: "citadel" must match the file name (citadel.json)',
    ]);
  });

  it("rejects malformed IDs and missing brand prefixes", () => {
    const lineId = "citadel-base";
    const file = brandFile("citadel", [
      paint("Citadel_Red", { lineId }),
      paint("ab", { lineId }),
      paint(`citadel-${"a".repeat(93)}`, { lineId }),
      paint("vallejo-x", { lineId }),
    ]);

    const result = validateCatalog([source("citadel.json", file)], ["vallejo-x"]);

    expect(messages(result)).toEqual([
      expect.stringMatching(/^citadel\.json paints\[0\]\.id: must be lowercase kebab-case/),
      expect.stringMatching(/^citadel\.json paints\[1\]\.id: .*>=3/),
      expect.stringMatching(/^citadel\.json paints\[2\]\.id: .*<=100/),
      'citadel.json paints[3].id: must start with "citadel-"',
    ]);
  });

  it("rejects duplicate IDs across files", () => {
    const citadel = brandFile("citadel", [paint("citadel-base-a")]);
    const copy = { ...brandFile("vallejo", []), paints: [paint("citadel-base-a")] };

    const result = validateCatalog(
      [source("citadel.json", citadel), source("vallejo.json", copy)],
      ["citadel-base-a"],
    );

    expect(messages(result)).toContain(
      'vallejo.json paints[0].id: duplicate paint id "citadel-base-a" (also in citadel.json)',
    );
  });

  it("rejects a paint whose line does not exist", () => {
    const file = brandFile("citadel", [paint("citadel-base-a", { lineId: "citadel-nope" })]);

    const result = validateCatalog([source("citadel.json", file)], ["citadel-base-a"]);

    expect(messages(result)).toEqual([
      'citadel.json paints[0].lineId: line "citadel-nope" is not defined in this file',
    ]);
  });

  it("rejects invalid hex, type, finish and hue override", () => {
    const file = brandFile("citadel", [
      paint("citadel-base-a", { hex: "#9a1115" }),
      paint("citadel-base-b", { hex: "#FFF" }),
      paint("citadel-base-c", { hex: "9A1115" }),
      paint("citadel-base-d", { type: "glaze" }),
      paint("citadel-base-e", { finish: "matt" }),
      paint("citadel-base-f", { hueOverride: "pink" }),
      paint("citadel-base-g", { name: "  " }),
    ]);
    const ids = file.paints.map((p) => p.id);

    const result = validateCatalog([source("citadel.json", file)], ids);

    expect(result.errors.map((e) => e.path)).toEqual([
      "paints[0].hex",
      "paints[1].hex",
      "paints[2].hex",
      "paints[3].type",
      "paints[4].finish",
      "paints[5].hueOverride",
      "paints[6].name",
    ]);
  });

  it("rejects unresolved and self-referencing curated equivalents", () => {
    const citadel = brandFile("citadel", [
      paint("citadel-base-a", {
        curatedEquivalents: ["citadel-base-missing", "citadel-base-a", "vallejo-base-b"],
      }),
    ]);
    const vallejo = brandFile("vallejo", [paint("vallejo-base-b")]);

    const result = validateCatalog(
      [source("citadel.json", citadel), source("vallejo.json", vallejo)],
      ["citadel-base-a", "vallejo-base-b"],
    );

    expect(messages(result)).toEqual([
      'citadel.json paints[0].curatedEquivalents[0]: paint "citadel-base-missing" does not exist',
      "citadel.json paints[0].curatedEquivalents[1]: a paint can't be its own equivalent",
    ]);
  });

  it("fails when a published ID is removed", () => {
    const file = brandFile("citadel", [paint("citadel-base-a")]);

    const result = validateCatalog(
      [source("citadel.json", file)],
      ["citadel-base-a", "citadel-base-gone"],
    );

    expect(messages(result)).toEqual([
      expect.stringMatching(
        /^published-ids\.json : published paint "citadel-base-gone" was removed/,
      ),
    ]);
  });

  it("does not report a paint that fails the schema as removed", () => {
    const file = brandFile("citadel", [paint("citadel-base-a", { hex: "red" })]);

    const result = validateCatalog([source("citadel.json", file)], ["citadel-base-a"]);

    expect(result.errors.map((e) => e.path)).toEqual(["paints[0].hex"]);
  });

  it("fails when a paint ID is not yet recorded", () => {
    const file = brandFile("citadel", [paint("citadel-base-a")]);

    const result = validateCatalog([source("citadel.json", file)], []);

    expect(messages(result)).toEqual([
      'citadel.json paints[0].id: "citadel-base-a" is not recorded in published-ids.json; run npm run catalog:ids',
    ]);
  });

  it("reports every error, not only the first", () => {
    const file = brandFile("citadel", [
      paint("citadel-base-a", { hex: "#fff" }),
      paint("citadel-base-b", { lineId: "citadel-nope" }),
      paint("citadel-base-c"),
    ]);

    const result = validateCatalog(
      [source("citadel.json", file)],
      ["citadel-base-a", "citadel-base-b"],
    );

    expect(result.errors.map((e) => e.path)).toEqual([
      "paints[0].hex",
      "paints[1].lineId",
      "paints[2].id",
    ]);
  });
});
