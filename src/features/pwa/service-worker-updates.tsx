import { useRegisterSW } from "virtual:pwa-register/react";

import { UpdatePrompt } from "./update-prompt";

/** Registers the service worker and offers updates. Thin on purpose: the virtual module only exists in Vite builds. */
export function ServiceWorkerUpdates() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error: unknown) => console.error("Service worker registration failed", error),
  });

  return <UpdatePrompt needRefresh={needRefresh} onReload={() => void updateServiceWorker()} />;
}
