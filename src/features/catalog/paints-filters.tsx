import "./paints-filters.css";

import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { HueDots } from "@/components/hue-dots";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCollection } from "@/features/collection/collection-provider";

import {
  COLLECTION_VIEW_LABELS,
  COLLECTION_VIEWS,
  countActive,
  type Filters,
  lineOptions,
  NO_FILTERS,
  normalizeFilters,
  scopeFor,
} from "./filters";
import type { ParsedQuery } from "./parse-query";
import { type Catalog, PAINT_TYPES } from "./schema";
import { type NameIndex, searchPaints } from "./search";

type Props = {
  catalog: Catalog;
  index: NameIndex;
  /** The typed query, so "Show N paints" counts what the list will actually show. */
  query: ParsedQuery;
  filters: Filters;
  onApply: (filters: Filters) => void;
  /** The screen's own scope (My Paints), so the live count matches the list. */
  baseScope?: ReadonlySet<string>;
  /** Signed in and not inside My Paints: offer Show only (DECISIONS 031). */
  showFilter: boolean;
};

/** Filters sheet: edits a draft; "Show N paints" commits it, closing any other way discards it. */
export function PaintsFilters({
  catalog,
  index,
  query,
  filters,
  onApply,
  baseScope,
  showFilter,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const collection = useCollection();

  const active = countActive(filters);
  const matching = useMemo(
    () =>
      searchPaints(catalog, index, query, draft, scopeFor(baseScope, draft.show, collection))
        .length,
    [catalog, index, query, draft, baseScope, collection],
  );
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const paint of catalog.paints) counts.set(paint.type, (counts.get(paint.type) ?? 0) + 1);
    return counts;
  }, [catalog]);

  const update = (next: Filters) => setDraft(normalizeFilters(catalog, next));

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(filters);
        setOpen(next);
      }}
    >
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="paints-filters__trigger"
          aria-label={active ? `Filters, ${active} active` : "Filters"}
        >
          <SlidersHorizontal aria-hidden="true" />
          {active ? `Filters · ${active}` : "Filters"}
        </Button>
      </SheetTrigger>

      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <SheetBody className="paints-filters">
          {showFilter && (
            <fieldset className="paints-filters__group">
              <legend className="paints-filters__legend">Show only</legend>
              <div className="paints-filters__options">
                {[
                  [undefined, "All"] as const,
                  ...COLLECTION_VIEWS.map((view) => [view, COLLECTION_VIEW_LABELS[view]] as const),
                ].map(([value, label]) => (
                  <label key={label} className="paints-filters__option">
                    <input
                      type="radio"
                      name="show"
                      checked={draft.show === value}
                      onChange={() => update({ ...draft, show: value })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <CheckboxGroup
            legend="Brand"
            options={catalog.brands.map((brand) => ({ value: brand.id, label: brand.name }))}
            selected={draft.brands}
            onChange={(brands) => update({ ...draft, brands })}
          />

          {draft.brands.length > 0 && (
            <fieldset className="paints-filters__group">
              <legend className="paints-filters__legend">Product line</legend>
              {lineOptions(catalog, draft.brands).map(({ brand, lines }) => (
                <CheckboxGroup
                  key={brand.id}
                  legend={brand.name}
                  nested
                  options={lines.map((line) => ({ value: line.id, label: line.name }))}
                  selected={draft.lines}
                  onChange={(lineIds) =>
                    update({
                      ...draft,
                      lines: [
                        ...draft.lines.filter((id) => !lines.some((line) => line.id === id)),
                        ...lineIds.filter((id) => lines.some((line) => line.id === id)),
                      ],
                    })
                  }
                />
              ))}
            </fieldset>
          )}

          <CheckboxGroup
            legend="Type"
            options={PAINT_TYPES.filter((type) => typeCounts.has(type)).map((type) => ({
              value: type,
              label: type.charAt(0).toUpperCase() + type.slice(1),
              count: typeCounts.get(type),
            }))}
            selected={draft.types}
            onChange={(types) => update({ ...draft, types: types as Filters["types"] })}
          />

          <fieldset className="paints-filters__group">
            <legend className="paints-filters__legend">Hue</legend>
            <HueDots
              label="Hue"
              layout="wrap"
              pressed={new Set(draft.hues)}
              onSelect={(hue) => update({ ...draft, hues: toggle(draft.hues, hue) })}
            />
          </fieldset>
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost" onClick={() => setDraft(NO_FILTERS)}>
            Clear all
          </Button>
          <Button
            className="paints-filters__show"
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
          >
            {matching === 1 ? "Show 1 paint" : `Show ${matching.toLocaleString("en")} paints`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type Option = { value: string; label: string; count?: number };

function CheckboxGroup({
  legend,
  options,
  selected,
  onChange,
  nested = false,
}: {
  legend: string;
  options: Option[];
  selected: readonly string[];
  onChange: (selected: string[]) => void;
  nested?: boolean;
}) {
  return (
    <fieldset className="paints-filters__group" data-nested={nested || undefined}>
      <legend className="paints-filters__legend">{legend}</legend>
      <ul className="paints-filters__options">
        {options.map(({ value, label, count }) => (
          <li key={value}>
            <label className="paints-filters__option">
              <input
                type="checkbox"
                checked={selected.includes(value)}
                onChange={() => onChange(toggle(selected, value))}
              />
              <span>{label}</span>
              {count !== undefined && <span className="paints-filters__count">{count}</span>}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
