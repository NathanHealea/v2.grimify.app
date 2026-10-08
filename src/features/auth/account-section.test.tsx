import { useClerk, useUser } from "@clerk/react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CollectionProvider,
  type CollectionState,
  useCollection,
} from "@/features/collection/collection-provider";
import {
  type DeviceRecord,
  readDeviceRecord,
  writeDeviceRecord,
} from "@/features/collection/device-store";
import { ToastProvider } from "@/features/feedback/toast-provider";

import { AccountSection } from "./account-section";

const openSignIn = vi.fn();
vi.mock("./sign-in-provider", () => ({ useSignIn: () => openSignIn }));

vi.mock("@/features/collection/collection-provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/collection/collection-provider")>();
  return { ...actual, useCollection: vi.fn(actual.useCollection) };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(useCollection).mockReset();
  vi.mocked(useUser).mockReset();
  vi.mocked(useClerk).mockReset();
});

const STORED: DeviceRecord = {
  userId: "user_a",
  rows: [],
  outbox: [
    { paintId: "citadel-base-mephiston-red", owned: true, clientUpdatedAt: 5 },
    { paintId: "citadel-base-macragge-blue", wishlisted: true, clientUpdatedAt: 6 },
  ],
};

function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CollectionProvider>{children}</CollectionProvider>
    </ToastProvider>
  );
}

function withPending(pending: number) {
  vi.mocked(useCollection).mockReturnValue({
    loading: false,
    flags: new Map(),
    owned: new Set(),
    wishlisted: new Set(),
    favorites: new Set(),
    pending,
  } satisfies CollectionState);
}

function signedIn(email: string) {
  vi.mocked(useUser).mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user: { id: "user_a", primaryEmailAddress: { emailAddress: email } },
  } as unknown as ReturnType<typeof useUser>);
}

function signedOut() {
  vi.mocked(useUser).mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    user: null,
  } as unknown as ReturnType<typeof useUser>);
}

function clerkSignOut(signOut: () => Promise<void>) {
  vi.mocked(useClerk).mockReturnValue({ signOut } as unknown as ReturnType<typeof useClerk>);
}

function deferred() {
  let resolve: () => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// The provider reads the stored record once on mount; a clear before that read would be undone by it.
async function storedRecordRead() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
}

describe("AccountSection", () => {
  it("shows the account state in Settings", async () => {
    const { unmount } = render(<AccountSection />, { wrapper: Providers });

    expect(screen.getByRole("region", { name: "Account" })).toHaveTextContent(
      "Sign in to save the paints you own and want.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(openSignIn).toHaveBeenCalledWith();
    unmount();

    const signOut = vi.fn(() => Promise.resolve());
    clerkSignOut(signOut);
    signedIn("me@example.com");
    render(<AccountSection />, { wrapper: Providers });
    await storedRecordRead();
    expect(screen.getByText("Signed in as me@example.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("offers account deletion when signed in", async () => {
    signedIn("me@example.com");
    render(<AccountSection />, { wrapper: Providers });
    await storedRecordRead();

    expect(
      within(screen.getByRole("region", { name: "Account" })).getByRole("button", {
        name: "Delete account",
      }),
    ).toBeInTheDocument();
  });

  it("explains that signing in needs a connection", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    vi.mocked(useUser).mockReturnValue({
      isLoaded: false,
      isSignedIn: undefined,
      user: undefined,
    } as unknown as ReturnType<typeof useUser>);

    render(<AccountSection />, { wrapper: Providers });

    expect(screen.getByText("Signing in needs an internet connection.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });

  it("confirms before discarding pending changes", async () => {
    await writeDeviceRecord(STORED);
    const signOut = vi.fn(() => Promise.resolve());
    clerkSignOut(signOut);
    signedIn("me@example.com");
    withPending(2);
    const { unmount } = render(<AccountSection />, { wrapper: Providers });
    await storedRecordRead();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    let dialog = screen.getByRole("dialog", { name: "Discard unsynced changes?" });
    expect(dialog).toHaveTextContent("2 changes haven't synced. Sign out and discard them?");
    expect(signOut).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
    // Radix restores focus after the close finishes, on a timer.
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign out" })).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    dialog = screen.getByRole("dialog", { name: "Discard unsynced changes?" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign out" })).toHaveFocus());
    expect(signOut).not.toHaveBeenCalled();
    expect(await readDeviceRecord()).toEqual(STORED);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    dialog = screen.getByRole("dialog", { name: "Discard unsynced changes?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
    await waitFor(async () => expect(await readDeviceRecord()).toBeUndefined());
    unmount();

    withPending(1);
    const { unmount: unmountOne } = render(<AccountSection />, { wrapper: Providers });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("dialog", { name: "Discard unsynced changes?" })).toHaveTextContent(
      "1 change hasn't synced. Sign out and discard it?",
    );
    unmountOne();

    await writeDeviceRecord({ userId: "user_a", rows: [], outbox: [] });
    signOut.mockClear();
    withPending(0);
    render(<AccountSection />, { wrapper: Providers });
    await storedRecordRead();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(signOut).toHaveBeenCalledOnce();
    await waitFor(async () => expect(await readDeviceRecord()).toBeUndefined());
  });

  it("keeps pending changes when sign-out fails", async () => {
    await writeDeviceRecord(STORED);
    const failing = deferred();
    clerkSignOut(vi.fn(() => failing.promise));
    signedIn("me@example.com");
    render(<AccountSection />, { wrapper: Providers });
    await storedRecordRead();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    let dialog = await screen.findByRole("dialog", { name: "Discard unsynced changes?" });
    expect(dialog).toHaveTextContent("2 changes haven't synced.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));
    await act(async () => {
      failing.reject(new Error("network down"));
      await failing.promise.catch(() => {});
    });

    expect(
      await screen.findByText("Couldn't sign out. Check your connection."),
    ).toBeInTheDocument();
    expect(screen.getByText("Signed in as me@example.com")).toBeInTheDocument();
    expect(await readDeviceRecord()).toEqual(STORED);

    const succeeding = deferred();
    clerkSignOut(vi.fn(() => succeeding.promise));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    dialog = await screen.findByRole("dialog", { name: "Discard unsynced changes?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(await readDeviceRecord()).toEqual(STORED);

    succeeding.resolve();
    await waitFor(async () => expect(await readDeviceRecord()).toBeUndefined());
  });

  it("moves focus to the Account heading after sign-out", async () => {
    const signOut = vi.fn(() => Promise.resolve());
    clerkSignOut(signOut);
    signedIn("me@example.com");
    const { rerender } = render(<AccountSection />, { wrapper: Providers });
    await storedRecordRead();

    const button = screen.getByRole("button", { name: "Sign out" });
    button.focus();
    fireEvent.click(button);
    await act(async () => {
      await signOut.mock.results[0]?.value;
    });

    signedOut();
    rerender(<AccountSection />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Account" })).toHaveFocus());
  });

  it("leaves focus alone when the session ends without this Sign out", async () => {
    signedIn("me@example.com");
    const { rerender } = render(
      <>
        <button type="button">Elsewhere</button>
        <AccountSection />
      </>,
      { wrapper: Providers },
    );
    await storedRecordRead();
    screen.getByRole("button", { name: "Elsewhere" }).focus();

    signedOut();
    rerender(
      <>
        <button type="button">Elsewhere</button>
        <AccountSection />
      </>,
    );
    await storedRecordRead();

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account" })).not.toHaveFocus();
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
  });

  it("leaves focus alone on a later sign-out after a failed one", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = deferred();
    clerkSignOut(vi.fn(() => failing.promise));
    signedIn("me@example.com");
    const { rerender } = render(
      <>
        <button type="button">Elsewhere</button>
        <AccountSection />
      </>,
      { wrapper: Providers },
    );
    await storedRecordRead();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await act(async () => {
      failing.reject(new Error("network down"));
      await failing.promise.catch(() => {});
    });
    expect(
      await screen.findByText("Couldn't sign out. Check your connection."),
    ).toBeInTheDocument();

    screen.getByRole("button", { name: "Elsewhere" }).focus();
    signedOut();
    rerender(
      <>
        <button type="button">Elsewhere</button>
        <AccountSection />
      </>,
    );
    await storedRecordRead();

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account" })).not.toHaveFocus();
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
  });
});
