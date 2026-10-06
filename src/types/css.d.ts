import "react";

// Lets components pass data values as CSS custom properties (CODE_STYLE §5a).
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
