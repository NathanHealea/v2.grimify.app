import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

/** Renders a component that uses router links, outside the app's route tree. */
export async function renderWithRouter(ui: ReactNode) {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => ui }),
    history: createMemoryHistory(),
  });
  const result = render(<RouterProvider router={router} />);
  await screen.findByRole("list");
  return result;
}
