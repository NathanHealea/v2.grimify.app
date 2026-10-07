import { describe, expect, it } from "vitest";

import {
  classifyHue,
  classifyValue,
  HUE_SEGMENTS,
  hueFromOklch,
  valueFromLightness,
} from "./classify-hue";

describe("classifyHue", () => {
  it.each([
    ["#FF0000", "red"],
    ["#FF8000", "orange"],
    ["#FFFF00", "yellow"],
    ["#00A651", "green"],
    ["#00FFFF", "blue-green"],
    ["#0000FF", "blue"],
    ["#FF00FF", "red-violet"],
    ["#9B130B", "red"], // Mephiston Red
    ["#EB641E", "red-orange"], // Troll Slayer Orange
    ["#FBBA00", "yellow-orange"], // Averland Sunset
    ["#FFD900", "yellow"], // Yriel Yellow
    ["#737A51", "yellow-green"], // Death Guard Green
    ["#003B1E", "green"], // Caliban Green
    ["#0E6875", "blue-green"], // Sotek Green
    ["#193A79", "blue"], // Macragge Blue
    ["#443655", "violet"], // Naggaroth Night
  ])("classifies reference colors into their families: %s → %s", (hex, family) => {
    expect(classifyHue(hex)).toBe(family);
  });

  it("treats low-chroma colors as neutral", () => {
    expect(classifyHue("#000000")).toBe("neutral");
    expect(classifyHue("#FFFFFF")).toBe("neutral");
    expect(classifyHue("#454F50")).toBe("neutral"); // Mechanicus Standard Grey, C 0.013
    expect(classifyHue("#4E3433")).toBe("red"); // Rhinox Hide, C 0.038: a brown, not a grey
    expect(hueFromOklch({ c: 0.0299, h: 30 })).toBe("neutral");
    expect(hueFromOklch({ c: 0.03, h: 30 })).toBe("red");
  });

  it("wraps red-violet back to red", () => {
    expect(classifyHue("#821A41")).toBe("red-violet"); // Screamer Pink, h ≈ 4°
    expect(hueFromOklch({ c: 0.1, h: 0 })).toBe("red-violet");
    expect(hueFromOklch({ c: 0.1, h: 359.9 })).toBe("red-violet");
    expect(hueFromOklch({ c: 0.1, h: 7.5 })).toBe("red");
  });

  it("uses start-inclusive segment boundaries", () => {
    HUE_SEGMENTS.forEach(([start, family], i) => {
      const previous = HUE_SEGMENTS[(i + HUE_SEGMENTS.length - 1) % HUE_SEGMENTS.length][1];
      expect(hueFromOklch({ c: 0.1, h: start })).toBe(family);
      expect(hueFromOklch({ c: 0.1, h: start - 0.01 })).toBe(previous);
    });
  });
});

describe("classifyValue", () => {
  it("assigns value bands at the lightness cut points", () => {
    expect(valueFromLightness(0.399)).toBe("dark");
    expect(valueFromLightness(0.4)).toBe("mid");
    expect(valueFromLightness(0.749)).toBe("mid");
    expect(valueFromLightness(0.75)).toBe("light");
    expect(classifyValue("#000000")).toBe("dark");
    expect(classifyValue("#FFFFFF")).toBe("light");
  });
});
