import * as React from "react";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";

/**
 * LockedControl — the one rule across JustCall for things a license blocks:
 * keep the entry point visible, mute it, and say why on hover, keyboard focus
 * or tap.
 *
 * Hiding a blocked control makes the product look smaller than it is and
 * leaves the person guessing whether a feature exists. Disabling it with the
 * `disabled` attribute is no better: a disabled button can't take focus or
 * pointer events, so the reason has nowhere to show. This keeps the control
 * focusable and marks it `aria-disabled` + `data-locked`, swallows its action,
 * and shows the reason in a tooltip instead.
 *
 * Wrap any single control. `Button` reads `data-locked` and takes its muted
 * palette; other controls style `data-[locked=true]:` themselves.
 *
 * The reason and hint default to LICENSE_LOCK_REASON / LICENSE_LOCK_HINT —
 * the same two lines everywhere.
 *
 * Tap: a click opens the reason immediately (touch has no hover); Escape,
 * moving focus away or the pointer leaving closes it.
 */
/**
 * The one message for every license-blocked control. Generic on purpose: the
 * same words everywhere teach people the pattern, and they never have to
 * parse which license unlocks which feature from a tooltip.
 */
export const LICENSE_LOCK_REASON = "Not available with your license";
export const LICENSE_LOCK_HINT =
  "This action isn’t included in your current license. Contact your admin for access.";

/**
 * A lock on one control. Usually empty — `{}` means "locked, with the default
 * reason". `reason` / `hint` exist for the rare control that needs to say more.
 */
export interface Lock {
  reason?: React.ReactNode;
  hint?: React.ReactNode;
}

export interface LockedControlProps {
  /** Defaults to LICENSE_LOCK_REASON; override only when a control needs more. */
  reason?: React.ReactNode;
  /** Defaults to LICENSE_LOCK_HINT. */
  hint?: React.ReactNode;
  /** When false, renders the child untouched — so callers can lock conditionally. */
  locked?: boolean;
  placement?: React.ComponentProps<typeof TooltipTrigger>["placement"];
  /** Class for the wrapper — e.g. `flex w-full` when the control is a full-width row. */
  triggerClassName?: string;
  children: React.ReactElement<Record<string, unknown>>;
}

export function LockedControl({
  reason = LICENSE_LOCK_REASON,
  hint = LICENSE_LOCK_HINT,
  locked = true,
  placement = "bottom",
  triggerClassName,
  children,
}: LockedControlProps) {
  const [open, setOpen] = React.useState(false);

  if (!locked) return children;

  const arrow =
    placement === "right"
      ? "left"
      : placement === "left"
        ? "right"
        : placement.startsWith("top")
          ? "bottom-center"
          : "top-center";
  const child = React.cloneElement(children, {
    "aria-disabled": true,
    "data-locked": "true",
    // The action is blocked; the click becomes the touch way to read why.
    // It only ever opens: on desktop the hover has usually opened it already,
    // and a toggle would hide the reason the moment someone clicks to act.
    onClick: (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    },
  });

  return (
    <TooltipTrigger
      placement={placement}
      className={triggerClassName}
      open={open}
      onOpenChange={setOpen}
      content={
        // The DS tooltip's own title + description, unstyled, so a locked
        // control reads like every other tooltip in the product.
        <Tooltip
          theme="dark"
          arrow={arrow}
          className="max-w-[280px]"
          title={reason}
          description={hint}
        />
      }
    >
      {child}
    </TooltipTrigger>
  );
}
