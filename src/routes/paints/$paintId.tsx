import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import { PaintDetail } from "@/features/catalog/paint-detail";

export const Route = createFileRoute("/paints/$paintId")({
  staticData: { back: { to: "/paints", label: "Paints" } },
  validateSearch: z.object({ types: z.literal("all").optional().catch(undefined) }),
  component: PaintDetailRoute,
});

function PaintDetailRoute() {
  const { paintId } = Route.useParams();
  const { types } = Route.useSearch();
  const navigate = Route.useNavigate();

  // replace: the toggle refines this screen; Back should still return to the list.
  const onAllTypesChange = useCallback(
    (allTypes: boolean) =>
      void navigate({ search: { types: allTypes ? "all" : undefined }, replace: true }),
    [navigate],
  );

  return (
    <PaintDetail paintId={paintId} allTypes={types === "all"} onAllTypesChange={onAllTypesChange} />
  );
}
