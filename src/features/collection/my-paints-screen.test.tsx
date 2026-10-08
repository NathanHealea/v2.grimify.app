import { useUser } from "@clerk/react";
import { fireEvent, screen, within } from "@testing-library/react";
import { useConvexAuth, useQuery } from "convex/react";
import { type FunctionReference, getFunctionName } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { catalogOf, catalogPaint } from "@/test/catalog-fixture";
import { renderRoute } from "@/test/render-route";

import { api } from "../../../convex/_generated/api";

const red = catalogPaint({ brandId: "citadel", name: "Mephiston Red", hex: "#9B130B" });
const blue = catalogPaint({ brandId: "citadel", name: "Macragge Blue", hex: "#193A79" });
const vallejo = catalogPaint({ brandId: "vallejo", name: "Blood Red", hex: "#A11B1F" });
const catalog = catalogOf([red, blue, vallejo]);

type Row = {
  paintId: string;
  owned: boolean;
  wishlisted: boolean;
  favorite: boolean;
  updatedAt: number;
};

function signedInWith(rows: Row[] | undefined) {
  vi.mocked(useUser).mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user: { id: "user_test" },
  } as unknown as ReturnType<typeof useUser>);
  vi.mocked(useConvexAuth).mockReturnValue({
    isLoading: false,
    isRefreshing: false,
    isAuthenticated: true,
  });
  vi.mocked(useQuery).mockImplementation(((query: unknown) =>
    getFunctionName(query as FunctionReference<"query">) ===
    getFunctionName(api.userPaints.listMine)
      ? rows
      : { _id: "user-1" }) as typeof useQuery);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json(catalog))),
  );
}

const rowNames = () =>
  Array.from(document.querySelectorAll(".paint-row__name")).map((el) => el.textContent);

afterEach(() => {
  vi.mocked(useUser).mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    user: null,
  } as unknown as ReturnType<typeof useUser>);
  vi.mocked(useConvexAuth).mockReturnValue({
    isLoading: false,
    isRefreshing: false,
    isAuthenticated: false,
  });
  vi.mocked(useQuery).mockImplementation((() => undefined) as typeof useQuery);
});

describe("MyPaintsScreen", () => {
  it("shows tabs, counts and states", async () => {
    signedInWith([
      { paintId: red.id, owned: true, wishlisted: false, favorite: false, updatedAt: 1 },
      { paintId: blue.id, owned: true, wishlisted: true, favorite: false, updatedAt: 2 },
      { paintId: vallejo.id, owned: false, wishlisted: false, favorite: true, updatedAt: 3 },
    ]);
    renderRoute("/my-paints");

    const tabs = await screen.findByRole("navigation", { name: "Collection" });
    const owned = within(tabs).getByRole("link", { name: "Owned (2)" });
    const wishlist = within(tabs).getByRole("link", { name: "Wishlist (1)" });
    expect(owned).toHaveAttribute("aria-current", "page");
    expect(wishlist).not.toHaveAttribute("aria-current");
    expect(await screen.findByText("Mephiston Red")).toBeInTheDocument();
    expect(rowNames()).toEqual(["Macragge Blue", "Mephiston Red"]);

    fireEvent.click(wishlist);
    await vi.waitFor(() => expect(rowNames()).toEqual(["Macragge Blue"]));
    expect(within(tabs).getByRole("link", { name: "Wishlist (1)" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.click(within(tabs).getByRole("link", { name: "Favorites (1)" }));
    await vi.waitFor(() => expect(rowNames()).toEqual([vallejo.name]));
  });

  it("shows an empty view with a way back to the catalog", async () => {
    signedInWith([
      { paintId: red.id, owned: true, wishlisted: false, favorite: false, updatedAt: 1 },
    ]);
    renderRoute("/my-paints?tab=wishlist");
    expect(await screen.findByText("Nothing on your wishlist")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse paints" })).toHaveAttribute("href", "/paints");
  });

  it("shows skeleton rows while the collection loads", async () => {
    signedInWith(undefined);
    renderRoute("/my-paints");

    const main = await screen.findByRole("main");
    expect(await within(main).findByRole("status")).toHaveTextContent("Loading your paints…");
    expect(main.querySelectorAll(".my-paints__skeleton-row")).toHaveLength(3);
    expect(main.querySelector(".my-paints__skeleton")).toHaveAttribute("aria-hidden", "true");
  });

  it("explains sign-in when signed out", async () => {
    renderRoute("/my-paints");

    expect(
      await screen.findByText("Sign in to see the paints you own and want, on any device."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("dialog", { name: "Sign in" })).toBeInTheDocument();
  });

  it("keeps the query and tab in the URL", async () => {
    signedInWith([
      { paintId: red.id, owned: false, wishlisted: true, favorite: false, updatedAt: 1 },
      { paintId: vallejo.id, owned: false, wishlisted: true, favorite: false, updatedAt: 1 },
    ]);
    renderRoute("/my-paints?tab=wishlist&q=vallejo");

    expect(await screen.findByRole("searchbox")).toHaveValue("vallejo");
    await vi.waitFor(() => expect(rowNames()).toEqual(["Blood Red"]));
    expect(screen.getByRole("link", { name: "Wishlist (2)" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("falls back to Owned for an unknown tab", async () => {
    signedInWith([
      { paintId: red.id, owned: true, wishlisted: false, favorite: false, updatedAt: 1 },
    ]);
    renderRoute("/my-paints?tab=bogus");

    expect(await screen.findByRole("link", { name: "Owned (1)" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
