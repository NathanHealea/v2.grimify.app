import { useClerk, useUser } from "@clerk/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountSection } from "./account-section";

const openSignIn = vi.fn();
vi.mock("./sign-in-provider", () => ({ useSignIn: () => openSignIn }));

afterEach(() => vi.restoreAllMocks());

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
});
