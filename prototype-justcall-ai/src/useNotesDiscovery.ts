import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { DURATION } from "@/lib/motion";
import { trackNotes } from "./notesTelemetry";

/**
 * Notes' first showing.
 *
 * The Notes panel is off by default and lives behind an icon on the call bar,
 * which is a fine resting state and a terrible starting one: nothing on the
 * bar says the panel exists. Rather than explain it, the panel is shown once
 * and then puts itself away in front of the agent — the header travels to the
 * toolbar icon and the icon lights up as it lands. That is the whole lesson:
 * *this* is where Notes went, so *this* is where it comes back from.
 *
 * It runs once per connected call, and only when it can be ignored safely: the
 * workspace has room for the column, no other right-side panel is up, and the
 * notes are empty. Any real touch of Notes during the pause ends it — a panel
 * the agent is already using must not be taken away, and once the agent opens
 * Notes themselves it stays open for the rest of that call.
 * A cursor resting on the panel is not a touch, but it is attention, so it
 * holds the collapse rather than cancelling it.
 *
 * It also waits for someone to be looking. A backgrounded tab still runs its
 * timers, so without that check the one introduction an agent ever gets could
 * open, be recorded as seen, and put itself away while the window sat behind
 * something else. Hidden is a reason to wait, not a reason to give up.
 */

/**
 * Transition lengths come from the shared scale — the panel, the travelling
 * header and the toolbar pulse are all animating, so they are all on it. The
 * plain numbers below are *waits*: nothing moves during a settle beat, a
 * dwell, or the hold after a pulse, so there is no travel to size them by.
 */
export const NOTES_DISCOVERY = {
  /** A beat after the workspace lands, so Notes is not one more thing arriving. */
  settleMs: 320,
  /** Long enough to read the panel and start typing in it if that is why it opened. */
  dwellMs: 3000,
  /** Textarea, counter and close button clear first; the header stays. */
  bodyFadeMs: DURATION.fast,
  /** The header's trip to the toolbar, and the panel's own compression with it. */
  flightMs: DURATION.slow,
  /** It only clears once it is over the icon, not on the way there. */
  fadeMs: DURATION.fast,
  fadeDelayMs: DURATION.fast,
  /** Toolbar glyph is 20px; the header meets it at roughly its size. */
  endScale: 0.5,
  /** Two frames, in case none arrive — the move must not depend on rAF alone. */
  armMs: 48,
  /**
   * The icon absorbing the landing: overshoot, dip, overshoot, settle. Not on
   * the transition scale at all — this is the one-shot attention pulse
   * `emphasis` exists for, the same token the assist card's arrival wash uses.
   * At `slow` the bounce was legible only if you already knew to look for it:
   * a 14% overshoot inside 240ms is over before the eye has finished
   * following the header in. The amplitude is what makes it read, and a
   * bigger travel needs the room — three visible hops decaying from 34%.
   */
  pulseMs: DURATION.emphasis,
  /** A beat past the bounce, so the highlight is not pulled mid-hop. */
  pulseHoldMs: DURATION.emphasis + DURATION.micro,
  /**
   * After the cursor leaves. Long enough that crossing the panel on the way
   * somewhere else doesn't hand the agent a collapse under their pointer.
   */
  hoverResumeMs: 300,
} as const;

/** Geometry for the travelling header, in viewport coordinates. */
export type NotesDiscoveryFlight = {
  top: number;
  left: number;
  width: number;
  height: number;
  /** Transform origin inside the box — the mark, not the box's middle. */
  originX: number;
  originY: number;
  dx: number;
  dy: number;
  /** False for the frame that paints it in place, true for the one that moves it. */
  moving: boolean;
};

/** `waiting` is the settle beat before the panel opens; `leaving` is the trip. */
type Stage = "off" | "waiting" | "dwell" | "leaving" | "done";

/** Nobody is looking at a hidden document, so nothing shown in one counts. */
function pageVisible() {
  return typeof document === "undefined" || !document.hidden;
}

export function useNotesDiscovery({
  ready,
  reduced,
  hasRoom,
  busy,
  hasContent,
  headerRef,
  markRef,
  targetRef,
  onOpen,
  onClose,
}: {
  /** The workspace has been measured and is no longer arriving. */
  ready: boolean;
  reduced: boolean;
  /** Enough width for Script, Guidance and the column at once. */
  hasRoom: boolean;
  /** Another right-side panel is already up. */
  busy: boolean;
  /** Notes already carry something the agent may need in front of them. */
  hasContent: boolean;
  /** The header's icon + title group — the element that travels. */
  headerRef: RefObject<HTMLElement | null>;
  /** The mark inside that group, which is what has to land on the icon. */
  markRef: RefObject<HTMLElement | null>;
  /** The Notes control on the call bar. */
  targetRef: RefObject<HTMLElement | null>;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [flight, setFlight] = useState<NotesDiscoveryFlight | null>(null);
  const [pulsing, setPulsing] = useState(false);
  // Re-runs the gate when the window comes back, which is the first moment the
  // introduction has an audience.
  const [visible, setVisible] = useState(pageVisible);

  useEffect(() => {
    const onChange = () => setVisible(pageVisible());
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  // The machine is a ref, not state: nothing renders off it, and a stage that
  // only settles on the next commit would let a second timer through.
  const stageRef = useRef<Stage>("off");
  const openRef = useRef(onOpen);
  openRef.current = onOpen;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  // The cursor is on the panel, and — separately — the collapse came due while
  // it was. The second outlives the first: that is what makes leaving the
  // panel start the collapse rather than just clearing a flag.
  const hoverRef = useRef(false);
  const heldRef = useRef(false);

  const timersRef = useRef<number[]>([]);
  const rafRef = useRef(0);

  const clear = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const later = useCallback((ms: number, run: () => void) => {
    timersRef.current.push(window.setTimeout(run, ms));
  }, []);

  // Teardown puts a run that has not started travelling back to the line, so
  // React's development remount re-arms it instead of swallowing it. Once the
  // header is in the air there is nothing left to restart.
  useEffect(
    () => () => {
      clear();
      heldRef.current = false;
      if (stageRef.current === "waiting" || stageRef.current === "dwell") {
        stageRef.current = "off";
      }
    },
    [clear]
  );

  const collapse = useCallback(() => {
    if (stageRef.current !== "dwell") return;

    // Reading the panel is a reason to keep it. Hold, and let the pointer
    // leaving be what restarts this — the collapse is owed, not cancelled.
    if (hoverRef.current) {
      heldRef.current = true;
      return;
    }
    heldRef.current = false;
    stageRef.current = "leaving";
    trackNotes("notes_intro_auto_collapsed");

    // Read the geometry while the panel is still where it was — the close
    // below is what starts taking it away.
    const from = headerRef.current?.getBoundingClientRect();
    const mark = markRef.current?.getBoundingClientRect();
    const to = targetRef.current?.getBoundingClientRect();

    closeRef.current();

    const pulse = () => {
      setPulsing(true);
      later(NOTES_DISCOVERY.pulseHoldMs, () => {
        setPulsing(false);
        stageRef.current = "done";
      });
    };

    // Reduced motion — or a panel that is no longer on screen to travel from.
    // The icon lighting up is then the whole of the connection.
    if (reducedRef.current || !from?.width || !mark?.width || !to?.width) {
      pulse();
      return;
    }

    const originX = mark.left + mark.width / 2 - from.left;
    const originY = mark.top + mark.height / 2 - from.top;
    setFlight({
      top: from.top,
      left: from.left,
      width: from.width,
      height: from.height,
      originX,
      originY,
      dx: to.left + to.width / 2 - (from.left + originX),
      dy: to.top + to.height / 2 - (from.top + originY),
      moving: false,
    });

    // Arm, then move. A transition only runs when the element was already
    // painted at the value it is travelling from — hence the second frame.
    // The timer is the same insurance the aside column carries: a window that
    // stops handing out frames must still leave the machine somewhere sane.
    let moved = false;
    const move = () => {
      if (moved) return;
      moved = true;
      setFlight((current) => (current ? { ...current, moving: true } : null));
    };
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(move);
    });
    later(NOTES_DISCOVERY.armMs, move);

    later(NOTES_DISCOVERY.flightMs, () => {
      setFlight(null);
      pulse();
    });
  }, [headerRef, later, markRef, targetRef]);

  useEffect(() => {
    if (stageRef.current !== "off" || !ready) return;

    // Waiting, not declining: the conditions below are about this call, but a
    // hidden window is about the agent, and they may still be back inside it.
    if (!visible) return;

    // One shot per call, taken the moment the workspace settles. If the
    // conditions are wrong now they are not going to become right in a way
    // worth acting on — Notes appearing on its own halfway through a call is an
    // interruption, not an introduction. The next call is a fresh chance.
    if (busy || hasContent || !hasRoom) {
      // Says which gate closed. A call that quietly gets no introduction is
      // indistinguishable from a broken one otherwise.
      console.debug("[notes] introduction skipped", {
        busy,
        hasContent,
        hasRoom,
      });
      stageRef.current = "done";
      return;
    }

    stageRef.current = "waiting";
    later(NOTES_DISCOVERY.settleMs, () => {
      if (stageRef.current !== "waiting") return;
      // Hidden during the settle beat — back to the line rather than opening
      // into a window nobody is watching.
      if (!pageVisible()) {
        stageRef.current = "off";
        return;
      }
      stageRef.current = "dwell";
      openRef.current();
      trackNotes("notes_intro_shown", { dwellMs: NOTES_DISCOVERY.dwellMs });
      later(NOTES_DISCOVERY.dwellMs, collapse);
    });
  }, [busy, collapse, hasContent, hasRoom, later, ready, visible]);

  /**
   * The agent reached for Notes. Whatever it was — a click in the box, a
   * keystroke, the close button, another panel — the introduction is over and
   * the panel is theirs. Never fires once the collapse is already travelling.
   */
  const cancel = useCallback(() => {
    if (stageRef.current !== "waiting" && stageRef.current !== "dwell") return;
    clear();
    heldRef.current = false;
    stageRef.current = "done";
    trackNotes("notes_intro_cancelled_by_interaction");
  }, [clear]);

  /**
   * Hover is the one signal that pauses instead of ending. It is also the only
   * one that can arrive *after* the collapse was due, which is why leaving has
   * to check for a held collapse rather than assume the timer is still coming.
   */
  const onPanelEnter = useCallback(() => {
    hoverRef.current = true;
  }, []);

  const onPanelLeave = useCallback(() => {
    hoverRef.current = false;
    if (!heldRef.current) return;
    heldRef.current = false;
    later(NOTES_DISCOVERY.hoverResumeMs, collapse);
  }, [collapse, later]);

  return {
    flight,
    /** The panel is handing its header over — fade what is not travelling. */
    handingOff: flight !== null,
    pulsing,
    cancel,
    onPanelEnter,
    onPanelLeave,
  };
}
