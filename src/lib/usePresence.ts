import * as React from "react";

export type PresenceState = "open" | "closed";

/**
 * Keeps an overlay mounted through its exit animation.
 *
 * An overlay that unmounts the moment `open` goes false has no exit — React
 * removes the node before the browser can animate it. So `mounted` lags
 * `open` by `exitMs`, and `state` drives a `[data-state]` selector that
 * carries the enter/exit timings (see §4's pairing rule).
 *
 * `exitMs` must match the CSS exit duration for the same element. Pass it
 * from `DURATION` rather than a literal — that is the whole reason
 * `@/lib/motion` exists.
 */
export function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const timer = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [open, mounted, exitMs]);

  // `open && mounted` rather than just `open`: on the first render after
  // `open` flips true, `mounted` is still false, and reporting "open" then
  // would skip the enter animation's start state.
  const state: PresenceState = open && mounted ? "open" : "closed";
  return { mounted, state };
}
