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
vi.mock("@/features/auth/sign-in-provider", () => ({ useSignIn: () => openSignIn }));

const RED = "citadel-base-mephiston-red";

beforeEach(() => {
  setFlags.mockReset();
  openSignIn.mockReset();
  vi.mocked(usePaintFlags).mockReturnValue({ owned: true, wishlisted: false });
});

describe("PaintToggles", () => {
  it("renders accessible toggles and saves when signed in", () => {
    vi.mocked(useCanSavePaints).mockReturnValue(true);
    render(<PaintToggles paintId={RED} paintName="Mephiston Red" />);

    const own = screen.getByRole("button", { name: "Mark Mephiston Red as owned" });
    const want = screen.getByRole("button", { name: "Mark Mephiston Red as wanted" });
    expect(own).toHaveAttribute("aria-pressed", "true");
    expect(want).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(own);
    fireEvent.click(want);
    expect(setFlags).toHaveBeenNthCalledWith(1, RED, { owned: false });
    expect(setFlags).toHaveBeenNthCalledWith(2, RED, { wishlisted: true });
    expect(openSignIn).not.toHaveBeenCalled();
  });

  it("hands off to sign-in when signed out", () => {
    vi.mocked(useCanSavePaints).mockReturnValue(false);
    render(<PaintToggles paintId={RED} paintName="Mephiston Red" />);

    fireEvent.click(screen.getByRole("button", { name: "Mark Mephiston Red as wanted" }));

    expect(openSignIn).toHaveBeenCalledWith({ paintId: RED, change: { wishlisted: true } });
    expect(setFlags).not.toHaveBeenCalled();
  });
});
