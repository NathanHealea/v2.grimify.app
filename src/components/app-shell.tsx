import "./app-shell.css";

import { Link, useMatches } from "@tanstack/react-router";
import { BookMarked, Palette, Settings } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const TABS = [
  { to: "/paints", label: "Paints", Icon: Palette },
  { to: "/my-paints", label: "My Paints", Icon: BookMarked },
  { to: "/settings", label: "Settings", Icon: Settings },
] as const;

export function AppShell({ children }: Props) {
  const title = useMatches({
    select: (matches) => matches.findLast((match) => match.staticData.title)?.staticData.title,
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
        {title && <h1 className="app-shell__title">{title}</h1>}
      </header>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
