import "./paint-swatch.css";

import { wcagLuminance } from "culori";
import { Droplet, Layers, type LucideIcon, Sparkles } from "lucide-react";

import type { PaintType } from "@/features/catalog/schema";

type Props = {
  hex: string;
  type?: PaintType;
  size?: "md" | "lg";
};

// Hex can't show sheen or transparency, so these types get a marker (DESIGN_SYSTEM §10).
const TYPE_ICONS: Partial<Record<PaintType, LucideIcon>> = {
  metallic: Sparkles,
  wash: Droplet,
  shade: Droplet,
  ink: Droplet,
  contrast: Layers,
  speedpaint: Layers,
};

/** Decorative: the paint's name and type are always given in text next to it. */
// Relative luminance where black and white ink have equal contrast.
const INK_CROSSOVER = 0.18;

export function PaintSwatch({ hex, type, size = "md" }: Props) {
  const Icon = type ? TYPE_ICONS[type] : undefined;

  return (
    <span
      className="paint-swatch"
      data-size={size}
      data-tone={wcagLuminance(hex) > INK_CROSSOVER ? "light" : "dark"}
      style={{ "--swatch-color": hex }}
      aria-hidden="true"
    >
      {Icon && <Icon className="paint-swatch__icon" />}
    </span>
  );
}
