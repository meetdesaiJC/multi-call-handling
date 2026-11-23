import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import {
  CALL_PANE_IDS,
  CALL_WORKSPACE_DIVIDERS,
  CALL_WORKSPACE_TOKENS,
  canResizeWorkspace,
  fractionsFromWidths,
  loadCallPaneFractions,
  pairBounds,
  panelSpacePx,
  participatingPanes,
  resetAdjacentFractions,
  resistanceOffset,
  resizeAdjacent,
  saveCallPaneFractions,
  normalizeFractions,
  widthsFromFractions,
  type CallPaneCollapsed,
  type CallPaneFractions,
  type CallPaneId,
  type CallPaneWidths,
  type CallWorkspaceDivider,
} from "./callWorkspaceLayout";

type DragSession = {
  divider: CallWorkspaceDivider;
  pointerId: number;
  startX: number;
  startWidths: CallPaneWidths;
  space: number;
  moved: boolean;
};

const SETTLE_MS = CALL_WORKSPACE_TOKENS.settleMs;
const DRAG_THRESHOLD_PX = 2;
const DOUBLE_CLICK_MS = 400;
const NO_COLLAPSE: CallPaneCollapsed = {};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function setResizingCursor(on: boolean) {
  document.documentElement.classList.toggle("call-workspace-resizing", on);
}

export function useCallWorkspaceResize(collapsed: CallPaneCollapsed = NO_COLLAPSE) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const liveWidthsRef = useRef<CallPaneWidths | null>(null);
  const lastClickRef = useRef({ at: 0, index: -1 });
  const settleTimerRef = useRef(0);
  const fractionsRef = useRef<CallPaneFractions>(loadCallPaneFractions());

  const [workspaceWidth, setWorkspaceWidth] = useState(0);
  const [fractions, setFractions] = useState<CallPaneFractions>(
    () => fractionsRef.current
  );
  const [dragWidths, setDragWidths] = useState<CallPaneWidths | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [resistPx, setResistPx] = useState(0);
  const [limited, setLimited] = useState(false);
  const [settling, setSettling] = useState(false);

  fractionsRef.current = fractions;

  const hasCollapsed = CALL_PANE_IDS.some((id) => collapsed[id]);
  const visible = hasCollapsed ? participatingPanes(collapsed) : CALL_PANE_IDS;
  const measured = workspaceWidth > 0;
  const resizable = measured && canResizeWorkspace(workspaceWidth, collapsed);
  const space = panelSpacePx(workspaceWidth, visible.length);
  const layoutWidths = widthsFromFractions(fractions, workspaceWidth, collapsed);
  const widths = dragWidths ?? layoutWidths;

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const measure = () => setWorkspaceWidth(node.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    return () => {
      setResizingCursor(false);
      window.clearTimeout(settleTimerRef.current);
    };
  }, []);

  const beginSettle = useCallback(() => {
    if (prefersReducedMotion()) return;
    window.clearTimeout(settleTimerRef.current);
    setSettling(true);
    settleTimerRef.current = window.setTimeout(() => {
      setSettling(false);
    }, SETTLE_MS);
  }, []);

  const replaceFractions = useCallback((next: CallPaneFractions) => {
    const normalized = normalizeFractions(next);
    fractionsRef.current = normalized;
    setFractions(normalized);
    saveCallPaneFractions(normalized);
  }, []);

  const persist = useCallback(
    (nextWidths: CallPaneWidths, forSpace = space) => {
      const nextFractions = fractionsFromWidths(
        nextWidths,
        forSpace,
        visible,
        fractionsRef.current
      );
      fractionsRef.current = nextFractions;
      setFractions(nextFractions);
      saveCallPaneFractions(nextFractions);
    },
    [space, visible]
  );

  const resetDivider = useCallback(
    (index: number) => {
      const divider = CALL_WORKSPACE_DIVIDERS[index];
      if (!divider || !canResizeWorkspace(workspaceWidth, collapsed)) return;

      dragRef.current = null;
      setDragWidths(null);
      setDraggingIndex(null);
      setResistPx(0);
      setLimited(false);
      setResizingCursor(false);

      const nextFractions = resetAdjacentFractions(
        fractionsRef.current,
        divider.left,
        divider.right
      );
      fractionsRef.current = nextFractions;
      setFractions(nextFractions);
      saveCallPaneFractions(nextFractions);
      beginSettle();
    },
    [beginSettle, collapsed, workspaceWidth]
  );

  const onDragStart = useCallback(
    (index: number, event: PointerEvent<HTMLDivElement>) => {
      if (!resizable || event.button !== 0) return;
      const divider = CALL_WORKSPACE_DIVIDERS[index];
      if (!divider) return;

      const now = performance.now();
      const last = lastClickRef.current;
      if (last.index === index && now - last.at < DOUBLE_CLICK_MS) {
        lastClickRef.current = { at: 0, index: -1 };
        event.preventDefault();
        resetDivider(index);
        return;
      }
      lastClickRef.current = { at: now, index };

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus({ preventScroll: true });

      dragRef.current = {
        divider,
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidths: { ...widths },
        space,
        moved: false,
      };
      setDraggingIndex(index);
      setResistPx(0);
      setLimited(false);
      setSettling(false);
      setResizingCursor(true);
    },
    [resetDivider, resizable, space, widths]
  );

  const onDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const session = dragRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    const delta = event.clientX - session.startX;
    if (!session.moved && Math.abs(delta) < DRAG_THRESHOLD_PX) return;
    session.moved = true;

    const result = resizeAdjacent(
      session.startWidths,
      session.divider.left,
      session.divider.right,
      delta,
      session.space
    );
    liveWidthsRef.current = result.widths;
    setDragWidths(result.widths);
    const resist = prefersReducedMotion() ? 0 : resistanceOffset(result.overshoot);
    setResistPx(resist);
    setLimited(result.overshoot !== 0);
  }, []);

  const onDragEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const session = dragRef.current;
      if (!session || event.pointerId !== session.pointerId) return;

      const nextWidths = liveWidthsRef.current;
      const moved = session.moved;
      const forSpace = session.space;
      dragRef.current = null;
      liveWidthsRef.current = null;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      setDraggingIndex(null);
      setLimited(false);
      setResizingCursor(false);
      setDragWidths(null);
      setResistPx(0);

      if (moved && nextWidths) {
        persist(nextWidths, forSpace);
        beginSettle();
      }
    },
    [beginSettle, persist]
  );

  const onNudge = useCallback(
    (index: number, deltaPx: number) => {
      if (!resizable) return;
      const divider = CALL_WORKSPACE_DIVIDERS[index];
      if (!divider) return;
      const result = resizeAdjacent(widths, divider.left, divider.right, deltaPx, space);
      persist(result.widths);
    },
    [persist, resizable, space, widths]
  );

  const handleProps = (index: number) => {
    const divider = CALL_WORKSPACE_DIVIDERS[index];
    const left: CallPaneId = divider?.left ?? "script";
    const right: CallPaneId = divider?.right ?? "suggestions";
    const bounds = divider
      ? pairBounds(widths, left, right, space)
      : { min: 0, max: 0, now: 0 };
    const dragging = draggingIndex === index;
    return {
      left,
      right,
      valueNow: bounds.now,
      valueMin: bounds.min,
      valueMax: bounds.max,
      dragging,
      limited: dragging && limited,
      resistPx: dragging ? resistPx : 0,
      disabled: !resizable,
      onDragStart: (event: PointerEvent<HTMLDivElement>) => onDragStart(index, event),
      onDrag,
      onDragEnd,
      onReset: () => resetDivider(index),
      onNudge: (deltaPx: number) => onNudge(index, deltaPx),
    };
  };

  return {
    containerRef,
    measured,
    resizable,
    workspaceWidth,
    widths,
    fractions,
    replaceFractions,
    settling: settling && draggingIndex === null,
    handleProps,
  };
}
