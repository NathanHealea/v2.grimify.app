import "./paint-row.css";

import { Link } from "@tanstack/react-router";

import type { CatalogPaint } from "@/features/catalog/schema";
import type { MatchLabel } from "@/features/matching/delta-e";

import { PaintSwatch } from "./paint-swatch";

type Props = {
  paint: CatalogPaint;
  brandName: string;
  lineName: string;
  match?: MatchLabel;
};

export function PaintRow({ paint, brandName, lineName, match }: Props) {
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
        </div>
        {(match ?? paint.discontinued) && (
          <div className="paint-row__badges">
            {match && <span className="paint-row__match">{match}</span>}
            {paint.discontinued && <span className="paint-row__badge">Discontinued</span>}
          </div>
        )}
      </Link>
    </li>
  );
}
