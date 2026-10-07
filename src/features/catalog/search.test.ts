import { describe, expect, it } from "vitest";

import { catalogOf, catalogPaint } from "@/test/catalog-fixture";

import { type Filters, NO_FILTERS } from "./filters";
import { parseQuery } from "./parse-query";
import { createNameIndex, searchPaints } from "./search";

const paints = [
  catalogPaint({ brandId: "citadel", name: "Mephiston Red", hex: "#9B130B" }),
  catalogPaint({ brandId: "citadel", name: "Macragge Blue", hex: "#193A79" }),
  catalogPaint({ brandId: "citadel", name: "Calgar Blue", hex: "#4272B8" }),
  catalogPaint({
    brandId: "citadel",
    name: "Bugman's Glow",
    hex: "#8C5144",
    aliases: ["Bugmans Glow"],
  }),
  catalogPaint({ brandId: "vallejo", name: "Blood Red", hex: "#A11B1F" }),
  catalogPaint({ brandId: "vallejo", name: "Dark Blue", hex: "#1D3557" }),
  catalogPaint({ brandId: "army-painter", name: "Blood Red", hex: "#9C1A1A" }),
];
const catalog = catalogOf(paints);
const index = createNameIndex(catalog.paints);

const filterCatalog = catalogOf([
  ...paints,
  catalogPaint({ brandId: "citadel", name: "Leadbelcher", hex: "#888D8F", type: "metallic" }),
  catalogPaint({ brandId: "vallejo", name: "Silver", hex: "#C0C0C0", type: "metallic" }),
  catalogPaint({
    brandId: "vallejo",
    name: "Sky Blue",
    hex: "#4B8BC8",
    type: "air",
    id: "vallejo-air-sky-blue",
    lineId: "vallejo-air",
  }),
]);
const filterIndex = createNameIndex(filterCatalog.paints);
const filtered = (q: string, filters: Partial<Filters>) =>
  searchPaints(filterCatalog, filterIndex, parseQuery(q, filterCatalog.brands), {
    ...NO_FILTERS,
    ...filters,
  });
const search = (q: string) => searchPaints(catalog, index, parseQuery(q, catalog.brands));
const names = (q: string) => search(q).map((r) => `${r.paint.name} (${r.paint.brandId})`);

describe("searchPaints", () => {
  it("finds misspelled names and aliases", () => {
    expect(names("mephston")[0]).toBe("Mephiston Red (citadel)");
    expect(search("bugmans glow")[0].paint.name).toBe("Bugman's Glow");
  });

  it("filters by brand and hue and sorts by lightness", () => {
    expect(names("vallejo blue")).toEqual(["Dark Blue (vallejo)"]);
    const blues = search("blue").map((r) => r.paint);
    expect(blues.map((p) => p.name)).toEqual(["Calgar Blue", "Macragge Blue", "Dark Blue"]);
    expect(blues.every((p, i) => i === 0 || p.lab[0] <= blues[i - 1].lab[0])).toBe(true);
  });

  it("ranks by distance for a hex query", () => {
    const results = search("#9B130B");
    expect(results[0]).toMatchObject({ distance: 0, label: "Very close" });
    expect(results[0].paint.name).toBe("Mephiston Red");
    expect(results.every((r, i) => i === 0 || r.distance! >= results[i - 1].distance!)).toBe(true);
    expect(search("vallejo #9B130B").map((r) => r.paint.brandId)).toEqual(["vallejo", "vallejo"]);
  });

  it("combines filters with OR within and AND across", () => {
    const named = (q: string, filters: Partial<Filters>) =>
      filtered(q, filters).map((r) => `${r.paint.name} (${r.paint.brandId})`);

    expect(named("", { brands: ["citadel", "vallejo"], types: ["metallic"] })).toEqual([
      "Leadbelcher (citadel)",
      "Silver (vallejo)",
    ]);
    expect(named("lead", { brands: ["citadel", "vallejo"], types: ["metallic"] })).toEqual([
      "Leadbelcher (citadel)",
    ]);
    expect(named("", { brands: ["army-painter"], types: ["metallic"] })).toEqual([]);
  });

  it("restricts lines to their own brand", () => {
    const results = filtered("", { brands: ["citadel", "vallejo"], lines: ["vallejo-air"] });

    expect(results.filter((r) => r.paint.brandId === "vallejo").map((r) => r.paint.name)).toEqual([
      "Sky Blue",
    ]);
    expect(results.filter((r) => r.paint.brandId === "citadel")).toHaveLength(5);
  });

  it("applies the hue param even with text", () => {
    const results = filtered("blue", { hues: ["blue"] });
    const text = filtered("macragge blue", { hues: ["red"] });

    expect(results.every((r) => r.paint.hue === "blue")).toBe(true);
    expect(text).toEqual([]);
  });

  it("sorts the full catalog by name, then brand", () => {
    expect(names("")).toEqual([
      "Blood Red (army-painter)",
      "Blood Red (vallejo)",
      "Bugman's Glow (citadel)",
      "Calgar Blue (citadel)",
      "Dark Blue (vallejo)",
      "Macragge Blue (citadel)",
      "Mephiston Red (citadel)",
    ]);
  });
});
