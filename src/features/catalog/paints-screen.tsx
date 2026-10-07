import "./paints-screen.css";

import { useEffect, useMemo, useRef, useState } from "react";

import { HueDots } from "@/components/hue-dots";
import { PaintRow } from "@/components/paint-row";
import { PaintSwatch } from "@/components/paint-swatch";
import { SearchChip } from "@/components/search-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { type ParsedQuery, parseQuery, removeToken, suggest } from "./parse-query";
import type { Catalog } from "./schema";
import { type NameIndex, searchPaints, type SearchResult } from "./search";
import { useCatalog } from "./use-catalog";

type Props = {
  /** The committed query from the URL. */
  query: string;
  /** Writes the query to the URL; `replace` is used while typing so back skips keystrokes. */
  onQueryChange: (query: string, options: { replace: boolean }) => void;
};

const PAGE_SIZE = 60;
const TYPING_DEBOUNCE_MS = 100;

export function PaintsScreen(props: Props) {
  const state = useCatalog();

  if (state.status === "loading") {
    return (
      <p className="paints-screen__status" role="status">
        Downloading paint catalog…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="paints-screen__status" role="alert">
        <p>Connect to the internet once to download the paint catalog.</p>
        <Button onClick={state.retry}>Retry</Button>
      </div>
    );
  }

  return <PaintsSearch {...props} catalog={state.catalog} index={state.index} />;
}

function PaintsSearch({
  query,
  onQueryChange,
  catalog,
  index,
}: Props & { catalog: Catalog; index: NameIndex }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const [sentQuery, setSentQuery] = useState(query);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // The URL changed without us (back button, link): show it in the box and start the list over.
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setLimit(PAGE_SIZE);
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
  const results: SearchResult[] = useMemo(
    () => searchPaints(catalog, index, parsed),
    [catalog, index, parsed],
  );
  const brandNames = useMemo(() => new Map(catalog.brands.map((b) => [b.id, b.name])), [catalog]);
  const lineNames = useMemo(() => new Map(catalog.lines.map((l) => [l.id, l.name])), [catalog]);
  const suggestions = suggest(draft, catalog.brands);

  return (
    <div className="paints-screen">
      <form className="paints-screen__search" role="search" onSubmit={(e) => e.preventDefault()}>
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

        {parsed.tokens.length > 0 && (
          <div className="paints-screen__chips" aria-label="Active search terms">
            {parsed.tokens.map((token) => (
              <SearchChip
                key={`${token.kind}-${token.value}`}
                label={token.label}
                variant="remove"
                onClick={() => apply(removeToken(query, token))}
              />
            ))}
          </div>
        )}
      </form>

      {query === "" && <HueDots onSelect={(hue) => apply(hue)} />}

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
          <Button variant="outline" onClick={() => apply("")}>
            Clear search
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
