import { renderHook } from "@testing-library/react";
import type { OptimisticLocalStore } from "convex/browser";
import { useConvexAuth, useMutation } from "convex/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/features/feedback/toast-provider";

import { applyOptimisticFlags, SAVE_FAILED_MESSAGE, useSetPaintFlags } from "./use-set-paint-flags";

vi.mock("convex/react", () => ({ useConvexAuth: vi.fn(), useMutation: vi.fn() }));

const RED = "citadel-base-mephiston-red";
const mutate = vi.fn();

beforeEach(() => {
  mutate.mockReset();
  const callable = Object.assign(mutate, { withOptimisticUpdate: () => callable });
  vi.mocked(useMutation).mockReturnValue(callable);
});

function signedIn(isAuthenticated: boolean) {
  vi.mocked(useConvexAuth).mockReturnValue({
    isLoading: false,
    isRefreshing: false,
    isAuthenticated,
  });
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

function fakeStore(
  rows: { paintId: string; owned: boolean; wishlisted: boolean; updatedAt: number }[] | undefined,
) {
  let value = rows;
  const store = {
    getQuery: () => value,
    setQuery: (_query: unknown, _args: unknown, next: typeof rows) => {
      value = next;
    },
  } as unknown as OptimisticLocalStore;
  return { store, read: () => value };
}

describe("useSetPaintFlags", () => {
  it("updates optimistically and reverts with a toast on failure", async () => {
    signedIn(true);
    vi.spyOn(Date, "now").mockReturnValue(1234);
    vi.spyOn(console, "error").mockImplementation(() => {});
    mutate.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useSetPaintFlags(), { wrapper });

    result.current(RED, { owned: true });

    expect(mutate).toHaveBeenCalledWith({ paintId: RED, owned: true, clientUpdatedAt: 1234 });
    await vi.waitFor(() => expect(document.body).toHaveTextContent(SAVE_FAILED_MESSAGE));
    vi.restoreAllMocks();
  });

  it("refuses to write while signed out", () => {
    signedIn(false);
    const { result } = renderHook(() => useSetPaintFlags(), { wrapper });

    expect(() => result.current(RED, { owned: true })).toThrow("signed out");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("mirrors the server rules in the optimistic update", () => {
    const { store, read } = fakeStore([
      { paintId: RED, owned: true, wishlisted: false, updatedAt: 1 },
    ]);

    applyOptimisticFlags(store, { paintId: RED, wishlisted: true, clientUpdatedAt: 2 });
    expect(read()).toEqual([{ paintId: RED, owned: true, wishlisted: true, updatedAt: 2 }]);

    applyOptimisticFlags(store, {
      paintId: RED,
      owned: false,
      wishlisted: false,
      clientUpdatedAt: 3,
    });
    expect(read()).toEqual([]);

    const loading = fakeStore(undefined);
    applyOptimisticFlags(loading.store, { paintId: RED, owned: true, clientUpdatedAt: 4 });
    expect(loading.read()).toBeUndefined();
  });
});
