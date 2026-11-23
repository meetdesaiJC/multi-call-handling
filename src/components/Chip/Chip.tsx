import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { IconCircleCheckFilled, IconClose } from "@/components/Icon";

/**
 * Chip — synced from Figma "Design System 2.0 / Chips" (node 3464:126124).
 *
 * Two families:
 *   Filter chips     → selectable filters (sizes 40 / 36 / 28)
 *   Suggestion chips → quick-reply / assistive options (fixed 32px)
 *
 * Figma properties:
 *   Configuration → optional leading `icon`
 *   Size          → `size` (lg / md / sm) — filter only; suggestion is fixed
 *   State         → hover / disabled via CSS; `selected` + `loading` as props
 *
 * Selected behaviour (filter only):
 *   With icon  → leading icon becomes a filled brand check
 *   Text only  → trailing close/remove affordance
 */

const chipVariants = cva(
  "relative inline-flex items-center justify-center overflow-clip whitespace-nowrap rounded-[4px] border border-solid select-none " +
    "transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand/16 " +
    "disabled:pointer-events-none disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        filter:
          "border-line bg-white text-foreground hover:bg-surface-hover " +
          "disabled:border-line disabled:bg-white disabled:text-disabled-fg " +
          "data-[selected=true]:border-brand data-[selected=true]:bg-brand-subtle data-[selected=true]:text-brand " +
          "data-[selected=true]:hover:bg-brand-subtle",
        suggestion:
          "h-8 border-line bg-white text-foreground hover:bg-surface-hover " +
          "disabled:border-line disabled:bg-white disabled:text-disabled-fg",
      },
      size: {
        // Filter heights: 40 / 36 / 28. Suggestion ignores size (h-8 above).
        lg: "h-10",
        md: "h-9",
        sm: "h-7",
      },
    },
    defaultVariants: {
      variant: "filter",
      size: "lg",
    },
  }
);

const contentVariants = cva("inline-flex items-center justify-center", {
  variants: {
    variant: {
      filter: "",
      suggestion: "gap-2 py-1.5 pl-4 pr-5",
    },
    size: {
      lg: "",
      md: "",
      sm: "",
    },
    layout: {
      text: "",
      icon: "gap-2",
      selectedText: "gap-2",
      selectedIcon: "gap-2",
      loadingText: "gap-2",
      loadingIcon: "gap-2",
    },
  },
  compoundVariants: [
    // Filter — text only
    { variant: "filter", layout: "text", size: "lg", className: "px-5" },
    { variant: "filter", layout: "text", size: "md", className: "px-4" },
    { variant: "filter", layout: "text", size: "sm", className: "px-4" },
    // Filter — leading icon / loading spinner leading
    { variant: "filter", layout: "icon", size: "lg", className: "pl-4 pr-5" },
    { variant: "filter", layout: "icon", size: "md", className: "pl-4 pr-5" },
    { variant: "filter", layout: "icon", size: "sm", className: "pl-3 pr-4" },
    {
      variant: "filter",
      layout: "loadingIcon",
      size: "lg",
      className: "pl-4 pr-5",
    },
    {
      variant: "filter",
      layout: "loadingIcon",
      size: "md",
      className: "pl-4 pr-5",
    },
    {
      variant: "filter",
      layout: "loadingIcon",
      size: "sm",
      className: "pl-3 pr-4",
    },
    // Filter — selected text only (label + close)
    {
      variant: "filter",
      layout: "selectedText",
      size: "lg",
      className: "px-4",
    },
    {
      variant: "filter",
      layout: "selectedText",
      size: "md",
      className: "px-4",
    },
    {
      variant: "filter",
      layout: "selectedText",
      size: "sm",
      className: "pl-3 pr-4",
    },
    // Filter — selected with check
    {
      variant: "filter",
      layout: "selectedIcon",
      size: "lg",
      className: "px-4",
    },
    {
      variant: "filter",
      layout: "selectedIcon",
      size: "md",
      className: "px-4",
    },
    {
      variant: "filter",
      layout: "selectedIcon",
      size: "sm",
      className: "pl-3 pr-4",
    },
    // Filter — loading text only (label + trailing spinner)
    {
      variant: "filter",
      layout: "loadingText",
      size: "lg",
      className: "px-4",
    },
    {
      variant: "filter",
      layout: "loadingText",
      size: "md",
      className: "px-4",
    },
    {
      variant: "filter",
      layout: "loadingText",
      size: "sm",
      className: "px-4",
    },
  ],
  defaultVariants: {
    variant: "filter",
    size: "lg",
    layout: "text",
  },
});

type ChipSize = NonNullable<VariantProps<typeof chipVariants>["size"]>;
type ChipLayout =
  | "text"
  | "icon"
  | "selectedText"
  | "selectedIcon"
  | "loadingText"
  | "loadingIcon";

function labelClass(size: ChipSize, selected: boolean, isSuggestion: boolean) {
  if (isSuggestion) return "text-paragraph-md";
  if (selected) {
    return size === "sm" ? "text-label-sm" : "text-label-md";
  }
  return size === "sm" ? "text-paragraph-sm" : "text-paragraph-md";
}

function Spinner() {
  return (
    <svg
      className="size-4 shrink-0 animate-spin text-brand"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.25"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled">,
    VariantProps<typeof chipVariants> {
  /** Leading icon (16px filter / 20px suggestion). Replaced by check when selected. */
  icon?: React.ReactNode;
  /** Selected / applied filter state. Ignored for suggestion chips. */
  selected?: boolean;
  /** Show a spinner; blocks interaction. */
  loading?: boolean;
  /** Grey out and block interaction. */
  disabled?: boolean;
  /**
   * Called when the trailing close on a selected text-only filter chip is
   * activated. If omitted, the close still renders and toggles selection off
   * via `onSelectedChange(false)` when that handler is provided.
   */
  onRemove?: (event: React.MouseEvent) => void;
  /** Controlled selection change (filter chips). */
  onSelectedChange?: (selected: boolean) => void;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  (
    {
      className,
      variant = "filter",
      size = "lg",
      icon,
      selected = false,
      loading = false,
      disabled = false,
      onRemove,
      onSelectedChange,
      onClick,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isFilter = variant === "filter";
    const isSuggestion = variant === "suggestion";
    const isSelected = isFilter && selected;
    const hasIcon = Boolean(icon);
    const resolvedSize: ChipSize = isSuggestion ? "md" : (size ?? "lg");
    const isDisabled = disabled || loading;

    let layout: ChipLayout = hasIcon ? "icon" : "text";
    if (loading) {
      layout = hasIcon ? "loadingIcon" : "loadingText";
    } else if (isSelected) {
      layout = hasIcon ? "selectedIcon" : "selectedText";
    }

    const checkSize = resolvedSize === "sm" ? 16 : 20;
    const closeSize = resolvedSize === "sm" ? 16 : 20;
    const leadingIconSize = isSuggestion ? 20 : 16;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented || !isFilter || isDisabled) return;
      onSelectedChange?.(!selected);
    };

    const handleRemove = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (onRemove) {
        onRemove(event);
        return;
      }
      onSelectedChange?.(false);
    };

    const showTrailingClose = isSelected && !hasIcon && !loading;
    const showLeadingCheck = isSelected && hasIcon && !loading;
    const showLeadingSpinner = loading && hasIcon;
    const showTrailingSpinner = loading && !hasIcon;
    const showLeadingIcon = hasIcon && !loading && !isSelected;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        data-selected={isSelected ? "true" : "false"}
        data-loading={loading ? "true" : "false"}
        aria-pressed={isFilter ? isSelected : undefined}
        aria-busy={loading || undefined}
        className={cn(
          chipVariants({
            variant,
            size: isSuggestion ? undefined : resolvedSize,
          }),
          contentVariants({
            variant,
            size: isSuggestion ? undefined : resolvedSize,
            layout: isSuggestion ? undefined : layout,
          }),
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {showLeadingSpinner && <Spinner />}
        {showLeadingCheck && (
          <IconCircleCheckFilled
            size={checkSize}
            className="shrink-0 text-brand"
          />
        )}
        {showLeadingIcon && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center overflow-hidden [&_svg]:size-full",
              leadingIconSize === 20 ? "size-5" : "size-4",
              disabled && "text-disabled-fg"
            )}
          >
            {icon}
          </span>
        )}

        {children != null && children !== "" && (
          <span
            className={cn(
              labelClass(resolvedSize, isSelected, isSuggestion),
              disabled && "text-disabled-fg"
            )}
          >
            {children}
          </span>
        )}

        {showTrailingSpinner && <Spinner />}

        {showTrailingClose && (
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex shrink-0 items-center justify-center text-brand",
              closeSize === 20 ? "size-5" : "size-4"
            )}
            onClick={handleRemove}
          >
            <IconClose size={closeSize} />
          </span>
        )}
      </button>
    );
  }
);
Chip.displayName = "Chip";

export { chipVariants };
