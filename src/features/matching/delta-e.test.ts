import { describe, expect, it } from "vitest";

import { deltaE, hexToLab, matchLabel } from "./delta-e";

describe("deltaE", () => {
  it("computes CIEDE2000 and labels the distance", () => {
    expect(deltaE([50, 10, 10], [50, 10, 10])).toBe(0);
    // Pair 1 of Sharma, Wu and Dalal's CIEDE2000 test data: ΔE00 = 2.0425.
    expect(deltaE([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 4);
    expect(hexToLab("#FFFFFF")[0]).toBeCloseTo(100, 2);

    expect(matchLabel(0)).toBe("Very close");
    expect(matchLabel(1.99)).toBe("Very close");
    expect(matchLabel(2)).toBe("Close");
    expect(matchLabel(4.99)).toBe("Close");
    expect(matchLabel(5)).toBe("Similar");
    expect(matchLabel(9.99)).toBe("Similar");
    expect(matchLabel(10)).toBeUndefined();
  });
});
