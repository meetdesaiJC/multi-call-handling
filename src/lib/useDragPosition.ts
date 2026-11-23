import * as React from "react";

/** A position in pixels, measured from the top-left of the drag area. */
export type DragPoint = { x: number; y: number };

/** Where a box rests before anyone has moved it. */
export type DragCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface UseDragPositionOptions {
  /**
   * The moving box's size. The clamp needs it: one that knows only where the
   * pointer is will happily let three quarters of a panel off the right edge,
   * and a floating panel the user cannot grab again is worse than one that
   * never moved.
   */
  size: { width: number; height: number };
  /** Which corner it starts in. */
  initial: DragCorner;
  /** Room kept between the box and every edge. */
  margin?: number;
  /**
   * Persist the position under this key. Omit and the box forgets where it
   * was on reload — which for a panel the user deliberately parked somewhere
   * is the wrong answer, so most callers want this.
   */
  storageKey?: string;
  /** Arrow-key travel, and the Shift multiplier for crossing the screen. */
  step?: number;
  shiftStep?: number;
}

/**
 * Makes a floating box draggable by a handle, and keeps it on screen.
 *
 * Two things this does that a naive drag does not.
 *
 * It moves the box by writing `translate` straight to the node while the
 * pointer is down, and only commits to React state on release. A panel like
 * the CRM widget has a live transcript and a guidance feed inside it; putting
 * the drag through `setState` would re-render that whole subtree on every
 * pointermove and the box would stutter behind the cursor. Same reason §4
 * says to animate `translate` — nothing here touches layout.
 *
 * And it is not pointer-only. The handle takes focus and answers to the arrow
 * keys, because "move this out of the way" is not a mouse-users-only need,
 * and a panel that can only be repositioned by dragging is a panel some
 * people can never reposition.
 */
export function useDragPosition({
  size,
  initial,
  margin = 16,
  storageKey,
  step = 16,
  shiftStep = 64,
}: UseDragPositionOptions) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = React.useState(false);

  /**
   * Keeps the box inside the viewport. Also the reason a resize cannot strand
   * it: every path that produces a position runs through here.
   */
  const clamp = React.useCallback(
    (point: DragPoint): DragPoint => {
      const maxX = Math.max(margin, window.innerWidth - size.width - margin);
      const maxY = Math.max(margin, window.innerHeight - size.height - margin);
      return {
        x: Math.min(Math.max(point.x, margin), maxX),
        y: Math.min(Math.max(point.y, margin), maxY),
      };
    },
    [margin, size.width, size.height]
  );

  const corner = React.useCallback((): DragPoint => {
    const right = window.innerWidth - size.width - margin;
    const bottom = window.innerHeight - size.height - margin;
    switch (initial) {
      case "top-left":
        return clamp({ x: margin, y: margin });
      case "bottom-left":
        return clamp({ x: margin, y: bottom });
      case "bottom-right":
        return clamp({ x: right, y: bottom });
      default:
        return clamp({ x: right, y: margin });
    }
  }, [clamp, initial, margin, size.width, size.height]);

  const [position, setPosition] = React.useState<DragPoint>(() => {
    // A stored position is still clamped: the window the box was parked in may
    // have been wider than the one it is coming back to.
    if (storageKey) {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<DragPoint>;
          if (typeof saved?.x === "number" && typeof saved?.y === "number") {
            const maxX = Math.max(margin, window.innerWidth - size.width - margin);
            const maxY = Math.max(margin, window.innerHeight - size.height - margin);
            return {
              x: Math.min(Math.max(saved.x, margin), maxX),
              y: Math.min(Math.max(saved.y, margin), maxY),
            };
          }
        }
      } catch {
        // A browser with site data blocked is not a reason to fail to render.
      }
    }
    const right = window.innerWidth - size.width - margin;
    const bottom = window.innerHeight - size.height - margin;
    if (initial === "top-left") return { x: margin, y: margin };
    if (initial === "bottom-left") return { x: margin, y: Math.max(margin, bottom) };
    if (initial === "bottom-right")
      return { x: Math.max(margin, right), y: Math.max(margin, bottom) };
    return { x: Math.max(margin, right), y: margin };
  });

  /** Written on release so the node and the state never disagree. */
  const commit = React.useCallback(
    (next: DragPoint) => {
      setPosition(next);
      if (!storageKey) return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Same as above — losing the memory of a position is survivable.
      }
    },
    [storageKey]
  );

  /* A window that shrinks under a parked panel pulls it back into view. */
  React.useEffect(() => {
    const onResize = () => setPosition((current) => clamp(current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  /**
   * The live drag. `latest` is the node's truth while the pointer is down —
   * state is deliberately stale until release, so nothing inside the panel
   * re-renders mid-gesture.
   */
  const drag = React.useRef<{
    pointerId: number;
    origin: DragPoint;
    start: DragPoint;
    latest: DragPoint;
  } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    // The handle carries controls too — the close button lives in this header.
    // Dragging from one of those would swallow the click that was meant for it.
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select, [role='button']")) {
      return;
    }
    // Cancels the text selection a drag across a title bar would otherwise
    // paint, but that also cancels the focus the click would have given the
    // handle — so focus it by hand. Otherwise grabbing the panel and then
    // reaching for the arrow keys does nothing, and the keyboard path is only
    // discoverable by tabbing to a title bar, which nobody does.
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      start: position,
      latest: position,
    };
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const next = clamp({
      x: state.start.x + (event.clientX - state.origin.x),
      y: state.start.y + (event.clientY - state.origin.y),
    });
    state.latest = next;
    const node = ref.current;
    if (node) node.style.translate = `${next.x}px ${next.y}px`;
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    commit(state.latest);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const distance = event.shiftKey ? shiftStep : step;
    const moves: Record<string, DragPoint> = {
      ArrowLeft: { x: -distance, y: 0 },
      ArrowRight: { x: distance, y: 0 },
      ArrowUp: { x: 0, y: -distance },
      ArrowDown: { x: 0, y: distance },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    commit(clamp({ x: position.x + move.x, y: position.y + move.y }));
  };

  const reset = React.useCallback(() => commit(corner()), [commit, corner]);

  return {
    /** Attach to the moving element. */
    ref,
    position,
    dragging,
    /** Put it back in the corner it started in. */
    reset,
    /** Spread onto the drag handle. */
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onKeyDown,
      onDoubleClick: reset,
      // Focusable and labelled, but deliberately without `role="button"`: a
      // title bar is a drag surface that *contains* controls, and a button
      // wrapping the close button would be invalid nesting. The label is what
      // tells a keyboard user the arrow keys do something here.
      tabIndex: 0,
      "aria-label": "Move panel. Drag, or use the arrow keys.",
    },
  };
}
