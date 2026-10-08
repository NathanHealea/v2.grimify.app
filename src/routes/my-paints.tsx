import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import { COLLECTION_VIEWS, type Filters, serializeFilters } from "@/features/catalog/filters";
import { MyPaintsScreen } from "@/features/collection/my-paints-screen";

const text = z
  .union([z.string(), z.number().transform(String)])
  .optional()
  .catch(undefined);

// The tab is part of the URL so each view is linkable; anything else falls back to Owned.
const searchSchema = z.object({
  tab: z.enum(COLLECTION_VIEWS).optional().catch(undefined),
  q: text,
  brand: text,
  line: text,
  type: text,
  hue: text,
});

export const Route = createFileRoute("/my-paints")({
  staticData: { title: "My Paints" },
  validateSearch: searchSchema,
  component: MyPaintsRoute,
});

function MyPaintsRoute() {
  const { tab = "owned", q = "", ...filterParams } = Route.useSearch();
  const navigate = Route.useNavigate();

  const onQueryChange = useCallback(
    (query: string, { replace }: { replace: boolean }) => {
      void navigate({ search: (prev) => ({ ...prev, q: query || undefined }), replace });
    },
    [navigate],
  );

  const onFiltersChange = useCallback(
    (filters: Filters) => {
      void navigate({
        search: (prev) => ({
          tab: prev.tab,
          q: prev.q,
          ...serializeFilters({ ...filters, show: undefined }),
        }),
      });
    },
    [navigate],
  );

  const onClearAll = useCallback(
    () => void navigate({ search: (prev) => ({ tab: prev.tab }) }),
    [navigate],
  );

  return (
    <MyPaintsScreen
      tab={tab}
      query={q}
      onQueryChange={onQueryChange}
      filterParams={filterParams}
      onFiltersChange={onFiltersChange}
      onClearAll={onClearAll}
    />
  );
}
