import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — synced from Figma "Design System 2.0 / Buttons".
 *
 * Figma exposes each button as a matrix of four properties:
 *   Hirerachy → `variant` (7 values)
 *   Size      → `size`    (xs / sm / md / lg  = 28 / 36 / 40 / 54px tall)
 *   State     → hover / focus / disabled are CSS; `loading` is a prop
 *   Icon      → `leftIcon` / `rightIcon`, or `iconOnly` for the square form
 */
const buttonVariants = cva(
  // Base: shared layout, typography, focus ring, disabled behaviour.
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-[4px] font-medium select-none " +
    // `button-press` (base.css) carries both the colour crossfade and the
    // press nudge, which run at different speeds — see §4.
    // Locked (see LockedControl) looks disabled but keeps pointer events and
    // focus, so the reason can show; its cursor comes from base.css.
    "button-press outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        // Solid brand blue. (Disabled palette is gated on data-loading=false so
        // a loading button keeps its colour and just shows the spinner.)
        primary:
          "bg-brand text-white hover:bg-brand-hover focus-visible:ring-brand/24 " +
          "disabled:data-[loading=false]:bg-disabled-bg disabled:data-[loading=false]:text-disabled-fg " +
          "data-[locked=true]:bg-disabled-bg data-[locked=true]:text-disabled-fg",
        // Brand border + brand text on white.
        "primary-outline":
          "border border-brand bg-white text-brand hover:bg-brand-subtle focus-visible:ring-brand/24 " +
          "disabled:data-[loading=false]:border-line disabled:data-[loading=false]:text-disabled-fg " +
          "data-[locked=true]:border-line data-[locked=true]:bg-white data-[locked=true]:text-disabled-fg",
        // Neutral border, dark text.
        "grey-outline":
          "border border-line bg-white text-foreground hover:bg-surface-hover focus-visible:ring-brand/16 " +
          "disabled:data-[loading=false]:text-disabled-fg " +
          "data-[locked=true]:bg-white data-[locked=true]:text-disabled-fg",
        // Text-only link.
        link:
          "button-press-none bg-transparent text-brand hover:text-brand-hover focus-visible:ring-brand/24 " +
          "disabled:data-[loading=false]:text-disabled-fg " +
          "data-[locked=true]:text-disabled-fg",
        // Solid error red.
        error:
          "bg-error text-white hover:bg-error-hover focus-visible:ring-error/24 " +
          "disabled:data-[loading=false]:bg-disabled-bg disabled:data-[loading=false]:text-disabled-fg " +
          "data-[locked=true]:bg-disabled-bg data-[locked=true]:text-disabled-fg",
        // Error border + error text on white.
        "error-secondary":
          "border border-error bg-white text-error hover:bg-error-subtle focus-visible:ring-error/24 " +
          "disabled:data-[loading=false]:border-line disabled:data-[loading=false]:text-disabled-fg " +
          "data-[locked=true]:border-line data-[locked=true]:bg-white data-[locked=true]:text-disabled-fg",
        // Neutral border + error text.
        "error-grey-outline":
          "border border-line bg-white text-error hover:bg-error-subtle focus-visible:ring-error/16 " +
          "disabled:data-[loading=false]:text-disabled-fg " +
          "data-[locked=true]:bg-white data-[locked=true]:text-disabled-fg",
      },
      size: {
        xs: "h-7 gap-1 px-3 text-label-sm [&_svg]:size-4",
        sm: "h-9 gap-1.5 px-3.5 text-label-md [&_svg]:size-4",
        md: "h-10 gap-1.5 px-4 text-label-md [&_svg]:size-5",
        lg: "h-[54px] gap-2 px-[22px] text-heading-xl [&_svg]:size-5",
      },
      iconOnly: {
        true: "px-0 aspect-square",
        false: "",
      },
    },
    compoundVariants: [
      // Square icon-only buttons: width tracks height, no horizontal padding.
      { size: "xs", iconOnly: true, className: "w-7" },
      { size: "sm", iconOnly: true, className: "w-9" },
      { size: "md", iconOnly: true, className: "w-10" },
      { size: "lg", iconOnly: true, className: "w-[54px]" },
      // Links read as inline text, so drop the button box padding.
      { variant: "link", iconOnly: false, className: "px-0" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
      iconOnly: false,
    },
  }
);

function Spinner() {
  return (
    <svg
      className="animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, "iconOnly"> {
  /** Icon rendered before the label. */
  leftIcon?: React.ReactNode;
  /** Icon rendered after the label. */
  rightIcon?: React.ReactNode;
  /** Square, label-less button. Pass the icon as `children`. */
  iconOnly?: boolean;
  /** Show a spinner and block interaction. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      iconOnly = false,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        data-loading={loading ? "true" : "false"}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size, iconOnly, className }))}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </span>
        )}
        {/* Content is kept mounted (just hidden) while loading so the
            button keeps its width. */}
        <span
          className={cn(
            "inline-flex items-center",
            size === "lg" ? "gap-2" : "gap-1.5",
            loading && "invisible"
          )}
        >
          {leftIcon}
          {children}
          {rightIcon}
        </span>
      </button>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
