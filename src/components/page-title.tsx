import "./page-title.css";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type RegisteredTitle = { text: string; element: HTMLElement };

const PageTitleContext = createContext<{
  title: RegisteredTitle | null;
  register: (title: RegisteredTitle | null) => void;
}>({ title: null, register: () => {} });

const APP_NAME = "Grimify";

/** Holds the current screen's large title so the header can show a small copy of it. */
export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, register] = useState<RegisteredTitle | null>(null);
  const value = useMemo(() => ({ title, register }), [title]);
  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

export function usePageTitle(): RegisteredTitle | null {
  return useContext(PageTitleContext).title;
}

/**
 * The screen's one `h1`, in large type (DECISIONS 040), and its browser tab title (WCAG 2.4.2).
 * `documentTitle` names the tab when it should differ from the heading.
 */
export function PageTitle({
  children,
  documentTitle,
}: {
  children: string;
  documentTitle?: string;
}) {
  const { register } = useContext(PageTitleContext);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${documentTitle ?? children} · ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [children, documentTitle]);

  useEffect(() => {
    if (!heading.current) return;
    register({ text: children, element: heading.current });
    return () => register(null);
  }, [children, register]);

  return (
    <h1 ref={heading} className="page-title">
      {children}
    </h1>
  );
}
