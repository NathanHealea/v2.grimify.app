import "./input.css";

import type { ComponentProps } from "react";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={className ? `ui-input ${className}` : "ui-input"}
      {...props}
    />
  );
}
