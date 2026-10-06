// @vitest-environment node
import { RuleTester } from "eslint";
import { afterAll, describe, it } from "vitest";

import rule from "./style-prop-custom-properties-only.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.afterAll = afterAll;

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

describe("style-prop-custom-properties-only", () => {
  describe("allows style objects with only custom properties", () => {
    ruleTester.run("style-prop-custom-properties-only", rule, {
      valid: [
        `<div style={{ "--swatch-color": hex }} />`,
        `<div style={{ "--a": x, "--b": y }} />`,
        `<div className="paint-swatch" />`,
        `<PaintSwatch style={{ "--swatch-color": paint.hex }} />`,
      ],
      invalid: [],
    });
  });

  describe("rejects style objects with regular CSS properties", () => {
    ruleTester.run("style-prop-custom-properties-only", rule, {
      valid: [],
      invalid: [
        { code: `<div style={{ color: "red" }} />`, errors: [{ messageId: "notCustomProperty" }] },
        {
          code: `<div style={{ "--a": x, color: y }} />`,
          errors: [{ messageId: "notCustomProperty" }],
        },
        {
          code: `<div style={{ "background-color": "red" }} />`,
          errors: [{ messageId: "notCustomProperty" }],
        },
      ],
    });
  });

  describe("rejects non-literal style values", () => {
    ruleTester.run("style-prop-custom-properties-only", rule, {
      valid: [],
      invalid: [
        { code: `<div style={obj} />`, errors: [{ messageId: "notObjectLiteral" }] },
        { code: `<div style="color: red" />`, errors: [{ messageId: "notObjectLiteral" }] },
        { code: `<div style={{ ...obj }} />`, errors: [{ messageId: "notCustomProperty" }] },
        { code: `<div style={{ [key]: x }} />`, errors: [{ messageId: "notCustomProperty" }] },
      ],
    });
  });
});
