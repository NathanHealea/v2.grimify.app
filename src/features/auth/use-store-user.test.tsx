import { renderHook } from "@testing-library/react";
import { useConvexAuth, useMutation } from "convex/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useStoreUser } from "./use-store-user";

vi.mock("convex/react", () => ({ useConvexAuth: vi.fn(), useMutation: vi.fn() }));

const store = vi.fn(() => Promise.resolve("user-id"));

beforeEach(() => {
  store.mockClear();
  vi.mocked(useMutation).mockReturnValue(store as unknown as ReturnType<typeof useMutation>);
});

function authState(isAuthenticated: boolean) {
  vi.mocked(useConvexAuth).mockReturnValue({
    isLoading: false,
    isRefreshing: false,
    isAuthenticated,
  });
}

describe("useStoreUser", () => {
  it("stores the user once per signed-in session", () => {
    authState(false);
    const { rerender } = renderHook(() => useStoreUser());
    expect(store).not.toHaveBeenCalled();

    authState(true);
    rerender();
    rerender();
    expect(store).toHaveBeenCalledOnce();

    authState(false);
    rerender();
    authState(true);
    rerender();
    expect(store).toHaveBeenCalledTimes(2);
  });
});
