import "./button.css";

import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  /** `sm` is below the 44px touch target; use it for secondary controls only. */
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
};

export function Button({
  variant = "default",
  size = "md",
  asChild = false,
  className,
  ...props
}: Props) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={className ? `ui-button ${className}` : "ui-button"}
      {...props}
    />
  );
}
