import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import ownerIcon from "./assets/owner.svg";
import premiumIcon from "./assets/premium.svg";

/**
 * Badge — synced from Figma "Design System 2.0 / Badges" (node 3464:126106).
 *
 * Compact pill labels for status, metadata, and categorization.
 *
 * Figma properties:
 *   State     → `variant` (Primary / Primary-inverted / Success / Error /
 *                Error-Inverted / Warning / Blue-grey / Grey-Inverted /
 *                Primary-outline / Purple,
 *                plus special New / Beta / Owner)
 *   Icon      → optional leading `icon` slot (16px)
 *   Indicator → optional 6px status dot (`indicator`)
 *
 * Icon and indicator are independent toggles — prefer one at a time.
 */

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-[16px] text-label-sm select-none",
  {
    variants: {
      variant: {
        // Solid brand blue.
        primary: "bg-brand px-2 py-0.5 text-white",
        // Subtle brand on light grey.
        "primary-inverted": "bg-badge-grey-bg px-2 py-0.5 text-brand",
        // Soft success (Figma has no solid success state).
        success: "bg-success-secondary px-2 py-0.5 text-success-text",
        // Solid error red.
        error: "bg-error px-2 py-0.5 text-white",
        // Soft error.
        "error-inverted": "bg-error-secondary px-2 py-0.5 text-error",
        // Soft warning.
        warning: "bg-warning-secondary px-2 py-0.5 text-warning-text",
        // Neutral blue-grey.
        "blue-grey": "bg-badge-bluegrey-bg px-2 py-0.5 text-foreground",
        // Lowest emphasis — white + grey outline.
        "grey-inverted":
          "border border-line bg-white px-2 py-0.5 text-foreground",
        // Brand label on the grey outline — an active, in-progress state that
        // should read as live without shouting like the solid primary.
        "primary-outline":
          "border border-line bg-white px-2 py-0.5 text-brand",
        // Accent purple — a transient state (ringing, playing IVR) that is
        // neither success nor warning.
        purple: "bg-avatar-purple-bg px-2 py-0.5 text-avatar-purple-fg",
        // Special: pink outline "New".
        new: "border border-badge-pink bg-white px-2 py-0.5 text-badge-pink",
        // Special: dark "Beta".
        beta: "bg-badge-beta px-2 py-0.5 text-white",
        // Special: owner shield only (no pill padding beyond the icon).
        owner: "p-0.5",
      },
    },
    defaultVariants: { variant: "primary" },
  }
);

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/** Indicator fill per state — matches Figma's Indicator instance colours. */
const indicatorColor: Record<
  Exclude<BadgeVariant, "new" | "beta" | "owner">,
  string
> = {
  primary: "bg-white",
  "primary-inverted": "bg-brand",
  success: "bg-success-text",
  error: "bg-white",
  "error-inverted": "bg-error",
  warning: "bg-warning-text",
  "blue-grey": "bg-badge-bluegrey-fg",
  "grey-inverted": "bg-muted-foreground",
  "primary-outline": "bg-brand",
  purple: "bg-avatar-purple-fg",
};

const SPECIAL_DEFAULTS: Partial<Record<BadgeVariant, string>> = {
  new: "New",
  beta: "Beta",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional leading icon (rendered at 16px). */
  icon?: React.ReactNode;
  /** Show a 6px status indicator dot before the label. */
  indicator?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "primary",
      icon,
      indicator = false,
      children,
      ...props
    },
    ref
  ) => {
    const resolved: BadgeVariant = variant ?? "primary";
    const isOwner = resolved === "owner";
    const isSpecial = resolved === "new" || resolved === "beta" || isOwner;
    const label =
      children ?? (isSpecial ? SPECIAL_DEFAULTS[resolved] : undefined);

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant: resolved }), className)}
        {...props}
      >
        {isOwner ? (
          <img
            src={ownerIcon}
            alt=""
            width={16}
            height={16}
            className="size-4 shrink-0"
            aria-hidden="true"
          />
        ) : (
          <>
            {indicator && resolved in indicatorColor && (
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 shrink-0 rounded-[3px]",
                  indicatorColor[
                    resolved as Exclude<BadgeVariant, "new" | "beta" | "owner">
                  ]
                )}
              />
            )}
            {icon && (
              <span className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden [&_img]:size-full [&_svg]:size-full">
                {icon}
              </span>
            )}
            {label != null && label !== "" && <span>{label}</span>}
          </>
        )}
      </span>
    );
  }
);
Badge.displayName = "Badge";

/* ------------------------------------------------------------------ */
/* Premium / upgrade crown — companion icon from the Badges page.     */
/* Sizes match Figma: 16 / 20 / 24.                                   */
/* ------------------------------------------------------------------ */

export type PremiumIconSize = 16 | 20 | 24;

const premiumBox: Record<PremiumIconSize, string> = {
  16: "size-4",
  20: "size-5",
  24: "size-6",
};

const premiumGlyph: Record<PremiumIconSize, string> = {
  // Figma glyph bounds scale with the frame: 14.27×9.6 @ 16, etc.
  16: "h-[9.6px] w-[14.267px]",
  20: "h-3 w-[17.833px]",
  24: "h-[14.4px] w-[21.4px]",
};

export interface PremiumIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: PremiumIconSize;
}

export const PremiumIcon = React.forwardRef<HTMLSpanElement, PremiumIconProps>(
  ({ className, size = 16, ...props }, ref) => (
    <span
      ref={ref}
      role="img"
      aria-label="Premium"
      className={cn(
        "inline-flex items-center justify-center",
        premiumBox[size],
        className
      )}
      {...props}
    >
      <img
        src={premiumIcon}
        alt=""
        className={cn("block max-w-none", premiumGlyph[size])}
        aria-hidden="true"
      />
    </span>
  )
);
PremiumIcon.displayName = "PremiumIcon";

export { badgeVariants };
