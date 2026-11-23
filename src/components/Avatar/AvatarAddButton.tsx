import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { PlusIcon } from "./Avatar";

/**
 * AvatarAddButton — synced from Figma ".Avatar add button".
 *
 * Circular "+" used at the end of an avatar group (invite / add member).
 *   Size  → xsm / sm / md / lg = 20 / 24 / 32 / 40px
 *   State → hover / focus are CSS; `disabled` greys the control
 */

const addButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-white text-foreground outline-none transition-colors " +
    "hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24 " +
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-disabled-fg",
  {
    variants: {
      size: {
        xsm: "size-5 [&_svg]:size-2.5",
        sm: "size-6 [&_svg]:size-3",
        md: "size-8 [&_svg]:size-4",
        lg: "size-10 [&_svg]:size-5",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface AvatarAddButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof addButtonVariants> {}

export const AvatarAddButton = React.forwardRef<
  HTMLButtonElement,
  AvatarAddButtonProps
>(({ className, size = "md", ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={props["aria-label"] ?? "Add"}
      className={cn(addButtonVariants({ size }), className)}
      {...props}
    >
      <PlusIcon />
    </button>
  );
});
AvatarAddButton.displayName = "AvatarAddButton";

export { addButtonVariants };
