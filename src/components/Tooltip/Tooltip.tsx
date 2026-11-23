import * as React from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";
import { usePresence } from "@/lib/usePresence";
import { IconClose } from "@/components/Icon";
import arrowLight from "./assets/arrow-light.svg";
import arrowDark from "./assets/arrow-dark.svg";

/**
 * Tooltip — synced from Figma "Design System 2.0 / Tooltips" (node 3464:126547).
 *
 * Unobtrusive contextual labels that appear on hover / focus. Content can be
 * a short label or a richer card (icon, badge, supporting text, media, CTA).
 *
 * Figma properties:
 *   Theme → `theme`  (Light / Dark)
 *   Arrow → `arrow`  (Bottom/Top × Left/Center/Right, Left, Right, None)
 *   Icon / Badge / Media / Close / Button → optional slots
 */

const tooltipShellVariants = cva("inline-flex w-max max-w-80", {
  variants: {
    arrow: {
      "top-center": "flex-col items-center",
      "top-left": "flex-col items-start",
      "top-right": "flex-col items-end",
      "bottom-center": "flex-col items-center",
      "bottom-left": "flex-col items-start",
      "bottom-right": "flex-col items-end",
      left: "flex-row items-center",
      right: "flex-row items-center",
      none: "flex-col items-stretch",
    },
  },
  defaultVariants: { arrow: "top-center" },
});

const tooltipContentVariants = cva(
  "relative flex w-full min-w-0 flex-col items-start rounded-[4px] shadow-400",
  {
    variants: {
      theme: {
        light: "bg-white text-foreground",
        dark: "bg-tooltip-dark-bg text-tooltip-dark-fg",
      },
      padded: {
        compact: "px-3 py-2",
        comfortable: "p-3",
      },
    },
    defaultVariants: {
      theme: "dark",
      padded: "compact",
    },
  }
);

export type TooltipTheme = NonNullable<
  VariantProps<typeof tooltipContentVariants>["theme"]
>;
export type TooltipArrow = NonNullable<
  VariantProps<typeof tooltipShellVariants>["arrow"]
>;

const ARROW_SRC: Record<TooltipTheme, string> = {
  light: arrowLight,
  dark: arrowDark,
};

function isTopArrow(arrow: TooltipArrow) {
  return arrow.startsWith("top-");
}
function isBottomArrow(arrow: TooltipArrow) {
  return arrow.startsWith("bottom-");
}
function isEdgeAligned(arrow: TooltipArrow) {
  return arrow.endsWith("-left") || arrow.endsWith("-right");
}

/** Caret from Figma — 16×8.5 triangle, rotated per side. */
function TooltipArrowMark({
  theme,
  arrow,
}: {
  theme: TooltipTheme;
  arrow: Exclude<TooltipArrow, "none">;
}) {
  const src = ARROW_SRC[theme];
  const edgeRail = isEdgeAligned(arrow);

  if (arrow === "left" || arrow === "right") {
    return (
      <span
        className={cn(
          "inline-flex h-4 w-1.5 shrink-0 items-center justify-center overflow-visible",
          arrow === "left" ? "-mr-px" : "-ml-px"
        )}
        aria-hidden="true"
      >
        <img
          src={src}
          alt=""
          className={cn(
            "block h-1.5 w-4 max-w-none",
            arrow === "left" ? "rotate-90" : "-rotate-90"
          )}
        />
      </span>
    );
  }

  return (
    <span
      // TooltipTrigger slides this back when it nudges the bubble on-screen,
      // so the point keeps landing on the trigger.
      data-tooltip-arrow=""
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-visible",
        edgeRail ? "w-7" : "w-4",
        isTopArrow(arrow) ? "-mb-px" : "-mt-px"
      )}
      aria-hidden="true"
    >
      <img
        src={src}
        alt=""
        className={cn(
          "block h-[8.515px] w-4 max-w-none",
          isTopArrow(arrow) && "rotate-180"
        )}
      />
    </span>
  );
}

export interface TooltipProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof tooltipShellVariants>,
    VariantProps<typeof tooltipContentVariants> {
  /** Primary label (medium 12/16). */
  title?: React.ReactNode;
  /** Supporting copy under the title. */
  description?: React.ReactNode;
  /** Optional leading icon (16px). */
  icon?: React.ReactNode;
  /** Optional badge beside the title (e.g. `<Badge variant="new" />`). */
  badge?: React.ReactNode;
  /** Optional media block above the text (illustrations / screenshots). */
  media?: React.ReactNode;
  /** Optional CTA slot (text button / link). */
  action?: React.ReactNode;
  /** Shows a dismiss control when provided. */
  onClose?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Accessible label for the dismiss control. */
  closeLabel?: string;
  /**
   * Custom body — used for freeform content (e.g. avatar name lists).
   * When set without `title` / `description`, replaces the text block.
   */
  children?: React.ReactNode;
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      className,
      theme = "dark",
      arrow = "top-center",
      title,
      description,
      icon,
      badge,
      media,
      action,
      onClose,
      closeLabel = "Dismiss",
      children,
      ...props
    },
    ref
  ) => {
    const resolvedTheme: TooltipTheme = theme ?? "dark";
    const resolvedArrow: TooltipArrow = arrow ?? "top-center";
    const hasClose = typeof onClose === "function";
    const hasStructured =
      title != null ||
      description != null ||
      Boolean(media) ||
      Boolean(action) ||
      Boolean(icon) ||
      Boolean(badge) ||
      hasClose;
    const hasCustomOnly = children != null && !hasStructured;
    const comfortable = Boolean(media || description);

    const titleColor =
      resolvedTheme === "dark" ? "text-tooltip-dark-fg" : "text-foreground";
    const mutedColor =
      resolvedTheme === "dark"
        ? "text-tooltip-dark-muted"
        : "text-muted-foreground";
    const actionColor =
      resolvedTheme === "dark" ? "text-tooltip-dark-link" : "text-brand";
    const closeColor =
      resolvedTheme === "dark"
        ? "text-tooltip-dark-fg hover:opacity-80"
        : "text-muted-foreground hover:text-foreground";

    // Media variants put the badge before the title; text+badge puts it after.
    const badgeFirst = Boolean(media);
    // Figma: Medium for plain / rich titles; Regular when icon or badge
    // shares a compact single-line row.
    const titleClass =
      description || (!icon && !badge) ? "text-label-sm" : "text-paragraph-sm";

    const closeButton = hasClose ? (
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-[2px] transition-opacity focus-visible:ring-2 focus-visible:ring-brand/24 focus-visible:outline-none",
          closeColor
        )}
      >
        <IconClose size={16} className="size-4" aria-hidden="true" />
      </button>
    ) : null;

    const titleRow =
      title != null || badge || hasClose ? (
        <div className="flex w-full min-w-0 items-center gap-2 pr-1">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {badgeFirst && badge}
            {title != null && title !== "" && (
              <p className={cn(titleClass, "min-w-0 break-words", titleColor)}>
                {title}
              </p>
            )}
            {!badgeFirst && badge}
          </div>
          {closeButton}
        </div>
      ) : null;

    const textColumn = (
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col items-start",
          (description || action) && "gap-1"
        )}
      >
        {titleRow}
        {description != null && description !== "" && (
          <p className={cn("text-paragraph-sm w-full break-words", mutedColor)}>
            {description}
          </p>
        )}
        {action != null && (
          <div
            className={cn(
              "text-label-sm inline-flex items-center",
              actionColor,
              "[&_a]:text-inherit [&_a]:no-underline hover:[&_a]:underline [&_button]:text-inherit"
            )}
          >
            {action}
          </div>
        )}
        {children != null && hasStructured && (
          <div className={cn("text-paragraph-sm break-words", mutedColor)}>
            {children}
          </div>
        )}
      </div>
    );

    const body = hasCustomOnly ? (
      <div
        className={cn(
          "text-paragraph-md w-full whitespace-pre-wrap break-words",
          titleColor
        )}
      >
        {children}
      </div>
    ) : (
      <div className={cn("flex w-full min-w-0 flex-col", media && "gap-2")}>
        {media && (
          <div className="relative w-full overflow-hidden rounded-[4px] [&_img]:block [&_img]:h-auto [&_img]:w-full [&_img]:object-cover">
            {media}
          </div>
        )}
        <div
          className={cn(
            "flex w-full min-w-0",
            icon ? "items-start gap-1" : "flex-col"
          )}
        >
          {icon && (
            <span
              className={cn(
                "inline-flex size-4 shrink-0 items-center justify-center overflow-hidden [&_img]:size-full [&_svg]:size-full",
                titleColor
              )}
            >
              {icon}
            </span>
          )}
          {textColumn}
        </div>
      </div>
    );

    const showArrow = resolvedArrow !== "none";
    const arrowNode = showArrow ? (
      <TooltipArrowMark theme={resolvedTheme} arrow={resolvedArrow} />
    ) : null;

    return (
      <div
        ref={ref}
        role="tooltip"
        className={cn(
          tooltipShellVariants({ arrow: resolvedArrow }),
          className
        )}
        {...props}
      >
        {showArrow &&
          (isTopArrow(resolvedArrow) || resolvedArrow === "left") &&
          arrowNode}

        <div
          className={cn(
            tooltipContentVariants({
              theme: resolvedTheme,
              padded: comfortable ? "comfortable" : "compact",
            })
          )}
        >
          {body}
        </div>

        {showArrow &&
          (isBottomArrow(resolvedArrow) || resolvedArrow === "right") &&
          arrowNode}
      </div>
    );
  }
);
Tooltip.displayName = "Tooltip";

/* ------------------------------------------------------------------ */
/* Exit step for `.tooltip-presence[data-state="closed"]` in base.css. */
const TOOLTIP_EXIT_MS = DURATION.micro;

/* Trigger — hover / focus wrapper with a brief open delay.           */
/* Default placement is above the trigger (Figma: icon buttons).      */
/* ------------------------------------------------------------------ */

const TRIGGER_GAP_PX = 4;

type TriggerPlacement =
  | "top"
  | "top-center"
  | "top-left"
  | "top-right"
  | "bottom"
  | "bottom-center"
  | "bottom-left"
  | "bottom-right"
  | "left"
  | "right";

/** Viewport-fixed coords so the bubble isn't clipped by overflow ancestors. */
/** Closest a tooltip may sit to the viewport edge. */
const VIEWPORT_MARGIN_PX = 8;

function getFixedStyle(
  placement: TriggerPlacement,
  trigger: DOMRect
): React.CSSProperties {
  const gap = TRIGGER_GAP_PX;
  const cx = trigger.left + trigger.width / 2;
  const cy = trigger.top + trigger.height / 2;

  switch (placement) {
    case "top":
    case "top-center":
      return {
        top: trigger.top - gap,
        left: cx,
        transform: "translate(-50%, -100%)",
      };
    case "top-left":
      return {
        top: trigger.top - gap,
        left: trigger.left,
        transform: "translateY(-100%)",
      };
    case "top-right":
      return {
        top: trigger.top - gap,
        left: trigger.right,
        transform: "translate(-100%, -100%)",
      };
    case "bottom":
    case "bottom-center":
      return { top: trigger.bottom + gap, left: cx, transform: "translateX(-50%)" };
    case "bottom-left":
      return { top: trigger.bottom + gap, left: trigger.left };
    case "bottom-right":
      return {
        top: trigger.bottom + gap,
        left: trigger.right,
        transform: "translateX(-100%)",
      };
    case "left":
      return {
        top: cy,
        left: trigger.left - gap,
        transform: "translate(-100%, -50%)",
      };
    case "right":
      return {
        top: cy,
        left: trigger.right + gap,
        transform: "translateY(-50%)",
      };
  }
}

export interface TooltipTriggerProps {
  /** Tooltip content — typically a `<Tooltip />` bubble. */
  content: React.ReactNode;
  children: React.ReactElement<Record<string, unknown>>;
  /** Where the bubble sits relative to the trigger. Default: above. */
  placement?: TriggerPlacement;
  /** Open delay in ms (Figma: brief delay on hover). */
  delay?: number;
  /**
   * Keep the bubble open while the pointer is over it, and allow clicking
   * content inside (CTAs). Off by default — labels shouldn't steal clicks.
   */
  interactive?: boolean;
  /** Close delay in ms when `interactive` (covers the gap to the bubble). */
  closeDelay?: number;
  /** Controlled open state. */
  open?: boolean;
  /** Default open for uncontrolled usage. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function TooltipTrigger({
  content,
  children,
  placement = "top",
  delay = 200,
  interactive = false,
  closeDelay = 120,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  disabled = false,
}: TooltipTriggerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const bubbleRef = React.useRef<HTMLSpanElement>(null);

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const clearTimer = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleOpen = () => {
    if (disabled) return;
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(true), delay);
  };

  const close = () => {
    clearTimer();
    setOpen(false);
  };

  const scheduleClose = () => {
    if (!interactive) {
      close();
      return;
    }
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(false), closeDelay);
  };

  const cancelClose = () => {
    if (disabled) return;
    clearTimer();
    setOpen(true);
  };

  React.useEffect(() => () => clearTimer(), []);

  const show = open && !disabled;
  // No API change needed here — Tooltip already owns `open`. It just used to
  // unmount the bubble in the same tick, leaving nothing to animate.
  const { mounted, state } = usePresence(show, TOOLTIP_EXIT_MS);

  // Keyed on `mounted`, not `show`. `show` flips true one render *before* the
  // bubble exists, so positioning off it would run against a null ref and
  // never re-run — the bubble would sit at top:0 left:0. Staying subscribed
  // through the exit also keeps it anchored while it fades.
  React.useLayoutEffect(() => {
    if (!mounted) return;
    const update = () => {
      const trigger = triggerRef.current;
      const bubble = bubbleRef.current;
      if (!trigger || !bubble) return;
      const next = getFixedStyle(placement, trigger.getBoundingClientRect());
      bubble.style.top = `${next.top}px`;
      bubble.style.left = `${next.left}px`;
      bubble.style.transform = typeof next.transform === "string" ? next.transform : "none";

      // Keep the bubble inside the viewport. A control near the edge (a ⋮ at
      // the far right of a toolbar) would otherwise push half the bubble off
      // screen. Shift it in, then slide the arrow back by the same amount so
      // it still points at the trigger.
      const arrowEl = bubble.querySelector<HTMLElement>("[data-tooltip-arrow]");
      if (arrowEl) arrowEl.style.translate = "";
      if (placement === "left" || placement === "right") return;
      const box = bubble.getBoundingClientRect();
      const margin = VIEWPORT_MARGIN_PX;
      let dx = 0;
      if (box.left < margin) dx = margin - box.left;
      else if (box.right > window.innerWidth - margin) {
        dx = window.innerWidth - margin - box.right;
      }
      if (dx !== 0) {
        bubble.style.left = `${Number(next.left) + dx}px`;
        if (arrowEl) arrowEl.style.translate = `${-dx}px 0`;
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [mounted, placement]);

  const child = React.cloneElement(children, {
    onMouseEnter: (event: React.MouseEvent) => {
      const prev = children.props.onMouseEnter as
        | ((e: React.MouseEvent) => void)
        | undefined;
      prev?.(event);
      scheduleOpen();
    },
    onMouseLeave: (event: React.MouseEvent) => {
      const prev = children.props.onMouseLeave as
        | ((e: React.MouseEvent) => void)
        | undefined;
      prev?.(event);
      scheduleClose();
    },
    onFocus: (event: React.FocusEvent) => {
      const prev = children.props.onFocus as
        | ((e: React.FocusEvent) => void)
        | undefined;
      prev?.(event);
      scheduleOpen();
    },
    onBlur: (event: React.FocusEvent) => {
      const prev = children.props.onBlur as
        | ((e: React.FocusEvent) => void)
        | undefined;
      prev?.(event);
      if (interactive) {
        const next = event.relatedTarget;
        if (next instanceof Node && bubbleRef.current?.contains(next)) return;
        scheduleClose();
        return;
      }
      close();
    },
  });

  return (
    <span ref={triggerRef} className={cn("relative inline-flex", className)}>
      {child}
      {mounted && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={bubbleRef}
              data-state={state}
              className={cn(
                // `flex`, not the default block: the bubble is inline-flex, and
                // in a block it sits on a text line whose line-height pushed
                // it ~9px past TRIGGER_GAP_PX, away from its trigger.
                "tooltip-presence fixed z-[100] flex",
                interactive ? "pointer-events-auto" : "pointer-events-none"
              )}
              style={{ top: 0, left: 0 }}
              onMouseEnter={interactive ? cancelClose : undefined}
              onMouseLeave={interactive ? scheduleClose : undefined}
            >
              {content}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}

export { tooltipShellVariants, tooltipContentVariants };
