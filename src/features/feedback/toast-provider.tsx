import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { Toast } from "@/components/ui/toast";

const AUTO_HIDE_MS = 6000;

const ToastContext = createContext<(message: string) => void>(() => {
  throw new Error("useToast must be used inside ToastProvider");
});

/** One toast at a time; a new message replaces the current one (DESIGN_SYSTEM §12, DECISIONS 029). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((next: string) => setMessage(next), []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Toast message={message} onDismiss={() => setMessage(null)} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
