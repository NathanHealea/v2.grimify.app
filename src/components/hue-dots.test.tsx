import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HueDots } from "./hue-dots";

describe("HueDots", () => {
  it("shows pressed state on hue toggles", () => {
    const onSelect = vi.fn();
    const { unmount } = render(<HueDots onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "Blue" })).not.toHaveAttribute("aria-pressed");
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    expect(onSelect).toHaveBeenCalledWith("blue");
    unmount();

    render(<HueDots onSelect={onSelect} pressed={new Set(["blue"] as const)} layout="wrap" />);
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Red" })).toHaveAttribute("aria-pressed", "false");
  });
});
