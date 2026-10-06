import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

import { z } from "zod";

import { compileCatalog } from "./catalog/compile.ts";
import { recordIds } from "./catalog/ledger.ts";
import {
  type CatalogError,
  LEDGER_FILE,
  type SourceFile,
  validateCatalog,
} from "./catalog/validate.ts";

const USAGE = "usage: node scripts/build-catalog.ts --validate | --build | --record-ids";

const root = new URL("../", import.meta.url);
const catalogDir = new URL("data/catalog/", root);
const ledgerUrl = new URL(LEDGER_FILE, catalogDir);
const outputUrl = new URL("public/catalog.json", root);

const mode = process.argv[2];
if (mode !== "--validate" && mode !== "--build" && mode !== "--record-ids") {
  console.error(USAGE);
  process.exit(2);
}

const sources = await readSources();
const ledger = await readLedger();

if (mode === "--record-ids") {
  const parsed = validateCatalog(sources, ledger);
  const paintIds = parsed.files.flatMap(({ paints }) => paints.map((paint) => paint.id));
  const updated = recordIds(ledger, paintIds);
  const { errors } = validateCatalog(sources, updated);
  if (errors.length > 0) fail(errors);
  await writeFile(ledgerUrl, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`Recorded ${updated.length - ledger.length} new paint IDs in ${LEDGER_FILE}.`);
} else {
  const { errors, files } = validateCatalog(sources, ledger);
  if (errors.length > 0) fail(errors);

  const catalog = compileCatalog(files);
  const counts = `${catalog.brands.length} brands, ${catalog.lines.length} lines, ${catalog.paints.length} paints`;

  if (mode === "--build") {
    const json = JSON.stringify(catalog);
    await mkdir(new URL("./", outputUrl), { recursive: true });
    await writeFile(outputUrl, json);
    const kb = (gzipSync(json).length / 1024).toFixed(1);
    console.log(`Catalog ${catalog.version}: ${counts}, ${kb} KB gzipped → public/catalog.json`);
  } else {
    console.log(`Catalog is valid: ${counts}.`);
  }
}

async function readSources(): Promise<SourceFile[]> {
  const names = (await readdir(catalogDir))
    .filter((name) => name.endsWith(".json") && name !== LEDGER_FILE)
    .sort();
  return Promise.all(
    names.map(async (fileName) => ({
      fileName,
      text: await readFile(new URL(fileName, catalogDir), "utf8"),
    })),
  );
}

async function readLedger(): Promise<string[]> {
  const text = await readFile(ledgerUrl, "utf8");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return fail([{ file: LEDGER_FILE, path: "", message: (error as Error).message }]);
  }
  const ledger = z.array(z.string()).safeParse(raw);
  if (!ledger.success) {
    return fail([{ file: LEDGER_FILE, path: "", message: "must be an array of paint IDs" }]);
  }
  return ledger.data;
}

function fail(errors: CatalogError[]): never {
  for (const { file, path, message } of errors) {
    console.error(`data/catalog/${file}${path ? ` ${path}` : ""}: ${message}`);
  }
  console.error(`\n${errors.length} catalog error${errors.length === 1 ? "" : "s"}.`);
  process.exit(1);
}
