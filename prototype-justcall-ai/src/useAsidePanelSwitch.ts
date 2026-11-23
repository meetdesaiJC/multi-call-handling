import { useLayoutEffect, useRef, useState } from "react";

export const ASIDE_SWITCH_MS = 150;

export type AsidePanel =
  | "notes"
  | "transcript"
  | "assist"
  | "keypad"
  | "transfer"
  | "voicemail";

/**
 * Every panel the call bar opens shares one right-side shell. Switching keeps
 * the column where it is; the incoming card plays the same enter Notes set
 * as the standard, and the outgoing view crossfades. Open/close of the shell
 * is owned by `useCallAsidePresence`, with the card motion living on the view.
 *
 * The last three used to hang off their controls as popovers. A popover closes
 * the moment attention moves, which is wrong for all of them: the keypad is
 * worked while listening to an IVR, and picking a transfer target is a task
 * with two decisions and a wait in between. They belong in the column, beside
 * the transcript the agent is reading while they do it.
 */
export function useAsidePanelSwitch(
  panel: AsidePanel | null,
  reduced: boolean
) {
  const shownRef = useRef<AsidePanel>("transcript");
  if (panel) shownRef.current = panel;
  const shown = panel ?? shownRef.current;

  const prev = useRef(panel);
  const [switching, setSwitching] = useState(false);

  useLayoutEffect(() => {
    const was = prev.current;
    prev.current = panel;
    if (!was || !panel || was === panel) return;
    if (reduced) return;
    setSwitching(true);
    const timer = window.setTimeout(() => setSwitching(false), ASIDE_SWITCH_MS);
    return () => {
      window.clearTimeout(timer);
      setSwitching(false);
    };
  }, [panel, reduced]);

  return { shown, switching };
}
