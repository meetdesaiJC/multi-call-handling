/**
 * Shared width model for the live-call workspace:
 *   Script + divider + Suggestions + divider + Transcript = available width
 *
 * Dragging one divider changes only the two widgets it connects. Constraints
 * live here as design tokens so the UI never hard-codes 280 / 35% / 50%.
 */

export const CALL_PANE_IDS = ["script", "suggestions", "transcript"] as const;
export type CallPaneId = (typeof CALL_PANE_IDS)[number];

export const CALL_WORKSPACE_TOKENS = {
  panes: {
    // Guidance is the pane the agent reads mid-call, so it carries the weight:
    // Script sits at 30% of the pair and Guidance at 70% while the aside is
    // closed (0.225 / 0.525 of the full three-pane row).
    script: { minPx: 280, defaultFr: 0.225, maxFr: 0.62 },
    suggestions: { minPx: 300, defaultFr: 0.525, maxFr: 0.78 },
    transcript: { minPx: 320, defaultFr: 0.25, maxFr: 0.4 },
  },
  /** Visual gap between cards — same as the existing `gap-3`. */
  dividerPx: 12,
  /** Hover / drag hit target, centered on the divider (~8px each side). */
  hitPx: 16,
  linePx: 2,
  hoverMs: 150,
  settleMs: 120,
  stepPx: 16,
  stepLargePx: 48,
  resistMaxPx: 4,
} as const;

export const CALL_PANE_LABELS: Record<CallPaneId, string> = {
  script: "Script",
  suggestions: "Conversation Guidance",
  transcript: "Live Transcript",
};

/**
 * Right-side utility shell (Notes / Transcript / Live Assist). One panel at
 * a time; width stays in the 320–360px range so Script and Guidance remain
 * the core workspace.
 */
export const CALL_ASIDE = {
  minPx: 320,
  defaultPx: 340,
  maxPx: 360,
} as const;

export const CALL_WORKSPACE_DIVIDERS = [
  { index: 0, left: "script", right: "suggestions" },
  { index: 1, left: "suggestions", right: "transcript" },
] as const;

export type CallWorkspaceDivider = (typeof CALL_WORKSPACE_DIVIDERS)[number];

export type CallPaneFractions = Record<CallPaneId, number>;
export type CallPaneWidths = Record<CallPaneId, number>;
export type CallPaneCollapsed = Partial<Record<CallPaneId, boolean>>;

export const DEFAULT_CALL_PANE_FRACTIONS: CallPaneFractions = {
  script: CALL_WORKSPACE_TOKENS.panes.script.defaultFr,
  suggestions: CALL_WORKSPACE_TOKENS.panes.suggestions.defaultFr,
  transcript: CALL_WORKSPACE_TOKENS.panes.transcript.defaultFr,
};

// Suffixed so a stored drag from the old 56/44 default does not out-vote the
// new 30/70 split for anyone who has already opened the prototype.
export const CALL_WORKSPACE_STORAGE_KEY = "jcai.dialer.call-workspace-fractions.v2";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function participatingPanes(collapsed: CallPaneCollapsed = {}): CallPaneId[] {
  return CALL_PANE_IDS.filter((id) => !collapsed[id]);
}

export function dividerCount(visibleCount: number) {
  return Math.max(0, visibleCount - 1);
}

export function panelSpacePx(workspaceWidth: number, visibleCount: number) {
  return Math.max(
    0,
    workspaceWidth - dividerCount(visibleCount) * CALL_WORKSPACE_TOKENS.dividerPx
  );
}

export function canResizeWorkspace(
  workspaceWidth: number,
  collapsed: CallPaneCollapsed = {}
) {
  const visible = participatingPanes(collapsed);
  if (visible.length < 2) return false;
  const mins = visible.reduce(
    (sum, id) => sum + CALL_WORKSPACE_TOKENS.panes[id].minPx,
    0
  );
  return workspaceWidth >= mins + dividerCount(visible.length) * CALL_WORKSPACE_TOKENS.dividerPx;
}

export function paneMinPx(id: CallPaneId) {
  return CALL_WORKSPACE_TOKENS.panes[id].minPx;
}

export function paneMaxPx(id: CallPaneId, space: number) {
  const byFr = CALL_WORKSPACE_TOKENS.panes[id].maxFr * space;
  if (id === "transcript") return Math.min(byFr, CALL_ASIDE.maxPx);
  return byFr;
}

export function clampAsidePx(px: number, workspaceWidth: number) {
  const space = panelSpacePx(workspaceWidth, CALL_PANE_IDS.length);
  const max = paneMaxPx("transcript", space);
  const min = Math.min(CALL_ASIDE.minPx, max);
  return clamp(px, min, max);
}

/**
 * Open the right-side column at a pixel width and compress Script + Guidance
 * from the sizes they had while it was closed, keeping their ratio.
 */
export function fractionsForAsideOpen(
  closed: Pick<CallPaneWidths, "script" | "suggestions">,
  panelPx: number,
  workspaceWidth: number
): CallPaneFractions {
  const space = panelSpacePx(workspaceWidth, CALL_PANE_IDS.length);
  const panel = clampAsidePx(panelPx, workspaceWidth);
  const remaining = Math.max(0, space - panel);
  const pair = Math.max(1, closed.script + closed.suggestions);
  const desired: CallPaneWidths = {
    script: (closed.script / pair) * remaining,
    suggestions: (closed.suggestions / pair) * remaining,
    transcript: panel,
  };
  const fitted = fitToConstraints(desired, space, CALL_PANE_IDS);
  return fractionsFromWidths(fitted, space, CALL_PANE_IDS);
}

export function emptyWidths(): CallPaneWidths {
  return { script: 0, suggestions: 0, transcript: 0 };
}

/**
 * Rubber-band: a 2–4px travel past the clamp that saturates quickly.
 * Zero when the pointer is still inside the permitted range.
 */
export function resistanceOffset(
  overshootPx: number,
  max = CALL_WORKSPACE_TOKENS.resistMaxPx
) {
  if (overshootPx === 0) return 0;
  const sign = Math.sign(overshootPx);
  const mag = Math.abs(overshootPx);
  return sign * Math.min(max, mag / (1 + mag / max));
}

export function normalizeFractions(fractions: CallPaneFractions): CallPaneFractions {
  const sum = CALL_PANE_IDS.reduce((total, id) => total + fractions[id], 0);
  if (!(sum > 0)) return { ...DEFAULT_CALL_PANE_FRACTIONS };
  return {
    script: fractions.script / sum,
    suggestions: fractions.suggestions / sum,
    transcript: fractions.transcript / sum,
  };
}

export function isValidFractions(value: unknown): value is CallPaneFractions {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const nums = CALL_PANE_IDS.map((id) => record[id]);
  if (!nums.every((n) => typeof n === "number" && Number.isFinite(n) && n > 0 && n < 1)) {
    return false;
  }
  const sum = nums.reduce((total, n) => total + (n as number), 0);
  return Math.abs(sum - 1) < 0.05;
}

export function loadCallPaneFractions(): CallPaneFractions {
  try {
    const raw = localStorage.getItem(CALL_WORKSPACE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CALL_PANE_FRACTIONS };
    const parsed: unknown = JSON.parse(raw);
    if (!isValidFractions(parsed)) return { ...DEFAULT_CALL_PANE_FRACTIONS };
    return normalizeFractions(parsed);
  } catch {
    return { ...DEFAULT_CALL_PANE_FRACTIONS };
  }
}

export function saveCallPaneFractions(fractions: CallPaneFractions) {
  try {
    localStorage.setItem(
      CALL_WORKSPACE_STORAGE_KEY,
      JSON.stringify(normalizeFractions(fractions))
    );
  } catch {
    // Private mode / quota — layout still works for this call.
  }
}

/**
 * Read a drag back out as fractions. A pane the agent has closed keeps the
 * share it had in `base` — resizing the two panes that are open must not
 * decide how wide the closed one comes back.
 */
export function fractionsFromWidths(
  widths: CallPaneWidths,
  space: number,
  visible: readonly CallPaneId[],
  base: CallPaneFractions = DEFAULT_CALL_PANE_FRACTIONS
): CallPaneFractions {
  if (space <= 0 || visible.length === 0) return { ...DEFAULT_CALL_PANE_FRACTIONS };
  const visibleSum = visible.reduce((total, id) => total + Math.max(0, widths[id]), 0);
  if (visibleSum <= 0) return { ...base };

  const hiddenShare = CALL_PANE_IDS.reduce(
    (total, id) => (visible.includes(id) ? total : total + Math.max(0, base[id])),
    0
  );
  // Leave the open panes at least most of the row even if the stored shares
  // for the closed ones are stale — normalize sorts out the remainder.
  const openShare = Math.max(0.1, 1 - hiddenShare);

  const next = { ...DEFAULT_CALL_PANE_FRACTIONS };
  for (const id of CALL_PANE_IDS) {
    next[id] = visible.includes(id)
      ? (Math.max(0, widths[id]) / visibleSum) * openShare
      : Math.max(0, base[id]);
  }
  return normalizeFractions(next);
}

/**
 * Convert stored fractions into integer pixel widths that fit the current
 * workspace. Collapsed panes take no share; the rest split the leftover.
 */
export function widthsFromFractions(
  fractions: CallPaneFractions,
  workspaceWidth: number,
  collapsed: CallPaneCollapsed = {}
): CallPaneWidths {
  const visible = participatingPanes(collapsed);
  const space = panelSpacePx(workspaceWidth, visible.length);
  const next = emptyWidths();
  if (visible.length === 0 || space <= 0) return next;

  const sumFr = visible.reduce((total, id) => total + fractions[id], 0) || 1;
  const desired = emptyWidths();
  for (const id of visible) {
    desired[id] = (fractions[id] / sumFr) * space;
  }
  return fitToConstraints(desired, space, visible);
}

export function fitToConstraints(
  desired: CallPaneWidths,
  space: number,
  visible: readonly CallPaneId[]
): CallPaneWidths {
  const next = emptyWidths();
  if (visible.length === 0 || space <= 0) return next;

  const values = visible.map((id) => Math.max(0, desired[id]));
  const locked = new Set<number>();

  for (let pass = 0; pass < 6; pass += 1) {
    let lockedSum = 0;
    let unlockedWeight = 0;
    visible.forEach((_, index) => {
      if (locked.has(index)) lockedSum += values[index];
      else unlockedWeight += values[index];
    });
    const unlockedSpace = space - lockedSum;
    const unlockedCount = visible.length - locked.size;
    if (unlockedCount === 0) break;

    let grewLock = false;
    visible.forEach((id, index) => {
      if (locked.has(index)) return;
      const raw =
        unlockedWeight > 0
          ? (values[index] / unlockedWeight) * unlockedSpace
          : unlockedSpace / unlockedCount;
      const min = paneMinPx(id);
      const max = paneMaxPx(id, space);
      if (raw < min - 0.01) {
        values[index] = min;
        locked.add(index);
        grewLock = true;
      } else if (raw > max + 0.01) {
        values[index] = max;
        locked.add(index);
        grewLock = true;
      } else {
        values[index] = raw;
      }
    });
    if (!grewLock) break;
  }

  const rounded = values.map((value) => Math.round(value));
  let drift = rounded.reduce((total, value) => total + value, 0) - Math.round(space);
  for (let i = rounded.length - 1; i >= 0 && drift !== 0; i -= 1) {
    const id = visible[i];
    const min = paneMinPx(id);
    const max = Math.round(paneMaxPx(id, space));
    const adjusted = clamp(rounded[i] - drift, min, max);
    drift -= rounded[i] - adjusted;
    rounded[i] = adjusted;
  }

  visible.forEach((id, index) => {
    next[id] = rounded[index];
  });
  return next;
}

export function pairBounds(
  widths: CallPaneWidths,
  left: CallPaneId,
  right: CallPaneId,
  space: number
) {
  const pair = widths[left] + widths[right];
  const min = Math.max(paneMinPx(left), pair - paneMaxPx(right, space));
  const max = Math.min(paneMaxPx(left, space), pair - paneMinPx(right));
  return {
    min: Math.round(min),
    max: Math.round(Math.max(min, max)),
    now: Math.round(widths[left]),
  };
}

/**
 * Move a single divider. The third pane is copied through unchanged.
 * `overshoot` is how far past the clamp the pointer asked to go — used
 * for the rubber-band, not for layout.
 */
export function resizeAdjacent(
  widths: CallPaneWidths,
  left: CallPaneId,
  right: CallPaneId,
  deltaPx: number,
  space: number
): { widths: CallPaneWidths; overshoot: number } {
  const pair = widths[left] + widths[right];
  const bounds = pairBounds(widths, left, right, space);
  const unconstrained = widths[left] + deltaPx;
  const nextLeft = clamp(unconstrained, bounds.min, bounds.max);
  return {
    widths: {
      ...widths,
      [left]: nextLeft,
      [right]: pair - nextLeft,
    },
    overshoot: unconstrained - nextLeft,
  };
}

/**
 * Restore the two panes a divider connects to their default *ratio*,
 * keeping the third pane's current share. The pair's combined width
 * does not change, so the rest of the workspace stays put.
 */
export function resetAdjacentFractions(
  fractions: CallPaneFractions,
  left: CallPaneId,
  right: CallPaneId
): CallPaneFractions {
  const pair = fractions[left] + fractions[right];
  const defaultPair =
    DEFAULT_CALL_PANE_FRACTIONS[left] + DEFAULT_CALL_PANE_FRACTIONS[right];
  const leftShare = DEFAULT_CALL_PANE_FRACTIONS[left] / defaultPair;
  return normalizeFractions({
    ...fractions,
    [left]: pair * leftShare,
    [right]: pair * (1 - leftShare),
  });
}

export function visibleDividers(collapsed: CallPaneCollapsed = {}) {
  const visible = participatingPanes(collapsed);
  const pairs: Array<{ index: number; left: CallPaneId; right: CallPaneId }> = [];
  for (let i = 0; i < visible.length - 1; i += 1) {
    pairs.push({ index: i, left: visible[i], right: visible[i + 1] });
  }
  return pairs;
}
