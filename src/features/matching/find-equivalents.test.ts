import { describe, expect, it } from "vitest";

import { catalogOf, catalogPaint } from "@/test/catalog-fixture";

import { findEquivalents } from "./find-equivalents";

const red = catalogPaint({ brandId: "citadel", name: "Mephiston Red", hex: "#9B130B" });

function idsByBrand(result: ReturnType<typeof findEquivalents>) {
  return result.groups.map((g) => [g.brand.id, g.matches.map((m) => m.paint.name)]);
}

describe("findEquivalents", () => {
  it("ranks other-brand paints in the same family", () => {
    const catalog = catalogOf([
      red,
      catalogPaint({ brandId: "citadel", name: "Evil Sunz Scarlet", hex: "#9B130C" }),
      catalogPaint({ brandId: "vallejo", name: "Blood Red", hex: "#A11B1F" }),
      catalogPaint({ brandId: "vallejo", name: "Red Ink", hex: "#9B130B", type: "ink" }),
      catalogPaint({ brandId: "vallejo", name: "Gory Red", hex: "#8A1A1A" }),
    ]);

    const result = findEquivalents(red, catalog);

    expect(result.special).toBe(false);
    expect(idsByBrand(result)).toEqual([["vallejo", ["Blood Red", "Gory Red"]]]);
    const distances = result.groups[0].matches.map((m) => m.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it("groups by brand, keeps three, orders by best match", () => {
    const catalog = catalogOf([
      red,
      ...["#A11B1F", "#A01A1E", "#9F191D", "#9E181C", "#9D171B"].map((hex, i) =>
        catalogPaint({ brandId: "vallejo", name: `Red ${i}`, hex }),
      ),
      catalogPaint({ brandId: "army-painter", name: "Exact Red", hex: "#9B130B" }),
    ]);

    const result = findEquivalents(red, catalog);

    expect(result.groups.map((g) => g.brand.id)).toEqual(["army-painter", "vallejo"]);
    expect(result.groups[1].matches).toHaveLength(3);
    expect(result.groups[0].matches[0]).toMatchObject({ distance: 0, label: "Very close" });
  });

  it("marks a brand with no close match", () => {
    const catalog = catalogOf([
      red,
      catalogPaint({ brandId: "vallejo", name: "Sky Blue", hex: "#4B8BC8" }),
      catalogPaint({ brandId: "vallejo", name: "Deep Blue", hex: "#1D3557" }),
    ]);

    const [group] = findEquivalents(red, catalog).groups;

    expect(group.noCloseMatch).toBe(true);
    expect(group.matches).toHaveLength(1);
    expect(group.matches[0].label).toBeUndefined();
    expect(group.matches[0].distance).toBeGreaterThanOrEqual(10);
  });

  it("widens to all types except for special paints", () => {
    const ink = catalogPaint({ brandId: "vallejo", name: "Red Ink", hex: "#9B130B", type: "ink" });
    const technical = catalogPaint({
      brandId: "army-painter",
      name: "Speedpaint Medium",
      hex: "#F2EFE9",
      type: "technical",
    });
    const catalog = catalogOf([red, ink, technical]);

    expect(idsByBrand(findEquivalents(red, catalog, { allTypes: true }))).toEqual([
      ["vallejo", ["Red Ink"]],
    ]);
    expect(findEquivalents(technical, catalog, { allTypes: true })).toEqual({
      special: true,
      curated: [],
      groups: [],
    });
    const curated = { ...technical, curatedEquivalents: [red.id] };
    expect(findEquivalents(curated, catalogOf([red, curated])).curated).toEqual([red]);
  });
});
