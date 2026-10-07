import { describe, expect, it } from "vitest";

import { PAINT_TYPES } from "../catalog/schema";
import { TYPE_FAMILIES, typeFamily } from "./type-families";

describe("typeFamily", () => {
  it("maps paint types to families", () => {
    expect(PAINT_TYPES.every((type) => TYPE_FAMILIES[type] !== undefined)).toBe(true);
    expect(typeFamily({ type: "acrylic" })).toBe("opaque");
    expect(typeFamily({ type: "speedpaint" })).toBe("tint");
    expect(typeFamily({ type: "ink" })).toBe("wash");
    expect(typeFamily({ type: "technical" })).toBe("special");
    expect(typeFamily({ type: "base", finish: "metallic" })).toBe("metallic");
  });
});
