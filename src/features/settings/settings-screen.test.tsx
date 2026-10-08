import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { CollectionProvider } from "@/features/collection/collection-provider";
import { ToastProvider } from "@/features/feedback/toast-provider";

import packageJson from "../../../package.json";
import { SettingsScreen } from "./settings-screen";

vi.mock("@/features/auth/sign-in-provider", () => ({ useSignIn: () => vi.fn() }));

function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CollectionProvider>{children}</CollectionProvider>
    </ToastProvider>
  );
}

describe("SettingsScreen", () => {
  it("shows account, appearance and about", () => {
    render(<SettingsScreen />, { wrapper: Providers });

    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(["Account", "Appearance", "About"]);
    expect(screen.getByRole("region", { name: "Appearance" })).toHaveTextContent(
      "Theme: Follows your system",
    );
    const about = screen.getByRole("region", { name: "About" });
    expect(about).toHaveTextContent(`Version ${__APP_VERSION__}`);
    expect(about).toHaveTextContent(
      "Paint colors are approximate on-screen values. Most hex values come from PaintPad (paintpad.app); the rest come from manufacturer pages.",
    );
    expect(about).toHaveTextContent(
      "Paint and brand names are trademarks of their owners. Grimify isn't affiliated with any paint manufacturer.",
    );
  });

  it("reports the package.json version", () => {
    expect(__APP_VERSION__).toBe(packageJson.version);
  });
});
