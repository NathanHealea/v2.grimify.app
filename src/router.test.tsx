import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderRoute } from "@/test/render-route";

describe("router", () => {
  it("redirects / to /paints", async () => {
    const router = renderRoute("/");

    await screen.findByRole("heading", { level: 1, name: "Paints" });
    expect(router.state.location.pathname).toBe("/paints");
  });

  it.each([
    ["/paints", "Paints"],
    ["/my-paints", "My Paints"],
    ["/settings", "Settings"],
  ])("renders the screen title for %s", async (path, title) => {
    renderRoute(path);

    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });
});
