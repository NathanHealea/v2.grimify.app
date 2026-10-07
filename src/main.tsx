import "@/styles/index.css";

import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ServiceWorkerUpdates } from "@/features/pwa/service-worker-updates";
import { createAppRouter } from "@/router";

const router = createAppRouter();
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root is missing from index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
    <ServiceWorkerUpdates />
  </StrictMode>,
);
