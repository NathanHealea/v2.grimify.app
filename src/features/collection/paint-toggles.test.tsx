import { useUser } from "@clerk/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePaintFlags } from "./collection-provider";
import { PaintToggles } from "./paint-toggles";
import { useCanSavePaints } from "./use-set-paint-flags";

const setFlags = vi.fn();
const openSignIn = vi.fn();
vi.mock("./use-set-paint-flags", () => ({
  useSetPaintFlags: () => setFlags,
  useCanSavePaints: vi.fn(),
}));
vi.mock("./collection-provider", () => ({ usePaintFlags: vi.fn() }));
const queueAfterSignIn = vi.fn();
vi.mock("@/features/auth/sign-in-provider", () => ({
  useSignIn: () => openSignIn,
  useQueueAfterSignIn: () => queueAfterSignIn,
}));

const RED = "citadel-base-mephiston-red";

beforeEach(() => {
  setFlags.mockReset();
  openSignIn.mockReset();
  queueAfterSignIn.mockReset();
  vi.mocked(usePaintFlags).mockReturnValue({ owned: true, wishlisted: false, favorite: false });
});

describe("PaintToggles", () => {
  it("renders accessible toggles and saves when signed in", () => {
    vi.mocked(useCanSavePaints).mockReturnValue(true);
    render(<PaintToggles paintId={RED} paintName="Mephiston Red" />);

    const own = screen.getByRole("button", { name: "Mark Mephiston Red as owned" });
    const want = screen.getByRole("button", { name: "Mark Mephiston Red as wanted" });
    const favorite = screen.getByRole("button", { name: "Mark Mephiston Red as favorite" });
    expect(own).toHaveAttribute("aria-pressed", "true");
    expect(want).toHaveAttribute("aria-pressed", "false");
    expect(favorite).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(own);
    fireEvent.click(want);
    fireEvent.click(favorite);
    expect(setFlags).toHaveBeenNthCalledWith(1, RED, { owned: false });
    expect(setFlags).toHaveBeenNthCalledWith(2, RED, { wishlisted: true });
    expect(setFlags).toHaveBeenNthCalledWith(3, RED, { favorite: true });
    expect(openSignIn).not.toHaveBeenCalled();
  });

  it("hands off to sign-in when signed out", () => {
    vi.mocked(useCanSavePaints).mockReturnValue(false);
    render(<PaintToggles paintId={RED} paintName="Mephiston Red" />);

    fireEvent.click(screen.getByRole("button", { name: "Mark Mephiston Red as wanted" }));

    expect(openSignIn).toHaveBeenCalledWith({ paintId: RED, change: { wishlisted: true } });

    fireEvent.click(screen.getByRole("button", { name: "Mark Mephiston Red as favorite" }));
    expect(openSignIn).toHaveBeenLastCalledWith({ paintId: RED, change: { favorite: true } });
    expect(setFlags).not.toHaveBeenCalled();
  });

  it("queues the tap while Convex auth catches up with Clerk", () => {
    vi.mocked(useCanSavePaints).mockReturnValue(false);
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: null,
    } as unknown as ReturnType<typeof useUser>);
    render(<PaintToggles paintId={RED} paintName="Mephiston Red" />);

    fireEvent.click(screen.getByRole("button", { name: "Mark Mephiston Red as owned" }));

    expect(queueAfterSignIn).toHaveBeenCalledWith({ paintId: RED, change: { owned: false } });
    expect(openSignIn).not.toHaveBeenCalled();
    expect(setFlags).not.toHaveBeenCalled();
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    } as unknown as ReturnType<typeof useUser>);
  });
});
