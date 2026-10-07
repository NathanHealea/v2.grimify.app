import "./search-chip.css";

import { X } from "lucide-react";

type Props = {
  label: string;
  /** `remove` chips undo a detected filter; `suggest` chips complete what's being typed. */
  variant: "remove" | "suggest";
  onClick: () => void;
};

export function SearchChip({ label, variant, onClick }: Props) {
  return (
    <button
      type="button"
      className="search-chip"
      data-variant={variant}
      aria-label={variant === "remove" ? `Remove ${label}` : undefined}
      onClick={onClick}
    >
      {label}
      {variant === "remove" && <X className="search-chip__icon" aria-hidden="true" />}
    </button>
  );
}
