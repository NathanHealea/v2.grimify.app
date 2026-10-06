const RAW_VALUE_RULES = {
  "color-no-hex": true,
  "color-named": "never",
  "function-disallowed-list": [
    "rgb",
    "rgba",
    "hsl",
    "hsla",
    "hwb",
    "lab",
    "lch",
    "oklab",
    "oklch",
    "color",
  ],
  // Media queries can't read custom properties, so breakpoints stay literal (DESIGN_SYSTEM §14).
  "unit-disallowed-list": [
    ["px"],
    {
      ignoreMediaFeatureNames: {
        px: ["width", "min-width", "max-width", "height", "min-height", "max-height"],
      },
    },
  ],
};

/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard"],
  rules: {
    ...RAW_VALUE_RULES,
    "selector-class-pattern": [
      "^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?$",
      { message: (selector) => `Expected "${selector}" to be kebab-case with optional __element` },
    ],
  },
  overrides: [
    {
      files: ["src/styles/tokens.css"],
      rules: Object.fromEntries(Object.keys(RAW_VALUE_RULES).map((rule) => [rule, null])),
    },
  ],
};
