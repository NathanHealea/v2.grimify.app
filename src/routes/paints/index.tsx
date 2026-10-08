import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import { type Filters, serializeFilters } from "@/features/catalog/filters";
import { PaintsScreen } from "@/features/catalog/paints-screen";

// The router parses `?q=123` as a number; keep it as text. Anything else invalid means no value.
const text = z
  .union([z.string(), z.number().transform(String)])
  .optional()
  .catch(undefined);

// Filters are comma-separated lists; values are checked against the catalog once it loads.
const searchSchema = z.object({
  q: text,
  brand: text,
  line: text,
  type: text,
  hue: text,
  show: text,
});

export const Route = createFileRoute("/paints/")({
  staticData: { title: "Paints" },
  validateSearch: searchSchema,
  component: PaintsRoute,
});

function PaintsRoute() {
  const { q = "", ...filterParams } = Route.useSearch();
  const navigate = Route.useNavigate();

  const onQueryChange = useCallback(
    (query: string, { replace }: { replace: boolean }) => {
      void navigate({ search: (prev) => ({ ...prev, q: query || undefined }), replace });
    },
    [navigate],
  );

  const onFiltersChange = useCallback(
    (filters: Filters) => {
      void navigate({ search: (prev) => ({ q: prev.q, ...serializeFilters(filters) }) });
    },
    [navigate],
  );

  const onClearAll = useCallback(() => void navigate({ search: {} }), [navigate]);

  return (
    <PaintsScreen
      query={q}
      onQueryChange={onQueryChange}
      filterParams={filterParams}
      onFiltersChange={onFiltersChange}
      onClearAll={onClearAll}
    />
  );
}
