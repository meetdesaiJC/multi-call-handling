import * as React from "react";

/**
 * Section takeover for Agent Assist.
 *
 * Editors like "Edit script" or "Create action" are full pages, not panels
 * inside a section: they own the header, the close button, and the publish
 * action. While one is open the Scripts / Response Cards / Behavioral Coaching /
 * In-call Actions nav is not a place to go — leaving it beside the editor implies
 * an escape route that would silently drop the draft. So an editor declares a
 * takeover and the section nav steps aside for the whole content area.
 *
 * Knowledge editors declare one too, harmlessly: Knowledge is a JustCall AI page
 * now, with no section nav to step aside, so the hook finds no host and no-ops.
 *
 * Counted rather than boolean so nested takeovers (an editor that opens
 * another) don't restore the nav when the inner one closes.
 */

type RegisterTakeover = (delta: 1 | -1) => void;

export const AgentAssistTakeoverContext =
  React.createContext<RegisterTakeover | null>(null);

/** Layout side: owns the count and tells the shell whether to hide its nav. */
export function useAgentAssistTakeoverHost(): {
  active: boolean;
  register: RegisterTakeover;
} {
  const [count, setCount] = React.useState(0);
  const register = React.useCallback<RegisterTakeover>((delta) => {
    setCount((current) => Math.max(0, current + delta));
  }, []);
  return { active: count > 0, register };
}

/**
 * Editor side: call once at the top of a page that should cover the section
 * nav. Layout effect so the nav is gone in the same paint the editor arrives
 * in — an effect would flash the nav for a frame.
 */
export function useAgentAssistTakeover(): void {
  const register = React.useContext(AgentAssistTakeoverContext);
  React.useLayoutEffect(() => {
    if (!register) return;
    register(1);
    return () => register(-1);
  }, [register]);
}
