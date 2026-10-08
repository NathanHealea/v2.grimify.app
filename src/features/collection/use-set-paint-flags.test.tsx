import { useUser } from "@clerk/react";
import { renderHook } from "@testing-library/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/features/feedback/toast-provider";

import { CollectionProvider, usePaintFlags } from "./collection-provider";
import { type DeviceRecord, writeDeviceRecord } from "./device-store";
import { useSetPaintFlags } from "./use-set-paint-flags";

const device = vi.hoisted(() => ({ record: undefined as DeviceRecord | undefined }));

vi.mock("./device-store", () => ({
  readDeviceRecord: vi.fn(() => Promise.resolve(device.record)),
  writeDeviceRecord: vi.fn((record: DeviceRecord) => {
    device.record = record;
    return Promise.resolve();
  }),
  clearDeviceRecord: vi.fn(() => {
    device.record = undefined;
    return Promise.resolve();
  }),
}));

const RED = "citadel-base-mephiston-red";
const mutate = vi.fn();

function signedIn(clerk: "loading" | "signed-out" | { userId: string }) {
  const known = typeof clerk === "object";
  vi.mocked(useUser).mockReturnValue({
    isLoaded: clerk !== "loading",
    isSignedIn: clerk === "loading" ? undefined : known,
    user: known ? { id: clerk.userId } : null,
  } as unknown as ReturnType<typeof useUser>);
  vi.mocked(useConvexAuth).mockReturnValue({
    isLoading: false,
    isRefreshing: false,
    isAuthenticated: known,
  });
  vi.mocked(useQuery).mockImplementation(((
    query: Parameters<typeof getFunctionName>[0],
    args: unknown,
  ) => {
    if (args === "skip") return undefined;
    return getFunctionName(query) === "userPaints:listMine" ? [] : { _id: "users_1" };
  }) as typeof useQuery);
}

beforeEach(() => {
  device.record = undefined;
  mutate.mockReset();
  vi.mocked(useMutation).mockReturnValue(mutate as unknown as ReturnType<typeof useMutation>);
  vi.mocked(writeDeviceRecord).mockClear();
});

afterEach(() => {
  signedIn("signed-out");
  vi.mocked(useQuery).mockImplementation((() => undefined) as typeof useQuery);
  vi.restoreAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <CollectionProvider>{children}</CollectionProvider>
  </ToastProvider>
);

function renderWriter() {
  return renderHook(() => ({ setFlags: useSetPaintFlags(), red: usePaintFlags(RED) }), {
    wrapper,
  });
}

describe("useSetPaintFlags", () => {
  it("writes through the outbox", async () => {
    signedIn({ userId: "user_a" });
    vi.spyOn(Date, "now").mockReturnValue(1234);
    let finishSend: () => void = () => {};
    mutate.mockImplementationOnce(
      () =>
        new Promise<null>((resolve) => {
          finishSend = () => resolve(null);
        }),
    );
    const { result } = renderWriter();

    result.current.setFlags(RED, { owned: true });

    const entry = { paintId: RED, owned: true, clientUpdatedAt: 1234 };
    await vi.waitFor(() => expect(result.current.red.owned).toBe(true));
    expect(writeDeviceRecord).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_a", outbox: [entry] }),
    );
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledWith(entry));

    finishSend();
    await vi.waitFor(() =>
      expect(writeDeviceRecord).toHaveBeenLastCalledWith(
        expect.objectContaining({ userId: "user_a", outbox: [] }),
      ),
    );

    mutate.mockRejectedValueOnce(new ConvexError("NO_FLAGS"));
    result.current.setFlags(RED, { wishlisted: true });

    await vi.waitFor(() =>
      expect(document.body).toHaveTextContent("Couldn't save that change."),
    );
    await vi.waitFor(() => expect(result.current.red.wishlisted).toBe(false));
    expect(device.record?.outbox).toEqual([]);

    signedIn("loading");
    device.record = undefined;
    const offline = renderWriter();
    expect(() => offline.result.current.setFlags(RED, { owned: true })).toThrow(Error);
  });

  it("refuses to write while signed out", () => {
    signedIn("signed-out");
    const { result } = renderWriter();

    expect(() => result.current.setFlags(RED, { owned: true })).toThrow(Error);
    expect(mutate).not.toHaveBeenCalled();
  });
});
