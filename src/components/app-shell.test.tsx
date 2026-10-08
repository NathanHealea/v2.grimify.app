import { act, cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CollectionState } from "@/features/collection/collection-provider";
import { renderRoute } from "@/test/render-route";

const collection = vi.hoisted(() => ({ state: undefined as CollectionState | undefined }));

vi.mock("@/features/collection/collection-provider", async (importActual) => {
  const actual = await importActual<typeof import("@/features/collection/collection-provider")>();
  return {
    ...actual,
    useCollection: () => collection.state ?? actual.useCollection(),
  };
});

afterEach(() => {
  collection.state = undefined;
});

async function findMainNav() {
  return screen.findByRole("navigation", { name: "Main" });
}

describe("AppShell", () => {
  it("renders a Main navigation with three labelled tabs", async () => {
    renderRoute("/paints");

    const links = within(await findMainNav()).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Paints", "/paints"],
      ["My Paints", "/my-paints"],
      ["Settings", "/settings"],
    ]);
  });

  it("marks only the current tab with aria-current", async () => {
    renderRoute("/my-paints");

    const nav = await findMainNav();
    await screen.findByRole("heading", { level: 1, name: "My Paints" });
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["My Paints"]);
  });

  it("places the Main navigation before the header and main", async () => {
    renderRoute("/paints");

    const nav = await findMainNav();
    const header = screen.getByRole("banner");
    const main = screen.getByRole("main");
    expect(nav.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nav.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders exactly one Main navigation", async () => {
    renderRoute("/settings");

    await findMainNav();
    expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1);
  });

  it("hides tab icons from assistive tech", async () => {
    renderRoute("/paints");

    const icons = (await findMainNav()).querySelectorAll("svg");
    expect(icons).toHaveLength(3);
    icons.forEach((icon) => expect(icon).toHaveAttribute("aria-hidden", "true"));
  });

  it("shows the Offline pill in the header", async () => {
    const onLine = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderRoute("/settings");

    const header = await screen.findByRole("banner");
    expect(within(header).getAllByRole("status")[0]).toHaveTextContent("Offline");

    onLine.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event("online")));
    expect(within(header).getAllByRole("status")[0]).toBeEmptyDOMElement();
    onLine.mockRestore();
  });

  it("shows how many changes are waiting", async () => {
    const withPending = (pending: number): CollectionState => ({
      loading: false,
      flags: new Map(),
      owned: new Set(),
      wishlisted: new Set(),
      favorites: new Set(),
      pending,
    });
    const statusTexts = async () => {
      const header = await screen.findByRole("banner");
      return within(header)
        .getAllByRole("status")
        .map((region) => region.textContent);
    };

    collection.state = withPending(0);
    renderRoute("/settings");
    expect(await statusTexts()).toEqual(["", ""]);
    cleanup();

    collection.state = withPending(1);
    renderRoute("/settings");
    expect(await statusTexts()).toEqual(["", "1 change waiting to sync"]);
    cleanup();

    collection.state = withPending(3);
    renderRoute("/settings");
    expect(await statusTexts()).toEqual(["", "3 changes waiting to sync"]);
  });
});
