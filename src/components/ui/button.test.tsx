import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders a button with default variant and size", () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("ui-button", { exact: true });
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button).toHaveAttribute("data-size", "md");
  });

  it("exposes variant and size as data attributes", () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveAttribute("data-variant", "destructive");
    expect(button).toHaveAttribute("data-size", "sm");
  });

  it("merges className after ui-button", () => {
    render(<Button className="extra">Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "class",
      "ui-button extra",
    );
  });

  it("renders the child element when asChild is set", () => {
    render(
      <Button asChild variant="outline">
        <a href="/paints">Browse paints</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Browse paints" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveClass("ui-button");
    expect(link).toHaveAttribute("data-variant", "outline");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
