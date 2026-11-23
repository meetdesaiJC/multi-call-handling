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
 * Alert — synced from Figma "Design System 2.0 / Alerts".
 * (Also used as a toast / snackbar / inline message.)
 *
 * Figma exposes it as a matrix of four properties:
 *   Alert Type → `variant` (Success / Info / Warning / Danger → error)
 *   Heading    → pass a `title` to get the bold heading + secondary body,
 *                omit it for a single-line body in the primary text colour
 *   CTA        → `action` slot (the "Learn More" link)
 *   Close      → pass `onClose` to show the dismiss "X"
 */
const alertVariants = cva(
  "relative flex w-full items-start gap-2 rounded-[8px] border px-4 py-3 shadow-400",
  {
    variants: {
      variant: {
        success: "border-success-border bg-success-secondary",
        info: "border-info-border bg-info-secondary",
        warning: "border-warning-border bg-warning-secondary",
        error: "border-error-border bg-error-secondary",
      },
    },
    defaultVariants: { variant: "info" },
  }
);

/* Exit step for `.dismissible[data-state="closed"]` in base.css. */
const DISMISS_EXIT_MS = DURATION.base;

type Variant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

const ICONS: Record<
  Variant,
  {
    Icon: React.ComponentType<{ size?: 16 | 20 | 24; className?: string }>;
    color: string;
  }
> = {
  success: { Icon: IconCircleCheckFilled, color: "text-success" },
  info: { Icon: IconInfoCircleFilled, color: "text-info" },
  warning: { Icon: IconAlertTriangleFilled, color: "text-warning" },
  error: { Icon: IconCircleXFilled, color: "text-error" },
};

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof alertVariants> {
  /** Bold heading. Omit for a single-line alert in the primary text colour. */
  title?: React.ReactNode;
  /** Body copy. */
  children?: React.ReactNode;
  /** Optional CTA slot, e.g. a "Learn More" link. */
  action?: React.ReactNode;
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

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = "info",
      title,
      children,
      action,
      onClose,
      icon,
      open,
      ...props
    },
    ref
  ) => {
    const controlled = open !== undefined;
    const { mounted, state } = usePresence(open ?? true, DISMISS_EXIT_MS);
    const resolved: Variant = variant ?? "info";
    const { Icon, color } = ICONS[resolved];
    // Error/warning are assertive; success/info are polite.
    const role =
      resolved === "error" || resolved === "warning" ? "alert" : "status";

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
          alertVariants({ variant: resolved }),
          className
        )}
        {...props}
      >
        <span className={cn("inline-flex shrink-0", color)}>
          {icon ?? <Icon size={20} className="size-5" />}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            {title && (
              <p className="text-label-md-semi break-words text-foreground">
                {title}
              </p>
            )}
            {children && (
              <p
                className={cn(
                  "text-paragraph-md break-words",
                  title ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {children}
              </p>
            )}
          </div>
          {action && (
            <div className="text-label-md flex items-center text-brand">
              {action}
            </div>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss"
            className="-m-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24 focus-visible:outline-none"
          >
            <IconClose size={16} className="size-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";

export { alertVariants };
