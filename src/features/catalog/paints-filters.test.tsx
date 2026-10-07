import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { catalogOf, catalogPaint } from "@/test/catalog-fixture";

import { type Filters, NO_FILTERS } from "./filters";
import { PaintsFilters } from "./paints-filters";
import { parseQuery } from "./parse-query";
import { createNameIndex } from "./search";

const catalog = catalogOf([
  catalogPaint({ brandId: "citadel", name: "Mephiston Red", hex: "#9B130B" }),
  catalogPaint({ brandId: "citadel", name: "Leadbelcher", hex: "#888D8F", type: "metallic" }),
  catalogPaint({ brandId: "vallejo", name: "Silver", hex: "#C0C0C0", type: "metallic" }),
  catalogPaint({ brandId: "vallejo", name: "Dark Blue", hex: "#1D3557" }),
]);
const index = createNameIndex(catalog.paints);

function renderFilters(filters: Filters = NO_FILTERS) {
  const onApply = vi.fn();
  render(
    <PaintsFilters
      catalog={catalog}
      index={index}
      query={parseQuery("", catalog.brands)}
      filters={filters}
      onApply={onApply}
    />,
  );
  return onApply;
}

const openSheet = () => {
  fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
  return screen.getByRole("dialog", { name: "Filters" });
};

describe("PaintsFilters", () => {
  it("edits a draft and commits it with Show", () => {
    const onApply = renderFilters();
    const dialog = openSheet();

    expect(within(dialog).queryByRole("group", { name: "Product line" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Vallejo" }));
    expect(within(dialog).getByRole("group", { name: "Product line" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Show 2 paints" })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Metallic/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Show 1 paint" }));

    expect(onApply).toHaveBeenCalledWith({
      ...NO_FILTERS,
      brands: ["vallejo"],
      types: ["metallic"],
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("discards the draft on Escape and returns focus", async () => {
    const onApply = renderFilters({ ...NO_FILTERS, brands: ["citadel"] });
    const trigger = screen.getByRole("button", { name: "Filters, 1 active" });
    const dialog = openSheet();

    expect(within(dialog).getByRole("checkbox", { name: "Citadel" })).toBeChecked();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Vallejo" }));
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onApply).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(trigger).toHaveFocus());
  });

  it("clears the draft with Clear all", () => {
    renderFilters({ ...NO_FILTERS, brands: ["citadel"], hues: ["red"] });
    const dialog = openSheet();

    expect(within(dialog).getByRole("button", { name: "Show 1 paint" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear all" }));

    expect(within(dialog).getByRole("checkbox", { name: "Citadel" })).not.toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Red" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(within(dialog).getByRole("button", { name: "Show 4 paints" })).toBeInTheDocument();
  });
});
