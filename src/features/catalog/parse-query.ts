import type { Brand, HueFamily } from "./schema";
import { HUE_FAMILIES } from "./schema";

export type QueryToken = {
  kind: "hex" | "brand" | "hue";
  /** Normalized value: `#RRGGBB`, a brand id or a hue family. */
  value: string;
  label: string;
  /** Span in the original query, so a chip can remove exactly its text. */
  start: number;
  end: number;
};

export type ParsedQuery = {
  hex?: string;
  brandIds: string[];
  hues: HueFamily[];
  text: string;
  tokens: QueryToken[];
};

// `#` forms accept 3 or 6 digits; a bare 6-character form needs a digit, so words like "facade" stay text.
const HEX = /(?<=^|\s)(#[0-9a-f]{6}|#[0-9a-f]{3}|(?=[0-9a-f]*\d)[0-9a-f]{6})(?=\s|$)/i;

/** The one search parser (AGENTS §3): splits a query into hex, brands, hues and free text. */
export function parseQuery(query: string, brands: readonly Brand[]): ParsedQuery {
  let masked = query.toLowerCase();
  const tokens: QueryToken[] = [];

  const consume = (start: number, end: number, token: Omit<QueryToken, "start" | "end">) => {
    tokens.push({ ...token, start, end });
    masked = masked.slice(0, start) + " ".repeat(end - start) + masked.slice(end);
  };

  const hexMatch = HEX.exec(masked);
  if (hexMatch) {
    const hex = normalizeHex(hexMatch[1]);
    consume(hexMatch.index, hexMatch.index + hexMatch[1].length, {
      kind: "hex",
      value: hex,
      label: `Hex: ${hex}`,
    });
  }

  for (const [phrase, brand] of brandPhrases(brands)) {
    if (tokens.some((t) => t.kind === "brand" && t.value === brand.id)) continue;
    const span = findPhrase(masked, phrase);
    if (span)
      consume(span[0], span[1], { kind: "brand", value: brand.id, label: `Brand: ${brand.name}` });
  }

  // Text left after hex and brands. Hue words only filter when nothing else is typed, because most
  // paint names contain a color word and classification can disagree with the name.
  const withoutHues = masked;
  const hueTokens: QueryToken[] = [];
  for (const [phrase, hue] of HUE_PHRASES) {
    const span = findPhrase(masked, phrase);
    if (!span) continue;
    const token = { kind: "hue" as const, value: hue, label: `Hue: ${hueLabel(hue)}` };
    hueTokens.push({ ...token, start: span[0], end: span[1] });
    masked = masked.slice(0, span[0]) + " ".repeat(span[1] - span[0]) + masked.slice(span[1]);
  }

  const leftover = collapse(masked);
  const hueFilters = leftover === "" ? hueTokens : [];
  const allTokens = [...tokens, ...hueFilters].sort((a, b) => a.start - b.start);

  return {
    hex: allTokens.find((t) => t.kind === "hex")?.value,
    brandIds: allTokens.filter((t) => t.kind === "brand").map((t) => t.value),
    hues: hueFilters.map((t) => t.value as HueFamily),
    text: leftover === "" ? "" : collapse(withoutHues),
    tokens: allTokens,
  };
}

export function removeToken(query: string, token: QueryToken): string {
  return collapse(query.slice(0, token.start) + " " + query.slice(token.end));
}

export function hueLabel(hue: HueFamily): string {
  return hue.replace(
    /(^|-)([a-z])/g,
    (_, sep: string, letter: string) => sep + letter.toUpperCase(),
  );
}

/** Brand and hue names that the last word of the query starts (two letters or more). */
export function suggest(
  query: string,
  brands: readonly Brand[],
): { label: string; completion: string }[] {
  const lastWord = /(\S+)$/.exec(query.toLowerCase())?.[1] ?? "";
  if (lastWord.length < 2 || lastWord.startsWith("#")) return [];
  const prefix = query.slice(0, query.length - lastWord.length);
  const options = [
    ...HUE_FAMILIES.map((hue) => ({ label: hueLabel(hue), name: hue })),
    ...brands.map((brand) => ({ label: brand.name, name: brand.name.toLowerCase() })),
  ];
  return options
    .map(({ label, name }) => ({ label, name: name.replace(/^the /, "") }))
    .filter(({ name }) => name.startsWith(lastWord) && name !== lastWord)
    .map(({ label, name }) => ({ label, completion: `${prefix}${name} ` }));
}

function normalizeHex(raw: string): string {
  const digits = raw.replace("#", "").toUpperCase();
  const full = digits.length === 3 ? [...digits].map((d) => d + d).join("") : digits;
  return `#${full}`;
}

function brandPhrases(brands: readonly Brand[]): [string, Brand][] {
  return brands
    .flatMap((brand): [string, Brand][] => {
      const name = brand.name.toLowerCase();
      const phrases = new Set([name, name.replace(/^the /, ""), brand.id.replaceAll("-", " ")]);
      return [...phrases].map((phrase) => [phrase, brand]);
    })
    .sort(([a], [b]) => b.length - a.length);
}

const HUE_PHRASES: [string, HueFamily][] = HUE_FAMILIES.flatMap((hue): [string, HueFamily][] =>
  hue.includes("-")
    ? [
        [hue, hue],
        [hue.replace("-", " "), hue],
      ]
    : [[hue, hue]],
).sort(([a], [b]) => b.length - a.length);

function findPhrase(text: string, phrase: string): [number, number] | undefined {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?<=^|\\s)${escaped}(?=\\s|$)`).exec(text);
  return match ? [match.index, match.index + phrase.length] : undefined;
}

function collapse(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}
