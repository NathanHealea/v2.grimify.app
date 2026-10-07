import { describe, expect, it } from "vitest";

import { catalogOf } from "@/test/catalog-fixture";

import {
  countActive,
  lineOptions,
  NO_FILTERS,
  normalizeFilters,
  parseFilterParams,
  serializeFilters,
} from "./filters";

describe("filter params", () => {
  it("parses and serializes filter params", () => {
    expect(
      parseFilterParams({
        brand: "vallejo,citadel,,vallejo",
        line: " vallejo-base ",
        type: "metallic,glaze",
        hue: "blue,pink",
      }),
    ).toEqual({
      brands: ["vallejo", "citadel"],
      lines: ["vallejo-base"],
      types: ["metallic"],
      hues: ["blue"],
    });
    expect(parseFilterParams({})).toEqual(NO_FILTERS);

    expect(serializeFilters(NO_FILTERS)).toEqual({});
    expect(
      serializeFilters({ brands: ["vallejo", "citadel"], lines: [], types: ["air"], hues: [] }),
    ).toEqual({ brand: "vallejo,citadel", type: "air" });
    expect(countActive({ brands: ["a", "b"], lines: ["c"], types: [], hues: ["red"] })).toBe(4);
  });
});

describe("line options", () => {
  const catalog = catalogOf([]);

  it("lists lines for ticked brands and prunes the rest", () => {
    expect(
      lineOptions(catalog, ["vallejo"]).map(({ brand, lines }) => [
        brand.id,
        lines.map((l) => l.id),
      ]),
    ).toEqual([["vallejo", ["vallejo-base"]]]);
    expect(lineOptions(catalog, [])).toEqual([]);

    expect(
      normalizeFilters(catalog, {
        ...NO_FILTERS,
        brands: ["citadel", "nope"],
        lines: ["citadel-base", "vallejo-base", "missing-line"],
      }),
    ).toEqual({ ...NO_FILTERS, brands: ["citadel"], lines: ["citadel-base"] });
  });
});
