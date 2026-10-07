import "./paints-screen.css";

import { useEffect, useMemo, useRef, useState } from "react";

import { HueDots } from "@/components/hue-dots";
import { PaintRow } from "@/components/paint-row";
import { PaintSwatch } from "@/components/paint-swatch";
import { SearchChip } from "@/components/search-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { CatalogGate } from "./catalog-gate";
import {
  countActive,
  type FilterParams,
  type Filters,
  normalizeFilters,
  parseFilterParams,
} from "./filters";
import { PaintsFilters } from "./paints-filters";
import { hueLabel, type ParsedQuery, parseQuery, removeToken, suggest } from "./parse-query";
import type { Catalog } from "./schema";
import { type NameIndex, searchPaints, type SearchResult } from "./search";

type Props = {
  /** The committed query from the URL. */
  query: string;
  /** Writes the query to the URL; `replace` is used while typing so back skips keystrokes. */
  onQueryChange: (query: string, options: { replace: boolean }) => void;
  /** The sheet's filters as they appear in the URL. */
  filterParams: FilterParams;
  onFiltersChange: (filters: Filters) => void;
  /** Clears the query and every filter in one history entry. */
  onClearAll: () => void;
};

const PAGE_SIZE = 60;
const TYPING_DEBOUNCE_MS = 100;

export function PaintsScreen(props: Props) {
  return (
    <CatalogGate>
      {(catalog, index) => <PaintsSearch {...props} catalog={catalog} index={index} />}
    </CatalogGate>
  );
}

function PaintsSearch({
  query,
  onQueryChange,
  filterParams,
  onFiltersChange,
  onClearAll,
  catalog,
  index,
}: Props & { catalog: Catalog; index: NameIndex }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const [sentQuery, setSentQuery] = useState(query);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const listKey = `${query}|${JSON.stringify(filterParams)}`;
  const [syncedListKey, setSyncedListKey] = useState(listKey);

  if (listKey !== syncedListKey) {
    setSyncedListKey(listKey);
    setLimit(PAGE_SIZE);
  }

  // The URL changed without us (back button, link): show it in the box and start the list over.
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    if (query !== sentQuery) setDraft(query);
  }

  useEffect(() => {
    if (draft.trim() === query) return;
    const timer = setTimeout(() => {
      setSentQuery(draft.trim());
      onQueryChange(draft.trim(), { replace: true });
    }, TYPING_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, query, onQueryChange]);

  const apply = (next: string) => {
    setDraft(next);
    setSentQuery(next.trim());
    onQueryChange(next.trim(), { replace: false });
  };

  const parsed: ParsedQuery = useMemo(() => parseQuery(query, catalog.brands), [query, catalog]);
  const filters = useMemo(
    () => normalizeFilters(catalog, parseFilterParams(filterParams)),
    [catalog, filterParams],
  );
  const results: SearchResult[] = useMemo(
    () => searchPaints(catalog, index, parsed, filters),
    [catalog, index, parsed, filters],
  );
  const brandNames = useMemo(() => new Map(catalog.brands.map((b) => [b.id, b.name])), [catalog]);
  const lineNames = useMemo(() => new Map(catalog.lines.map((l) => [l.id, l.name])), [catalog]);
  const suggestions = suggest(draft, catalog.brands);
  const filterChips = [
    ...filters.brands.map((id) => ({
      key: `brand-${id}`,
      label: `Brand: ${brandNames.get(id) ?? id}`,
      next: { ...filters, brands: filters.brands.filter((b) => b !== id) },
    })),
    ...filters.lines.map((id) => ({
      key: `line-${id}`,
      label: `Line: ${lineNames.get(id) ?? id}`,
      next: { ...filters, lines: filters.lines.filter((l) => l !== id) },
    })),
    ...filters.types.map((type) => ({
      key: `type-${type}`,
      label: `Type: ${type.charAt(0).toUpperCase()}${type.slice(1)}`,
      next: { ...filters, types: filters.types.filter((t) => t !== type) },
    })),
    ...filters.hues.map((hue) => ({
      key: `hue-${hue}`,
      label: `Hue: ${hueLabel(hue)}`,
      next: { ...filters, hues: filters.hues.filter((h) => h !== hue) },
    })),
  ];

  return (
    <div className="paints-screen">
      <form className="paints-screen__search" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="paints-screen__search-row">
          <Input
            ref={inputRef}
            type="search"
            aria-label="Search paints"
            placeholder={`Search ${catalog.paints.length.toLocaleString("en")} paints…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
          />
          <PaintsFilters
            catalog={catalog}
            index={index}
            query={parsed}
            filters={filters}
            onApply={onFiltersChange}
          />
        </div>

        {suggestions.length > 0 && (
          <div className="paints-screen__chips" aria-label="Suggestions">
            {suggestions.map(({ label, completion }) => (
              <SearchChip
                key={label}
                label={label}
                variant="suggest"
                onClick={() => {
                  apply(completion);
                  inputRef.current?.focus();
                }}
              />
            ))}
          </div>
        )}

        {(parsed.tokens.length > 0 || filterChips.length > 0) && (
          <div className="paints-screen__chips" aria-label="Active search terms and filters">
            {parsed.tokens.map((token) => (
              <SearchChip
                key={`${token.kind}-${token.value}`}
                label={token.label}
                variant="remove"
                onClick={() => apply(removeToken(query, token))}
              />
            ))}
            {filterChips.map(({ key, label, next }) => (
              <SearchChip
                key={key}
                label={label}
                variant="remove"
                onClick={() => onFiltersChange(next)}
              />
            ))}
          </div>
        )}
      </form>

      {query === "" && countActive(filters) === 0 && <HueDots onSelect={(hue) => apply(hue)} />}

      {parsed.hex && (
        <div className="paints-screen__hex">
          <PaintSwatch hex={parsed.hex} size="lg" />
          <p>Paints closest to {parsed.hex}</p>
        </div>
      )}

      <p className="paints-screen__count" role="status">
        {results.length === 1 ? "1 paint" : `${results.length.toLocaleString("en")} paints`}
      </p>

      {results.length === 0 ? (
        <div className="paints-screen__empty">
          <p>No paints match</p>
          <Button
            variant="outline"
            onClick={() => {
              setDraft("");
              setSentQuery("");
              onClearAll();
            }}
          >
            Clear all
          </Button>
        </div>
      ) : (
        <>
          <ul className="paints-screen__list">
            {results.slice(0, limit).map(({ paint, label }) => (
              <PaintRow
                key={paint.id}
                paint={paint}
                brandName={brandNames.get(paint.brandId) ?? paint.brandId}
                lineName={lineNames.get(paint.lineId) ?? paint.lineId}
                match={label}
              />
            ))}
          </ul>
          {limit < results.length && <LoadMore onVisible={() => setLimit((n) => n + PAGE_SIZE)} />}
        </>
      )}
    </div>
  );
}

/** Appends the next page when it scrolls into view; avoids rendering thousands of rows at once. */
function LoadMore({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onVisible();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onVisible]);

  return <div ref={ref} className="paints-screen__sentinel" aria-hidden="true" />;
}
