import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";
import { usePresence } from "@/lib/usePresence";
import {
  IconAlertTriangleFilled,
  IconInfoCircleFilled,
  IconCircleXFilled,
  IconCircleCheckFilled,
  IconClose,
} from "@/components/Icon";

/**
 * Banner — synced from Figma "Design System 2.0 / Banners" (node 5269:19356).
 *
 * Top-of-screen / in-page banners for essential product messages
 * (what's new, outages, data issues, significant site-wide info).
 *
 * Figma properties:
 *   Type   → `variant` (Info / Warning / Error / Success)
 *   Width  → `width`   (Full / Page specific)
 *   Buttons→ `action` (full: inline link) or `actions` (page: button group)
 *   Cancel → pass `onClose` to show the dismiss "X"
 */
const bannerVariants = cva(
  "relative flex w-full items-center overflow-clip px-3",
  {
    variants: {
      variant: {
        warning: "bg-warning-secondary",
        info: "bg-info-secondary",
        error: "bg-error-secondary",
        success: "bg-success-secondary",
      },
      width: {
        // Site-wide top bar — left-aligned message, no border/radius.
        full: "h-10",
        // In-page banner — bordered, left-aligned message + trailing actions.
        page: "gap-4 rounded-[4px] border py-2",
      },
    },
    compoundVariants: [
      { variant: "warning", width: "page", className: "border-warning-border" },
      { variant: "info", width: "page", className: "border-info-border" },
      { variant: "error", width: "page", className: "border-error-border" },
      { variant: "success", width: "page", className: "border-success-border" },
    ],
    defaultVariants: {
      variant: "warning",
      width: "full",
    },
  }
);

type BannerVariant = NonNullable<VariantProps<typeof bannerVariants>["variant"]>;

const STATUS_ICONS: Record<
  BannerVariant,
  React.ComponentType<{ size?: 16 | 20 | 24; className?: string }>
> = {
  warning: IconAlertTriangleFilled,
  info: IconInfoCircleFilled,
  error: IconCircleXFilled,
  success: IconCircleCheckFilled,
};

const STATUS_COLOR: Record<BannerVariant, string> = {
  warning: "text-warning",
  info: "text-info",
  error: "text-error",
  success: "text-success",
};

function StatusIcon({ variant }: { variant: BannerVariant }) {
  const Icon = STATUS_ICONS[variant];
  return (
    <Icon
      size={20}
      className={cn("size-5 shrink-0", STATUS_COLOR[variant])}
      aria-hidden="true"
    />
  );
}

export interface BannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof bannerVariants> {
  /** Bold lead-in, rendered inline before the body. */
  title?: React.ReactNode;
  /** Supporting body copy, rendered inline after the title. */
  children?: React.ReactNode;
  /**
   * Inline CTA — typically an underlined link.
   * Shown beside the message (full) or unused when `actions` is set (page).
   */
  action?: React.ReactNode;
  /**
   * Trailing action group for page-width banners
   * (e.g. secondary + primary `Button`s at size `xs`).
   */
  actions?: React.ReactNode;
  /** Pass a handler to show the dismiss button. */
  onClose?: () => void;
  /** Override the leading status icon. */
  icon?: React.ReactNode;
  /**
   * Presence. Omit it and the component renders exactly as before — the
   * consumer mounts and unmounts it, and there is no animation, because a
   * node React has already removed cannot animate.
   *
   * Pass it and the component owns its own enter/exit instead: it stays
   * mounted through the exit before removing itself. `onClose` still just
   * reports the click; flipping `open` to false is the caller's move.
   */
  open?: boolean;
}

/* Exit step for `.dismissible[data-state="closed"]` in base.css. */
const DISMISS_EXIT_MS = DURATION.base;

export const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  (
    {
      className,
      variant = "warning",
      width = "full",
      title,
      children,
      action,
      actions,
      onClose,
      icon,
      open,
      ...props
    },
    ref
  ) => {
    const controlled = open !== undefined;
    const { mounted, state } = usePresence(open ?? true, DISMISS_EXIT_MS);
    const resolved: BannerVariant = variant ?? "warning";
    const isFull = width !== "page";
    const role =
      resolved === "error" || resolved === "warning" ? "alert" : "status";

    const message = (
      <p className="min-w-0 text-[14px] leading-5 text-foreground break-words">
        {title != null && title !== "" && (
          <span className="font-semibold">{title} </span>
        )}
        {children != null && children !== "" && (
          <span className="font-normal">{children}</span>
        )}
      </p>
    );

    if (controlled && !mounted) return null;

    return (
      <div
        ref={ref}
        role={role}
        // Uncontrolled callers get no `data-state`, so the motion rules
        // never match and behaviour is byte-for-byte what it was.
        data-state={controlled ? state : undefined}
        className={cn(
          controlled && "dismissible",
          bannerVariants({ variant: resolved, width }),
          className
        )}
        {...props}
      >
        {isFull ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {icon ?? <StatusIcon variant={resolved} />}
              <div className="flex items-center gap-2">
                {message}
                {action && (
                  <div className="flex h-5 shrink-0 items-center justify-center text-label-md text-brand [&_a]:underline">
                    {action}
                  </div>
                )}
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss"
                className="shrink-0 rounded text-foreground transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-brand/24 focus-visible:outline-none"
              >
                <IconClose size={20} className="size-5" />
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {icon ?? <StatusIcon variant={resolved} />}
              {message}
            </div>
            {(actions || action || onClose) && (
              <div className="flex shrink-0 items-center justify-center gap-4">
                {actions && (
                  <div className="flex items-center gap-3">{actions}</div>
                )}
                {!actions && action && (
                  <div className="flex items-center gap-3">{action}</div>
                )}
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Dismiss"
                    className="shrink-0 rounded text-foreground transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-brand/24 focus-visible:outline-none"
                  >
                    <IconClose size={20} className="size-5" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);
Banner.displayName = "Banner";

export { bannerVariants };
