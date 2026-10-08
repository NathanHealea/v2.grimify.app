import { useUser } from "@clerk/react";
import { render, screen } from "@testing-library/react";
import { useConvexAuth, useQuery } from "convex/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CollectionProvider, useCollection } from "./collection-provider";

function Probe() {
  const { loading, owned } = useCollection();
  return <p>{loading ? "loading" : `owned ${owned.size}`}</p>;
}

function state({
  signedIn,
  authenticated,
  rows,
}: {
  signedIn: boolean | undefined;
  authenticated: boolean;
  rows: unknown;
}) {
  vi.mocked(useUser).mockReturnValue({
    isLoaded: signedIn !== undefined,
    isSignedIn: signedIn,
    user: null,
  } as unknown as ReturnType<typeof useUser>);
  vi.mocked(useConvexAuth).mockReturnValue({
    isLoading: false,
    isRefreshing: false,
    isAuthenticated: authenticated,
  });
  vi.mocked(useQuery).mockImplementation(((_query: unknown, args: unknown) =>
    args === "skip" ? undefined : rows) as typeof useQuery);
}

const ROWS = [
  {
    paintId: "citadel-base-mephiston-red",
    owned: true,
    wishlisted: false,
    favorite: false,
    updatedAt: 1,
  },
];

afterEach(() => {
  state({ signedIn: false, authenticated: false, rows: undefined });
  vi.mocked(useQuery).mockImplementation((() => undefined) as typeof useQuery);
});

describe("CollectionProvider", () => {
  it("stays loading until Convex has the signed-in session", () => {
    state({ signedIn: true, authenticated: false, rows: [] });
    const { rerender } = render(
      <CollectionProvider>
        <Probe />
      </CollectionProvider>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(vi.mocked(useQuery)).toHaveBeenLastCalledWith(expect.anything(), "skip");

    state({ signedIn: true, authenticated: true, rows: ROWS });
    rerender(
      <CollectionProvider>
        <Probe />
      </CollectionProvider>,
    );
    expect(screen.getByText("owned 1")).toBeInTheDocument();
  });

  it("is an empty, loaded collection when signed out", () => {
    state({ signedIn: false, authenticated: false, rows: undefined });
    render(
      <CollectionProvider>
        <Probe />
      </CollectionProvider>,
    );
    expect(screen.getByText("owned 0")).toBeInTheDocument();
  });
});
