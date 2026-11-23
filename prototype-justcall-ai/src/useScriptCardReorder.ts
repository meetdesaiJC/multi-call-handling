import * as React from "react";

export const REORDER_DROP_MS = 180;
const DRAG_THRESHOLD_PX = 4;
const EDGE_ZONE_PX = 56;
const FLOAT_SCALE = 1.01;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export type ReorderMode = "idle" | "pressed" | "dragging" | "keyboard" | "settling";

interface Metrics {
  tops: number[];
  heights: number[];
  gap: number;
}

interface FloatState {
  left: number;
  top: number;
  width: number;
  originX: number;
  originY: number;
  settling: boolean;
}

interface Session {
  mode: Exclude<ReorderMode, "idle">;
  from: number;
  to: number;
  metrics: Metrics;
  float: FloatState | null;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function computeShifts(from: number, to: number, metrics: Metrics): number[] {
  const n = metrics.heights.length;
  const shifts = Array.from({ length: n }, () => 0);
  if (n === 0 || from === to) return shifts;

  const order = Array.from({ length: n }, (_, index) => index);
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);

  const targetTops = Array.from({ length: n }, () => 0);
  let y = metrics.tops[0] ?? 0;
  for (const index of order) {
    targetTops[index] = y;
    y += metrics.heights[index] + metrics.gap;
  }

  for (let index = 0; index < n; index += 1) {
    shifts[index] = targetTops[index] - metrics.tops[index];
  }
  return shifts;
}

function insertIndexAt(contentY: number, metrics: Metrics): number {
  const n = metrics.heights.length;
  if (n === 0) return 0;
  for (let index = 0; index < n; index += 1) {
    if (contentY < metrics.tops[index] + metrics.heights[index] / 2) return index;
  }
  return n - 1;
}

function measureList(list: HTMLElement, slots: Array<HTMLElement | null>): Metrics | null {
  if (slots.some((slot) => !slot)) return null;
  const els = slots as HTMLElement[];
  if (els.length === 0) return null;

  const listRect = list.getBoundingClientRect();
  const gap = Number.parseFloat(getComputedStyle(list).rowGap || getComputedStyle(list).gap) || 12;

  return {
    gap,
    tops: els.map((el) => el.getBoundingClientRect().top - listRect.top + list.scrollTop),
    heights: els.map((el) => el.offsetHeight),
  };
}

function autoScrollBy(container: HTMLElement, clientY: number): number {
  const rect = container.getBoundingClientRect();
  const viewTop = Math.max(0, rect.top);
  const viewBottom = Math.min(window.innerHeight, rect.bottom);
  const distTop = clientY - viewTop;
  const distBottom = viewBottom - clientY;

  let delta = 0;
  if (distTop < EDGE_ZONE_PX) {
    const t = 1 - Math.max(0, distTop) / EDGE_ZONE_PX;
    delta = -(0.6 + t * t * 18);
  } else if (distBottom < EDGE_ZONE_PX) {
    const t = 1 - Math.max(0, distBottom) / EDGE_ZONE_PX;
    delta = 0.6 + t * t * 18;
  }

  if (!delta) return 0;
  const prev = container.scrollTop;
  container.scrollTop = Math.max(0, Math.min(container.scrollHeight - container.clientHeight, prev + delta));
  return container.scrollTop - prev;
}

export function useScriptCardReorder({
  count,
  itemLabel,
  onReorder,
  onReorderFail,
}: {
  count: number;
  itemLabel: (index: number) => string;
  onReorder: (from: number, to: number) => void;
  onReorderFail?: () => void;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const slotRefs = React.useRef<Array<HTMLElement | null>>([]);
  const handleRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const sessionRef = React.useRef<Session | null>(null);
  const pointerRef = React.useRef({ x: 0, y: 0 });
  const pressOriginRef = React.useRef({ x: 0, y: 0 });
  const grabOffsetRef = React.useRef({ x: 0, y: 0 });
  const rafRef = React.useRef<number | 0>(0);
  const settleTimerRef = React.useRef<number | 0>(0);
  const floatNodeRef = React.useRef<HTMLElement | null>(null);

  const [session, setSession] = React.useState<Session | null>(null);
  const [announcement, setAnnouncement] = React.useState("");

  sessionRef.current = session;

  const setSlotRef = React.useCallback((index: number, node: HTMLElement | null) => {
    slotRefs.current[index] = node;
  }, []);

  const setHandleRef = React.useCallback((index: number, node: HTMLButtonElement | null) => {
    handleRefs.current[index] = node;
  }, []);

  const clearDocLock = React.useCallback(() => {
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  }, []);

  const lockDoc = React.useCallback(() => {
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }, []);

  const stopLoop = React.useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = 0;
    }
  }, []);

  const reset = React.useCallback(() => {
    stopLoop();
    clearDocLock();
    sessionRef.current = null;
    setSession(null);
  }, [clearDocLock, stopLoop]);

  const commit = React.useCallback(
    (from: number, to: number) => {
      if (from === to) {
        reset();
        return;
      }
      try {
        onReorder(from, to);
        reset();
        window.setTimeout(() => {
          handleRefs.current[to]?.focus();
        }, 0);
      } catch {
        onReorderFail?.();
        setAnnouncement("Couldn't update order. Try again.");
        const current = sessionRef.current;
        if (current) {
          const restored = { ...current, to: from, mode: "keyboard" as const, float: null };
          sessionRef.current = restored;
          setSession(restored);
          window.setTimeout(() => reset(), prefersReducedMotion() ? 0 : REORDER_DROP_MS);
        } else {
          reset();
        }
      }
    },
    [onReorder, onReorderFail, reset]
  );

  const settleFloatTo = React.useCallback(
    (targetIndex: number, persist: boolean) => {
      const current = sessionRef.current;
      const list = listRef.current;
      if (!current) {
        reset();
        return;
      }

      if (!current.float || !list) {
        if (persist) commit(current.from, targetIndex);
        else reset();
        return;
      }

      const listRect = list.getBoundingClientRect();
      const slot = slotRefs.current[current.from];
      const destLeft = slot?.getBoundingClientRect().left ?? current.float.left;
      const destTop = persist
        ? (slot?.getBoundingClientRect().top ?? current.float.top)
        : listRect.top - list.scrollTop + current.metrics.tops[current.from];

      const next: Session = {
        ...current,
        mode: "settling",
        to: persist ? targetIndex : current.from,
        float: {
          ...current.float,
          left: destLeft,
          top: destTop,
          settling: true,
        },
      };

      sessionRef.current = next;
      setSession(next);
      stopLoop();
      clearDocLock();

      const finish = () => {
        if (persist) commit(current.from, targetIndex);
        else {
          setAnnouncement("Reorder cancelled");
          reset();
        }
      };

      if (prefersReducedMotion()) {
        finish();
        return;
      }

      settleTimerRef.current = window.setTimeout(finish, REORDER_DROP_MS);
    },
    [clearDocLock, commit, reset, stopLoop]
  );

  const updateInsertFromPointer = React.useCallback(() => {
    const current = sessionRef.current;
    const list = listRef.current;
    if (!current || !list || current.mode !== "dragging") return;

    const listRect = list.getBoundingClientRect();
    const contentY = pointerRef.current.y - listRect.top + list.scrollTop;
    const nextTo = insertIndexAt(contentY, current.metrics);
    if (nextTo === current.to) return;

    const next = { ...current, to: nextTo };
    sessionRef.current = next;
    setSession(next);
  }, []);

  const startDragging = React.useCallback(
    (index: number) => {
      const current = sessionRef.current;
      const list = listRef.current;
      const slot = slotRefs.current[index];
      if (!current || !list || !slot) return;

      const rect = slot.getBoundingClientRect();
      grabOffsetRef.current = {
        x: pointerRef.current.x - rect.left,
        y: pointerRef.current.y - rect.top,
      };

      const next: Session = {
        ...current,
        mode: "dragging",
        float: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          originX: grabOffsetRef.current.x,
          originY: grabOffsetRef.current.y,
          settling: false,
        },
      };
      sessionRef.current = next;
      setSession(next);
      lockDoc();
      setAnnouncement(
        `Picked up ${itemLabel(index)}. Current position ${index + 1} of ${count}. Use up and down arrows to move, space to drop, escape to cancel.`
      );

      const tick = () => {
        const live = sessionRef.current;
        if (!live || live.mode !== "dragging") return;
        const listEl = listRef.current;
        if (listEl) autoScrollBy(listEl, pointerRef.current.y);
        updateInsertFromPointer();

        const grab = grabOffsetRef.current;
        const left = pointerRef.current.x - grab.x;
        const top = pointerRef.current.y - grab.y;
        if (live.float) {
          live.float.left = left;
          live.float.top = top;
        }
        const node = floatNodeRef.current;
        if (node) {
          node.style.left = `${left}px`;
          node.style.top = `${top}px`;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [count, itemLabel, lockDoc, updateInsertFromPointer]
  );

  const startDraggingRef = React.useRef(startDragging);
  startDraggingRef.current = startDragging;
  const settleFloatToRef = React.useRef(settleFloatTo);
  settleFloatToRef.current = settleFloatTo;
  const resetRef = React.useRef(reset);
  resetRef.current = reset;
  const itemLabelRef = React.useRef(itemLabel);
  itemLabelRef.current = itemLabel;
  const countRef = React.useRef(count);
  countRef.current = count;

  const onWindowPointerMove = React.useCallback((event: PointerEvent) => {
    pointerRef.current = { x: event.clientX, y: event.clientY };
    const current = sessionRef.current;
    if (!current) return;

    if (current.mode === "pressed") {
      const dx = event.clientX - pressOriginRef.current.x;
      const dy = event.clientY - pressOriginRef.current.y;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        startDraggingRef.current(current.from);
      }
    }
  }, []);

  const onWindowPointerUp = React.useRef<() => void>(() => {});
  const handleWindowPointerUp = React.useCallback(() => {
    onWindowPointerUp.current();
  }, []);

  const detachWindow = React.useCallback(() => {
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);
    window.removeEventListener("pointercancel", handleWindowPointerUp);
  }, [handleWindowPointerUp, onWindowPointerMove]);

  onWindowPointerUp.current = () => {
    const current = sessionRef.current;
    detachWindow();
    if (!current) return;

    if (current.mode === "pressed") {
      resetRef.current();
      return;
    }

    if (current.mode === "dragging") {
      if (current.from !== current.to) {
        setAnnouncement(
          `Dropped ${itemLabelRef.current(current.from)} at position ${current.to + 1} of ${countRef.current}.`
        );
      }
      settleFloatToRef.current(current.to, true);
    }
  };

  React.useEffect(() => () => {
    detachWindow();
    stopLoop();
    clearDocLock();
  }, [clearDocLock, detachWindow, stopLoop]);

  const cancel = React.useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.mode === "settling") return;
    detachWindow();
    if (current.mode === "dragging" && current.float) {
      settleFloatTo(current.from, false);
      return;
    }
    setAnnouncement("Reorder cancelled");
    if (current.mode === "keyboard" && current.to !== current.from) {
      const restored = { ...current, to: current.from };
      sessionRef.current = restored;
      setSession(restored);
      window.setTimeout(() => reset(), prefersReducedMotion() ? 0 : REORDER_DROP_MS);
      return;
    }
    reset();
  }, [detachWindow, reset, settleFloatTo]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const current = sessionRef.current;
      if (!current || current.mode === "settling") return;
      event.preventDefault();
      cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancel]);

  const beginPress = React.useCallback(
    (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      if (sessionRef.current?.mode === "settling") return;
      const list = listRef.current;
      if (!list) return;
      const metrics = measureList(list, slotRefs.current.slice(0, count));
      if (!metrics) return;

      event.preventDefault();
      event.currentTarget.focus();
      pointerRef.current = { x: event.clientX, y: event.clientY };
      pressOriginRef.current = { x: event.clientX, y: event.clientY };

      const next: Session = {
        mode: "pressed",
        from: index,
        to: index,
        metrics,
        float: null,
      };
      sessionRef.current = next;
      setSession(next);
      lockDoc();

      window.addEventListener("pointermove", onWindowPointerMove);
      window.addEventListener("pointerup", handleWindowPointerUp);
      window.addEventListener("pointercancel", handleWindowPointerUp);
    },
    [count, handleWindowPointerUp, lockDoc, onWindowPointerMove]
  );

  const moveKeyboard = React.useCallback((direction: -1 | 1) => {
    const current = sessionRef.current;
    if (!current || current.mode !== "keyboard") return;
    const nextTo = Math.max(0, Math.min(count - 1, current.to + direction));
    if (nextTo === current.to) return;
    const next = { ...current, to: nextTo };
    sessionRef.current = next;
    setSession(next);
    setAnnouncement(`Position ${nextTo + 1} of ${count}`);
  }, [count]);

  const dropKeyboard = React.useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.mode !== "keyboard") return;
    if (current.from !== current.to) {
      setAnnouncement(
        `Dropped ${itemLabel(current.from)} at position ${current.to + 1} of ${count}.`
      );
    }
    commit(current.from, current.to);
  }, [commit, count, itemLabel]);

  const toggleKeyboard = React.useCallback(
    (index: number) => {
      const current = sessionRef.current;
      if (current?.mode === "keyboard" && current.from === index) {
        dropKeyboard();
        return;
      }
      if (current) return;

      const list = listRef.current;
      if (!list) return;
      const metrics = measureList(list, slotRefs.current.slice(0, count));
      if (!metrics) return;

      const next: Session = {
        mode: "keyboard",
        from: index,
        to: index,
        metrics,
        float: null,
      };
      sessionRef.current = next;
      setSession(next);
      setAnnouncement(
        `Picked up ${itemLabel(index)}. Current position ${index + 1} of ${count}. Use up and down arrows to move, space to drop, escape to cancel.`
      );
    },
    [count, dropKeyboard, itemLabel]
  );

  const onHandleKeyDown = React.useCallback(
    (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
      const current = sessionRef.current;
      const picked = current?.mode === "keyboard";

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        toggleKeyboard(index);
        return;
      }
      if (!picked) return;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        moveKeyboard(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        moveKeyboard(1);
      }
    },
    [moveKeyboard, toggleKeyboard]
  );

  React.useEffect(() => {
    if (session?.mode !== "keyboard") return;

    const onKey = (event: KeyboardEvent) => {
      const current = sessionRef.current;
      if (!current || current.mode !== "keyboard") return;

      const target = event.target;
      const inField =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (inField && event.key !== "Escape") return;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveKeyboard(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveKeyboard(1);
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        dropKeyboard();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dropKeyboard, moveKeyboard, session?.mode]);

  const mode: ReorderMode = session?.mode ?? "idle";
  const from = session?.from ?? null;
  const to = session?.to ?? null;
  const shifts =
    session && (session.mode === "dragging" || session.mode === "keyboard" || session.mode === "settling")
      ? computeShifts(session.from, session.to, session.metrics)
      : Array.from({ length: count }, () => 0);

  const shifting =
    mode === "dragging" || mode === "keyboard" || mode === "settling";

  const floatStyle: React.CSSProperties | null = session?.float
    ? {
        position: "fixed",
        left: session.float.left,
        top: session.float.top,
        width: session.float.width,
        zIndex: 80,
        margin: 0,
        opacity: 1,
        pointerEvents: "none",
        transform:
          session.float.settling || prefersReducedMotion() ? "scale(1)" : `scale(${FLOAT_SCALE})`,
        transformOrigin: `${session.float.originX}px ${session.float.originY}px`,
        transition: session.float.settling
          ? `left ${REORDER_DROP_MS}ms ${EASE_OUT}, top ${REORDER_DROP_MS}ms ${EASE_OUT}, transform ${REORDER_DROP_MS}ms ${EASE_OUT}`
          : undefined,
      }
    : null;

  return {
    listRef,
    floatNodeRef,
    setSlotRef,
    setHandleRef,
    mode,
    from,
    to,
    shifts,
    shifting,
    floatStyle,
    announcement,
    beginPress,
    onHandleKeyDown,
    isPlaceholder: (index: number) =>
      Boolean(session && (session.mode === "dragging" || session.mode === "settling") && session.from === index),
    isLifted: (index: number) =>
      Boolean(
        session &&
          session.from === index &&
          (session.mode === "pressed" || session.mode === "keyboard")
      ),
    placeholderHeight:
      session && (session.mode === "dragging" || session.mode === "settling")
        ? session.metrics.heights[session.from]
        : 0,
  };
}
