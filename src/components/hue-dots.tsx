import "./hue-dots.css";

import { clampChroma, formatHex, wcagLuminance } from "culori";
import { Check } from "lucide-react";

import { hueLabel } from "@/features/catalog/parse-query";
import { HUE_FAMILIES, type HueFamily } from "@/features/catalog/schema";

type Props = {
  onSelect: (hue: HueFamily) => void;
  /** When given, the dots are toggles: pressed ones show a check and `aria-pressed`. */
  pressed?: ReadonlySet<HueFamily>;
  /** `scroll` is one swipeable row (Paints tab); `wrap` fits a sheet. */
  layout?: "scroll" | "wrap";
  label?: string;
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

// Relative luminance where black and white ink have equal contrast (same rule as PaintSwatch).
const INK_CROSSOVER = 0.18;

export function HueDots({
  onSelect,
  pressed,
  layout = "scroll",
  label = "Browse by color",
}: Props) {
  return (
    <ul className="hue-dots" data-layout={layout} aria-label={label}>
      {HUE_FAMILIES.map((hue) => {
        const isPressed = pressed?.has(hue);
        return (
          <li key={hue}>
            <button
              type="button"
              className="hue-dots__button"
              aria-pressed={pressed ? isPressed : undefined}
              onClick={() => onSelect(hue)}
            >
              <span
                className="hue-dots__dot"
                data-tone={wcagLuminance(DOT_COLORS[hue]) > INK_CROSSOVER ? "light" : "dark"}
                style={{ "--swatch-color": DOT_COLORS[hue] }}
                aria-hidden="true"
              >
                {isPressed && <Check className="hue-dots__check" />}
              </span>
              {hueLabel(hue)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
