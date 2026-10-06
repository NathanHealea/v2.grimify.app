// @vitest-environment node
import { describe, expect, it } from "vitest";

import { recordIds } from "./ledger.ts";

describe("recordIds", () => {
  it("records new IDs without removing old ones", () => {
    const once = recordIds(["b"], ["c", "a"]);

    expect(once).toEqual(["a", "b", "c"]);
    expect(recordIds(once, ["c", "a"])).toEqual(once);
    expect(recordIds(once, [])).toEqual(once);
  });
});
