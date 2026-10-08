import { useUser } from "@clerk/react";
import { render, renderHook, screen } from "@testing-library/react";
import { useConvexAuth, useQuery } from "convex/react";
import { getFunctionName } from "convex/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CollectionProvider, useCollection } from "./collection-provider";
import {
  clearDeviceRecord,
  type DeviceRecord,
  readDeviceRecord,
  writeDeviceRecord,
} from "./device-store";
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

const seen: string[] = [];

function Probe() {
  const { loading, owned, wishlisted } = useCollection();
  const text = loading
    ? "loading"
    : `owned ${[...owned].join(",") || "none"}; wishlisted ${[...wishlisted].join(",") || "none"}`;
  seen.push(text);
  return <p>{text}</p>;
}

function state({
  clerk,
  authenticated,
  rows,
}: {
  clerk: "loading" | "signed-out" | { userId: string };
  authenticated: boolean;
  rows: unknown;
}) {
  vi.mocked(useUser).mockReturnValue({
    isLoaded: clerk !== "loading",
    isSignedIn: clerk === "loading" ? undefined : clerk !== "signed-out",
    user: typeof clerk === "object" ? { id: clerk.userId } : null,
  } as unknown as ReturnType<typeof useUser>);
  vi.mocked(useConvexAuth).mockReturnValue({
    isLoading: false,
    isRefreshing: false,
    isAuthenticated: authenticated,
  });
  // users.me answers null so the flush gate stays shut; these tests are about what is shown.
  vi.mocked(useQuery).mockImplementation(((
    query: Parameters<typeof getFunctionName>[0],
    args: unknown,
  ) => {
    if (args === "skip") return undefined;
    return getFunctionName(query) === "userPaints:listMine" ? rows : null;
  }) as typeof useQuery);
}

const RED = "citadel-base-mephiston-red";
const BLUE = "citadel-base-macragge-blue";
const GREEN = "citadel-base-caliban-green";

function row(paintId: string, flags: { owned?: boolean; wishlisted?: boolean }, updatedAt = 1) {
  return {
    paintId,
    owned: flags.owned ?? false,
    wishlisted: flags.wishlisted ?? false,
    favorite: false,
    updatedAt,
  };
}

const ROWS = [row(RED, { owned: true })];

beforeEach(() => {
  device.record = undefined;
  seen.length = 0;
  vi.mocked(writeDeviceRecord).mockClear();
  vi.mocked(clearDeviceRecord).mockClear();
});

afterEach(() => {
  state({ clerk: "signed-out", authenticated: false, rows: undefined });
  vi.mocked(useQuery).mockImplementation((() => undefined) as typeof useQuery);
  vi.restoreAllMocks();
});

describe("CollectionProvider", () => {
  it("stays loading until Convex has the signed-in session", async () => {
    state({ clerk: { userId: "user_a" }, authenticated: false, rows: [] });
    const { rerender } = render(
      <CollectionProvider>
        <Probe />
      </CollectionProvider>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(vi.mocked(useQuery)).toHaveBeenCalledWith(expect.anything(), "skip");

    state({ clerk: { userId: "user_a" }, authenticated: true, rows: ROWS });
    rerender(
      <CollectionProvider>
        <Probe />
      </CollectionProvider>,
    );
    expect(await screen.findByText(`owned ${RED}; wishlisted none`)).toBeInTheDocument();
  });

  it("is an empty, loaded collection when signed out", async () => {
    state({ clerk: "signed-out", authenticated: false, rows: undefined });
    render(
      <CollectionProvider>
        <Probe />
      </CollectionProvider>,
    );
    expect(await screen.findByText("owned none; wishlisted none")).toBeInTheDocument();
  });

  it("shows cached and pending flags", async () => {
    device.record = {
      userId: "user_a",
      rows: [row(RED, { owned: true })],
      outbox: [{ paintId: BLUE, wishlisted: true, clientUpdatedAt: 5 }],
    };
    state({ clerk: { userId: "user_a" }, authenticated: false, rows: [] });
    const { rerender } = render(
      <CollectionProvider>
        <Probe />
      </CollectionProvider>,
    );
    expect(await screen.findByText(`owned ${RED}; wishlisted ${BLUE}`)).toBeInTheDocument();

    const live = [row(GREEN, { owned: true }, 9)];
    state({ clerk: { userId: "user_a" }, authenticated: true, rows: live });
    rerender(
      <CollectionProvider>
        <Probe />
      </CollectionProvider>,
    );
    expect(await screen.findByText(`owned ${GREEN}; wishlisted ${BLUE}`)).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(writeDeviceRecord).toHaveBeenLastCalledWith({
        userId: "user_a",
        rows: live,
        outbox: [{ paintId: BLUE, wishlisted: true, clientUpdatedAt: 5 }],
      }),
    );
  });

  it("resolves the device user", async () => {
    const stored: DeviceRecord = {
      userId: "user_a",
      rows: [row(RED, { owned: true })],
      outbox: [{ paintId: BLUE, wishlisted: true, clientUpdatedAt: 5 }],
    };

    device.record = stored;
    state({ clerk: "loading", authenticated: false, rows: undefined });
    const offline = render(
      <CollectionProvider>
        <Probe />
      </CollectionProvider>,
    );
    expect(await screen.findByText(`owned ${RED}; wishlisted ${BLUE}`)).toBeInTheDocument();
    offline.unmount();

    seen.length = 0;
    device.record = stored;
    state({ clerk: { userId: "user_b" }, authenticated: false, rows: undefined });
    const otherUser = render(
      <CollectionProvider>
        <Probe />
      </CollectionProvider>,
    );
    await vi.waitFor(() => expect(clearDeviceRecord).toHaveBeenCalled());
    expect(seen.some((text) => text.includes(RED) || text.includes(BLUE))).toBe(false);
    otherUser.unmount();

    seen.length = 0;
    vi.mocked(clearDeviceRecord).mockClear();
    device.record = stored;
    state({ clerk: "signed-out", authenticated: false, rows: undefined });
    render(
      <CollectionProvider>
        <Probe />
      </CollectionProvider>,
    );
    expect(await screen.findByText("owned none; wishlisted none")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seen.some((text) => text.includes(RED) || text.includes(BLUE))).toBe(false);
    expect(clearDeviceRecord).not.toHaveBeenCalled();
    expect(device.record?.outbox).toEqual(stored.outbox);
  });

  it("counts pending changes per paint until they are sent", async () => {
    const rows: never[] = [];
    state({ clerk: { userId: "user_a" }, authenticated: true, rows });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CollectionProvider>{children}</CollectionProvider>
    );
    const { result, rerender } = renderHook(
      () => ({ setFlags: useSetPaintFlags(), collection: useCollection() }),
      { wrapper },
    );
    await vi.waitFor(() => expect(result.current.collection.loading).toBe(false));

    result.current.setFlags(RED, { owned: true });
    result.current.setFlags(RED, { owned: false });
    result.current.setFlags(BLUE, { owned: true });
    await vi.waitFor(() => expect(result.current.collection.pending).toBe(2));

    const me = { _id: "users_1" };
    vi.mocked(useQuery).mockImplementation(((
      query: Parameters<typeof getFunctionName>[0],
      args: unknown,
    ) => {
      if (args === "skip") return undefined;
      return getFunctionName(query) === "userPaints:listMine" ? rows : me;
    }) as typeof useQuery);
    rerender();

    await vi.waitFor(() => expect(result.current.collection.pending).toBe(0));
  });

  it("adds a change made before the stored record is read", async () => {
    let finishRead: (record: DeviceRecord) => void = () => {};
    vi.mocked(readDeviceRecord).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRead = resolve;
        }),
    );
    state({ clerk: { userId: "user_a" }, authenticated: false, rows: undefined });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CollectionProvider>{children}</CollectionProvider>
    );
    const { result } = renderHook(
      () => ({ setFlags: useSetPaintFlags(), collection: useCollection() }),
      { wrapper },
    );
    vi.spyOn(Date, "now").mockReturnValue(9);

    result.current.setFlags(GREEN, { owned: true });
    finishRead({
      userId: "user_a",
      rows: [],
      outbox: [{ paintId: BLUE, wishlisted: true, clientUpdatedAt: 5 }],
    });

    await vi.waitFor(() => expect(result.current.collection.pending).toBe(2));
    expect(device.record?.outbox).toEqual([
      { paintId: BLUE, wishlisted: true, clientUpdatedAt: 5 },
      { paintId: GREEN, owned: true, clientUpdatedAt: 9 },
    ]);
  });
});
