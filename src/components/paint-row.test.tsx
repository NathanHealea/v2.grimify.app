import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { catalogPaint } from "@/test/catalog-fixture";
import { renderWithRouter } from "@/test/render-with-router";

import { PaintRow } from "./paint-row";

function renderRow(...args: Parameters<typeof catalogPaint>) {
  const paint = catalogPaint(...args);
  return renderWithRouter(
    <ul>
      <PaintRow paint={paint} brandName="Citadel" lineName="Base" />
    </ul>,
  );
}

describe("PaintRow", () => {
  it("renders a swatch with the paint color and no color-only meaning", async () => {
    const { container } = await renderRow({
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

  it("marks discontinued paints in text", async () => {
    await renderRow({ brandId: "citadel", name: "Old Red", hex: "#9B130B", discontinued: true });

    expect(screen.getByText("Discontinued")).toBeInTheDocument();
  });

  it("links each row to its detail", async () => {
    await renderRow({ brandId: "citadel", name: "Mephiston Red", hex: "#9B130B" });

    const link = screen.getByRole("link", { name: /Mephiston Red/ });
    expect(link).toHaveAttribute("href", "/paints/citadel-base-mephiston-red");
  });

  it("keeps the row link and toggles separate", async () => {
    const paint = catalogPaint({ brandId: "citadel", name: "Mephiston Red", hex: "#9B130B" });
    await renderWithRouter(
      <ul>
        <PaintRow
          paint={paint}
          brandName="Citadel"
          lineName="Base"
          actions={<button type="button">Own</button>}
        />
      </ul>,
    );

    const link = screen.getByRole("link", { name: /Mephiston Red/ });
    const own = screen.getByRole("button", { name: "Own" });
    expect(link).not.toContainElement(own);
    expect(screen.getByRole("listitem")).toContainElement(own);
  });
});
