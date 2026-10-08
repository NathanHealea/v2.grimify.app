import "./app-shell.css";

import { Link, useCanGoBack, useMatches, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Library, Palette, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { InstallBanner } from "@/features/pwa/install-banner";
import { useOnlineStatus } from "@/features/pwa/use-online-status";

type Props = {
  children: ReactNode;
};

const TABS = [
  { to: "/paints", label: "Paints", Icon: Palette },
  { to: "/my-paints", label: "My Paints", Icon: Library },
  { to: "/settings", label: "Settings", Icon: Settings },
] as const;

export function AppShell({ children }: Props) {
  const title = useMatches({
    select: (matches) => matches.findLast((match) => match.staticData.title)?.staticData.title,
  });
  const online = useOnlineStatus();
  const back = useMatches({
    select: (matches) => matches.findLast((match) => match.staticData.back)?.staticData.back,
  });

  return (
    <div className="app-shell">
      <nav className="app-shell__tabs" aria-label="Main">
        <ul className="app-shell__tab-list">
          {TABS.map(({ to, label, Icon }) => (
            <li key={to} className="app-shell__tab-item">
              <Link to={to} className="app-shell__tab">
                <Icon className="app-shell__tab-icon" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <header className="app-shell__header">
        {back && <BackButton to={back.to} label={back.label} />}
        {title && <h1 className="app-shell__title">{title}</h1>}
        <p className="app-shell__offline" role="status">
          {!online && "Offline"}
        </p>
      </header>
      <main className="app-shell__main">
        <InstallBanner />
        {children}
      </main>
    </div>
  );
}

/** Goes back when the previous entry is in the app (keeping its search), otherwise opens `to`. */
function BackButton({ to, label }: { to: "/paints"; label: string }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  return (
    <Link
      to={to}
      className="app-shell__back"
      aria-label={`Back to ${label}`}
      onClick={(event) => {
        if (!canGoBack) return;
        event.preventDefault();
        router.history.back();
      }}
    >
      <ChevronLeft className="app-shell__back-icon" aria-hidden="true" />
      {label}
    </Link>
  );
}
