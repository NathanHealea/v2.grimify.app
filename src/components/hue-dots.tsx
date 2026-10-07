import "./hue-dots.css";

import { clampChroma, formatHex } from "culori";

import { hueLabel } from "@/features/catalog/parse-query";
import { HUE_FAMILIES, type HueFamily } from "@/features/catalog/schema";

type Props = {
  onSelect: (hue: HueFamily) => void;
};

// Each dot shows its family's center on the OKLCh wheel; yellows need more lightness to read as yellow.
const DOT_OKLCH: Record<HueFamily, [l: number, c: number, h: number]> = {
  red: [0.6, 0.18, 25],
  "red-orange": [0.65, 0.17, 40],
  orange: [0.72, 0.16, 55],
  "yellow-orange": [0.8, 0.15, 75],
  yellow: [0.88, 0.16, 100],
  "yellow-green": [0.8, 0.15, 125],
  green: [0.62, 0.15, 150],
  "blue-green": [0.62, 0.1, 190],
  blue: [0.55, 0.14, 250],
  "blue-violet": [0.5, 0.16, 280],
  violet: [0.5, 0.15, 305],
  "red-violet": [0.55, 0.18, 345],
  neutral: [0.62, 0, 0],
};

const DOT_COLORS = Object.fromEntries(
  HUE_FAMILIES.map((hue) => {
    const [l, c, h] = DOT_OKLCH[hue];
    return [hue, formatHex(clampChroma({ mode: "oklch", l, c, h }, "oklch"))];
  }),
) as Record<HueFamily, string>;

export function HueDots({ onSelect }: Props) {
  return (
    <ul className="hue-dots" aria-label="Browse by color">
      {HUE_FAMILIES.map((hue) => (
        <li key={hue}>
          <button type="button" className="hue-dots__button" onClick={() => onSelect(hue)}>
            <span
              className="hue-dots__dot"
              style={{ "--swatch-color": DOT_COLORS[hue] }}
              aria-hidden="true"
            />
            {hueLabel(hue)}
          </button>
        </li>
      ))}
    </ul>
  );
}
