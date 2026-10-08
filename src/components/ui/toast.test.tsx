import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "@/features/feedback/toast-provider";

function Trigger() {
  const show = useToast();
  return <button onClick={() => show("Couldn't save. Check your connection.")}>Fail</button>;
}

afterEach(() => vi.useRealTimers());

describe("Toast", () => {
  it("announces and dismisses the toast", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    const region = screen.getByRole("status");
    expect(region).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: "Fail" }));
    expect(region).toHaveTextContent("Couldn't save. Check your connection.");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(region).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: "Fail" }));
    act(() => void vi.advanceTimersByTime(6000));
    expect(region).toBeEmptyDOMElement();
  });
});
