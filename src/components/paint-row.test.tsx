import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { catalogPaint } from "@/test/catalog-fixture";

import { PaintRow } from "./paint-row";

function renderRow(...args: Parameters<typeof catalogPaint>) {
  const paint = catalogPaint(...args);
  return render(
    <ul>
      <PaintRow paint={paint} brandName="Citadel" lineName="Base" />
    </ul>,
  );
}

describe("PaintRow", () => {
  it("renders a swatch with the paint color and no color-only meaning", () => {
    const { container } = renderRow({
      brandId: "citadel",
      name: "Leadbelcher",
      hex: "#888D8F",
      type: "metallic",
    });

    const row = screen.getByRole("listitem");
    expect(row).toHaveTextContent("Leadbelcher");
    expect(row).toHaveTextContent("Citadel · Base · Metallic");
    const swatch = container.querySelector(".paint-swatch")!;
    expect(swatch).toHaveAttribute("aria-hidden", "true");
    expect(swatch.getAttribute("style")).toContain("--swatch-color: #888D8F");
    expect(screen.queryByText("Discontinued")).toBeNull();
  });

  it("marks discontinued paints in text", () => {
    renderRow({ brandId: "citadel", name: "Old Red", hex: "#9B130B", discontinued: true });

    expect(screen.getByText("Discontinued")).toBeInTheDocument();
  });
});
