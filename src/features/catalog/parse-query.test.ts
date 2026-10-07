import { describe, expect, it } from "vitest";

import { BRANDS } from "@/test/catalog-fixture";

import { parseQuery, removeToken, suggest } from "./parse-query";

const parse = (q: string) => parseQuery(q, BRANDS);

describe("parseQuery", () => {
  it("detects hex codes in every accepted form", () => {
    expect(parse("#9A1115").hex).toBe("#9A1115");
    expect(parse("9a1115").hex).toBe("#9A1115");
    expect(parse("#abc").hex).toBe("#AABBCC");
    expect(parse("abc")).toMatchObject({ hex: undefined, text: "abc" });
    expect(parse("facade")).toMatchObject({ hex: undefined, text: "facade" });
    expect(parse("#12345").hex).toBeUndefined();
    expect(parse("#GGGGGG").hex).toBeUndefined();
    expect(parse("#9A1115").tokens).toEqual([
      { kind: "hex", value: "#9A1115", label: "Hex: #9A1115", start: 0, end: 7 },
    ]);
  });

  it("detects brands by name, short name and id, longest first", () => {
    expect(parse("Vallejo").brandIds).toEqual(["vallejo"]);
    expect(parse("army painter").brandIds).toEqual(["army-painter"]);
    expect(parse("The Army Painter").brandIds).toEqual(["army-painter"]);
    expect(parse("green stuff world")).toMatchObject({ brandIds: ["green-stuff-world"], hues: [] });
    expect(parse("citadel mephiston")).toMatchObject({ brandIds: ["citadel"], text: "mephiston" });
  });

  it("detects hue names with spaces or hyphens", () => {
    expect(parse("red-orange").hues).toEqual(["red-orange"]);
    expect(parse("red orange").hues).toEqual(["red-orange"]);
    expect(parse("Neutral").hues).toEqual(["neutral"]);
    expect(parse("red-orange").tokens[0].label).toBe("Hue: Red-Orange");
  });

  it("keeps hue words in the text when other text is present", () => {
    expect(parse("vallejo red-orange")).toMatchObject({
      brandIds: ["vallejo"],
      hues: ["red-orange"],
      text: "",
    });
    expect(parse("death guard green")).toMatchObject({ hues: [], text: "death guard green" });
    expect(parse("vallejo mephiston red")).toMatchObject({
      brandIds: ["vallejo"],
      hues: [],
      text: "mephiston red",
    });
    expect(parse("#9A1115 blue")).toMatchObject({ hex: "#9A1115", hues: ["blue"], text: "" });
    expect(parse("brown")).toMatchObject({ hues: [], text: "brown" });
  });
});

describe("removeToken", () => {
  it("removes one token from the query", () => {
    const query = "vallejo  red-orange";
    const brand = parse(query).tokens.find((t) => t.kind === "brand")!;
    expect(removeToken(query, brand)).toBe("red-orange");
  });
});

describe("suggest", () => {
  it("completes partial brand and hue names", () => {
    expect(suggest("gree", BRANDS).map((s) => s.label)).toEqual(["Green", "Green Stuff World"]);
    expect(suggest("vallejo ar", BRANDS)).toEqual([
      { label: "The Army Painter", completion: "vallejo army painter " },
    ]);
    expect(suggest("g", BRANDS)).toEqual([]);
    expect(suggest("green", BRANDS).map((s) => s.label)).toEqual(["Green Stuff World"]);
  });
});
