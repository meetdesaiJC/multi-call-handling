import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";
import { usePresence } from "@/lib/usePresence";
import { IconClose } from "@/components/Icon";

/**
 * Tag — synced from Figma "Design System 2.0 / Tags" (node 3464:126546).
 *
 * Descriptive labels for categorizing objects (users, groups, Moments,
 * call tags). Designed for tag groups inside inputs and tables.
 *
 * Figma properties:
 *   Size    → `size`    (Small 20 / Medium 24 / Large 28)
 *   Color   → `color`   (Grey / Blue grey / Purple / Indigo / Orange /
 *                        Pink / Green / Red / AI)
 *   Outline → `outline` (bordered, no fill — not available for Red / AI)
 *   Left    → `icon` or `avatar` slot
 *   Close   → pass `onClose` to show the dismiss control
 *   Info    → optional trailing `infoIcon` slot
 */

const tagVariants = cva(
  "inline-flex max-w-full items-center whitespace-nowrap rounded-[4px] text-center select-none",
  {
    variants: {
      size: {
        // Figma Small — 20px tall, 12/16 text.
        sm: "gap-1 px-2 py-0.5 text-paragraph-sm",
        // Figma Medium — 24px tall, 14/20 text.
        md: "gap-1 px-2 py-0.5 text-paragraph-md",
        // Figma Large — 28px tall, 14/20 text (preferred in inputs/tables).
        lg: "h-7 gap-1 px-2 py-1 text-paragraph-md",
      },
      color: {
        // Accent grey (usage: user tags). Component-set Gray is gray-100.
        grey: "bg-tag-grey-bg text-avatar-grey-fg",
        "blue-grey": "bg-avatar-bluegrey-bg text-avatar-bluegrey-fg",
        purple: "bg-avatar-purple-bg text-avatar-purple-fg",
        indigo: "bg-avatar-indigo-bg text-avatar-indigo-fg",
        orange: "bg-tag-orange-bg text-tag-orange-fg",
        pink: "bg-avatar-pink-bg text-avatar-pink-fg",
        green: "bg-success-secondary text-success-text",
        red: "bg-error-secondary text-error",
        // Blue→purple wash over white, matching Figma Color=AI.
        ai: "bg-[linear-gradient(99deg,rgba(0,76,230,0.15)_46%,rgba(172,112,255,0.15)_145%),linear-gradient(var(--color-white),var(--color-white))] text-foreground",
      },
      outline: {
        true: "bg-transparent",
        false: "",
      },
    },
    compoundVariants: [
      {
        outline: true,
        color: "grey",
        className: "border border-border bg-transparent",
      },
      {
        outline: true,
        color: "blue-grey",
        className: "border border-border bg-transparent",
      },
      {
        outline: true,
        color: "purple",
        className: "border border-purple-300 bg-transparent",
      },
      {
        outline: true,
        color: "indigo",
        className: "border border-indigo-300 bg-transparent",
      },
      {
        outline: true,
        color: "orange",
        // Component-set Outline=Yes, Color=Orange uses warning border + text.
        className: "border border-warning bg-transparent text-warning-text",
      },
      {
        outline: true,
        color: "pink",
        className: "border border-pink-300 bg-transparent",
      },
      {
        outline: true,
        color: "green",
        className: "border border-success bg-transparent",
      },
    ],
    defaultVariants: {
      size: "lg",
      color: "grey",
      outline: false,
    },
  }
);

export type TagColor = NonNullable<VariantProps<typeof tagVariants>["color"]>;
export type TagSize = NonNullable<VariantProps<typeof tagVariants>["size"]>;

/** Colors that have an Outline=Yes variant in Figma. */
const OUTLINE_COLORS = new Set<TagColor>([
  "grey",
  "blue-grey",
  "purple",
  "indigo",
  "orange",
  "pink",
  "green",
]);

const iconBox: Record<TagSize, string> = {
  sm: "size-4",
  md: "size-4",
  lg: "size-5",
};

const closeIconSize: Record<TagSize, 16 | 20> = {
  sm: 16,
  md: 16,
  lg: 20,
};

export interface TagProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof tagVariants> {
  /** Optional leading icon (16px on sm/md, 20px on lg). */
  icon?: React.ReactNode;
  /** Optional leading avatar (typically Avatar size="xs"). */
  avatar?: React.ReactNode;
  /** Optional trailing info icon slot. */
  infoIcon?: React.ReactNode;
  /** Shows a dismiss control; called when the user clicks it. */
  onClose?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Accessible label for the dismiss control. */
  closeLabel?: string;
  /**
   * Presence. Omit it and the tag renders exactly as before — the consumer
   * mounts and unmounts it, and there is no animation, because a node React
   * has already removed cannot animate.
   *
   * Pass it and the tag owns its own enter/exit instead: it stays mounted
   * through the exit before removing itself. `onClose` still just reports
   * the click; flipping `open` to false is the caller's move.
   */
  open?: boolean;
}

/* Exit step for `.tag-presence[data-state="closed"]` in base.css. */
const TAG_EXIT_MS = DURATION.fast;

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  (
    {
      className,
      size = "lg",
      color = "grey",
      outline = false,
      icon,
      avatar,
      infoIcon,
      onClose,
      closeLabel = "Remove",
      children,
      open,
      ...props
    },
    ref
  ) => {
    const controlled = open !== undefined;
    const { mounted, state } = usePresence(open ?? true, TAG_EXIT_MS);
    const resolvedSize: TagSize = size ?? "lg";
    const resolvedColor: TagColor = color ?? "grey";
    const resolvedOutline =
      Boolean(outline) && OUTLINE_COLORS.has(resolvedColor);
    const box = iconBox[resolvedSize];
    const hasClose = typeof onClose === "function";
    const hasLeading = Boolean(avatar || icon);

    if (controlled && !mounted) return null;

    return (
      <span
        ref={ref}
        // Uncontrolled callers get no `data-state`, so the motion rules
        // never match and behaviour is byte-for-byte what it was.
        data-state={controlled ? state : undefined}
        className={cn(
          controlled && "tag-presence",
          tagVariants({
            size: resolvedSize,
            color: resolvedColor,
            outline: resolvedOutline,
          }),
          // Figma tightens trailing padding when a close control is present.
          hasClose && "pr-1.5",
          // Avatar + close uses a slightly wider gap between content & X.
          hasClose && avatar && "gap-1.5",
          className
        )}
        {...props}
      >
        {(hasLeading || children != null) && (
          <span
            className={cn(
              "inline-flex min-w-0 items-center",
              hasLeading && "gap-1"
            )}
          >
            {avatar && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full [&_img]:size-full [&_img]:object-cover",
                  box
                )}
              >
                {avatar}
              </span>
            )}
            {icon && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center justify-center overflow-hidden [&_img]:size-full [&_svg]:size-full",
                  box
                )}
              >
                {icon}
              </span>
            )}
            {children != null && children !== "" && (
              <span className="min-w-0 truncate">{children}</span>
            )}
          </span>
        )}

        {infoIcon && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center overflow-hidden [&_img]:size-full [&_svg]:size-full",
              box
            )}
          >
            {infoIcon}
          </span>
        )}

        {hasClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-[2px] transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand/24 focus-visible:outline-none",
              box
            )}
          >
            <IconClose
              size={closeIconSize[resolvedSize]}
              className={box}
              aria-hidden="true"
            />
          </button>
        )}
      </span>
    );
  }
);
Tag.displayName = "Tag";

export { tagVariants };
