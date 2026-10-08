import { useUser } from "@clerk/react";
import { renderHook } from "@testing-library/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/features/feedback/toast-provider";

import { CollectionProvider, useCollection, usePaintFlags } from "./collection-provider";
import { type DeviceRecord, readDeviceRecord, writeDeviceRecord } from "./device-store";
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
const BLUE = "citadel-base-macragge-blue";
const mutate = vi.fn();
// Stable answers: a fresh [] on every render would re-run the provider's live-rows effect each time.
const NO_ROWS: never[] = [];
const ME = { _id: "users_1" };

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
    return getFunctionName(query) === "userPaints:listMine" ? NO_ROWS : ME;
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
  return renderHook(
    () => ({ setFlags: useSetPaintFlags(), red: usePaintFlags(RED), collection: useCollection() }),
    { wrapper },
  );
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

  it("sends a change made while an earlier send is in flight", async () => {
    signedIn({ userId: "user_a" });
    let finishFirst: () => void = () => {};
    mutate.mockImplementationOnce(
      () =>
        new Promise<null>((resolve) => {
          finishFirst = () => resolve(null);
        }),
    );
    const { result } = renderWriter();
    await vi.waitFor(() => expect(result.current.collection.loading).toBe(false));

    result.current.setFlags(RED, { owned: true });
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    result.current.setFlags(BLUE, { owned: true });
    finishFirst();

    await vi.waitFor(() =>
      expect(mutate).toHaveBeenLastCalledWith(expect.objectContaining({ paintId: BLUE })),
    );
    expect(mutate).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => expect(device.record?.outbox).toEqual([]));
  });

  it("retries a failed send when the browser comes back online", async () => {
    signedIn({ userId: "user_a" });
    mutate.mockRejectedValueOnce(new Error("network down"));
    const { result } = renderWriter();
    await vi.waitFor(() => expect(result.current.collection.loading).toBe(false));

    result.current.setFlags(RED, { owned: true });
    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(device.record?.outbox).toEqual([expect.objectContaining({ paintId: RED, owned: true })]);

    window.dispatchEvent(new Event("online"));

    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(device.record?.outbox).toEqual([]));
  });

  it("sends a stored outbox once the device record is read", async () => {
    const entry = { paintId: RED, owned: true, clientUpdatedAt: 5 };
    const stored: DeviceRecord = { userId: "user_a", rows: [], outbox: [entry] };
    vi.mocked(readDeviceRecord).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(stored), 20)),
    );
    signedIn({ userId: "user_a" });

    renderWriter();

    await vi.waitFor(() => expect(mutate).toHaveBeenCalledWith(entry));
    await vi.waitFor(() => expect(device.record?.outbox).toEqual([]));
  });
});
