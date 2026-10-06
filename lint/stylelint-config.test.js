// @vitest-environment node
import { fileURLToPath, URL } from "node:url";

import stylelint from "stylelint";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const configFile = fileURLToPath(new URL("../stylelint.config.js", import.meta.url));

async function lintAt(file, code) {
  const { results } = await stylelint.lint({
    code,
    codeFilename: `${root}${file}`,
    configFile,
  });
  return results[0].warnings.map((warning) => warning.rule);
}

const RAW_VALUES = `.paint-row {
  color: #fff;
  background: white;
  border-color: rgb(0 0 0);
  padding: 12px;
}
`;

describe("stylelint config", () => {
  it("rejects raw colors and px outside tokens.css", async () => {
    const rules = await lintAt("src/components/paint-row.css", RAW_VALUES);

    expect(rules).toEqual(
      expect.arrayContaining([
        "color-no-hex",
        "color-named",
        "function-disallowed-list",
        "unit-disallowed-list",
      ]),
    );
  });

  it("allows raw values in tokens.css", async () => {
    const rules = await lintAt("src/styles/tokens.css", RAW_VALUES);

    expect(rules).toEqual([]);
  });

  it("allows px in media queries and BEM class names", async () => {
    const rules = await lintAt(
      "src/components/ui/card.css",
      `.ui-card__header {
  padding: var(--space-4);
}

@media (width >= 640px) {
  .ui-card__header {
    padding: var(--space-6);
  }
}
`,
    );

    expect(rules).toEqual([]);
  });
});
