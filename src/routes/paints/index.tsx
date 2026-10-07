import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import { PaintsScreen } from "@/features/catalog/paints-screen";

// The router parses `?q=123` as a number; keep it as text. Anything else invalid means no query.
const searchSchema = z.object({
  q: z
    .union([z.string(), z.number().transform(String)])
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/paints/")({
  staticData: { title: "Paints" },
  validateSearch: searchSchema,
  component: PaintsRoute,
});

function PaintsRoute() {
  const { q = "" } = Route.useSearch();
  const navigate = Route.useNavigate();

  const onQueryChange = useCallback(
    (query: string, { replace }: { replace: boolean }) => {
      void navigate({ search: query ? { q: query } : {}, replace });
    },
    [navigate],
  );

  return <PaintsScreen query={q} onQueryChange={onQueryChange} />;
}
