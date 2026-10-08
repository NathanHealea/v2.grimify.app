import { useClerk, useUser } from "@clerk/react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type CollectionState, useCollection } from "@/features/collection/collection-provider";

import { AccountSection } from "./account-section";

const openSignIn = vi.fn();
vi.mock("./sign-in-provider", () => ({ useSignIn: () => openSignIn }));

const clearDevice = vi.fn();
vi.mock("@/features/collection/collection-provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/collection/collection-provider")>();
  return {
    ...actual,
    useCollection: vi.fn(actual.useCollection),
    useClearDevice: () => clearDevice,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  clearDevice.mockReset();
  vi.mocked(useCollection).mockReset();
});

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
    user: { primaryEmailAddress: { emailAddress: email } },
  } as unknown as ReturnType<typeof useUser>);
}

describe("AccountSection", () => {
  it("shows the account state in Settings", () => {
    const { unmount } = render(<AccountSection />);

    expect(screen.getByRole("region", { name: "Account" })).toHaveTextContent(
      "Sign in to save the paints you own and want.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(openSignIn).toHaveBeenCalledWith();
    unmount();

    const signOut = vi.fn(() => Promise.resolve());
    vi.mocked(useClerk).mockReturnValue({ signOut } as unknown as ReturnType<typeof useClerk>);
    signedIn("me@example.com");
    render(<AccountSection />);
    expect(screen.getByText("Signed in as me@example.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("explains that signing in needs a connection", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    vi.mocked(useUser).mockReturnValue({
      isLoaded: false,
      isSignedIn: undefined,
      user: undefined,
    } as unknown as ReturnType<typeof useUser>);

    render(<AccountSection />);

    expect(screen.getByText("Signing in needs an internet connection.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });

  it("confirms before discarding pending changes", async () => {
    const signOut = vi.fn(() => Promise.resolve());
    vi.mocked(useClerk).mockReturnValue({ signOut } as unknown as ReturnType<typeof useClerk>);
    signedIn("me@example.com");
    withPending(2);
    const { unmount } = render(<AccountSection />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    let dialog = screen.getByRole("dialog", { name: "Discard unsynced changes?" });
    expect(dialog).toHaveTextContent("2 changes haven't synced. Sign out and discard them?");
    expect(signOut).not.toHaveBeenCalled();
    expect(clearDevice).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
    expect(clearDevice).not.toHaveBeenCalled();
    // Radix restores focus after the close finishes, on a timer.
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign out" })).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    dialog = screen.getByRole("dialog", { name: "Discard unsynced changes?" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign out" })).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    dialog = screen.getByRole("dialog", { name: "Discard unsynced changes?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));
    expect(clearDevice).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledOnce();
    expect(clearDevice.mock.invocationCallOrder[0]).toBeLessThan(
      signOut.mock.invocationCallOrder[0],
    );
    unmount();

    clearDevice.mockReset();
    signOut.mockClear();
    withPending(1);
    const { unmount: unmountOne } = render(<AccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("dialog", { name: "Discard unsynced changes?" })).toHaveTextContent(
      "1 change hasn't synced. Sign out and discard it?",
    );
    unmountOne();

    signOut.mockClear();
    withPending(0);
    render(<AccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(clearDevice).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledOnce();
    expect(clearDevice.mock.invocationCallOrder[0]).toBeLessThan(
      signOut.mock.invocationCallOrder[0],
    );
  });
});
