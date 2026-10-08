import { useUser } from "@clerk/react";
import { useNavigate } from "@tanstack/react-router";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CollectionProvider } from "@/features/collection/collection-provider";
import { readDeviceRecord, writeDeviceRecord } from "@/features/collection/device-store";
import { ToastProvider } from "@/features/feedback/toast-provider";

import { DeleteAccount } from "./delete-account";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, useNavigate: vi.fn() };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(useUser).mockReset();
});

function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CollectionProvider>{children}</CollectionProvider>
    </ToastProvider>
  );
}

describe("DeleteAccount with the collection provider", () => {
  it("clears the device when the Clerk step fails after the server data is gone", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);
    await writeDeviceRecord({
      userId: "user_a",
      rows: [],
      outbox: [{ paintId: "citadel-base-mephiston-red", owned: true, clientUpdatedAt: 5 }],
    });
    vi.mocked(useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: "user_a",
        primaryEmailAddress: { emailAddress: "painter@example.com" },
        deleteSelfEnabled: true,
        delete: vi.fn(() => Promise.reject(new Error("clerk unavailable"))),
      },
    } as unknown as ReturnType<typeof useUser>);
    render(<DeleteAccount />, { wrapper: Providers });
    // The provider reads the stored record once on mount; a clear before that read would be undone by it.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    const dialog = screen.getByRole("dialog", { name: "Delete your account?" });
    fireEvent.change(within(dialog).getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete account" }));

    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "Couldn't finish deleting your account. Try again.",
      ),
    );
    await waitFor(async () => expect(await readDeviceRecord()).toBeUndefined());
    expect(navigate).not.toHaveBeenCalled();
  });
});
