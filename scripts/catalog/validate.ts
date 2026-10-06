import { z } from "zod";

import {
  type BrandFile,
  brandSchema,
  type Line,
  lineSchema,
  type Paint,
  paintSchema,
} from "../../src/features/catalog/schema.ts";

export const LEDGER_FILE = "published-ids.json";

export type SourceFile = { fileName: string; text: string };

export type CatalogError = { file: string; path: string; message: string };

export type ValidationResult = {
  errors: CatalogError[];
  /** The parts of each file that passed the schema; only complete when `errors` is empty. */
  files: BrandFile[];
};

// Keeps the item's position in the source file, so error paths stay right when earlier items fail.
type Indexed<T> = { index: number; value: T };

type ParsedFile = {
  fileName: string;
  brand: BrandFile["brand"];
  lines: Indexed<Line>[];
  paints: Indexed<Paint>[];
};

// Each brand, line and paint is parsed on its own, so one bad paint doesn't hide the rest.
const fileShapeSchema = z.strictObject({
  brand: z.unknown(),
  lines: z.array(z.unknown()),
  paints: z.array(z.unknown()),
});

export function validateCatalog(sources: SourceFile[], ledger: string[]): ValidationResult {
  const errors: CatalogError[] = [];
  const files: ParsedFile[] = [];
  // Includes paints that failed the schema, so a bad hex isn't also reported as a removed ID.
  const seenPaintIds = new Set<string>();
  let everyFileParsed = true;

  for (const source of sources) {
    const parsed = parseFile(source, errors, seenPaintIds);
    if (parsed) files.push(parsed);
    else everyFileParsed = false;
  }

  const brandFiles = new Map<string, string>();
  const lineFiles = new Map<string, string>();
  const paintFiles = new Map<string, string>();

  for (const file of files) {
    const { fileName, brand, lines, paints } = file;
    const report = (path: string, message: string) =>
      errors.push({ file: fileName, path, message });

    if (fileName !== `${brand.id}.json`) {
      report("brand.id", `"${brand.id}" must match the file name (${brand.id}.json)`);
    }
    checkUnique(brandFiles, brand.id, fileName, "brand", "brand.id", report);

    const prefix = `${brand.id}-`;
    const lineIds = new Set<string>();
    lines.forEach(({ index: i, value: line }) => {
      if (!line.id.startsWith(prefix)) report(`lines[${i}].id`, `must start with "${prefix}"`);
      checkUnique(lineFiles, line.id, fileName, "line", `lines[${i}].id`, report);
      lineIds.add(line.id);
    });

    paints.forEach(({ index: i, value: paint }) => {
      if (!paint.id.startsWith(prefix)) report(`paints[${i}].id`, `must start with "${prefix}"`);
      checkUnique(paintFiles, paint.id, fileName, "paint", `paints[${i}].id`, report);
      if (!lineIds.has(paint.lineId)) {
        report(`paints[${i}].lineId`, `line "${paint.lineId}" is not defined in this file`);
      }
    });
  }

  const ledgerIds = new Set(ledger);
  for (const { fileName, paints } of files) {
    paints.forEach(({ index: i, value: paint }) => {
      paint.curatedEquivalents?.forEach((equivalentId, j) => {
        const path = `paints[${i}].curatedEquivalents[${j}]`;
        if (equivalentId === paint.id) {
          errors.push({ file: fileName, path, message: "a paint can't be its own equivalent" });
        } else if (!seenPaintIds.has(equivalentId)) {
          errors.push({ file: fileName, path, message: `paint "${equivalentId}" does not exist` });
        }
      });
      if (!ledgerIds.has(paint.id)) {
        errors.push({
          file: fileName,
          path: `paints[${i}].id`,
          message: `"${paint.id}" is not recorded in ${LEDGER_FILE}; run npm run catalog:ids`,
        });
      }
    });
  }

  // A file that didn't parse hides its paints; the removed-ID check waits until it does.
  for (const id of everyFileParsed ? ledger : []) {
    if (!seenPaintIds.has(id)) {
      errors.push({
        file: LEDGER_FILE,
        path: "",
        message: `published paint "${id}" was removed; paint IDs are permanent, so restore it and set discontinued: true`,
      });
    }
  }

  return {
    errors,
    files: files.map(({ brand, lines, paints }) => ({
      brand,
      lines: lines.map(({ value }) => value),
      paints: paints.map(({ value }) => value),
    })),
  };
}

function parseFile(
  { fileName, text }: SourceFile,
  errors: CatalogError[],
  seenPaintIds: Set<string>,
): ParsedFile | undefined {
  const report = (path: string, message: string) => errors.push({ file: fileName, path, message });

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    report("", `is not valid JSON: ${(error as Error).message}`);
    return undefined;
  }

  const shape = fileShapeSchema.safeParse(raw);
  if (!shape.success) {
    reportIssues(shape.error, "", report);
    return undefined;
  }

  const brand = brandSchema.safeParse(shape.data.brand);
  if (!brand.success) {
    reportIssues(brand.error, "brand", report);
    return undefined;
  }

  const lines: Indexed<Line>[] = [];
  shape.data.lines.forEach((value, i) => {
    const line = lineSchema.safeParse(value);
    if (line.success) lines.push({ index: i, value: line.data });
    else reportIssues(line.error, `lines[${i}]`, report);
  });

  const paints: Indexed<Paint>[] = [];
  shape.data.paints.forEach((value, i) => {
    const id = (value as { id?: unknown } | null)?.id;
    if (typeof id === "string") seenPaintIds.add(id);
    const paint = paintSchema.safeParse(value);
    if (paint.success) paints.push({ index: i, value: paint.data });
    else reportIssues(paint.error, `paints[${i}]`, report);
  });

  return { fileName, brand: brand.data, lines, paints };
}

function reportIssues(
  error: z.ZodError,
  base: string,
  report: (path: string, message: string) => void,
) {
  for (const issue of error.issues) {
    const path = issue.path.reduce<string>(
      (acc, key) =>
        typeof key === "number" ? `${acc}[${key}]` : acc ? `${acc}.${String(key)}` : String(key),
      base,
    );
    report(path, issue.message);
  }
}

function checkUnique(
  seen: Map<string, string>,
  id: string,
  fileName: string,
  kind: string,
  path: string,
  report: (path: string, message: string) => void,
) {
  const firstFile = seen.get(id);
  if (firstFile === undefined) {
    seen.set(id, fileName);
  } else {
    report(path, `duplicate ${kind} id "${id}" (also in ${firstFile})`);
  }
}
