import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Avatar, initialsFromName } from "@/components/Avatar";
import {
  IconGripVertical,
  IconHeadphonesOff,
  IconHeadset,
  IconLogin,
  IconMicrophone,
  IconPhone,
} from "@/components/Icon";
import { LockedControl, type Lock } from "@/components/LockedControl";
import { cn } from "@/lib/utils";
import { type LiveCall } from "./liveMonitoringData";

/**
 * Live Monitoring › Monitor Call — Figma "Unified analytics" (4714:367107).
 *
 * The inverse panel that floats over the page while a supervisor listens in.
 * The strip behind its top edge is the one thing that changes with what the
 * supervisor is doing, because "can anyone hear me?" is the question they
 * need answered at a glance: grey while silent, amber while whispering to the
 * agent, green once they've barged in and everyone can hear them.
 */

type Mode = "silent" | "whisper" | "barge";

const BANNER: Record<Mode, { className: string; icon?: React.ReactNode; text: (member: string) => string }> = {
  silent: {
    className: "bg-monitor-banner text-white",
    icon: <IconGripVertical size={16} />,
    text: () => "You’re monitoring silently. No one can hear you.",
  },
  whisper: {
    className: "bg-warning-secondary text-warning-text",
    icon: <IconMicrophone size={16} />,
    text: (member) => `You’re whispering to ${member.split(" ")[0]} only`,
  },
  barge: {
    className: "bg-success-secondary text-success-text",
    icon: <IconMicrophone size={16} />,
    text: () => "You’ve joined the call, everyone can hear you",
  },
};

/** Keeps at least this much of the panel's edge clear of the viewport edge. */
const VIEWPORT_MARGIN_PX = 8;

/**
 * Drag by the banner strip. The panel floats over exactly the table the
 * supervisor is reading, so they need to be able to move it out of the way
 * without ending the session.
 *
 * The offset goes on `transform`, not `translate`: the entrance keyframes
 * animate `translate` with `fill: both`, which would pin it at 0 and swallow
 * any drag written to the same property.
 */
function useDragOffset() {
  const panelRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ pointerX: number; pointerY: number; x: number; y: number; rect: DOMRect } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !panelRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: offset.x,
      y: offset.y,
      rect: panelRef.current.getBoundingClientRect(),
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const start = drag.current;
    if (!start) return;
    const m = VIEWPORT_MARGIN_PX;
    // Clamp against where the panel was when the drag began, so it can't be
    // thrown off-screen and lost.
    const dx = Math.min(
      Math.max(event.clientX - start.pointerX, m - start.rect.left),
      window.innerWidth - m - start.rect.right
    );
    const dy = Math.min(
      Math.max(event.clientY - start.pointerY, m - start.rect.top),
      window.innerHeight - m - start.rect.bottom
    );
    setOffset({ x: start.x + dx, y: start.y + dy });
  };

  const endDrag = () => {
    drag.current = null;
  };

  return {
    panelRef,
    style: { transform: `translate(${offset.x}px, ${offset.y}px)` },
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MonitorCallWidget({
  call,
  bargeLock,
  onEnd,
}: {
  call: LiveCall;
  /** Set when the license can't barge in; the button stays, muted, and says why. */
  bargeLock?: Lock;
  onEnd: () => void;
}) {
  const [mode, setMode] = useState<Mode>("silent");
  const [elapsed, setElapsed] = useState(0);
  const member = call.member ?? "Team member";
  const banner = BANNER[mode];

  // How long the supervisor has been on, not the call's age — it's what tells
  // them whether they've heard enough to step in.
  useEffect(() => {
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const whispering = mode === "whisper";
  const { panelRef, style, handleProps } = useDragOffset();

  return (
    <aside
      ref={panelRef}
      aria-label={`Monitoring ${call.contact}`}
      style={style}
      className="monitor-widget fixed top-[77px] right-9 z-40 w-[360px] rounded-md shadow-500"
    >
      <div
        role="status"
        {...handleProps}
        className={cn(
          "flex h-12 cursor-grab touch-none items-start gap-2 rounded-t-md pt-2 pr-2 pl-4 text-label-sm transition-colors select-none active:cursor-grabbing",
          banner.className
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">{banner.icon}</span>
        {banner.text(member)}
      </div>

      <div className="-mt-[18px] overflow-hidden rounded-md border border-monitor-line bg-monitor-surface text-white">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar
              size="lg"
              color="indigo"
              initials={initialsFromName(call.contact)}
              className="size-14 shrink-0"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-label-md">{call.contact}</span>
                <span className="truncate text-paragraph-sm">{call.phoneNumber}</span>
              </div>
              <span className="text-label-sm text-disabled-fg tabular-nums">
                {formatElapsed(elapsed)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <LockedControl
              locked={Boolean(bargeLock)}
              reason={bargeLock?.reason}
              hint={bargeLock?.hint}
            >
              <button
                type="button"
                aria-pressed={mode === "barge"}
                onClick={() => setMode("barge")}
                className="flex h-7 items-center gap-1 rounded-[4px] bg-monitor-action pr-3 pl-2 text-label-sm text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/40 data-[locked=true]:cursor-not-allowed data-[locked=true]:bg-monitor-line data-[locked=true]:text-disabled-fg"
              >
                <IconLogin size={16} className="rotate-180" />
                Barge
              </button>
            </LockedControl>
            <button
              type="button"
              aria-label="Stop monitoring"
              onClick={onEnd}
              className="flex size-7 items-center justify-center rounded-[4px] bg-error text-white transition-colors outline-none hover:bg-error-hover focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <IconPhone size={16} className="rotate-[135deg]" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-monitor-line px-4 pt-2 pb-4">
          <span className="text-label-xs text-disabled-fg uppercase">
            Whisper to member
          </span>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-label-md">
              <IconHeadset size={16} />
              {member}
            </span>
            {/* Off by default, as drawn: the red headphones say "they can't
                hear you". Pressing it opens the line to the agent only. */}
            <button
              type="button"
              aria-pressed={whispering}
              aria-label={whispering ? `Stop whispering to ${member}` : `Whisper to ${member}`}
              onClick={() => setMode(whispering ? "silent" : "whisper")}
              className={cn(
                "flex size-7 items-center justify-center rounded-[4px] border border-line transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                whispering ? "bg-warning-secondary text-warning-text" : "bg-error-subtle text-error-icon"
              )}
            >
              {whispering ? <IconMicrophone size={16} /> : <IconHeadphonesOff size={16} />}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
