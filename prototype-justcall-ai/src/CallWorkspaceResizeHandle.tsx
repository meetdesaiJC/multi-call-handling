import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { cn } from "@/lib/utils";
import {
  CALL_PANE_LABELS,
  CALL_WORKSPACE_TOKENS,
  type CallPaneId,
} from "./callWorkspaceLayout";

export interface CallWorkspaceResizeHandleProps {
  left: CallPaneId;
  right: CallPaneId;
  valueNow: number;
  valueMin: number;
  valueMax: number;
  dragging: boolean;
  limited: boolean;
  resistPx: number;
  disabled?: boolean;
  /** The column this divider serves is opening or closing — no width, no grip. */
  collapsing?: boolean;
  onDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  onDrag: (event: PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onReset: () => void;
  onNudge: (deltaPx: number) => void;
}

export function CallWorkspaceResizeHandle({
  left,
  right,
  valueNow,
  valueMin,
  valueMax,
  dragging,
  limited,
  resistPx,
  disabled = false,
  collapsing = false,
  onDragStart,
  onDrag,
  onDragEnd,
  onReset,
  onNudge,
}: CallWorkspaceResizeHandleProps) {
  const leftLabel = CALL_PANE_LABELS[left];
  const rightLabel = CALL_PANE_LABELS[right];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const { key, shiftKey } = event;
    if (key === "Enter") {
      event.preventDefault();
      onReset();
      return;
    }
    if (key !== "ArrowLeft" && key !== "ArrowRight") return;
    event.preventDefault();
    const step = shiftKey
      ? CALL_WORKSPACE_TOKENS.stepLargePx
      : CALL_WORKSPACE_TOKENS.stepPx;
    onNudge(key === "ArrowRight" ? step : -step);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${leftLabel} and ${rightLabel}`}
      aria-valuenow={valueNow}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      aria-valuetext={`${valueNow} pixels for ${leftLabel}`}
      aria-controls={`call-pane-${left} call-pane-${right}`}
      aria-disabled={disabled || collapsing || undefined}
      aria-hidden={collapsing || undefined}
      tabIndex={disabled || collapsing ? -1 : 0}
      className={cn(
        "call-pane-resize",
        collapsing && "is-collapsing",
        dragging && "is-dragging",
        limited && "is-limited"
      )}
      style={
        {
          "--call-resist": `${resistPx}px`,
        } as CSSProperties
      }
      onPointerDown={onDragStart}
      onPointerMove={onDrag}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      onLostPointerCapture={onDragEnd}
      onDoubleClick={(event) => {
        event.preventDefault();
        if (!disabled) onReset();
      }}
      onKeyDown={onKeyDown}
    >
      <span className="call-pane-resize-line" aria-hidden="true" />
    </div>
  );
}
