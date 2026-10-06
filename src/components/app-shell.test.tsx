import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderRoute } from "@/test/render-route";

async function findMainNav() {
  return screen.findByRole("navigation", { name: "Main" });
}

describe("AppShell", () => {
  it("renders a Main navigation with three labelled tabs", async () => {
    renderRoute("/paints");

    const links = within(await findMainNav()).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Paints", "/paints"],
      ["My Paints", "/my-paints"],
      ["Settings", "/settings"],
    ]);
  });

  it("marks only the current tab with aria-current", async () => {
    renderRoute("/my-paints");

    const nav = await findMainNav();
    await screen.findByRole("heading", { level: 1, name: "My Paints" });
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["My Paints"]);
  });

  it("hides tab icons from assistive tech", async () => {
    renderRoute("/paints");

    const icons = (await findMainNav()).querySelectorAll("svg");
    expect(icons).toHaveLength(3);
    icons.forEach((icon) => expect(icon).toHaveAttribute("aria-hidden", "true"));
  });
});
