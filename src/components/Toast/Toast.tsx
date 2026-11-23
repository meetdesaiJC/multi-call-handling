import * as React from "react";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";
import { Alert, type AlertProps } from "@/components/Alert";

/**
 * Toast — a short confirmation that floats over the page after an action
 * lands somewhere else ("3 team members invited" once the admin is back on the list).
 *
 * It is an `Alert` in the `.toast-panel` motion from base.css: rises in at
 * `moderate`, lifts away at `base`. It dismisses itself after a reading pause
 * and on its ✕; either way it reports through `onClose`, and the caller flips
 * `open`, so the exit always plays.
 */

// How long it stays up. A dwell, not a transition, so it isn't on the motion
// scale: long enough to read three or four words, short enough not to linger.
const TOAST_DWELL_MS = 4000;

type ToastPhase = "entering" | "open" | "exiting";

export interface ToastProps {
  open: boolean;
  /** Called on ✕ and when the dwell runs out. Set `open` false in response. */
  onClose: () => void;
  /** Bold one-liner, e.g. "1 team member invited". */
  title: React.ReactNode;
  /** Optional second line. */
  children?: React.ReactNode;
  variant?: AlertProps["variant"];
  /** Stay up until dismissed. Default `false`. */
  persistent?: boolean;
  /** Positions the toast. Default: top-right, just below the GlobalHeader. */
  className?: string;
}

export function Toast({
  open,
  onClose,
  title,
  children,
  variant = "success",
  persistent = false,
  className,
}: ToastProps) {
  const [phase, setPhase] = React.useState<ToastPhase | null>(open ? "entering" : null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      setPhase("entering");
      return;
    }
    setPhase((current) => (current ? "exiting" : null));
    const timer = window.setTimeout(() => setPhase(null), DURATION.base);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Commit the start state, then move to "open" so there is something to
  // transition from. Reading layout forces the start styles to apply before
  // the switch — unlike waiting a frame, this also works in a background tab,
  // where frames don't run and the toast would sit invisible.
  React.useLayoutEffect(() => {
    if (phase !== "entering") return;
    void panelRef.current?.offsetWidth;
    setPhase("open");
  }, [phase]);

  React.useEffect(() => {
    if (!open || persistent) return;
    const timer = window.setTimeout(onClose, TOAST_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [open, persistent, onClose]);

  if (!phase) return null;

  return (
    <div
      ref={panelRef}
      role="status"
      data-state={phase}
      // Below the 60px GlobalHeader, never over it: the header carries the
      // admin's status, profile and live-call controls.
      className={cn("toast-panel fixed top-[72px] right-6 z-50 w-max max-w-[min(100vw-48px,360px)]", className)}
    >
      <Alert variant={variant} title={title} onClose={onClose} className="shadow-300">
        {children}
      </Alert>
    </div>
  );
}
