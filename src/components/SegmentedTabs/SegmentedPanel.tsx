import * as React from "react";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";

/**
 * The content area a `SegmentedTabs` switches. Old content steps out of the
 * way, new content settles in — no horizontal travel, because the segments
 * are four *kinds* of source, not four steps of a flow, and a slide would
 * imply an order they don't have.
 *
 * Deliberately decoupled from the control: the indicator moves the instant
 * the user clicks, and this swap runs on its own clock behind it. A source
 * that has to load shows its spinner in here, never by holding the card
 * still — see the loading story.
 *
 * Content is a render prop rather than an element so the *outgoing* key stays
 * mounted for the length of its exit. Passing `children` directly would swap
 * the subtree on the same frame the fade starts, and the fade would play over
 * the new content.
 */

// Matches .segmented-panel[data-phase="exiting"] in base.css.
const EXIT_MS = DURATION.micro;

// Backstop for the rAF pair below, comfortably past two frames.
const SETTLE_FALLBACK_MS = DURATION.fast;

type Phase = "idle" | "exiting" | "entering";

export interface SegmentedPanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The selected segment. A change here runs the swap. */
  activeKey: string;
  /** Called with the key currently *on screen*, which lags `activeKey`. */
  children: (key: string) => React.ReactNode;
}

export function SegmentedPanel({
  activeKey,
  children,
  className,
  ...props
}: SegmentedPanelProps) {
  const [shown, setShown] = React.useState(activeKey);
  const [phase, setPhase] = React.useState<Phase>("idle");

  // What is on screen, readable without making it a dependency below. The
  // swap sets `shown`, so an effect keyed on it would tear down its own
  // pending frames the moment it fired — the panel would never settle.
  const shownRef = React.useRef(shown);

  React.useEffect(() => {
    if (activeKey === shownRef.current) return;

    setPhase("exiting");
    let enterFrame = 0;
    let settleTimer = 0;
    const exitTimer = window.setTimeout(() => {
      shownRef.current = activeKey;
      setShown(activeKey);
      setPhase("entering");
      // Two frames, so the browser paints the entering offset before it is
      // transitioned away — one frame gets batched into the same paint and
      // the content would simply appear. Same shape as the Sidenav body swap.
      enterFrame = requestAnimationFrame(() => {
        enterFrame = requestAnimationFrame(() => setPhase("idle"));
      });
      // A backgrounded tab stops servicing rAF entirely, and `entering` is
      // opacity 0 — without this the user comes back to a panel that has the
      // right content and cannot be seen. Losing the fade is the acceptable
      // failure here; losing the content is not. In a visible tab the frames
      // land in ~32ms and this fires against an already-idle panel, which
      // React discards.
      settleTimer = window.setTimeout(() => setPhase("idle"), SETTLE_FALLBACK_MS);
    }, EXIT_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(settleTimer);
      if (enterFrame) cancelAnimationFrame(enterFrame);
    };
    // Keyed on `activeKey` alone, so the only things that cancel a swap are a
    // newer selection and unmount. Re-selecting mid-exit restarts the timer
    // rather than queueing a second swap, which is what keeps rapid switching
    // from playing every step it was asked for.
  }, [activeKey]);

  return (
    <div className={cn("segmented-panel", className)} data-phase={phase} {...props}>
      {children(shown)}
    </div>
  );
}
