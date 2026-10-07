import "./sheet.css";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";

// Converted from shadcn's Sheet; only the bottom side is kept, since the app only uses bottom sheets.

function withClass(base: string, className?: string) {
  return className ? `${base} ${className}` : base;
}

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" className="ui-sheet-overlay" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={withClass("ui-sheet", className)}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="ui-sheet__close" aria-label="Close">
          <X aria-hidden="true" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="sheet-header" className={withClass("ui-sheet__header", className)} {...props} />
  );
}

/** Scrolls when the content is taller than the sheet; header and footer stay put. */
export function SheetBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="sheet-body" className={withClass("ui-sheet__body", className)} {...props} />
  );
}

export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="sheet-footer" className={withClass("ui-sheet__footer", className)} {...props} />
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={withClass("ui-sheet__title", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={withClass("ui-sheet__description", className)}
      {...props}
    />
  );
}
