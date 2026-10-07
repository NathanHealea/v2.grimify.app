import { act, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { catalogOf, catalogPaint } from "@/test/catalog-fixture";
import { triggerIntersection } from "@/test/intersection-observer";
import { renderRoute } from "@/test/render-route";

import type { Catalog } from "./schema";

const NAMED = [
  catalogPaint({ brandId: "citadel", name: "Mephiston Red", hex: "#9B130B" }),
  catalogPaint({ brandId: "citadel", name: "Macragge Blue", hex: "#193A79" }),
  catalogPaint({ brandId: "vallejo", name: "Dark Blue", hex: "#1D3557" }),
  catalogPaint({ brandId: "vallejo", name: "Blood Red", hex: "#A11B1F" }),
];

const GREYS = Array.from({ length: 96 }, (_, i) =>
  catalogPaint({
    brandId: "army-painter",
    name: `Grey ${String(i).padStart(3, "0")}`,
    hex: "#808080",
  }),
);

function serve(catalog: Catalog) {
  const fetch = vi.fn(() => Promise.resolve(Response.json(catalog)));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const rows = () =>
  screen.queryAllByRole("listitem").filter((li) => li.classList.contains("paint-row"));

describe("PaintsScreen", () => {
  it("shows loading, then error with retry, then the list", async () => {
    let failFirst: (response: Response) => void = () => {};
    const fetch = vi
      .fn()
      .mockReturnValueOnce(new Promise<Response>((resolve) => (failFirst = resolve)))
      .mockResolvedValueOnce(Response.json(catalogOf(NAMED)));
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderRoute("/paints");

    expect(await screen.findByText("Downloading paint catalog…")).toBeInTheDocument();
    act(() => failFirst(new Response("down", { status: 503 })));
    expect(await screen.findByText(/Connect to the internet once/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Mephiston Red")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("4 paints");
  });

  it("shows chips, hue dots and suggestions", async () => {
    serve(catalogOf(NAMED));
    const router = renderRoute("/paints?q=vallejo");

    const chip = await screen.findByRole("button", { name: "Remove Brand: Vallejo" });
    expect(rows().map((row) => row.querySelector(".paint-row__name")?.textContent)).toEqual([
      "Blood Red",
      "Dark Blue",
    ]);
    expect(screen.queryByRole("list", { name: "Browse by color" })).toBeNull();

    fireEvent.click(chip);
    const dots = await screen.findByRole("list", { name: "Browse by color" });
    expect(within(dots).getAllByRole("button")).toHaveLength(13);
    expect(within(dots).getByRole("button", { name: "Red-Orange" })).toBeInTheDocument();

    fireEvent.click(within(dots).getByRole("button", { name: "Blue" }));
    await vi.waitFor(() => expect(router.state.location.search).toEqual({ q: "blue" }));
    expect(screen.getByRole("searchbox", { name: "Search paints" })).toHaveValue("blue");

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "gree" } });
    const suggestions = screen.getByLabelText("Suggestions");
    expect(
      within(suggestions)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Green", "Green Stuff World"]);
  });

  it("renders 60 rows, then more, and an empty state", async () => {
    serve(catalogOf([...NAMED, ...GREYS]));
    renderRoute("/paints");

    await screen.findByText("Blood Red");
    expect(rows()).toHaveLength(60);
    act(() => triggerIntersection());
    expect(rows()).toHaveLength(100);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzzqq" } });
    expect(await screen.findByText("No paints match")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    await vi.waitFor(() => expect(rows()).toHaveLength(60));
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("restores the query from the URL", async () => {
    serve(catalogOf(NAMED));
    renderRoute("/paints?q=blue");

    expect(await screen.findByRole("searchbox")).toHaveValue("blue");
    expect(rows().map((row) => row.querySelector(".paint-row__name")?.textContent)).toEqual([
      "Macragge Blue",
      "Dark Blue",
    ]);
  });

  it("keeps a numeric query as text", async () => {
    serve(catalogOf(NAMED));
    renderRoute("/paints?q=123");

    expect(await screen.findByRole("searchbox")).toHaveValue("123");
    expect(await screen.findByText("No paints match")).toBeInTheDocument();
  });
});
