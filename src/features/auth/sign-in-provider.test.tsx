import { useUser } from "@clerk/react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useQuery } from "convex/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type PendingAction, SignInProvider, useSignIn } from "./sign-in-provider";

const setFlags = vi.fn();
vi.mock("@/features/collection/use-set-paint-flags", () => ({ useSetPaintFlags: () => setFlags }));
vi.mock("convex/react", () => ({ useQuery: vi.fn() }));

const PENDING: PendingAction = {
  paintId: "citadel-base-mephiston-red",
  change: { wishlisted: true },
};

function Opener() {
  const openSignIn = useSignIn();
  return <button onClick={() => openSignIn(PENDING)}>Want</button>;
}

function signedIn(yes: boolean) {
  vi.mocked(useUser).mockReturnValue({
    isLoaded: true,
    isSignedIn: yes,
    user: null,
  } as unknown as ReturnType<typeof useUser>);
  vi.mocked(useQuery).mockReturnValue(yes ? { _id: "user-1" } : null);
}

beforeEach(() => {
  setFlags.mockReset();
  signedIn(false);
});

afterEach(() => vi.restoreAllMocks());

function renderProvider() {
  return render(
    <SignInProvider>
      <Opener />
    </SignInProvider>,
  );
}

describe("SignInProvider", () => {
  it("applies the pending action after sign-in", () => {
    const { rerender } = renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "Want" }));
    const dialog = screen.getByRole("dialog", { name: "Sign in" });
    expect(within(dialog).getByText("Clerk sign-in form")).toBeInTheDocument();

    signedIn(true);
    rerender(
      <SignInProvider>
        <Opener />
      </SignInProvider>,
    );

    expect(setFlags).toHaveBeenCalledOnce();
    expect(setFlags).toHaveBeenCalledWith(PENDING.paintId, PENDING.change);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("drops the pending action when the sheet closes without signing in", () => {
    const { rerender } = renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "Want" }));
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Sign in" }), { key: "Escape" });
    signedIn(true);
    rerender(
      <SignInProvider>
        <Opener />
      </SignInProvider>,
    );

    expect(setFlags).not.toHaveBeenCalled();
  });
});
