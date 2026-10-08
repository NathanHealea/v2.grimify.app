import "./paint-row.css";

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { CatalogPaint } from "@/features/catalog/schema";
import type { MatchLabel } from "@/features/matching/delta-e";

import { PaintSwatch } from "./paint-swatch";

type Props = {
  paint: CatalogPaint;
  brandName: string;
  lineName: string;
  match?: MatchLabel;
  /** Extra muted text under the meta line, e.g. "You own this". */
  note?: string;
  /** Controls beside the row's link, e.g. Own/Want toggles; kept outside the link so taps never open the paint. */
  actions?: ReactNode;
};

export function PaintRow({ paint, brandName, lineName, match, note, actions }: Props) {
  const type = paint.type.charAt(0).toUpperCase() + paint.type.slice(1);

  return (
    <li className="paint-row">
      <Link to="/paints/$paintId" params={{ paintId: paint.id }} className="paint-row__link">
        <PaintSwatch hex={paint.hex} type={paint.type} />
        <div className="paint-row__text">
          <p className="paint-row__name">{paint.name}</p>
          <p className="paint-row__meta">
            {brandName} · {lineName} · {type}
          </p>
          {note && <p className="paint-row__note">{note}</p>}
        </div>
        {(match ?? paint.discontinued) && (
          <div className="paint-row__badges">
            {match && <span className="paint-row__match">{match}</span>}
            {paint.discontinued && <span className="paint-row__badge">Discontinued</span>}
          </div>
        )}
      </Link>
      {actions}
    </li>
  );
}
