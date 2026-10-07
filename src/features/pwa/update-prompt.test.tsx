import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UpdatePrompt } from "./update-prompt";

describe("UpdatePrompt", () => {
  it("prompts to reload when an update is waiting", () => {
    const onReload = vi.fn();
    const { rerender } = render(<UpdatePrompt needRefresh={false} onReload={onReload} />);
    expect(screen.queryByRole("region", { name: "App update" })).toBeNull();

    rerender(<UpdatePrompt needRefresh onReload={onReload} />);
    expect(screen.getByText("Update available")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onReload).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByRole("region", { name: "App update" })).toBeNull();
  });
});
