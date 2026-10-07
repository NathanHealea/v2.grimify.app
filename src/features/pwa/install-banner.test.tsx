import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InstallBanner } from "./install-banner";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});

afterEach(() => vi.restoreAllMocks());

describe("InstallBanner", () => {
  it("shows the iOS hint and remembers Not now", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(IPHONE);
    localStorage.setItem("grimify:visits", "1");

    render(<InstallBanner />);

    const banner = screen.getByRole("region", { name: "Install Grimify" });
    expect(banner).toHaveTextContent("Tap Share , then Add to Home Screen.");
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("region", { name: "Install Grimify" })).toBeNull();
    expect(Number(localStorage.getItem("grimify:install-dismissed-at"))).toBeGreaterThan(0);
  });

  it("stays hidden on a first visit until 30 seconds pass", () => {
    vi.useFakeTimers();
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(IPHONE);

    render(<InstallBanner />);
    expect(screen.queryByRole("region", { name: "Install Grimify" })).toBeNull();
    act(() => void vi.advanceTimersByTime(30_000));
    expect(screen.getByRole("region", { name: "Install Grimify" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("offers the native install prompt", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14; Pixel 7)",
    );
    localStorage.setItem("grimify:visits", "1");
    render(<InstallBanner />);
    expect(screen.queryByRole("region", { name: "Install Grimify" })).toBeNull();

    const prompt = vi.fn(() => Promise.resolve());
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    act(() => void window.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Install app" }));
    expect(prompt).toHaveBeenCalledOnce();
    await vi.waitFor(() =>
      expect(screen.queryByRole("region", { name: "Install Grimify" })).toBeNull(),
    );
  });
});
