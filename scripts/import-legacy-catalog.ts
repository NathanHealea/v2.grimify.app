import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import { BRANDS, convertBrand } from "./catalog/import-legacy.ts";

// One-time import of the earlier Grimify dataset (DECISIONS 015, 018). Kept as a record of the conversion.
const legacyDir = process.argv[2];
if (!legacyDir) {
  console.error("usage: node scripts/import-legacy-catalog.ts <grimify>/scripts/data");
  process.exit(2);
}

const legacyFileSchema = z.array(
  z.object({ id: z.string(), name: z.string(), hex: z.string(), type: z.string() }),
);
const catalogDir = new URL("../data/catalog/", import.meta.url);

for (const brandId of Object.keys(BRANDS)) {
  const sourcePath = resolve(legacyDir, "paints", `${brandId}.json`);
  const legacy = legacyFileSchema.parse(JSON.parse(await readFile(sourcePath, "utf8")));
  const file = convertBrand(brandId, legacy);

  // "wx" fails if the file exists, so a re-run can't overwrite hand edits.
  await writeFile(new URL(`${brandId}.json`, catalogDir), `${JSON.stringify(file, null, 2)}\n`, {
    flag: "wx",
  });

  const excluded = legacy.filter((paint) => BRANDS[brandId].lines[paint.type] === "exclude").length;
  const merged = legacy.length - excluded - file.paints.length;
  console.log(
    `${brandId}: read ${legacy.length}, excluded ${excluded}, merged ${merged} → ${file.lines.length} lines, ${file.paints.length} paints`,
  );
}
