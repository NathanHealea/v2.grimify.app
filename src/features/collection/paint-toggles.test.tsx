import { useUser } from "@clerk/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CollectionProvider, usePaintFlags } from "./collection-provider";
import { writeDeviceRecord } from "./device-store";
import { PaintToggles } from "./paint-toggles";
import { useCanSavePaints } from "./use-set-paint-flags";

const setFlags = vi.fn();
const openSignIn = vi.fn();
const toast = vi.fn();
vi.mock("./use-set-paint-flags", () => ({
  useSetPaintFlags: () => setFlags,
  useCanSavePaints: vi.fn(),
}));
vi.mock("./collection-provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./collection-provider")>()),
  usePaintFlags: vi.fn(),
}));
vi.mock("@/features/auth/sign-in-provider", () => ({ useSignIn: () => openSignIn }));
vi.mock("@/features/feedback/toast-provider", () => ({ useToast: () => toast }));

const RED = "citadel-base-mephiston-red";

async function useRealDeviceUser() {
  const actual =
    await vi.importActual<typeof import("./use-set-paint-flags")>("./use-set-paint-flags");
  vi.mocked(useCanSavePaints).mockImplementation(actual.useCanSavePaints);
}

beforeEach(() => {
  setFlags.mockReset();
  openSignIn.mockReset();
  toast.mockReset();
  vi.mocked(usePaintFlags).mockReturnValue({ owned: true, wishlisted: false, favorite: false });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(useUser).mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    user: null,
  } as unknown as ReturnType<typeof useUser>);
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

  it("hands off to sign-in when no user is known on the device", async () => {
    await useRealDeviceUser();
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    } as unknown as ReturnType<typeof useUser>);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    render(
      <CollectionProvider>
        <PaintToggles paintId={RED} paintName="Mephiston Red" />
      </CollectionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark Mephiston Red as wanted" }));

    expect(openSignIn).toHaveBeenCalledWith({ paintId: RED, change: { wishlisted: true } });
    expect(setFlags).not.toHaveBeenCalled();
  });

  it("saves while Convex auth catches up with Clerk", async () => {
    await useRealDeviceUser();
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "user-a" },
    } as unknown as ReturnType<typeof useUser>);
    render(
      <CollectionProvider>
        <PaintToggles paintId={RED} paintName="Mephiston Red" />
      </CollectionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark Mephiston Red as owned" }));

    expect(setFlags).toHaveBeenCalledWith(RED, { owned: false });
    expect(openSignIn).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it("queues while offline for a known user", async () => {
    await useRealDeviceUser();
    vi.mocked(usePaintFlags).mockImplementation(
      (await vi.importActual<typeof import("./collection-provider")>("./collection-provider"))
        .usePaintFlags,
    );
    vi.mocked(useUser).mockReturnValue({
      isLoaded: false,
      isSignedIn: undefined,
      user: null,
    } as unknown as ReturnType<typeof useUser>);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await writeDeviceRecord({
      userId: "user-a",
      rows: [{ paintId: RED, owned: true, wishlisted: false, favorite: false, updatedAt: 1 }],
      outbox: [],
    });
    render(
      <CollectionProvider>
        <PaintToggles paintId={RED} paintName="Mephiston Red" />
      </CollectionProvider>,
    );
    const own = screen.getByRole("button", { name: "Mark Mephiston Red as owned" });
    // Pressed only once the stored record has been read for the stored user.
    await vi.waitFor(() => expect(own).toHaveAttribute("aria-pressed", "true"));

    fireEvent.click(own);

    expect(setFlags).toHaveBeenCalledWith(RED, { owned: false });
    expect(toast).not.toHaveBeenCalled();
    expect(openSignIn).not.toHaveBeenCalled();
  });
});
