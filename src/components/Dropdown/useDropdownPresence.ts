import { DURATION } from "@/lib/motion";
import { usePresence, type PresenceState } from "@/lib/usePresence";

/**
 * Stay mounted this long after `open` goes false so `.dropdown-panel`
 * `[data-state="closed"]` (--duration-fast / --ease-exit, base.css) can
 * finish.
 */
export const DROPDOWN_CLOSE_MS = DURATION.fast;

export type DropdownPresenceState = PresenceState;

/**
 * Keeps an overlay mounted through its close animation.
 * `state` maps onto `.dropdown-panel[data-state]`.
 *
 * A thin wrapper over `usePresence` — kept because `.dropdown-panel` is the
 * shared menu skin, so "dropdown presence" means one specific duration and
 * callers should not have to know which.
 */
export function useDropdownPresence(open: boolean) {
  return usePresence(open, DROPDOWN_CLOSE_MS);
}
