import { fireEvent, screen, within } from "@testing-library/react";
import { useQuery } from "convex/react";
import { type FunctionReference, getFunctionName } from "convex/server";
import { describe, expect, it, vi } from "vitest";

import { catalogOf, catalogPaint } from "@/test/catalog-fixture";
import { renderRoute } from "@/test/render-route";

import { api } from "../../../convex/_generated/api";

const red = catalogPaint({
  brandId: "citadel",
  name: "Mephiston Red",
  hex: "#9B130B",
  aliases: ["Old Red"],
});
const leadbelcher = catalogPaint({
  brandId: "citadel",
  name: "Leadbelcher",
  hex: "#888D8F",
  type: "metallic",
  finish: "metallic",
});
const catalog = catalogOf([
  red,
  leadbelcher,
  catalogPaint({ brandId: "vallejo", name: "Blood Red", hex: "#A11B1F" }),
  catalogPaint({ brandId: "vallejo", name: "Red Ink", hex: "#9B130C", type: "ink" }),
  catalogPaint({ brandId: "army-painter", name: "Pure Red", hex: "#9C140C" }),
  catalogPaint({
    brandId: "vallejo",
    name: "Gunmetal",
    hex: "#7A7F82",
    type: "metallic",
    finish: "metallic",
  }),
]);

function serve() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json(catalog))),
  );
}

describe("PaintDetail", () => {
  it("shows the paint and copies its hex", async () => {
    serve();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderRoute(`/paints/${red.id}`);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Mephiston Red" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Citadel · Base · Base")).toBeInTheDocument();
    expect(screen.getByText("Also known as Old Red")).toBeInTheDocument();
    expect(screen.getByText("Colors are approximate.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy hex #9B130B" }));
    expect(writeText).toHaveBeenCalledWith("#9B130B");
    expect(await screen.findByText("Copied #9B130B")).toHaveAttribute("role", "status");
  });

  it("lists equivalents and toggles all types", async () => {
    serve();
    const router = renderRoute(`/paints/${red.id}`);

    const section = await screen.findByRole("region", { name: "Equivalents" });
    expect(
      within(section)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["The Army Painter", "Vallejo"]);
    expect(within(section).queryByText("Red Ink")).toBeNull();
    expect(within(section).getAllByText("Very close").length).toBeGreaterThan(0);

    fireEvent.click(within(section).getByRole("checkbox", { name: "Show all types" }));
    await vi.waitFor(() => expect(router.state.location.search).toEqual({ types: "all" }));
    expect(await within(section).findByText("Red Ink")).toBeInTheDocument();
  });

  it("warns that metallic matches are rough", async () => {
    serve();
    renderRoute(`/paints/${leadbelcher.id}`);

    expect(await screen.findByText(/metallic sheen/)).toBeInTheDocument();
    expect(screen.getByText("Gunmetal")).toBeInTheDocument();
  });

  it("handles unknown paints and back navigation", async () => {
    serve();
    const router = renderRoute("/paints/not-a-paint");

    expect(
      await screen.findByRole("heading", { name: "This paint isn't in the catalog" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Back to Paints" }));
    await vi.waitFor(() => expect(router.state.location.pathname).toBe("/paints"));
  });

  it("marks owned equivalents", async () => {
    serve();
    const bloodRed = catalog.paints.find((p) => p.name === "Blood Red")!;
    vi.mocked(useQuery).mockImplementation(((query: unknown) =>
      getFunctionName(query as FunctionReference<"query">) ===
      getFunctionName(api.userPaints.listMine)
        ? [{ paintId: bloodRed.id, owned: true, wishlisted: false, updatedAt: 1 }]
        : undefined) as typeof useQuery);
    renderRoute(`/paints/${red.id}`);

    const section = await screen.findByRole("region", { name: "Equivalents" });
    const owned = within(section).getAllByText("You own this");
    expect(owned).toHaveLength(1);
    expect(owned[0].closest("li")).toHaveTextContent("Blood Red");
    expect(
      within(section).getByRole("button", { name: "Mark Blood Red as owned" }),
    ).toHaveAttribute("aria-pressed", "true");
    vi.mocked(useQuery).mockImplementation((() => undefined) as typeof useQuery);
  });
});
