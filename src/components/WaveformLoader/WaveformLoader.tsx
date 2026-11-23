import * as React from "react";

import { DURATION } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A four-bar waveform that breathes while something is being worked out.
 *
 * It is a *processing* indicator, not a level meter: the bars are driven by a
 * fixed loop, never by audio, and the motion is deliberately shallow so a
 * minute of it is still ignorable. Built for the in-call guidance panel, where
 * the wait sits inside a live conversation and a spinner would read as an
 * error state, but nothing about it is specific to that panel.
 *
 * The loop lives in CSS (`.waveform-loader-bar` in `styles/base.css`) rather
 * than in a frame loop on purpose — a `requestAnimationFrame` pulse stops dead
 * whenever the page is hidden, and this renders inside preview panes that are
 * permanently hidden.
 */

/**
 * 6 / 10 / 14 / 8 px, written as classes rather than a mapped `style` so
 * Tailwind can see them. The uneven profile is the point: four equal bars
 * pulsing out of phase read as a loading dots row wearing a costume.
 */
const BAR_HEIGHTS = ["h-1.5", "h-2.5", "h-3.5", "h-2"];

export interface WaveformLoaderProps {
  /**
   * Drives presence. Flipping to `false` plays the exit, then unmounts the
   * bars and calls `onExited` — so the caller keeps this rendered until then
   * rather than dropping it the moment the wait is over.
   */
  show?: boolean;
  /** Fired once the exit has finished and the bars are gone. */
  onExited?: () => void;
  /**
   * Announced to screen readers. Omit when neighbouring copy already says
   * what is being waited on — two live regions for one wait is one too many.
   */
  label?: string;
  className?: string;
}

export function WaveformLoader({
  show = true,
  onExited,
  label,
  className,
}: WaveformLoaderProps) {
  const [exited, setExited] = React.useState(false);

  // Held in a ref so an inline `onExited` — the normal way to pass one —
  // cannot restart the exit timer on every parent render.
  const onExitedRef = React.useRef(onExited);
  onExitedRef.current = onExited;

  React.useEffect(() => {
    if (show) {
      setExited(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setExited(true);
      onExitedRef.current?.();
    }, DURATION.fast);
    return () => window.clearTimeout(timer);
  }, [show]);

  if (!show && exited) return null;

  return (
    <span
      data-phase={show ? "visible" : "exiting"}
      {...(label ? { role: "status", "aria-label": label } : { "aria-hidden": true })}
      className={cn(
        // `flex`, not `inline-flex`: an inline-level box gets baseline-aligned,
        // and since this one holds no text its baseline is its bottom edge — so
        // the whole 20px box hangs above the baseline and its parent grows by
        // the inherited font's descender. A row of `items-center` then centres
        // that taller parent instead of the bars, and the indicator sits low
        // next to its label. As a block box the parent is exactly 20px and the
        // two centres coincide.
        "waveform-loader flex size-5 shrink-0 items-center justify-center gap-0.5",
        className
      )}
    >
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={index}
          className={cn("waveform-loader-bar w-0.5 rounded-full bg-current", height)}
        />
      ))}
    </span>
  );
}
