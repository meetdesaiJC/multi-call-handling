import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { FeedbackThumbs, type FeedbackVote } from "@/components/FeedbackThumbs";
import { InputField } from "@/components/InputField";
import {
  IconCallDisposition,
  IconCallLogs,
  IconCheck,
  IconChevronDown,
  IconClose,
  IconContacts,
  IconMessages,
  IconOtherApps,
  IconSparkles,
  IconVoice,
  IconVoicemailDrop,
} from "@/components/Icon";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { IconJcaiSettings } from "./icons/JustCallAiNavIcons";
import {
  IconCallHold,
  IconCallKeypad,
  IconCallMuted,
  IconCallNotes,
  IconCallTranscript,
  IconCallTransfer,
  IconCallUsers,
} from "./icons/CallControlIcons";
import { BarControl, CallControl } from "./CallBarControl";
import {
  KEYPAD_COPY,
  KeypadBody,
  KeypadControl,
  KeypadGrid,
  TransferBody,
  TransferControl,
  VoicemailBody,
  VoicemailDropControl,
  transferCopy,
  useKeypad,
  useTransferFlow,
  useVoicemailDrop,
  voicemailCopy,
  type KeypadFlow,
  type TransferFlow,
  type VoicemailFlow,
} from "./CallLineControls";
import {
  RecordingBody,
  recordingCopy,
  AvailabilityControl,
  AvailabilityStatusPill,
  CallQualityModal,
  NetworkStatusControl,
  PhoneNetworkCheck,
  RecordingControl,
  useCallQualityModal,
  useRecording,
  type RecordingController,
} from "./CallStatusControls";
import {
  CallAsidePanel,
  PhoneSheet,
  usePhoneSheetPresence,
} from "./CallPopover";
import { DialerSettingsPage } from "./DialerSettingsPage";
import { useAudioDevices, type AudioDeviceSelection } from "./audioSettings";
import {
  KNOWN_NUMBERS,
  formatCallDuration,
  formatPhoneNumber,
  networkReadingAt,
  setVoicemailLibrary,
  voicemailLibrary,
  type AvailabilityId,
  SEED_BUSY_REASONS,
  type BusyReason,
  type BusyReasonId,
  type NetworkReading,
  type TransferTarget,
  type VoicemailGreeting,
  INBOUND_ARRIVES_MS,
  INBOUND_CALL,
  type InboundCall,
} from "./callDeviceData";
import {
  AgentAssistCallSheet,
  LiveTranscriptPanel,
  callActionCtas,
} from "./AgentAssistCallSheet";
import {
  NotesEditor,
  type NotesEditorCaret,
  type NotesEditorHandle,
  type NotesEditorValue,
} from "./NotesEditor";
import { LiveAgentAssistPanel } from "./LiveAgentAssistPanel";
import { type AgentAssistScope } from "./agentAssistScope";
import {
  LiveAssistControl,
  LiveAssistPanel,
  LiveAssistToast,
  useLiveAssist,
  type LiveAssistThread,
} from "./LiveAssistPanel";
import { CallWaveform } from "./CallWaveform";
import { CallWorkspaceResizeHandle } from "./CallWorkspaceResizeHandle";
import {
  CALL_ASIDE,
  canResizeWorkspace,
  fractionsForAsideOpen,
  type CallPaneCollapsed,
  type CallPaneId,
} from "./callWorkspaceLayout";
import { useCallWorkspaceResize } from "./useCallWorkspaceResize";
import {
  useAsidePanelSwitch,
  type AsidePanel,
} from "./useAsidePanelSwitch";
import {
  NOTES_DISCOVERY,
  useNotesDiscovery,
  type NotesDiscoveryFlight,
} from "./useNotesDiscovery";
import { trackNotes } from "./notesTelemetry";
import {
  CALL_SCENARIOS,
  POST_WRAP_COMPLETED_DELAY_MS,
  scenarioById,
  simulationAt,
  type CallOutcomeValue,
  type CallScenario,
} from "./callSimulation";
import type { ActionState } from "./actionsData";
import usFlag from "./assets/dialer/us-flag.svg";
import phoneFilled from "./assets/dialer/phone-filled.svg";
import hangupIcon from "./assets/dialer/hangup.svg";
import messageIcon from "./assets/dialer/message.svg";
import userIcon from "./assets/dialer/user.svg";

/**
 * Dialer page — compact 360px webphone, pinned top-center while idle
 * (and while the line is still ringing). Once the callee picks up, the
 * call workspace — script, guidance, transcript, then wrap-up — sits
 * centered so those panes read as one object.
 */

type DialerTab = "dialer" | "call-logs" | "contacts" | "messages" | "settings";
/**
 * `connecting` is the beat between pickup and the workspace: the phone is still
 * whole, it just stops saying Ringing and starts the clock. The layout only
 * begins to move once that has registered.
 *
 * `incoming` is not a variant of `ringing`, and the difference is the whole
 * reason it exists: `ringing` ends on a timer, and an offered call must only
 * ever end because the agent answered it or turned it down. Keeping them apart
 * is what stops the clock effect below from quietly answering the phone.
 */
type CallPhase =
  | "idle"
  | "incoming"
  | "ringing"
  | "connecting"
  | "talking"
  | "wrapup";

/**
 * Who is on the line. The number always exists; the name only does when the
 * directory has a record for it, and `known: false` is the unknown-caller
 * state every surface has to render — the number is promoted to the headline
 * and nothing pretends to know whose it is.
 */
type CallerIdentity = {
  name: string;
  number: string;
  meta: string;
  known: boolean;
};

const NOTES_MAX = 1500;

/** One call, one set of notes — the live pane and Wrap up edit the same value. */
const EMPTY_NOTES: NotesEditorValue = { html: "", text: "" };

/**
 * How long the workspace takes to give the aside column its width — and
 * to take it away. Matches `--call-aside-open-ms` / `--call-aside-close-ms`.
 */
const ASIDE_OPEN_MS = 280;
const ASIDE_CLOSE_MS = 240;

/** The beat between arming the width transition and changing the widths. */
const ASIDE_RELEASE_MS = 48;

/** Disposition reads at a glance — the dot carries the outcome, not the words. */
const OUTCOME_TONE = {
  positive: "bg-success",
  pending: "bg-warning",
  negative: "bg-error",
  neutral: "bg-disabled-fg",
} as const;

type OutcomeTone = keyof typeof OUTCOME_TONE;

const CALL_OUTCOMES: {
  value: CallOutcomeValue;
  label: string;
  tone: OutcomeTone;
}[] = [
  { value: "interested", label: "Interested", tone: "positive" },
  { value: "follow-up", label: "Follow-up required", tone: "pending" },
  { value: "meeting", label: "Meeting booked", tone: "positive" },
  { value: "not-interested", label: "Not interested", tone: "negative" },
  { value: "no-answer", label: "No answer", tone: "neutral" },
  { value: "voicemail", label: "Left voicemail", tone: "neutral" },
  { value: "wrong-number", label: "Wrong number", tone: "neutral" },
];

const RINGING_MS = 2400;
const DEFAULT_NUMBER = "919773110910";

/**
 * Keypad and ringing are the same phone, so the card cannot change size when
 * the agent hits Call — only what is inside it changes. The number is the
 * ringing state's natural height, since its content is the taller of the two.
 * The keypad needs less, and spreads its rows into the room left over.
 */
const PHONE_SHELL_H = "h-[588px] max-h-full";

/** Tap Call — let the button finish compressing before the dialer turns over. */
const CALL_PRESS_MS = 120;
/** Hangup — Agent Assist lets go first, then the phone changes state. */
const ASSIST_COLLAPSE_MS = 200;
/** After completed cards land, hold them on screen before hangup. */
const POST_COMPLETED_HANGUP_MS = 2800;
/** How long the outgoing card stays on top while the next one resolves. */
const SHELL_CROSSFADE_MS = 180;
/** Save & close — the button confirms before the wrap-up lets go. */
const SAVE_CONFIRM_MS = 520;
/**
 * How long the dropped-voicemail toast stays up. Long enough to be read after
 * the dialer has finished arriving under it, short enough that it is gone
 * before the agent has dialled the next number.
 */
const VOICEMAIL_TOAST_MS = 3200;

/* ── Answered → workspace ───────────────────────────────────────────────────
   One ~640ms move, timed from the moment the line goes live. The phone is
   never swapped for another screen: it becomes the call bar, and the panels
   only arrive once that has almost finished. */

/** 0–120ms — Ringing → Connected, clock starts, nothing has moved yet. */
const CONNECT_BEAT_MS = 120;
/** 120–480ms — the dark card compresses upward and spreads into the bar. */
const MORPH_SURFACE_MS = 360;
/** 140–440ms — avatar, caller, Mute/Hold/Keypad/Transfer and End call travel. */
const MORPH_ELEMENT_DELAY_MS = 20;
const MORPH_ELEMENT_MS = 300;
/** 160ms — anything the bar has no use for, and the form change under a move. */
const MORPH_FADE_MS = 160;
/** 120–640ms — the whole move, measured from the first frame of geometry. */
const MORPH_TOTAL_MS = 520;
/** No bounce: a single decelerating curve carries every part of the move. */
const MORPH_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Bar chrome with no counterpart on the phone resolves after the travel. */
const BAR_DETAIL_DELAY_MS = 340;
/** 360–580ms, then 420–640ms — panels land last, left to right. */
const PANE_REVEAL_DELAYS_MS = [240, 270, 300];
/**
 * The stage has finished arriving: the last pane's entrance is over (its delay
 * plus the 220ms `call-stage-pane-in` runs to), which lands at the same beat
 * the morph does. Measured from the moment the call goes live, so it holds for
 * a resumed call that had no phone to morph from.
 */
const STAGE_SETTLED_MS = PANE_REVEAL_DELAYS_MS[2] + 220;

/* ── Completed call → dialer ────────────────────────────────────────────
   Putting a finished call away. The recap collapses toward the completed-call
   bar while the dialer arrives underneath it from the same horizontal centre,
   overlapping so the stage is never empty: one workspace folding up, not a
   page change. The choreography itself lives in `styles.css`; what JS needs
   is when the recap stops being on screen and when the dialer starts taking
   clicks.

   Composed from the scale rather than re-typed — the panes leave at `base`,
   the dark bar outlasts them at `moderate`, and the dialer waits a `micro`
   beat before taking `moderate`. Nothing here is a new duration (CLAUDE.md §4). */
/** The whole move: the dialer's beat of overlap plus its arrival. */
const POST_CALL_CLOSE_MS = DURATION.micro + DURATION.moderate;
/**
 * The dialer takes clicks once its entrance is all but done — early enough
 * that a fast agent isn't typing into a dead card, late enough that a click
 * aimed at the recap can't land on the dialer under it.
 */
const DIALER_ARM_MS = DURATION.micro + DURATION.base;
/** Reduced motion: one crossfade, no collapse, no travel, nothing to wait out. */
const POST_CALL_CLOSE_REDUCED_MS = DURATION.fast;

const NAV_ITEMS: {
  id: DialerTab;
  label: string;
  icon: ReactNode;
  badge?: string;
}[] = [
  {
    id: "dialer",
    label: "Dialer",
    icon: <IconOtherApps size={20} className="size-5 text-white" />,
  },
  {
    id: "call-logs",
    label: "Call Logs",
    icon: <IconCallLogs size={20} className="size-5 text-white" />,
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: <IconContacts size={20} className="size-5 text-white" />,
  },
  {
    id: "messages",
    label: "Messages",
    icon: <IconMessages size={20} className="size-5 text-white" />,
    badge: "358",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <IconJcaiSettings className="size-5 text-white" />,
  },
];

function Flag({ className }: { className?: string }) {
  return (
    <img
      src={usFlag}
      alt=""
      className={cn("size-4 shrink-0 rounded-full object-cover", className)}
    />
  );
}

function Glyph({ src, className }: { src: string; className?: string }) {
  return (
    <span className={cn("relative size-6 overflow-clip", className)}>
      <img src={src} alt="" className="size-full object-contain" />
    </span>
  );
}

function formatLocalTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type MorphRect = { left: number; top: number; width: number; height: number };
type MorphCapture = { card: MorphRect; parts: Map<string, MorphRect> };

function readRect(el: Element): MorphRect {
  const { left, top, width, height } = el.getBoundingClientRect();
  return { left, top, width, height };
}

/**
 * Viewport rect → stage-relative rect. The morph layers are absolute children
 * of the stage rather than fixed to the viewport: the shell's entrance
 * animation leaves a transform behind, and a transformed ancestor becomes the
 * containing block for fixed children — which would silently offset them by the
 * overlay's top padding. Start and target are converted against one origin read
 * in the same frame, so any ancestor offset cancels out.
 */
function localRect(rect: MorphRect, origin: MorphRect): MorphRect {
  return {
    left: rect.left - origin.left,
    top: rect.top - origin.top,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Write a rect to an element. Unlike React's style prop, the CSSOM takes no
 * bare numbers — a unitless value is dropped silently, which would leave a
 * layer sitting wherever it happened to land.
 */
function applyRect(el: HTMLElement, rect: MorphRect) {
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.top}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
}

/**
 * Snapshot where the phone and each of its shared elements sit, while the
 * phone is still the thing on screen. Taken during the connect beat, which is
 * the last frame before the layout turns over.
 */
function captureMorph(card: HTMLElement): MorphCapture {
  const parts = new Map<string, MorphRect>();
  card.querySelectorAll<HTMLElement>("[data-morph]").forEach((el) => {
    const key = el.dataset.morph;
    if (key) parts.set(key, readRect(el));
  });
  return { card: readRect(card), parts };
}

/**
 * Play the move. The dark surface takes the geometry — phone footprint to bar
 * footprint — while each element that exists in both places is inverted back
 * to where it was on the phone and released. A control that changes form on
 * the way (a 56px ringed circle becoming a 20px bar icon) cross-dissolves
 * across the same travel, so the change of shape rides the movement instead of
 * cutting.
 */
function runMorph(
  from: MorphCapture,
  root: HTMLElement,
  surface: HTMLElement,
  ghost: HTMLElement | null
): () => void {
  const bar = root.querySelector<HTMLElement>("[data-morph-bar]");
  if (!bar) return () => {};

  // One origin, read in the same frame as the target, for both layers.
  const origin = readRect(root);
  const footprint = localRect(from.card, origin);
  const to = readRect(bar);
  const travelling: HTMLElement[] = [];

  bar.querySelectorAll<HTMLElement>("[data-morph]").forEach((el) => {
    const key = el.dataset.morph;
    const start = key ? from.parts.get(key) : undefined;
    if (!start) return;
    const end = readRect(el);
    if (end.width === 0 || end.height === 0) return;

    // Text re-flows rather than scales; a control keeps its proportions and
    // takes the ratio that matches how it is read — its overall height.
    const mode = el.dataset.morphScale ?? "width";
    const scale =
      mode === "none"
        ? 1
        : mode === "height"
          ? start.height / end.height
          : start.width / end.width;
    const dx = start.left + start.width / 2 - (end.left + end.width / 2);
    const dy = start.top + start.height / 2 - (end.top + end.height / 2);

    el.style.transition = "none";
    el.style.transformOrigin = "center center";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    el.style.opacity = "0";
    el.style.willChange = "transform, opacity";
    travelling.push(el);
  });

  // Both layers start on the phone's footprint. Written here rather than in
  // render because only now is the origin they resolve against known — and a
  // layout effect still lands before the first paint, so nothing shows late.
  applyRect(surface, footprint);
  if (ghost) applyRect(ghost, footprint);

  // Flush the inverted state so the first painted frame is still the phone.
  void surface.offsetWidth;

  const frame = requestAnimationFrame(() => {
    surface.style.transition = (["left", "top", "width", "height"] as const)
      .map((prop) => `${prop} ${MORPH_SURFACE_MS}ms ${MORPH_EASE}`)
      .join(", ");
    applyRect(surface, localRect(to, origin));

    travelling.forEach((el) => {
      el.style.transition = [
        `transform ${MORPH_ELEMENT_MS}ms ${MORPH_EASE} ${MORPH_ELEMENT_DELAY_MS}ms`,
        `opacity ${MORPH_FADE_MS}ms ease-out ${MORPH_ELEMENT_DELAY_MS}ms`,
      ].join(", ");
      el.style.transform = "none";
      el.style.opacity = "1";
    });
  });

  return () => {
    cancelAnimationFrame(frame);
    travelling.forEach((el) => {
      el.style.removeProperty("transition");
      el.style.removeProperty("transform");
      el.style.removeProperty("transform-origin");
      el.style.removeProperty("opacity");
      el.style.removeProperty("will-change");
    });
  };
}

/**
 * Cross-dissolve between two call cards. The outgoing card is snapshotted and
 * held on top at the same footprint while the incoming card resolves under it,
 * so dialing → ringing → wrap-up reads as one surface changing state.
 */
function ShellSwap({
  swapKey,
  reduced,
  instant = false,
  className,
  children,
}: {
  swapKey: string;
  reduced: boolean;
  /**
   * Hand the next card over with no dissolve. The post-call close runs its
   * own choreography across both cards, and a generic crossfade laid on top
   * of it reads as the recap flashing back in on its way out.
   */
  instant?: boolean;
  className?: string;
  children: (enterClassName: string) => ReactNode;
}) {
  const [live, setLive] = useState({ key: swapKey, entering: false });
  const [outgoing, setOutgoing] = useState<ReactNode>(null);
  const onScreen = useRef<ReactNode>(null);
  const timer = useRef<number | null>(null);
  const cut = reduced || instant;

  // Commit the entering state in the same render as the swap, so the incoming
  // card never lands at full opacity for a frame before the dissolve starts.
  if (live.key !== swapKey) setLive({ key: swapKey, entering: !cut });
  const rendered = children(
    live.key === swapKey && live.entering ? "dialer-shell-in" : ""
  );

  useEffect(() => {
    const previous = onScreen.current;
    if (!previous || cut) return;
    setOutgoing(previous);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOutgoing(null), SHELL_CROSSFADE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapKey]);

  useEffect(() => {
    onScreen.current = rendered;
  });

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  return (
    <div className={cn("relative", className)}>
      {outgoing ? (
        <div
          aria-hidden="true"
          inert
          className="dialer-shell-out pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          {outgoing}
        </div>
      ) : null}
      {rendered}
    </div>
  );
}

export interface DialerPanelProps {
  /** V1 has no Live Assist, coaching cues or suggested actions. */
  scope?: AgentAssistScope;
  /**
   * Whether this account has anything authored in Agent Assist.
   *
   * Off is the default dialer: no script to follow, no response cards, nothing
   * to widen the stage for — so the call never leaves the 360px phone. That is
   * not a degraded version of the workspace, it is what a JustCall call looks
   * like before Agent Assist is set up, and it is the state every new account
   * starts in.
   */
  assistConfigured?: boolean;
  /** False when the account's plan does not include Agent Assist. */
  assistAvailable?: boolean;
  /**
   * False is today's dialer, from before Agent Assist existed: an answered
   * call stays on the 360px phone and nothing under it mentions Agent Assist
   * — not even the "isn't set up yet" card an unconfigured account gets.
   * Prototypes designed on the current dialer (multi-call handling) start
   * here, so the later release's surfaces don't leak into them.
   */
  agentAssist?: boolean;
  /**
   * The unavailability reasons the admin has set up for this account. The
   * dialer reads this list, it never authors it — going Unavailable asks for a
   * reason from here, and an account with none set up is asked for nothing.
   */
  busyReasons?: BusyReason[];
  /**
   * Selects the transferred-call walkthrough: shortly after the dialer opens,
   * a colleague hands a call over instead of the agent placing one. Nothing
   * else about the dialer changes, and the outbound demo never sees the timer.
   *
   * No caller sets it today — the launcher card was pulled while the handover
   * flow is reworked. Passing it again from `Dashboard` is the whole re-enable,
   * so the offer states below stay exercised rather than rebuilt.
   */
  inboundDemo?: boolean;
  className?: string;
  onCall?: (number: string) => void;
  onClose?: () => void;
}

export function DialerPanel({
  className,
  onCall,
  onClose,
  scope = "v2",
  assistConfigured: assistConfiguredProp = true,
  assistAvailable = true,
  agentAssist = true,
  busyReasons = SEED_BUSY_REASONS,
  inboundDemo = false,
}: DialerPanelProps) {
  const inputId = useId();
  // No Agent Assist at all means nothing authored in it either — the phone
  // never widens into the workspace.
  const assistConfigured = agentAssist && assistConfiguredProp;
  const [number, setNumber] = useState("");
  const [tab, setTab] = useState<DialerTab>("dialer");
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [scenarioId, setScenarioId] = useState(CALL_SCENARIOS[0].id);
  // Which number the call actually went to, so the phone can tell a contact
  // from a bare number it has never seen (see `caller` below).
  const [dialedDigits, setDialedDigits] = useState(DEFAULT_NUMBER);
  /**
   * The attribution for a transferred call, and the direction flag both:
   * `inbound !== null` is what makes this call inbound. Held as one nullable
   * payload rather than a field on `CallerIdentity`, so the eight surfaces that
   * take a caller stay untouched — none of them cares which way it was placed.
   */
  const [inbound, setInbound] = useState<InboundCall | null>(null);
  // The agent's own status and why they are Unavailable if they are. Both
  // live here because both outlast a single call.
  const [availability, setAvailability] = useState<AvailabilityId>("available");
  const [busyReason, setBusyReason] = useState<BusyReasonId | null>(null);

  /**
   * Status and reason move together — an Unavailable without a reason and an
   * Available carrying a stale one are both states nothing should be able to
   * reach.
   */
  const changeAvailability = (
    next: AvailabilityId,
    reason: BusyReasonId | null
  ) => {
    setAvailability(next);
    setBusyReason(next === "busy" ? reason : null);
  };
  // Devices outlast calls too — an agent picks a headset once a morning.
  const devices = useAudioDevices();
  // So does the drop library: uploaded once in Settings, offered on every call
  // after. It lives up here because Settings writes it and the call bar reads
  // it, and those are two different branches of this tree — and it is seeded
  // from the account rather than from the fixture, so a drop the agent
  // uploaded is still there after the dialer has been closed and reopened.
  const [drops, setDrops] = useState<VoicemailGreeting[]>(voicemailLibrary);
  // Which drop was just left, or null. The one thing that outlives the call a
  // voicemail ended: there is no recap to report it on, so it reports itself
  // on the dialer the agent lands back on.
  const [droppedVoicemail, setDroppedVoicemail] = useState<string | null>(null);
  const [assistCollapsing, setAssistCollapsing] = useState(false);
  // The completed call is on its way out: the recap is collapsing and the
  // dialer is arriving under it. Also the transition lock — one close runs,
  // however many × clicks, Escapes or Save & closes arrive while it does.
  const [closing, setClosing] = useState(false);
  // The arriving dialer stops being a picture and starts taking clicks.
  const [dialerArmed, setDialerArmed] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const collapseTimer = useRef<number | null>(null);
  const closeTimers = useRef<number[]>([]);
  // Where the close came from decides where focus lands afterwards.
  const closedByKeyboard = useRef(false);
  const callStartedAt = useRef<number | null>(null);
  const holdStartedAt = useRef<number | null>(null);
  const pausedMs = useRef(0);
  const autoEnded = useRef(false);
  const inCall = phase !== "idle";
  const incoming = phase === "incoming";
  const connecting = phase === "connecting";
  const talking = phase === "talking";
  const wrapping = phase === "wrapup";
  const scenario = scenarioById(scenarioId);

  /**
   * Who is on the line, name and number both.
   *
   * The number is the one thing about a call that always exists — a name only
   * does when there is a record behind it. So the number is derived from what
   * was dialled rather than from the scenario, and a number the directory
   * doesn't know produces the unknown-caller state: the number becomes the
   * headline and there is no name above it. That state is reachable by typing
   * an unfamiliar number into the field, which is how an agent reaches it for
   * real — not by a switch.
   */
  const caller = useMemo(() => {
    const digits = dialedDigits.replace(/\D/g, "");
    const known = KNOWN_NUMBERS[digits] === scenario.id;
    return {
      name: known ? scenario.contactName : "",
      number: formatPhoneNumber(known ? scenario.contactNumber : digits),
      meta: known ? scenario.contactMeta : "No matching contact",
      known,
    };
  }, [dialedDigits, scenario]);

  /** The line's own reading, on the authored arc — see `networkTierAt`. */
  const network = networkReadingAt(elapsedMs);

  /**
   * What the pill says. On a call and in wrap-up the phone owns the status:
   * an agent mid-sentence is not "Available", whatever they last picked.
   *
   * Unavailable rather than a status of its own, because Unavailable is what
   * the queue already does with this: don't ring this person. An agent on a
   * call, an agent filing one and an agent at lunch are the same routing fact,
   * and giving each its own colour says they aren't — the floor view then has
   * three colours to mean one thing.
   *
   * Wrap-up was the last holdout, and it was the weakest of the three: Wrap-Up
   * Time ships Disabled, so an amber "Wrap-up time" named a window the account
   * had not granted. Filing a call is the same fact as taking one — the agent
   * is off the queue, and the pill says so once.
   *
   * "On a call" and "Wrap-up time" stay in the vocabulary for the *other*
   * agents in the transfer list, where how they are off the queue is the
   * whole point.
   */
  const effectiveAvailability: AvailabilityId =
    // `inCall` is `phase !== "idle"`, so it already covers wrap-up. An offered
    // call satisfies it too — but a call being offered is not one being taken,
    // and reporting Unavailable before the agent has answered tells the queue
    // something untrue about them.
    inCall && !incoming ? "busy" : availability;

  useEffect(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    input?.focus();
  }, [inputId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // During a live call the stage owns Escape (close the open panel, not
      // the whole dialer). A dialog opened from inside the call — the battle
      // card zoom, say — still owns Escape first.
      if (talking) return;
      // An offer has two answers and Escape is neither. This handler calls
      // `onClose`, which unmounts the panel outright — a stray keypress would
      // drop a ringing call with nothing recorded.
      if (incoming) return;
      // A close is already running. Leaving mid-collapse would cut the
      // screen in half; the transition is short enough to wait out.
      if (closing) return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      const topmost = dialogs[dialogs.length - 1];
      if (topmost && topmost !== rootRef.current) return;
      onClose?.();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
    // `incoming` belongs here: idle → incoming moves neither `talking` nor
    // `closing`, so without it the listener keeps the handler that was built
    // when there was no offer and Escape closes the dialer anyway.
  }, [onClose, talking, incoming, closing]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // `incoming` is deliberately absent from this list. An offered call has no
  // clock and no deadline: adding it here would start the interval below, and
  // the `raw >= RINGING_MS` promotion would answer the phone by itself 2.4s
  // later — from inside a state updater, so it would read as a race rather
  // than as a rule. Accept and Decline are the only ways out of that phase.
  useEffect(() => {
    if (phase !== "ringing" && phase !== "connecting" && phase !== "talking") return;
    const tick = () => {
      const started = callStartedAt.current;
      if (!started) return;
      const raw = Date.now() - started;
      setPhase((current) =>
        current === "ringing" && raw >= RINGING_MS ? "connecting" : current
      );
      const holdNow = holdStartedAt.current ? Date.now() - holdStartedAt.current : 0;
      setElapsedMs(Math.max(0, raw - RINGING_MS - pausedMs.current - holdNow));
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Answered. Let the phone say so and start counting before anything moves.
  useEffect(() => {
    if (phase !== "connecting") return;
    if (prefersReducedMotion()) {
      setPhase("talking");
      return;
    }
    const beat = window.setTimeout(() => setPhase("talking"), CONNECT_BEAT_MS);
    return () => window.clearTimeout(beat);
  }, [phase]);

  useEffect(() => {
    if (!talking || !onHold) return;
    holdStartedAt.current = Date.now();
    return () => {
      if (holdStartedAt.current == null) return;
      pausedMs.current += Date.now() - holdStartedAt.current;
      holdStartedAt.current = null;
    };
  }, [talking, onHold]);

  const appendDigit = (digit: string) => {
    setNumber((current) => `${current}${digit}`);
  };

  // Appended rather than sorted: the drop the agent just uploaded is the one
  // they uploaded it to use, and a list that reorders itself is a list they
  // have to re-read on the next call.
  const addDrop = (drop: VoicemailGreeting) =>
    setDrops((library) => [...library, drop]);

  const removeDrop = (id: string) =>
    setDrops((library) => library.filter((drop) => drop.id !== id));

  // Back to the account, so closing the dialer doesn't throw the upload away.
  useEffect(() => {
    setVoicemailLibrary(drops);
  }, [drops]);

  /**
   * One constructor for every call, whichever direction it goes.
   *
   * An inbound call is seeded here rather than by a sibling function so that
   * every reset the outbound path performs — mute, hold, the clock, the paused
   * accumulator, the scenario — happens in exactly one place. A second
   * copy is how an accepted transfer ends up subtly not being the same live
   * call as a dialled one.
   */
  const startCall = (opts?: {
    skipRinging?: boolean;
    scenarioId?: string;
    elapsedMs?: number;
    /** Offer the call instead of placing it. */
    incoming?: InboundCall;
  }) => {
    const digits =
      opts?.incoming?.digits ?? (number.replace(/\D/g, "") || DEFAULT_NUMBER);
    const seek = opts?.elapsedMs ?? 0;
    setDroppedVoicemail(null);
    setDialedDigits(digits);
    setMuted(false);
    setOnHold(false);
    setElapsedMs(seek);
    setScenarioId(
      opts?.incoming?.scenarioId ?? opts?.scenarioId ?? CALL_SCENARIOS[0].id
    );
    setInbound(opts?.incoming ?? null);
    holdStartedAt.current = null;
    pausedMs.current = 0;
    autoEnded.current = false;
    if (opts?.incoming) {
      // No clock and no timer: the offer stands until the agent answers it.
      // `callStartedAt` staying null is also what makes the tick effect inert
      // if anything ever does run it during this phase.
      callStartedAt.current = null;
      setTab("dialer");
      setPhase("incoming");
    } else if (opts?.skipRinging) {
      callStartedAt.current = Date.now() - RINGING_MS - seek;
      setPhase("talking");
    } else {
      callStartedAt.current = Date.now();
      setPhase("ringing");
    }
    // "A call was placed to this number" — untrue of one that arrived.
    if (!opts?.incoming) onCall?.(digits);
  };

  /** A colleague hands a call over. */
  const receiveCall = (call: InboundCall) => startCall({ incoming: call });

  /**
   * Answered. Lands on `connecting`, the same beat the outbound path reaches
   * on pickup, so the measure-then-move morph and everything after it is the
   * one implementation.
   *
   * The clock is based back by `RINGING_MS` because `elapsedMs` is recomputed
   * from `callStartedAt` every tick with that ring subtracted unconditionally —
   * so basing at `Date.now()` would leave the talk clock frozen at 00:00 for
   * 2.4 seconds, and with it the script, the network reading and the guidance
   * feed that all key off `elapsedMs`.
   */
  const acceptCall = () => {
    callStartedAt.current = Date.now() - RINGING_MS;
    setElapsedMs(0);
    setPhase("connecting");
  };

  /**
   * Turned down. Straight to idle rather than through `hangup`, which is
   * re-entrancy-guarded on the collapse timer and means "end a call that
   * exists" — this one never started.
   */
  const declineCall = () => resetToIdle();

  const resetToIdle = () => {
    callStartedAt.current = null;
    holdStartedAt.current = null;
    pausedMs.current = 0;
    autoEnded.current = false;
    setPhase("idle");
    setElapsedMs(0);
    setMuted(false);
    setOnHold(false);
    setScenarioId(CALL_SCENARIOS[0].id);
    // Covers all three exits that must forget how the call arrived: declining,
    // hanging up from a phase that never reached wrap-up, and closing the
    // recap. `endToWrapUp` deliberately does not call this, so the attribution
    // survives into the recap the way `mergedWith` does.
    setInbound(null);
  };

  const clearCloseTimers = () => {
    closeTimers.current.forEach((id) => window.clearTimeout(id));
    closeTimers.current = [];
  };

  const finishClose = () => {
    clearCloseTimers();
    resetToIdle();
    // Filing the call puts the agent back on the queue. Applied here rather
    // than at hangup: wrap-up is still part of the call, and going Available
    // mid-recap would put the next one through before this one is written up.
    // Going Unavailable again is theirs to do from the dialer, with a reason
    // — which is the only place that choice is ever asked for.
    setAvailability("available");
    setBusyReason(null);
  };

  /**
   * × on the completed-call bar, and Save & close after it has confirmed.
   *
   * Anything the agent could lose is settled here, before the first frame:
   * a recap that animates away and then asks about unsaved notes has already
   * told them the call was filed. The outcome and the notes are held above
   * this swap — the notes are the same value the live pane was writing — so
   * there is nothing to hold the transition back for. Nor does a summary
   * still being generated: the agent should never wait on the model to be
   * allowed to make their next call.
   */
  const closeRecap = (fromKeyboard = false) => {
    if (closing) return;
    closedByKeyboard.current = fromKeyboard;
    const reduced = prefersReducedMotion();
    setClosing(true);
    // A crossfade has no travel to protect the dialer from.
    setDialerArmed(reduced);
    if (!reduced) {
      closeTimers.current.push(
        window.setTimeout(() => setDialerArmed(true), DIALER_ARM_MS)
      );
    }
    closeTimers.current.push(
      window.setTimeout(
        finishClose,
        reduced ? POST_CALL_CLOSE_REDUCED_MS : POST_CALL_CLOSE_MS
      )
    );
  };

  /** Dialled straight out of the arriving dialer — the close has been overtaken. */
  const callFromArrival = () => {
    clearCloseTimers();
    startCall();
  };

  const endToWrapUp = () => {
    collapseTimer.current = null;
    holdStartedAt.current = null;
    pausedMs.current = 0;
    setAssistCollapsing(false);
    setMuted(false);
    setOnHold(false);
    setPhase("wrapup");
  };

  const hangup = () => {
    if (collapseTimer.current != null) return;
    // Freeze the clock at hangup; the panel gets its beat to let go first.
    callStartedAt.current = null;
    if (phase === "talking") {
      if (prefersReducedMotion()) {
        endToWrapUp();
        return;
      }
      setAssistCollapsing(true);
      collapseTimer.current = window.setTimeout(endToWrapUp, ASSIST_COLLAPSE_MS);
      return;
    }
    holdStartedAt.current = null;
    pausedMs.current = 0;
    setMuted(false);
    setOnHold(false);
    resetToIdle();
  };

  /**
   * A dropped voicemail is not a call that ended — it is a call that never
   * started. Nobody picked up, so there is nothing to dispose, nothing to
   * summarise and no notes to file, and putting the agent through wrap-up for
   * one is how a dialling session loses its rhythm. So this skips the recap
   * entirely: the line is released, the dialer comes straight back, and the
   * toast is the whole record of what happened.
   *
   * `finishClose` rather than `hangup`: the call *is* filed, so the status the
   * agent lined up for afterwards applies now, the way it would once a recap
   * had been closed.
   */
  const dropVoicemail = (greeting: VoicemailGreeting) => {
    if (collapseTimer.current != null) {
      window.clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    setAssistCollapsing(false);
    finishClose();
    setDroppedVoicemail(greeting.label);
  };

  // Nothing else dismisses it — the dialer under it is not a surface anyone
  // acknowledges — so it goes on its own.
  useEffect(() => {
    if (!droppedVoicemail) return;
    const timer = window.setTimeout(
      () => setDroppedVoicemail(null),
      VOICEMAIL_TOAST_MS
    );
    return () => window.clearTimeout(timer);
  }, [droppedVoicemail]);

  /**
   * The transferred call arrives a moment after the dialer opens, so the agent
   * sees the keypad first and the call lands on top of it — which is how a
   * handover actually happens. One shot: declining puts the phone back on the
   * keypad rather than ringing again.
   */
  useEffect(() => {
    if (!inboundDemo) return;
    const timer = window.setTimeout(
      () => receiveCall(INBOUND_CALL),
      INBOUND_ARRIVES_MS
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboundDemo]);

  const callWrapped = talking && simulationAt(scenario, elapsedMs).wrapped;

  useEffect(() => {
    if (!callWrapped || autoEnded.current) return;
    autoEnded.current = true;
    const timer = window.setTimeout(
      hangup,
      POST_WRAP_COMPLETED_DELAY_MS + POST_COMPLETED_HANGUP_MS
    );
    return () => window.clearTimeout(timer);
  }, [callWrapped]);

  useEffect(
    () => () => {
      if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
      closeTimers.current.forEach((id) => window.clearTimeout(id));
    },
    []
  );

  /**
   * The close is over — either the dialer landed, or a call was dialled out of
   * it before it did. Drop the lock, then put focus somewhere defensible.
   *
   * Only a keyboard close earns the caret: filling the number field after a
   * pointer close would open the OS keyboard on a phone, and on desktop it
   * hands the next keystroke to a field the agent never asked for. The
   * container takes focus instead, so the dialog still owns the keyboard.
   */
  useEffect(() => {
    if (!closing || phase === "wrapup") return;
    setClosing(false);
    setDialerArmed(false);
    if (phase !== "idle") return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (closedByKeyboard.current && !coarse) input?.focus();
    else rootRef.current?.focus({ preventScroll: true });
  }, [closing, phase, inputId]);

  const resetCallClock = () => {
    if (callStartedAt.current == null) return;
    pausedMs.current = 0;
    holdStartedAt.current = null;
    if (onHold) setOnHold(false);
    autoEnded.current = false;
    callStartedAt.current = Date.now() - RINGING_MS;
    setElapsedMs(0);
  };

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Dialer"
      // Focusable so a closed recap has somewhere to leave focus that isn't
      // the number field (see the close effect above).
      tabIndex={-1}
      className={cn(
        // Page-level surface, so it sits under dialogs (Modal/Sidesheet, z-50)
        // and popovers (tooltips, z-100) — otherwise anything opened from
        // inside the call workspace, like the battle card zoom, renders behind it.
        "fixed inset-0 z-40 flex flex-col items-center overflow-hidden bg-secondary-bg pt-8 pb-8 outline-none",
        className
      )}
    >
      {/* Hidden during an offer for the same reason Escape is ignored there:
          closing unmounts the panel, which would drop a ringing call with no
          answer recorded. Absolutely positioned, so nothing shifts. */}
      {onClose && !incoming ? (
        <button
          type="button"
          aria-label="Close dialer"
          // Above the stage, which claims a layer of its own while a recap
          // is collapsing over the arriving dialer.
          onClick={() => {
            if (closing) return;
            onClose();
          }}
          className="absolute top-4 right-4 z-20 flex size-8 items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={20} />
        </button>
      ) : null}

      {/* The dialer, already on stage underneath the recap that is collapsing
          off it — same horizontal centre, same top edge it will keep, so the
          hand-over reads as one workspace rather than two screens. Inert
          until its entrance is all but done, so a click meant for the recap
          cannot fall through to the keypad. */}
      {closing && wrapping ? (
        <div
          inert={!dialerArmed}
          className="absolute inset-0 flex items-start justify-center pt-8 pb-8"
        >
          <IdleDialer
            className="post-call-dialer-in"
            inputId={`${inputId}-arriving`}
            number={number}
            tab={tab}
            availability={availability}
            busyReason={busyReason}
            busyReasons={busyReasons}
            onAvailabilityChange={changeAvailability}
            devices={devices}
            drops={drops}
            onAddDrop={addDrop}
            onRemoveDrop={removeDrop}
            onNumberChange={setNumber}
            onTabChange={setTab}
            onDigit={appendDigit}
            onCall={callFromArrival}
          />
        </div>
      ) : null}

      {/* Dialing → ringing: the dialer transforms into the dark call state
          rather than hard-switching. */}
      <ShellSwap
        swapKey={inCall ? "call" : "idle"}
        reduced={prefersReducedMotion()}
        instant={closing}
        className="relative z-10 flex h-full min-h-0 w-full flex-1 items-center justify-center"
      >
        {(enter) =>
          inCall ? (
            <InCallShell
              className={enter}
              scope={scope}
              assistConfigured={assistConfigured}
              assistAvailable={assistAvailable}
              agentAssist={agentAssist}
              talking={talking}
              connecting={connecting}
              wrapping={wrapping}
              assistCollapsing={assistCollapsing}
              elapsedMs={elapsedMs}
              caller={caller}
              network={network}
              availability={effectiveAvailability}
              drops={drops}
              muted={muted}
              onHold={onHold}
              tab={tab}
              scenario={scenario}
              onScenarioChange={(id) => {
                setScenarioId(id);
                resetCallClock();
              }}
              onTabChange={setTab}
              onMute={() => setMuted((value) => !value)}
              onHoldToggle={() => setOnHold((value) => !value)}
              // A warm transfer parks the customer, so the flow needs to *set*
              // hold rather than flip it — cancelling a consult while the agent
              // had also pressed Hold shouldn't take them off it.
              onHoldChange={setOnHold}
              onHangup={hangup}
              inbound={inbound}
              onAccept={acceptCall}
              onDecline={declineCall}
              onVoicemailDropped={dropVoicemail}
              closing={closing}
              onCloseWrapUp={closeRecap}
            />
          ) : (
            // Compact phone (idle keypad, and ringing via CallMorphStage)
            // sits at the top. The live script and wrap-up stay centered.
            <div className="flex h-full w-full items-start justify-center self-stretch">
              <IdleDialer
                className={enter}
                inputId={inputId}
                number={number}
                tab={tab}
                availability={availability}
                busyReason={busyReason}
                busyReasons={busyReasons}
                onAvailabilityChange={changeAvailability}
                devices={devices}
                drops={drops}
                onAddDrop={addDrop}
                onRemoveDrop={removeDrop}
                onNumberChange={setNumber}
                onTabChange={setTab}
                onDigit={appendDigit}
                onCall={startCall}
              />
            </div>
          )
        }
      </ShellSwap>

      {/* A voicemail drop is the one way a call ends with no recap to report
          on, so the report is here instead. Bottom-centred rather than over
          the phone: the agent's next act is dialling again, and the number
          field must never be under an acknowledgement. */}
      {droppedVoicemail ? (
        <div
          data-state="open"
          className="toast-panel pointer-events-auto absolute bottom-8 left-1/2 z-30 w-[min(100%-48px,360px)] -translate-x-1/2"
        >
          <Alert
            variant="success"
            onClose={() => setDroppedVoicemail(null)}
          >
            Voicemail dropped · {droppedVoicemail}
          </Alert>
        </div>
      ) : null}
    </div>,
    document.body
  );
}

function IdleDialer({
  inputId,
  number,
  tab,
  availability,
  busyReason,
  busyReasons,
  onAvailabilityChange,
  devices,
  drops,
  onAddDrop,
  onRemoveDrop,
  className,
  onNumberChange,
  onTabChange,
  onDigit,
  onCall,
}: {
  inputId: string;
  number: string;
  tab: DialerTab;
  availability: AvailabilityId;
  busyReason: BusyReasonId | null;
  busyReasons: BusyReason[];
  onAvailabilityChange: (
    next: AvailabilityId,
    reason: BusyReasonId | null
  ) => void;
  devices: AudioDeviceSelection;
  drops: VoicemailGreeting[];
  onAddDrop: (drop: VoicemailGreeting) => void;
  onRemoveDrop: (id: string) => void;
  className?: string;
  onNumberChange: (value: string) => void;
  onTabChange: (tab: DialerTab) => void;
  onDigit: (digit: string) => void;
  onCall: () => void;
}) {
  const [pressing, setPressing] = useState(false);
  const pressTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
    },
    []
  );

  // Let the press land before the dialer turns over, so the compress reads.
  const handleCall = () => {
    if (pressTimer.current) return;
    if (prefersReducedMotion()) {
      onCall();
      return;
    }
    setPressing(true);
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      setPressing(false);
      onCall();
    }, CALL_PRESS_MS);
  };

  return (
    <div
      className={cn(
        "flex w-[360px] shrink-0 flex-col overflow-hidden rounded-[16px] bg-white shadow-600",
        PHONE_SHELL_H,
        className
      )}
    >
      {/* On Settings the top of the card becomes a page header: the notch keeps
          its place in it, and the title and Logout sit under it. Everywhere
          else the notch is the only thing up here, on white. */}
      <div
        className={cn(
          "flex w-full flex-col items-center",
          tab === "settings" && "bg-brand"
        )}
      >
        {/* Idle, the status is the agent's own — so unlike the in-call notch
            this one sets it outright rather than queueing it. */}
        <AvailabilityControl
          status={availability}
          reason={busyReason}
          reasons={busyReasons}
          onStatusChange={onAvailabilityChange}
        />
        {tab === "settings" ? (
          <div className="relative flex h-11 w-full items-center justify-center px-3">
            <h2 className="text-[16px] leading-6 font-medium text-white">
              Settings
            </h2>
            {/* Signing out is the one thing on this page that ends the session
                rather than changing it, so it sits in the chrome rather than in
                the list — where it would read as a sixth setting. */}
            <button
              type="button"
              className="absolute right-3 flex h-7 items-center rounded-full bg-white px-3 text-label-sm text-gray-700 outline-none transition-colors duration-base hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>

      {tab === "settings" ? (
        <DialerSettingsPage
          devices={devices}
          drops={drops}
          onAddDrop={onAddDrop}
          onRemoveDrop={onRemoveDrop}
        />
      ) : (
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-between gap-4 p-4">
        <InputField
          id={inputId}
          variant="prefix"
          prefix={
            <span className="inline-flex items-center gap-1">
              <Flag />
              +1
            </span>
          }
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="Enter a number"
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          aria-label="Phone number"
        />

        <KeypadGrid
          onDigit={(digit) => {
            onDigit(digit);
            (document.getElementById(inputId) as HTMLInputElement | null)?.focus();
          }}
        />

        <div className="flex w-full items-center justify-center gap-3">
          <span className="size-14 shrink-0" aria-hidden="true" />
          <button
            type="button"
            aria-label="Call"
            onClick={handleCall}
            className={cn(
              "flex size-14 shrink-0 items-center justify-center overflow-clip rounded-full bg-brand outline-none transition-colors hover:bg-brand-hover focus-visible:ring-4 focus-visible:ring-brand/24",
              pressing ? "dialer-press" : "active:scale-[0.97]"
            )}
          >
            <Glyph src={phoneFilled} />
          </button>
          <button
            type="button"
            aria-label="Send message"
            className="flex size-14 shrink-0 items-center justify-center overflow-clip rounded-full bg-brand-subtle outline-none transition-colors hover:bg-info-secondary focus-visible:ring-4 focus-visible:ring-brand/24 active:scale-[0.97]"
          >
            <span className="relative size-6 overflow-clip">
              <img src={messageIcon} alt="" className="size-full object-contain" />
            </span>
          </button>
        </div>

        <div className="flex w-full items-center justify-center gap-2">
          <span className="text-label-sm text-muted-foreground">Call via</span>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-line bg-white px-2 outline-none transition-colors hover:border-gray-300 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <Flag />
              <span className="text-label-sm text-foreground">Support outbound</span>
            <IconChevronDown size={16} className="size-4 shrink-0 text-foreground" />
          </button>
        </div>
      </div>
      )}

      <DialerNav tab={tab} onTabChange={onTabChange} />
    </div>
  );
}

function InCallShell({
  className,
  scope,
  assistConfigured,
  assistAvailable,
  agentAssist,
  talking,
  connecting,
  wrapping,
  assistCollapsing,
  elapsedMs,
  caller,
  network,
  availability,
  drops,
  muted,
  onHold,
  tab,
  scenario,
  onScenarioChange,
  onTabChange,
  onMute,
  onHoldToggle,
  onHoldChange,
  onHangup,
  inbound,
  onAccept,
  onDecline,
  onVoicemailDropped,
  closing,
  onCloseWrapUp,
}: {
  className?: string;
  scope: AgentAssistScope;
  assistConfigured: boolean;
  assistAvailable: boolean;
  agentAssist: boolean;
  talking: boolean;
  connecting: boolean;
  wrapping: boolean;
  assistCollapsing: boolean;
  elapsedMs: number;
  caller: CallerIdentity;
  network: NetworkReading;
  availability: AvailabilityId;
  drops: VoicemailGreeting[];
  muted: boolean;
  onHold: boolean;
  tab: DialerTab;
  scenario: CallScenario;
  onScenarioChange: (id: string) => void;
  onTabChange: (tab: DialerTab) => void;
  onMute: () => void;
  onHoldToggle: () => void;
  onHoldChange: (held: boolean) => void;
  onHangup: () => void;
  /** Set while a transferred call is being offered — see `InboundCall`. */
  inbound: InboundCall | null;
  onAccept: () => void;
  onDecline: () => void;
  /** The message is away — release the line without a wrap-up. */
  onVoicemailDropped: (greeting: VoicemailGreeting) => void;
  /** The recap is collapsing off the stage — see POST_CALL_CLOSE_MS. */
  closing: boolean;
  onCloseWrapUp: (fromKeyboard?: boolean) => void;
}) {
  const reduced = prefersReducedMotion();
  const localTime = formatLocalTime(new Date());
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>(
    {}
  );
  // Owned here, above the live/wrap-up swap: the Notes pane during the call and
  // the Notes field in Wrap up are the same notes, so whatever the agent typed
  // while the line was open is already in the field they file with.
  const [notes, setNotes] = useState<NotesEditorValue>(EMPTY_NOTES);

  useEffect(() => {
    setActionStates({});
    setNotes(EMPTY_NOTES);
  }, [scenario.id]);

  // Ringing and live are the same surface, so they share a swap key: the phone
  // morphs into the bar instead of dissolving into a different card. Only
  // wrap-up is a genuinely new card, and it still cross-dissolves.
  return (
    <ShellSwap
      swapKey={wrapping ? "wrapup" : "call"}
      reduced={reduced}
      // A call dialled out of the arriving dialer leaves wrap-up mid-close;
      // the recap is already invisible by then, so it goes without a second
      // dissolve rather than snapshotting itself back into view.
      instant={closing}
      className={cn(
        "flex h-full min-h-0 w-full items-center justify-center",
        className
      )}
    >
      {(enter) =>
        wrapping ? (
          assistConfigured ? (
            <PostCallStage
              className={enter}
              scope={scope}
              reduced={reduced}
              elapsedMs={elapsedMs}
              caller={caller}
              scenario={scenario}
              actionStates={actionStates}
              notes={notes}
              onNotesChange={setNotes}
              onScenarioChange={onScenarioChange}
              closing={closing}
              onClose={onCloseWrapUp}
            />
          ) : (
            <CompactWrapUp
              className={enter}
              elapsedMs={elapsedMs}
              caller={caller}
              notes={notes}
              onNotesChange={setNotes}
              closing={closing}
              onClose={onCloseWrapUp}
            />
          )
        ) : (
          <CallMorphStage
            className={enter}
            scope={scope}
            assistConfigured={assistConfigured}
            assistAvailable={assistAvailable}
            agentAssist={agentAssist}
            reduced={reduced}
            live={talking}
            connecting={connecting}
            elapsedMs={elapsedMs}
            caller={caller}
            network={network}
            availability={availability}
            drops={drops}
            localTime={localTime}
            muted={muted}
            onHold={onHold}
            tab={tab}
            scenario={scenario}
            assistCollapsing={assistCollapsing}
            notes={notes}
            onNotesChange={setNotes}
            onScenarioChange={onScenarioChange}
            onTabChange={onTabChange}
            onMute={onMute}
            onHoldToggle={onHoldToggle}
            onHoldChange={onHoldChange}
            onHangup={onHangup}
            inbound={inbound}
            onAccept={onAccept}
            onDecline={onDecline}
            onVoicemailDropped={onVoicemailDropped}
            onActionStatesChange={setActionStates}
          />
        )
      }
    </ShellSwap>
  );
}

/**
 * Ringing → live workspace, as one continuous move.
 *
 * The phone is not faded out and replaced. Three layers overlap for ~520ms:
 * a dark surface that starts on the phone's footprint and compresses upward
 * into the call bar; a ghost of the phone, pinned to that same footprint,
 * carrying the bottom nav and the dial-pad chrome out; and the live workspace
 * itself, whose bar elements are inverted back onto their phone positions and
 * then released. The dark never breaks, so the phone reads as becoming the bar
 * rather than being swapped for it.
 *
 * A resumed call (or reduced motion) has no phone to measure, so it skips
 * straight to the workspace with a plain reveal.
 */
function CallMorphStage({
  className,
  scope,
  assistConfigured,
  assistAvailable,
  agentAssist,
  reduced,
  live,
  connecting,
  elapsedMs,
  caller,
  network,
  availability,
  drops,
  localTime,
  muted,
  onHold,
  tab,
  scenario,
  assistCollapsing,
  notes,
  onNotesChange,
  onScenarioChange,
  onTabChange,
  onMute,
  onHoldToggle,
  onHoldChange,
  onHangup,
  inbound,
  onAccept,
  onDecline,
  onVoicemailDropped,
  onActionStatesChange,
}: {
  className?: string;
  scope: AgentAssistScope;
  assistConfigured: boolean;
  assistAvailable: boolean;
  agentAssist: boolean;
  reduced: boolean;
  live: boolean;
  connecting: boolean;
  elapsedMs: number;
  caller: CallerIdentity;
  network: NetworkReading;
  availability: AvailabilityId;
  drops: VoicemailGreeting[];
  localTime: string;
  muted: boolean;
  onHold: boolean;
  tab: DialerTab;
  scenario: CallScenario;
  assistCollapsing: boolean;
  notes: NotesEditorValue;
  onNotesChange: (value: NotesEditorValue) => void;
  onScenarioChange: (id: string) => void;
  onTabChange: (tab: DialerTab) => void;
  onMute: () => void;
  onHoldToggle: () => void;
  onHoldChange: (held: boolean) => void;
  onHangup: () => void;
  /**
   * Forwarded to the phone and read nowhere here: the morph's capture and its
   * state machine are direction-blind, which is exactly why accepting a
   * transferred call plays the same move as an outbound pickup.
   */
  inbound: InboundCall | null;
  onAccept: () => void;
  onDecline: () => void;
  onVoicemailDropped: (greeting: VoicemailGreeting) => void;
  onActionStatesChange?: (states: Record<string, ActionState>) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const captured = useRef<MorphCapture | null>(null);
  const [morph, setMorph] = useState<
    { phase: "idle" | "settled" } | { phase: "run"; from: MorphCapture }
  >({ phase: "idle" });

  /**
   * The four things that belong to the *call* rather than to the panel showing
   * them — tones already sent, a transfer in flight, a voicemail playing out,
   * and the recording.
   *
   * They live at this level because the call has two possible faces: the wide
   * workspace when Agent Assist is set up, and the 360px phone when it isn't.
   * A transfer started from one has to still be running if the other is what
   * is on screen, and holding the state here is what makes that true instead
   * of true-by-coincidence.
   */
  const [mergedWith, setMergedWith] = useState<TransferTarget | null>(null);
  const keypad = useKeypad();
  const transfer = useTransferFlow({
    // The same label the bar and the phone put in the headline, so the
    // participant list doesn't call a named contact "Customer".
    customerName: caller.known ? caller.name : caller.number,
    elapsedMs,
    customerHeld: onHold,
    onCustomerHoldChange: onHoldChange,
    onCallHandedOff: onHangup,
    onMergedChange: setMergedWith,
  });
  const voicemail = useVoicemailDrop({
    greetings: drops,
    onDropped: onVoicemailDropped,
  });
  const recording = useRecording(elapsedMs);

  // Measure while the phone is still the thing on screen. With nothing
  // authored in Agent Assist there is no workspace to morph into — the phone
  // keeps the stage for the whole call — so there is nothing to measure.
  useLayoutEffect(() => {
    if (!connecting || reduced || !assistConfigured) return;
    const card = rootRef.current?.querySelector<HTMLElement>("[data-morph-card]");
    if (card) captured.current = captureMorph(card);
  }, [connecting, reduced, assistConfigured]);

  // Commit `run` in the same pass that mounts the bar, so the bar never gets a
  // painted frame at its settled size before the move starts.
  if (live && morph.phase === "idle" && captured.current) {
    setMorph({ phase: "run", from: captured.current });
  }
  if (!live && morph.phase !== "idle") {
    setMorph({ phase: "idle" });
  }

  useLayoutEffect(() => {
    if (morph.phase !== "run") return;
    captured.current = null;
    const root = rootRef.current;
    const surface = surfaceRef.current;
    if (!root || !surface) {
      setMorph({ phase: "settled" });
      return;
    }
    const stop = runMorph(morph.from, root, surface, ghostRef.current);
    const settle = window.setTimeout(
      () => setMorph({ phase: "settled" }),
      MORPH_TOTAL_MS
    );
    return () => {
      window.clearTimeout(settle);
      stop();
    };
  }, [morph]);

  const morphing = morph.phase === "run";

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex h-full min-h-0 w-full justify-center",
        // Centring is for the live workspace. Without Agent Assist the call
        // stays on the phone, so it keeps the idle dialer's top edge — picking
        // up must not make the phone jump down the page.
        live && agentAssist ? "items-center" : "items-start",
        className
      )}
    >
      {morphing ? (
        <>
          {/* The dark surface owns the geometry — and, while it is moving, the
              call bar's background, so the two never read as separate. Both
              layers are placed by the layout effect, which knows the origin. */}
          <div
            aria-hidden="true"
            ref={surfaceRef}
            className="call-morph-surface"
          />
          {/* Everything the call bar has no use for, on its way out. */}
          <div
            aria-hidden="true"
            inert
            ref={ghostRef}
            className="call-morph-ghost"
          >
            {/* No `inbound` here on purpose. The ghost is the copy of the
                *connected* card that fades out during the move, so giving it
                the offer's props would fade accept/decline out of a call that
                has already been answered. */}
            <RingingPhone
              reduced
              connected
              ghost
              elapsedMs={elapsedMs}
              caller={caller}
              network={network}
              availability={availability}
              localTime={localTime}
              tab={tab}
              onTabChange={() => {}}
              onHangup={() => {}}
              className="h-full"
            />
          </div>
        </>
      ) : null}

      {live && assistConfigured ? (
        <LiveCallStage
          className="call-morph-stage"
          scope={scope}
          reduced={reduced}
          morphing={morphing}
          elapsedMs={elapsedMs}
          caller={caller}
          network={network}
          availability={availability}
          keypad={keypad}
          transfer={transfer}
          voicemail={voicemail}
          recording={recording}
          mergedWith={mergedWith}
          muted={muted}
          onHold={onHold}
          scenario={scenario}
          assistCollapsing={assistCollapsing}
          notes={notes}
          onNotesChange={onNotesChange}
          onScenarioChange={onScenarioChange}
          onMute={onMute}
          onHoldToggle={onHoldToggle}
          onHangup={onHangup}
          onActionStatesChange={onActionStatesChange}
        />
      ) : (
        <div className="flex flex-col items-stretch gap-3">
          <RingingPhone
            className={PHONE_SHELL_H}
            reduced={reduced}
            connected={connecting || live}
            // The phone is the call now, not a beat on the way to one, so its
            // controls run the line rather than sitting armed and waiting.
            live={live}
            elapsedMs={elapsedMs}
            caller={caller}
            network={network}
            availability={availability}
            keypad={keypad}
            transfer={transfer}
            voicemail={voicemail}
            recording={recording}
            mergedWith={mergedWith}
            muted={muted}
            onHold={onHold}
            localTime={localTime}
            tab={tab}
            onTabChange={onTabChange}
            onMute={onMute}
            onHoldToggle={onHoldToggle}
            onHangup={onHangup}
            inbound={inbound}
            onAccept={onAccept}
            onDecline={onDecline}
          />
          {live && agentAssist && !assistConfigured ? (
            <AgentAssistCallState available={assistAvailable} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function AgentAssistCallState({ available }: { available: boolean }) {
  return (
    <aside className="w-[360px] rounded-lg border border-line bg-white p-4 shadow-100">
      <div className="flex flex-col gap-2">
        <p className="text-label-md-semi text-foreground">
          {available ? "Agent Assist isn’t set up yet" : "Agent Assist isn’t included in your plan"}
        </p>
        <p className="text-paragraph-sm text-muted-foreground">
          {available
            ? "This call works normally, but no script or guidance can appear until an admin publishes content and assigns it to you."
            : "Your current plan includes calling, but not live scripts or conversation guidance."}
        </p>
        {available ? (
          <ol className="list-decimal space-y-1 pl-5 text-paragraph-sm text-foreground">
            <li>Create a script, response card, or knowledge source</li>
            <li>Publish it</li>
            <li>Assign it to your team or to you</li>
          </ol>
        ) : null}
        <button
          type="button"
          onClick={() => window.opener?.focus()}
          className="mt-1 self-start rounded-[4px] text-label-sm font-medium text-brand outline-none hover:text-brand-hover focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          {available ? "Open Agent Assist setup" : "View plans and upgrade"}
        </button>
      </div>
    </aside>
  );
}

/**
 * Notes, Transcript, and Live Assist share one right-side shell. Opening it
 * slides the column in from the right while Script and Guidance compress;
 * closing slides it out and restores those widths. Switching views never
 * re-opens the shell.
 *
 * Two beats, and the order matters. First `shifting` arms the width transition
 * on every pane in the row and mounts the column at no width — a transition
 * only runs when the element was already transition-able in the frame before
 * the value changed, so arming and moving in one commit animates nothing.
 * `entered` is the second beat: the widths change and all three panes travel
 * together. Closing runs the same two beats in reverse. After the first open,
 * `mounted` stays true so Transcript scroll, Notes, and Live Assist keep
 * their state in a zero-width column.
 */
function useCallAsidePresence(open: boolean, reduced: boolean) {
  /** The value the width model reads — one frame behind `open` on a change. */
  const [entered, setEntered] = useState(open);
  const [mounted, setMounted] = useState(open);
  const [shifting, setShifting] = useState(false);
  const [shift, setShift] = useState<"open" | "close" | null>(null);
  const prevOpen = useRef(open);
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef(0);

  const clear = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  };

  useLayoutEffect(() => {
    if (prevOpen.current === open) return;
    prevOpen.current = open;
    clear();

    if (reduced) {
      if (open) setMounted(true);
      setEntered(open);
      setShifting(false);
      setShift(null);
      return;
    }

    if (open) setMounted(true);
    setShift(open ? "open" : "close");
    setShifting(true);

    const duration = open ? ASIDE_OPEN_MS : ASIDE_CLOSE_MS;

    // Second beat, on whichever clock arrives first. A frame is the accurate
    // one; the timer is there because a backgrounded tab stops handing out
    // frames, and the column still has to end up open.
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      setEntered(open);
    };
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(release);
    });
    timersRef.current.push(window.setTimeout(release, ASIDE_RELEASE_MS));

    timersRef.current.push(
      window.setTimeout(() => {
        setShifting(false);
        setShift(null);
        // Stay mounted after the first open so Transcript scroll, Notes
        // caret, and Live Assist chat survive close — width goes to 0.
      }, duration + ASIDE_RELEASE_MS)
    );
  }, [open, reduced]);

  useLayoutEffect(() => clear, []);

  return { mounted, entered, leaving: mounted && !open, shifting, shift };
}

/**
 * Live call — the call bar owns the top edge, then Script and Conversation
 * Guidance split the rest. Notes, Transcript, and Live Assist share one
 * right-side utility shell, off by default; only one of them is open at a
 * time, and switching views keeps the column where it is. Closing it does
 * not reset panel state. Column widths are a shared tokenized model
 * (A + divider + B + divider + C); dragging one divider only trades space
 * between its two neighbours.
 */
function LiveCallStage({
  className,
  scope,
  reduced,
  morphing,
  elapsedMs,
  caller,
  network,
  availability,
  keypad,
  transfer,
  voicemail,
  recording,
  mergedWith,
  muted,
  onHold,
  scenario,
  assistCollapsing,
  notes,
  onNotesChange,
  onScenarioChange,
  onMute,
  onHoldToggle,
  onHangup,
  onActionStatesChange,
}: {
  className?: string;
  scope: AgentAssistScope;
  reduced: boolean;
  morphing?: boolean;
  elapsedMs: number;
  caller: CallerIdentity;
  network: NetworkReading;
  availability: AvailabilityId;
  keypad: KeypadFlow;
  transfer: TransferFlow;
  voicemail: VoicemailFlow;
  recording: RecordingController;
  mergedWith: TransferTarget | null;
  muted: boolean;
  onHold: boolean;
  scenario: CallScenario;
  assistCollapsing: boolean;
  notes: NotesEditorValue;
  onNotesChange: (value: NotesEditorValue) => void;
  onScenarioChange: (id: string) => void;
  onMute: () => void;
  onHoldToggle: () => void;
  onHangup: () => void;
  onActionStatesChange?: (states: Record<string, ActionState>) => void;
}) {
  const [asidePanel, setAsidePanel] = useState<AsidePanel | null>(null);

  const liveAssist = useLiveAssist({
    scenarioId: scenario.id,
    elapsedMs,
    panelOpen: asidePanel === "assist",
  });

  const asideOpen = asidePanel !== null;
  const aside = useCallAsidePresence(asideOpen, reduced);
  // `entered`, not `asideOpen` — the column is in the width model from the beat
  // the panes start travelling, not from the click.
  const collapsed = useMemo<CallPaneCollapsed>(
    () => ({ transcript: !aside.entered }),
    [aside.entered]
  );
  const workspace = useCallWorkspaceResize(collapsed);
  const asideSwitch = useAsidePanelSwitch(asidePanel, reduced);

  // The width the aside settles at, kept across the close so the cards inside
  // keep their layout while the column clips away from them. Next open uses
  // this rather than a fresh default, unless the agent has never opened it.
  const asideWidthRef = useRef<number>(CALL_ASIDE.defaultPx);
  const closedSnapshotRef = useRef<{ script: number; suggestions: number } | null>(
    null
  );
  if (workspace.widths.transcript > 0) {
    asideWidthRef.current = workspace.widths.transcript;
  }

  const shownNotes = asideSwitch.shown === "notes";
  const shownTranscript = asideSwitch.shown === "transcript";
  const shownAssist = asideSwitch.shown === "assist";
  const shownKeypad = asideSwitch.shown === "keypad";
  const shownTransfer = asideSwitch.shown === "transfer";
  const shownVoicemail = asideSwitch.shown === "voicemail";

  const notesEditorRef = useRef<NotesEditorHandle>(null);
  // Parent-owned: the editor unmounts with the column, the caret shouldn't.
  const notesCaret = useRef<NotesEditorCaret>({ offset: 0, scroll: 0 });
  const notesPaneRef = useRef<HTMLDivElement>(null);
  const notesHeaderRef = useRef<HTMLDivElement>(null);
  const notesMarkRef = useRef<HTMLSpanElement>(null);
  const notesControlRef = useRef<HTMLButtonElement>(null);

  /**
   * Card motion inside the column. Notes set the bar — fade up out of the
   * right edge on enter, a shorter reverse on leave — and every view the
   * column hosts plays the same pair. Only ever set for a move the agent
   * asked for: the introduction opens and puts itself away on its own clock.
   */
  const [asideMotion, setAsideMotion] = useState<"enter" | "leave" | null>(
    null
  );
  const asideMotionTimerRef = useRef(0);
  /** The introduction has run and put the panel away, so an open is a re-open. */
  const introClosedRef = useRef(false);
  /** First keystroke of the call — reported once, whoever opened the panel. */
  const notesTypedRef = useRef(false);

  useEffect(() => () => window.clearTimeout(asideMotionTimerRef.current), []);

  const [stageSettled, setStageSettled] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setStageSettled(true), STAGE_SETTLED_MS);
    return () => window.clearTimeout(id);
  }, []);

  const saveNotesCaret = () => notesEditorRef.current?.saveCaret();

  /**
   * Anything that changes the notes ends the introduction — a paste from the
   * menu never reaches the panel's key handler, and content arriving is the
   * clearest possible sign the agent is using the panel rather than reading it.
   */
  const handleNotesChange = (value: NotesEditorValue) => {
    discovery.cancel();
    if (!notesTypedRef.current && value.text.trim().length > 0) {
      notesTypedRef.current = true;
      trackNotes("notes_first_input_started");
    }
    onNotesChange(value);
  };

  /** Close with no opinion about why — the introduction uses this one too. */
  const dismissAside = () => {
    if (asidePanel === "notes") saveNotesCaret();
    setAsidePanel(null);
  };

  /** The card arriving — same move Notes has always played, now shared. */
  const playAsideEnter = () => {
    if (reduced) return;
    window.clearTimeout(asideMotionTimerRef.current);
    setAsideMotion("enter");
    asideMotionTimerRef.current = window.setTimeout(
      () => setAsideMotion(null),
      DURATION.slow
    );
  };

  /**
   * The card leaving. Held through the column close so `both` fill does not
   * snap the card back to opaque for the last frames of the clip.
   */
  const playAsideLeave = () => {
    if (reduced) return;
    window.clearTimeout(asideMotionTimerRef.current);
    setAsideMotion("leave");
    asideMotionTimerRef.current = window.setTimeout(
      () => setAsideMotion(null),
      ASIDE_CLOSE_MS
    );
  };

  const openAside = (next: AsidePanel) => {
    if (asidePanel === "notes") saveNotesCaret();
    if (!asidePanel && workspace.workspaceWidth > 0) {
      closedSnapshotRef.current = {
        script: workspace.widths.script,
        suggestions: workspace.widths.suggestions,
      };
      workspace.replaceFractions(
        fractionsForAsideOpen(
          closedSnapshotRef.current,
          asideWidthRef.current,
          workspace.workspaceWidth
        )
      );
    }
    setAsidePanel(next);
  };

  const discovery = useNotesDiscovery({
    // Nothing introduces itself over an entrance: the panes have to be in and
    // the phone has to have finished becoming the bar.
    ready: stageSettled && !morphing && workspace.measured,
    reduced,
    // Three panes at their minimums, not two — the column has to have somewhere
    // to open into or there is nothing to demonstrate.
    hasRoom: canResizeWorkspace(workspace.workspaceWidth),
    busy: asidePanel !== null,
    hasContent: notes.text.trim().length > 0,
    headerRef: notesHeaderRef,
    markRef: notesMarkRef,
    targetRef: notesControlRef,
    onOpen: () => openAside("notes"),
    onClose: () => {
      // The panel opened itself and took the caret with it; it gives both back.
      // Not to the toolbar icon, tempting as that is — focus there pops the
      // tooltip, and the move is supposed to make the label unnecessary.
      const active = document.activeElement;
      if (active instanceof HTMLElement && notesPaneRef.current?.contains(active)) {
        active.blur();
      }
      dismissAside();
      introClosedRef.current = true;
    },
  });

  const closeAside = () => {
    discovery.cancel();
    playAsideLeave();
    dismissAside();
  };

  const toggleAside = (next: AsidePanel) => {
    discovery.cancel();
    if (asidePanel === next) {
      playAsideLeave();
      dismissAside();
      return;
    }
    if (next === "notes" && introClosedRef.current) {
      trackNotes("notes_panel_reopened");
    }
    playAsideEnter();
    openAside(next);
  };

  const scenarioRef = useRef(scenario.id);
  useEffect(() => {
    if (scenarioRef.current === scenario.id) return;
    scenarioRef.current = scenario.id;
    notesTypedRef.current = false;
    discovery.cancel();
    setAsidePanel(null);
    // `discovery.cancel` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id]);

  useEffect(() => {
    if (!assistCollapsing) return;
    discovery.cancel();
    setAsidePanel(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistCollapsing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Nested surfaces (battle-card zoom, etc.) own Escape. The dialer
      // itself is a dialog, so only a second one means something else is up.
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs.length > 1) return;
      if (document.querySelector('[role="listbox"]')) return;
      // The notes formatting overlay dismisses itself first.
      if (document.querySelector("[data-notes-overlay]")) return;
      if (!asidePanel) return;
      event.preventDefault();
      event.stopPropagation();
      closeAside();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [asidePanel]);

  useLayoutEffect(() => {
    if (!shownNotes || !aside.entered || aside.leaving) return;
    notesEditorRef.current?.focus();
  }, [shownNotes, aside.entered, aside.leaving]);

  const prevEnteredRef = useRef(aside.entered);
  useLayoutEffect(() => {
    const was = prevEnteredRef.current;
    prevEnteredRef.current = aside.entered;
    const snap = closedSnapshotRef.current;
    if (!was || aside.entered || !snap || workspace.workspaceWidth <= 0) return;
    workspace.replaceFractions(
      fractionsForAsideOpen(snap, asideWidthRef.current, workspace.workspaceWidth)
    );
    // Restore runs in the same close beat as the width model collapsing, so
    // Script and Guidance travel back to the sizes they had before this open.
    // workspace is read from the render that flipped `entered`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aside.entered]);

  const asideViewClass = (id: AsidePanel, extra?: string) =>
    cn(
      "call-aside-view",
      asideSwitch.shown === id && "is-active",
      asideSwitch.shown === id && asideMotion === "enter" && "is-entering",
      asideSwitch.shown === id &&
        asideMotion === "leave" &&
        !(id === "notes" && discovery.handingOff) &&
        "is-leaving",
      extra
    );

  return (
    <div
      className={cn(
        // The gutter clears the overlay's close button at narrow widths and
        // settles the stage at 1440 once there is room for it. The stage takes
        // the height its content needs rather than the whole window, and sits
        // in the middle of it — the three panes read as one object, not as
        // three columns stretched to the viewport. Horizontal overflow is
        // clipped so a resize never introduces a workspace scrollbar.
        "relative z-0 flex h-[700px] max-h-full min-h-0 w-full max-w-[1504px] flex-col gap-3 overflow-x-hidden px-16",
        className
      )}
      // Notes' introduction spans the pane and the toolbar icon, so the two
      // durations both surfaces animate on are published once, here.
      style={
        {
          "--notes-body-fade-ms": `${NOTES_DISCOVERY.bodyFadeMs}ms`,
          "--notes-flight-ms": `${NOTES_DISCOVERY.flightMs}ms`,
          "--notes-pulse-ms": `${NOTES_DISCOVERY.pulseMs}ms`,
        } as CSSProperties
      }
    >
      <CallBar
        // Morphing in from the phone, the bar's own entrance would fight the
        // travelling elements — the dark surface behind it is the entrance.
        className={!reduced && !morphing ? "call-bar-in" : undefined}
        morphing={morphing}
        revealing={!reduced}
        elapsedMs={elapsedMs}
        caller={caller}
        network={network}
        availability={availability}
        transfer={transfer}
        voicemail={voicemail}
        recording={recording}
        mergedWith={mergedWith}
        muted={muted}
        onHold={onHold}
        notesOpen={asidePanel === "notes"}
        notesControlRef={notesControlRef}
        notesFound={discovery.pulsing}
        transcriptOpen={asidePanel === "transcript"}
        scope={scope}
        liveAssistOpen={asidePanel === "assist"}
        keypadOpen={asidePanel === "keypad"}
        transferOpen={asidePanel === "transfer"}
        voicemailOpen={asidePanel === "voicemail"}
        help={liveAssist}
        onMute={onMute}
        onHoldToggle={onHoldToggle}
        onHangup={onHangup}
        onNotesToggle={() => {
          trackNotes("notes_icon_clicked", { opening: asidePanel !== "notes" });
          toggleAside("notes");
        }}
        onTranscriptToggle={() => toggleAside("transcript")}
        onLiveAssistToggle={() => toggleAside("assist")}
        onKeypadToggle={() => toggleAside("keypad")}
        onTransferToggle={() => toggleAside("transfer")}
        onVoicemailToggle={() => toggleAside("voicemail")}
      />

      <div
        ref={workspace.containerRef}
        className={cn(
          "call-workspace-row flex min-h-0 min-w-0 flex-1",
          workspace.resizable ? "call-workspace-panes" : "gap-3",
          aside.shift === "open" && "is-shifting-open",
          aside.shift === "close" && "is-shifting-close"
        )}
      >
        <StagePane
          index={0}
          paneId="script"
          reduced={reduced}
          grow={3}
          fraction={workspace.fractions.script}
          widthPx={workspace.resizable ? workspace.widths.script : undefined}
          settling={workspace.settling}
        >
          <AgentAssistCallSheet
            key={scenario.id}
            elapsedMs={elapsedMs}
            scenario={scenario}
            onScenarioChange={onScenarioChange}
            active
            exiting={assistCollapsing}
            transcriptDetached
            guidanceDetached
            className="h-full"
          />
        </StagePane>
        {workspace.resizable ? (
          <CallWorkspaceResizeHandle {...workspace.handleProps(0)} />
        ) : null}
        <StagePane
          index={1}
          paneId="suggestions"
          reduced={reduced}
          grow={7}
          fraction={workspace.fractions.suggestions}
          widthPx={workspace.resizable ? workspace.widths.suggestions : undefined}
          settling={workspace.settling}
        >
          <LiveAgentAssistPanel
            key={scenario.id}
            scope={scope}
            elapsedMs={elapsedMs}
            scenario={scenario}
            exiting={assistCollapsing}
            onActionStatesChange={onActionStatesChange}
            className="h-full"
          />
        </StagePane>
        {workspace.resizable && aside.mounted ? (
          <CallWorkspaceResizeHandle
            {...workspace.handleProps(1)}
            collapsing={!aside.entered}
          />
        ) : null}
        {aside.mounted ? (
        <StagePane
          index={2}
          paneId="transcript"
          reduced={reduced}
          grow={5}
          fraction={workspace.fractions.transcript}
          widthPx={workspace.resizable ? workspace.widths.transcript : undefined}
          settling={workspace.settling}
          surface={false}
          animateIn={false}
          className="call-aside-pane"
          // Nothing to read or reach in a column that is on its way out.
          inert={aside.leaving || undefined}
        >
          <div
            className={cn(
              "call-aside-stage min-h-0 flex-1",
              asideSwitch.switching && "is-switching"
            )}
            // Pinned to the pane's right edge at the width it settles at, so
            // the clip opens across the cards instead of reflowing them.
            style={
              workspace.resizable && asideWidthRef.current
                ? { width: `${asideWidthRef.current}px` }
                : undefined
            }
          >
            <div
              ref={notesPaneRef}
              className={asideViewClass(
                "notes",
                discovery.handingOff ? "is-notes-handoff" : undefined
              )}
              aria-hidden={!shownNotes}
              inert={!shownNotes || undefined}
              // Any real touch of Notes ends the introduction: a panel the
              // agent has started using is theirs, not a demonstration.
              onPointerDownCapture={discovery.cancel}
              onKeyDownCapture={discovery.cancel}
              // Hover is attention, not use: it holds the collapse instead of
              // ending the introduction, and leaving is what releases it.
              onPointerEnter={discovery.onPanelEnter}
              onPointerLeave={discovery.onPanelLeave}
            >
              <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[16px] border border-line bg-white">
                <header className="flex h-11 shrink-0 items-center justify-between gap-1.5 border-b border-line px-4">
                  <div ref={notesHeaderRef} className="notes-pane-mark flex items-center gap-1.5">
                    <span ref={notesMarkRef} className="flex size-4 shrink-0 items-center justify-center">
                      <NotesPaneIcon className="size-4 text-muted-foreground" />
                    </span>
                    <p className="text-label-md-semi text-foreground">Notes</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close notes"
                    onClick={closeAside}
                    className="notes-pane-body flex size-6 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
                  >
                    <IconClose size={16} />
                  </button>
                </header>
                <div className="notes-pane-body flex min-h-0 flex-1 flex-col gap-1 p-4">
                  <NotesEditor
                    ref={notesEditorRef}
                    caretRef={notesCaret}
                    placeholder="Type your notes here..."
                    maxLength={NOTES_MAX}
                    value={notes}
                    onChange={handleNotesChange}
                    wrapperClassName="min-h-0 flex-1"
                    className="min-h-0 flex-1"
                    ariaLabel="Call notes"
                  />
                  <p className="shrink-0 text-right text-label-sm text-muted-foreground tabular-nums">
                    {notes.text.length}/{NOTES_MAX}
                  </p>
                </div>
              </div>
            </div>
            <div
              className={asideViewClass("transcript")}
              aria-hidden={!shownTranscript}
              inert={!shownTranscript || undefined}
            >
              <div className="h-full min-h-0 w-full overflow-hidden rounded-[16px] border border-line bg-white">
                <LiveTranscriptPanel
                  key={scenario.id}
                  elapsedMs={elapsedMs}
                  scenario={scenario}
                  exiting={assistCollapsing}
                  active={shownTranscript}
                  onClose={closeAside}
                  className="h-full"
                />
              </div>
            </div>
            <div
              className={asideViewClass("assist")}
              aria-hidden={!shownAssist}
              inert={!shownAssist || undefined}
            >
              <div className="h-full min-h-0 w-full overflow-hidden rounded-[16px] border border-line bg-white">
                <LiveAssistPanel
                  thread={liveAssist}
                  scenario={scenario}
                  active={shownAssist && aside.entered && !aside.leaving}
                  onClose={closeAside}
                  className="h-full"
                />
              </div>
            </div>

            {/* Keypad, transfer and voicemail drop. They hung off their bar
                controls as popovers until now; all three are worked *during*
                the call rather than in a pause in it, so they belong in the
                column the agent is already reading from — and a popover that
                shuts when the agent clicks the transcript behind it is a
                popover that loses a half-typed extension. */}
            <div
              className={asideViewClass("keypad")}
              aria-hidden={!shownKeypad}
              inert={!shownKeypad || undefined}
            >
              <CallAsidePanel
                title={KEYPAD_COPY.title}
                icon={<IconCallKeypad size={16} />}
                onClose={closeAside}
              >
                {/* `fill` — the column is a full-height card, like the phone's
                    sheet and unlike the popover this used to size itself to. */}
                <KeypadBody
                  keypad={keypad}
                  fill
                  active={shownKeypad && aside.entered && !aside.leaving}
                />
              </CallAsidePanel>
            </div>

            <div
              className={asideViewClass("transfer")}
              aria-hidden={!shownTransfer}
              inert={!shownTransfer || undefined}
            >
              <CallAsidePanel
                {...transferCopy(transfer)}
                icon={
                  transfer.merged ? (
                    <IconCallUsers size={16} />
                  ) : (
                    <IconCallTransfer size={16} />
                  )
                }
                onClose={closeAside}
                // The picker owns its own scroller: the confirmation is pinned
                // to the panel's bottom edge and must not scroll off with the
                // list underneath it.
                scroll={false}
              >
                <TransferBody flow={transfer} />
              </CallAsidePanel>
            </div>

            <div
              className={asideViewClass("voicemail")}
              aria-hidden={!shownVoicemail}
              inert={!shownVoicemail || undefined}
            >
              <CallAsidePanel
                {...voicemailCopy(voicemail)}
                icon={<IconVoicemailDrop size={16} />}
                onClose={closeAside}
              >
                <VoicemailBody flow={voicemail} />
              </CallAsidePanel>
            </div>
          </div>
        </StagePane>
        ) : null}
      </div>

      <LiveAssistToast
        toast={scope === "v2" ? liveAssist.toast : null}
        onDismiss={liveAssist.dismissToast}
        onView={() => {
          liveAssist.dismissToast();
          if (asidePanel !== "assist") toggleAside("assist");
        }}
      />

      <NotesDiscoveryGhost flight={discovery.flight} />
    </div>
  );
}

/**
 * The travelling half of Notes' first showing: a copy of the panel header,
 * pinned to the viewport where the real one stood, on its way to the call
 * bar's Notes icon. Only the mark travels — the panel itself just gives its
 * width back, and shrinking a whole column into a 20px circle would read as
 * the column being thrown away rather than put away.
 */
function NotesDiscoveryGhost({ flight }: { flight: NotesDiscoveryFlight | null }) {
  if (!flight) return null;
  return createPortal(
    <div
      aria-hidden="true"
      className={cn("notes-discovery-ghost", flight.moving && "is-moving")}
      style={
        {
          top: flight.top,
          left: flight.left,
          width: flight.width,
          height: flight.height,
          "--ghost-origin-x": `${flight.originX}px`,
          "--ghost-origin-y": `${flight.originY}px`,
          "--ghost-dx": `${flight.dx}px`,
          "--ghost-dy": `${flight.dy}px`,
          "--ghost-scale": NOTES_DISCOVERY.endScale,
          "--ghost-ms": `${NOTES_DISCOVERY.flightMs}ms`,
          "--ghost-fade-ms": `${NOTES_DISCOVERY.fadeMs}ms`,
          "--ghost-fade-delay": `${NOTES_DISCOVERY.fadeDelayMs}ms`,
        } as CSSProperties
      }
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        <NotesPaneIcon className="size-4 text-muted-foreground" />
      </span>
      <p className="text-label-md-semi whitespace-nowrap text-foreground">Notes</p>
    </div>,
    document.body
  );
}

/** Panels wait out the call bar, then arrive left to right. */
function StagePane({
  index,
  paneId,
  grow,
  fraction,
  widthPx,
  settling = false,
  reduced,
  surface = true,
  animateIn = true,
  className,
  inert,
  children,
}: {
  index: number;
  paneId?: CallPaneId;
  grow: number;
  /** Stored proportion — used before the row has a measured pixel width. */
  fraction?: number;
  widthPx?: number;
  settling?: boolean;
  reduced: boolean;
  /** White card chrome. Off when this column stacks its own cards. */
  surface?: boolean;
  /** Off for the aside column — its entrance is the width it opens into. */
  animateIn?: boolean;
  className?: string;
  inert?: boolean;
  children: ReactNode;
}) {
  const sized = widthPx != null;
  return (
    <div
      id={paneId ? `call-pane-${paneId}` : undefined}
      inert={inert}
      className={cn(
        "call-stage-pane flex min-h-0 min-w-0 flex-col",
        surface && "overflow-hidden rounded-[16px] border border-line bg-white",
        !reduced && animateIn && "call-stage-pane-in",
        settling && sized && "is-settling",
        className
      )}
      style={
        {
          flex: sized
            ? `0 0 ${widthPx}px`
            : `${fraction != null ? Math.round(fraction * 100) : grow} 1 0px`,
          "--pane-delay": `${PANE_REVEAL_DELAYS_MS[index] ?? 0}ms`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/**
 * The call bar. `data-morph` marks each element that also exists on the phone,
 * so the ringing → live move can carry it across; `data-morph-scale` says how
 * the size difference should be read (text re-flows, controls keep their
 * proportions off their height). While the move runs the bar is transparent —
 * the morph surface behind it is the dark, and the two end on the same rect.
 *
 * The left half reports on the call — who, for how long, your status, whether
 * it is being recorded, how the line is holding. The right half acts on it.
 * Nothing crosses that line, which is why an agent can find Mute without
 * reading the bar and why the recording pill has never been mistaken for one.
 */
function CallBar({
  className,
  morphing,
  revealing,
  elapsedMs,
  caller,
  network,
  availability,
  transfer,
  voicemail,
  recording,
  mergedWith,
  muted,
  onHold,
  notesOpen,
  notesControlRef,
  notesFound,
  transcriptOpen,
  liveAssistOpen,
  keypadOpen,
  transferOpen,
  voicemailOpen,
  scope = "v2",
  help,
  onMute,
  onHoldToggle,
  onHangup,
  onNotesToggle,
  onTranscriptToggle,
  onLiveAssistToggle,
  onKeypadToggle,
  onTransferToggle,
  onVoicemailToggle,
}: {
  className?: string;
  morphing?: boolean;
  revealing?: boolean;
  elapsedMs: number;
  caller: CallerIdentity;
  network: NetworkReading;
  availability: AvailabilityId;
  transfer: TransferFlow;
  voicemail: VoicemailFlow;
  recording: RecordingController;
  mergedWith: TransferTarget | null;
  muted: boolean;
  onHold: boolean;
  notesOpen?: boolean;
  notesControlRef?: RefObject<HTMLButtonElement | null>;
  /** The introduction has just landed here — light up, once. */
  notesFound?: boolean;
  transcriptOpen?: boolean;
  liveAssistOpen?: boolean;
  /** The three line controls open into the same column as Notes now. */
  keypadOpen?: boolean;
  transferOpen?: boolean;
  voicemailOpen?: boolean;
  scope?: AgentAssistScope;
  help: LiveAssistThread;
  onMute: () => void;
  onHoldToggle: () => void;
  onHangup: () => void;
  onNotesToggle?: () => void;
  onTranscriptToggle?: () => void;
  onLiveAssistToggle?: () => void;
  onKeypadToggle?: () => void;
  onTransferToggle?: () => void;
  onVoicemailToggle?: () => void;
}) {
  const detail = (delay: number) =>
    revealing
      ? {
          className: "call-bar-detail-in",
          style: { "--detail-delay": `${delay}ms` } as CSSProperties,
        }
      : {};
  const detailStyle = {
    "--detail-delay": `${BAR_DETAIL_DELAY_MS}ms`,
  } as CSSProperties;

  return (
    <div
      data-morph-bar
      className={cn(
        "relative z-30 flex h-[72px] shrink-0 items-center gap-4 rounded-[16px] px-4",
        morphing ? "bg-transparent" : "bg-dialer-surface shadow-600",
        className
      )}
    >
      <div
        data-morph="identity"
        data-morph-scale="none"
        className="min-w-0 max-w-[220px] shrink-0"
      >
        <p className="truncate text-[14px] leading-5 font-medium text-white">
          {caller.known ? caller.name : caller.number}
        </p>
        {/* Number and clock share the line. Both are things the agent reads off
            the bar mid-sentence — "the call you are on, and how long it has
            been" — and giving the number a row of its own would push the
            controls in to buy nothing. */}
        <p className="truncate text-[12px] leading-4 text-white/60 tabular-nums">
          {caller.known ? `${caller.number} · ` : ""}
          {mergedWith ? `3-way · ` : onHold ? "On hold · " : ""}
          {formatCallDuration(elapsedMs)}
        </p>
      </div>

      <span
        style={detailStyle}
        className={cn(
          "h-8 w-px shrink-0 bg-white/15",
          revealing && "call-bar-detail-in"
        )}
        aria-hidden="true"
      />

      <div className="flex shrink-0 items-center gap-2.5">
        <RecordingControl
          recording={recording}
          style={detailStyle}
          className={cn(revealing && "call-bar-detail-in")}
        />

        <span
          style={detailStyle}
          className={cn(
            "hidden items-center lg:flex",
            revealing && "call-bar-detail-in"
          )}
        >
          <NetworkStatusControl reading={network} />
        </span>

        <span
          style={detailStyle}
          className={cn(
            "hidden items-center xl:flex",
            revealing && "call-bar-detail-in"
          )}
        >
          <AvailabilityStatusPill status={availability} />
        </span>
      </div>

      {/* Voice activity — a 48×20 reading, not a centrepiece. It yields at
          `md` so the call controls never compress to make room for it. */}
      <span
        style={detailStyle}
        className={cn(
          "hidden shrink-0 items-center md:flex",
          revealing && "call-bar-detail-in"
        )}
      >
        <CallWaveform active={!morphing} muted={muted} onHold={onHold} reduced={!revealing} />
      </span>

      {/* Icon-only: on a bar this dense the labels cost more room than they
          buy, and the four that morph in from the phone were already circles
          there. Two groups, told apart by the space between them rather than
          another rule: the controls that run the line itself, then the tools
          the agent opens alongside it. Notes, Transcript, and Live Assist
          share one right-side shell. */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {/* Call controls — everything here acts on the line, Voicemail drop
            included: it is what the agent does when nobody picked up. */}
        <div className="flex items-center gap-1.5">
          <BarControl
            morphKey="mute"
            label={muted ? "Unmute" : "Mute"}
            tone="interrupt"
            pressed={muted}
            onClick={onMute}
          >
            {muted ? <IconCallMuted size={20} /> : <IconVoice size={20} />}
          </BarControl>
          <BarControl
            morphKey="hold"
            label={onHold ? "Resume call" : "Hold"}
            tone="interrupt"
            pressed={onHold}
            onClick={onHoldToggle}
          >
            <IconCallHold size={20} />
          </BarControl>
          <KeypadControl
            morphKey="keypad"
            open={keypadOpen}
            onToggle={onKeypadToggle}
          />
          <TransferControl
            morphKey="transfer"
            flow={transfer}
            open={transferOpen}
            onToggle={onTransferToggle}
          />
          <VoicemailDropControl
            flow={voicemail}
            open={voicemailOpen}
            onToggle={onVoicemailToggle}
            {...detail(BAR_DETAIL_DELAY_MS)}
          />
        </div>

        {/* In-call tools — each opens a surface; none touch the call.

            Audio devices are not one of them. Picking a mic is a setting, not
            an in-call move: it belongs on the Settings tab beside the other
            things about this machine, and a speaker icon in a row of
            conversation tools invited the agent to go hunting for it here. */}
        <div className="ml-3 flex items-center gap-1.5">
          {scope === "v2" && onLiveAssistToggle ? (
            <LiveAssistControl
              help={help}
              panelOpen={Boolean(liveAssistOpen)}
              revealing={revealing}
              onToggle={onLiveAssistToggle}
            />
          ) : null}
          <BarControl
            label={notesOpen ? "Hide notes" : "Notes"}
            pressed={notesOpen}
            buttonRef={notesControlRef}
            onClick={onNotesToggle}
            {...detail(BAR_DETAIL_DELAY_MS)}
            className={cn(
              revealing && "call-bar-detail-in",
              notesFound && "is-notes-found"
            )}
          >
            <IconCallNotes size={20} />
          </BarControl>
          <BarControl
            label={transcriptOpen ? "Hide transcript" : "Show transcript"}
            pressed={transcriptOpen}
            onClick={onTranscriptToggle}
            {...detail(BAR_DETAIL_DELAY_MS)}
          >
            <IconCallTranscript size={20} />
          </BarControl>
        </div>

        <span
          style={detailStyle}
          className={cn(
            "mr-4 ml-2 h-8 w-px bg-white/15",
            revealing && "call-bar-detail-in"
          )}
          aria-hidden="true"
        />

        <button
          type="button"
          data-morph="end"
          onClick={onHangup}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white pr-4 pl-3 outline-none transition-colors hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97]"
        >
          <Glyph src={hangupIcon} className="size-6" />
          <span className="text-label-sm whitespace-nowrap text-error">
            End call
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * The phone, from ringing through to a live call.
 *
 * Two jobs, and which one it is doing depends on `live`. Without it the phone
 * is a beat on the way somewhere: the line is ringing, or it has just been
 * picked up and the workspace is about to take over, so the controls are drawn
 * but inert and its `data-morph` elements are the ones the call bar takes over.
 * With it the phone *is* the call — nothing is authored in Agent Assist, so
 * there is no workspace to hand over to — and every control runs the line.
 *
 * `ghost` renders the same phone as the copy that fades out during the move.
 * It drops the capture marker so it can never be mistaken for the live phone.
 */
type PhoneSheetKind = "keypad" | "transfer" | "voicemail" | "recording";

/**
 * Which title the sheet wears. A lookup rather than a nested ternary in the
 * markup: six kinds and two fields each is where a conditional expression
 * stops being readable, and each panel already owns its own wording.
 */
function sheetCopy(
  kind: PhoneSheetKind,
  flows: {
    keypad?: KeypadFlow;
    transfer?: TransferFlow;
    voicemail?: VoicemailFlow;
    recording?: RecordingController;
  }
): { title: string; description?: string } {
  if (kind === "keypad") return KEYPAD_COPY;
  if (kind === "transfer" && flows.transfer) return transferCopy(flows.transfer);
  if (kind === "voicemail" && flows.voicemail)
    return voicemailCopy(flows.voicemail);
  if (kind === "recording" && flows.recording)
    return recordingCopy(flows.recording);
  return { title: "Call" };
}

function RingingPhone({
  className,
  reduced,
  connected,
  live,
  ghost,
  elapsedMs,
  caller,
  network,
  availability,
  keypad,
  transfer,
  voicemail,
  recording,
  mergedWith,
  muted,
  onHold,
  localTime,
  tab,
  onTabChange,
  onMute,
  onHoldToggle,
  onHangup,
  inbound,
  onAccept,
  onDecline,
}: {
  className?: string;
  reduced: boolean;
  connected?: boolean;
  /** The phone is the call, not a beat on the way to one. */
  live?: boolean;
  ghost?: boolean;
  elapsedMs?: number;
  caller: CallerIdentity;
  network: NetworkReading;
  availability: AvailabilityId;
  keypad?: KeypadFlow;
  transfer?: TransferFlow;
  voicemail?: VoicemailFlow;
  recording?: RecordingController;
  mergedWith?: TransferTarget | null;
  muted?: boolean;
  onHold?: boolean;
  localTime: string;
  tab: DialerTab;
  onTabChange: (tab: DialerTab) => void;
  onMute?: () => void;
  onHoldToggle?: () => void;
  onHangup: () => void;
  /** A colleague is handing this call over — see `InboundCall`. */
  inbound?: InboundCall | null;
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  // One sheet at a time. A 360px card can only hold one, and the card is the
  // only thing in a position to enforce that — which is why the sheet is
  // rendered here rather than by each control (see `PhoneSheet`).
  const [sheet, setSheet] = useState<PhoneSheetKind | null>(null);
  const presence = usePhoneSheetPresence(sheet !== null);
  // The connection's advice is a modal over the body, not a sheet in the
  // stack above — it is the design's own treatment, and it is the one panel
  // here the agent opens *while* still reading the call behind it.
  const quality = useCallQualityModal();

  // Whatever the sheet was showing has to stay on screen through its exit, so
  // the last kind is held rather than read from a state that has already gone.
  const shownSheet = useRef<PhoneSheetKind | null>(null);
  if (sheet) shownSheet.current = sheet;
  const kind = sheet ?? shownSheet.current;

  const openSheet = (next: PhoneSheetKind) =>
    setSheet((current) => (current === next ? null : next));

  /**
   * The offer, and only the offer. Derived from both halves rather than
   * threaded, because `connected` is what turns it off — which means the card
   * this component renders at `connecting` is byte-for-byte the connected card
   * the morph measured, and the ghost (which forces `connected` and is handed
   * no `inbound`) can never show an accept button fading out of a live call.
   *
   * Gate every offer-only region on this. Gating on `inbound` alone, or on
   * `!live`, would leave the offer's layout in the frame `captureMorph` reads
   * and slide the caller's name in from the wrong height, silently.
   */
  const offering = Boolean(inbound) && !connected;

  return (
    <div
      data-morph-card={ghost ? undefined : true}
      className={cn(
        "flex w-[360px] shrink-0 flex-col overflow-hidden rounded-[16px] bg-dialer-surface shadow-600",
        className
      )}
    >
      <div className="flex w-full items-center justify-center px-4">
        {/* The status is the phone's, not the agent's, for as long as there is
            a call on it — so the notch reports what the phone decided and has
            nothing to open. */}
        <AvailabilityControl status={availability} locked />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col items-center gap-5 overflow-hidden p-4">
          {/* Before pickup the useful thing is whether this is a decent hour to
              be calling. Once the line is live it isn't — the agent is talking
              to them — so the row turns over to the two readings that matter
              while it is: what the connection is doing, and whether this is
              being recorded. */}
          <div className="flex h-8 w-full items-center justify-between gap-2">
            {live && recording ? (
              <>
                <PhoneNetworkCheck
                  reading={network}
                  onTroubleshoot={quality.show}
                />
                <RecordingControl
                  recording={recording}
                  sheetOpen={sheet === "recording"}
                  onOpenSheet={() => openSheet("recording")}
                />
              </>
            ) : offering && inbound ? (
              /* Who handed it over, in the row that already exists — the local
                 hour is the wrong reading for a call a colleague is passing
                 you, and the fixed h-8 box takes an h-6 pill with slack, so
                 the attribution costs the card no height. A dark pill rather
                 than the DS `Tag`: every Tag colour is a light fill built for
                 the white workspace, and §2 forbids re-styling one from the
                 call site. This is the shape `AvailabilityBarPill` uses. */
              <span
                className={cn(
                  "mx-auto flex h-6 items-center rounded-full bg-white/12 px-2.5 text-[10px] leading-3 whitespace-nowrap text-white/80",
                  !reduced && "dialer-text-in"
                )}
              >
                Transferred by {inbound.transferredBy.name}
              </span>
            ) : (
              <p className="w-full text-center text-[12px] leading-4 text-white/70">
                It’s {localTime} there
              </p>
            )}
          </div>

          <div className="flex w-full flex-col items-center gap-2">
            <span
              data-morph="avatar"
              className="relative flex size-10 items-center justify-center overflow-clip rounded-full bg-gray-700"
            >
              <img src={userIcon} alt="" className="size-6 object-contain" />
            </span>
            {/* Hugs its text so the box centre is the text centre — that is what
                the move aligns to when it travels into the bar. */}
            <div
              data-morph="identity"
              className="flex max-w-full flex-col items-center gap-1 text-center"
            >
              <p className="text-[16px] leading-6 font-medium text-pretty text-white">
                {caller.known ? caller.name : caller.number}
              </p>
              <p
                className={cn(
                  "text-[12px] leading-4 tabular-nums",
                  caller.known ? "text-white/70" : "text-white/50",
                  !reduced && "dialer-text-in"
                )}
              >
                {/* Name and number both, always — a call is filed against the
                    number, and an agent reading a name back to a customer has
                    to be able to see which line it came in on. Unknown, the
                    number has already taken the headline, so this says so
                    rather than repeating it. */}
                {caller.known ? caller.number : "No matching contact"}
              </p>
              {caller.known ? (
                <p className="text-[11px] leading-4 text-white/45">
                  {caller.meta}
                </p>
              ) : null}
            </div>
            <div
              data-morph="status"
              className="flex h-11 flex-col items-center justify-end gap-1 text-center text-white"
            >
              {connected ? (
                <>
                  <p
                    className={cn(
                      "text-[10px] leading-3 tracking-[0.06em] text-white/60 uppercase",
                      !reduced && "dialer-text-in"
                    )}
                  >
                    {mergedWith
                      ? `3-way with ${mergedWith.name.split(" ")[0]}`
                      : onHold
                        ? "On hold"
                        : "Connected"}
                  </p>
                  <p
                    className={cn(
                      "text-[16px] leading-6 font-medium tabular-nums",
                      !reduced && "dialer-text-in"
                    )}
                  >
                    {formatCallDuration(elapsedMs ?? 0)}
                  </p>
                </>
              ) : (
                <p
                  className={cn(
                    "text-[16px] leading-6 font-medium",
                    !reduced && "dialer-text-in"
                  )}
                >
                  {/* Reuses the box that says "Ringing" rather than adding a
                      row above the avatar, which is where the design puts it:
                      this box is a `data-morph` anchor pinned at h-11, and a
                      new row in a card fixed at 588px with overflow-hidden
                      twice would push the nav out of sight. */}
                  {offering ? "Incoming call" : "Ringing"}
                </p>
              )}
            </div>
          </div>

          {/* The four controls the call bar keeps. They come alive on connect,
              which is also the moment they start travelling.

              Absent entirely during an offer: there is nothing to mute on a
              call you have not taken, the design shows open space here, and the
              ~128px it frees is what lets the line-name row below fit a card
              that cannot grow. Morph-safe because `offering` is already false
              at `connecting`, so the grid is present when the move measures. */}
          {offering ? null : (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex gap-4">
              <CallControl
                morphKey="mute"
                label="Mute"
                pressedLabel="Unmute"
                tone="interrupt"
                pressed={muted}
                disabled={!connected}
                onClick={live ? onMute : undefined}
              >
                {muted ? <IconCallMuted size={24} /> : <IconVoice size={24} />}
              </CallControl>
              <CallControl
                morphKey="hold"
                label="Hold"
                pressedLabel="Resume"
                tone="interrupt"
                pressed={onHold}
                disabled={!connected}
                onClick={live ? onHoldToggle : undefined}
              >
                <IconCallHold size={24} />
              </CallControl>
            </div>
            <div className="flex gap-4">
              <CallControl
                morphKey="keypad"
                label="Keypad"
                pressed={sheet === "keypad"}
                disabled={!connected}
                onClick={live ? () => openSheet("keypad") : undefined}
              >
                <IconCallKeypad size={24} />
              </CallControl>
              <CallControl
                morphKey="transfer"
                label={transfer?.merged ? "3-way" : "Transfer"}
                pressed={sheet === "transfer" || transfer?.active}
                disabled={!connected}
                onClick={live ? () => openSheet("transfer") : undefined}
              >
                {transfer?.merged ? (
                  <IconCallUsers size={24} />
                ) : (
                  <IconCallTransfer size={24} />
                )}
              </CallControl>
            </div>
          </div>
          )}

          {/* The offer's two answers sit 40px apart and centred; the live row
              keeps the 16px spacing that balances End call against Voicemail
              drop. Scoped rather than shared, or the normal call's row widens
              too. */}
          <div
            className={cn(
              "mt-auto flex items-center",
              offering ? "justify-center gap-10" : "gap-4"
            )}
          >
            {offering ? (
              <>
                {/* Accept left, decline right, 40px apart — the design's
                    arrangement, and the order a two-answer prompt reads in.
                    Neither carries `data-morph`: `end` belongs to the End call
                    button that exists when the move measures, and a second
                    claim on a key would have the bar invert onto the wrong
                    rect. The glyphs are the two the card already ships —
                    `phone-filled.svg` bakes a white fill so it needs a
                    coloured face, which is exactly what it gets. */}
                <button
                  type="button"
                  aria-label="Accept call"
                  onClick={onAccept}
                  className="flex size-14 items-center justify-center overflow-clip rounded-full bg-success outline-none transition-colors duration-base hover:bg-success/90 focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97]"
                >
                  <Glyph src={phoneFilled} className="size-6" />
                </button>
                <button
                  type="button"
                  aria-label="Decline call"
                  onClick={onDecline}
                  className="flex size-14 items-center justify-center rounded-full bg-error text-white outline-none transition-colors duration-base hover:bg-error-hover focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97]"
                >
                  <IconClose size={24} />
                </button>
              </>
            ) : (
              <>
            {/* Balances End call against Voicemail drop on the other side, so
                the red button stays centred in the row. Audio devices used to
                sit here; they are a setting about this machine, not a move on
                the call, and they live on the Settings tab now. */}
            <span className="size-12 shrink-0" aria-hidden="true" />
            <button
              type="button"
              aria-label="End call"
              data-morph="end"
              onClick={onHangup}
              className="flex h-14 w-32 items-center justify-center overflow-clip rounded-full bg-white outline-none transition-colors duration-base hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97]"
            >
              <Glyph src={hangupIcon} className="size-7" />
            </button>
            {/* Reachable while the line is still ringing, which is the moment
                it is actually for: nobody picked up. */}
            <button
              type="button"
              aria-label="Voicemail drop"
              aria-pressed={sheet === "voicemail" || voicemail?.running}
              onClick={() => openSheet("voicemail")}
              className={cn(
                "flex size-12 items-center justify-center overflow-clip rounded-full outline-none transition-colors duration-base focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97]",
                voicemail?.running
                  ? "bg-success text-white"
                  : "bg-white text-success hover:bg-surface-hover"
              )}
            >
              <IconVoicemailDrop size={24} className="size-6" />
            </button>
              </>
            )}
          </div>
        </div>

        {presence.mounted && kind ? (
          <PhoneSheet
            state={presence.state}
            onClose={() => setSheet(null)}
            {...sheetCopy(kind, { keypad, transfer, voicemail, recording })}
          >
            {kind === "keypad" && keypad ? (
              <KeypadBody
                keypad={keypad}
                fill
                active={presence.state === "open"}
              />
            ) : null}
            {kind === "transfer" && transfer ? (
              <TransferBody flow={transfer} />
            ) : null}
            {kind === "voicemail" && voicemail ? (
              <VoicemailBody flow={voicemail} />
            ) : null}
            {kind === "recording" && recording ? (
              <RecordingBody
                recording={recording}
                onDone={() => setSheet(null)}
              />
            ) : null}
          </PhoneSheet>
        ) : null}

        {quality.mounted ? (
          <CallQualityModal
            state={quality.state}
            reading={network}
            onClose={quality.close}
          />
        ) : null}
      </div>

      {/* Which of the account's numbers was rung — its own row rather than a
          second line under the number, so the caller's name stays the thing
          the agent reads first. */}
      {offering && inbound ? (
        <p className="shrink-0 px-4 pb-2 text-center text-[10px] leading-3 text-white/40">
          {inbound.lineName}
        </p>
      ) : null}

      <DialerNav tab={tab} onTabChange={onTabChange} />
    </div>
  );
}

/**
 * Post-call — the same stage the live call used, in its ended state. The call
 * bar keeps the top edge (now reporting the call rather than running it), the
 * recap keeps the wide pane it had while the line was open, and Wrap up takes
 * the column guidance and the transcript were using. Nothing the agent was
 * reading moves to a different part of the screen when the call ends.
 *
 * Call quality sits under Wrap up as its own card, not inside it: filing the
 * call and telling us how the line sounded are two different jobs, and only the
 * first one is the customer's record.
 */
function PostCallStage({
  className,
  scope,
  reduced,
  elapsedMs,
  caller,
  scenario,
  actionStates,
  notes,
  onNotesChange,
  onScenarioChange,
  closing,
  onClose,
}: {
  className?: string;
  reduced: boolean;
  elapsedMs: number;
  caller: CallerIdentity;
  scenario: CallScenario;
  actionStates?: Record<string, ActionState>;
  scope: AgentAssistScope;
  notes: NotesEditorValue;
  onNotesChange: (value: NotesEditorValue) => void;
  onScenarioChange: (id: string) => void;
  closing: boolean;
  onClose: (fromKeyboard?: boolean) => void;
}) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  return (
    <div
      // One visual group: recap, Wrap up and the completed-call bar leave as
      // the session they were, not as three panels being dismissed. `inert`
      // both takes the pointer off it and drops it out of the accessibility
      // tree the moment it starts leaving.
      data-closing={closing ? "true" : undefined}
      inert={closing}
      className={cn(
        // Same geometry the live stage settles at, so hanging up doesn't
        // resize the surface the agent is already reading.
        "post-call-stage flex h-[700px] max-h-full min-h-0 w-full max-w-[1504px] flex-col gap-3 px-16",
        className
      )}
    >
      <EndedCallBar
        // The bar outlasts the panes on the way out, so the session reads as
        // leaving after its own contents.
        className={cn("post-call-bar", !reduced && "call-bar-in")}
        elapsedMs={elapsedMs}
        caller={caller}
        onClose={onClose}
      />

      <div className="post-call-body flex min-h-0 flex-1 gap-3">
        <StagePane index={0} reduced={reduced} grow={7}>
          <AgentAssistCallSheet
            key={scenario.id}
            elapsedMs={elapsedMs}
            scenario={scenario}
            onScenarioChange={onScenarioChange}
            ended
            transcriptOpen={transcriptOpen}
            onTranscriptOpenChange={setTranscriptOpen}
            actionStates={actionStates}
            scope={scope}
            className="h-full"
          />
        </StagePane>
        <StagePane index={1} reduced={reduced} grow={4}>
          <WrapUpPanel
            key={scenario.id}
            // V1 does not read the call for a disposition, so the field opens
            // empty and the agent picks. Only V2 arrives filled.
            suggestedOutcome={
              scope === "v1" ? undefined : scenario.wrapUp.suggestedOutcome
            }
            // Only V1 hands the work back. On V2 each recap row runs its own,
            // so repeating the offer here would be two buttons for one job.
            actions={
              scope === "v1" ? callActionCtas(scenario.wrapUp.actionItems) : undefined
            }
            notes={notes}
            onNotesChange={onNotesChange}
            onClose={onClose}
          />
        </StagePane>
      </div>
    </div>
  );
}

/**
 * The call bar after hangup. Same surface, same geometry — the live controls
 * give way to the two things left to do with the bar itself: say how the line
 * sounded, and leave. Reading the call is the recap pane's own business.
 *
 * Call quality lives here rather than in Wrap up on purpose. Wrap up is the
 * customer's record — what happened on the call and what we do next. How the
 * audio held up is our record, about our infrastructure, and folding it into
 * the disposition form would put a question the agent can answer in half a
 * second behind one they have to think about. The bar is also the thing that
 * was carrying the call, so it is the honest place to ask about the call.
 *
 * Deliberately not a survey: two thumbs, no comment box, no submit. The vote
 * stays local because it is the prototype's — there is no backend to file it
 * against, and re-mounting per call is exactly the lifetime it should have.
 */
function EndedCallBar({
  className,
  elapsedMs,
  caller,
  onClose,
}: {
  className?: string;
  elapsedMs: number;
  caller: CallerIdentity;
  onClose: (fromKeyboard?: boolean) => void;
}) {
  // The contact's clock stops being useful the moment the line drops — what
  // the agent is filing against now is when this call ended, stamped once.
  const [endedAt] = useState(() => formatLocalTime(new Date()));
  const [quality, setQuality] = useState<FeedbackVote>(null);

  return (
    <div
      className={cn(
        "flex h-[72px] shrink-0 items-center gap-4 rounded-[16px] bg-dialer-surface px-4 shadow-600",
        className
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[14px] leading-5 font-medium text-white">
          {caller.known ? caller.name : caller.number}
        </p>
        <p className="truncate text-[11px] leading-4 text-white/60 tabular-nums">
          {caller.known ? `${caller.number} · ` : ""}Ended {endedAt}
        </p>
      </div>

      <div className="flex shrink-0 flex-col justify-center pl-2">
        <p className="text-[10px] leading-3 tracking-[0.06em] whitespace-nowrap text-white/60 uppercase">
          Duration
        </p>
        <p className="text-[16px] leading-6 font-medium text-white tabular-nums">
          {formatCallDuration(elapsedMs)}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {/* The label stays put once a thumb is picked. Swapping it for a
            thank-you would shift the buttons out from under the cursor at the
            exact moment the agent might want to correct a mis-tap — and the
            filled thumb already says it was heard. */}
        <span className="text-[13px] leading-5 whitespace-nowrap text-white/60">
          How was the audio quality?
        </span>
        {/* Filled and labelled: this bar is on screen for as long as it takes
            to file the call, which is not long enough for anyone to go hunting
            for a bare glyph. The short words carry the ask; the long ones stay
            on the accessible name. */}
        <FeedbackThumbs
          tone="dark"
          size="md"
          shape="rounded"
          emphasis="filled"
          value={quality}
          onChange={setQuality}
          upLabel="Call quality was good"
          downLabel="Call quality was poor"
          upText="Good"
          downText="Bad"
        />

        {/* Leaving is a different kind of act from answering a question, so
            the rule keeps the cross from reading as a third thumb. */}
        <span aria-hidden="true" className="h-6 w-px bg-white/15" />

        {/* Dismissal reads the same everywhere on this page: a bare cross, no
            label — only the colours change for the dark surface.

            The press answers under the finger while the screen is already
            leaving — neither waits for the other, or dismissing a call would
            cost two animations end to end. A click carries `detail: 0` only
            when the keyboard activated it, which is what decides where focus
            lands once the dialer is back. */}
        <button
          type="button"
          aria-label="Close"
          onClick={(event) => onClose(event.detail === 0)}
          className="call-close-press flex size-8 shrink-0 items-center justify-center rounded-[4px] text-white/70 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 active:bg-white/16"
        >
          <IconClose size={20} className="call-close-icon" />
        </button>
      </div>
    </div>
  );
}

/**
 * Wrap-up with no Agent Assist behind it.
 *
 * The call never left the 360px phone, so filing it doesn't either — a call
 * that ran in a card and then files itself across a 1504px stage would read as
 * two different products. Same card, same top edge, same width: what changes is
 * that the phone stops running a call and starts closing one out.
 *
 * There is no recap pane because there is nothing to recap. Agent Assist is
 * what writes the summary, the moments and the suggested disposition, and this
 * is the account that hasn't set it up — so the outcome starts empty and the
 * notes are only what the agent typed. That absence is the state, not a gap to
 * paper over with an empty panel.
 */
function CompactWrapUp({
  className,
  elapsedMs,
  caller,
  notes,
  onNotesChange,
  closing,
  onClose,
}: {
  className?: string;
  elapsedMs: number;
  caller: CallerIdentity;
  notes: NotesEditorValue;
  onNotesChange: (value: NotesEditorValue) => void;
  closing: boolean;
  onClose: (fromKeyboard?: boolean) => void;
}) {
  const [endedAt] = useState(() => formatLocalTime(new Date()));
  const [quality, setQuality] = useState<FeedbackVote>(null);

  return (
    <div className="flex h-full w-full items-start justify-center">
      <div
        data-closing={closing ? "true" : undefined}
        inert={closing}
        className={cn(
          "post-call-stage flex w-[360px] shrink-0 flex-col overflow-hidden rounded-[16px] bg-white shadow-600",
          PHONE_SHELL_H,
          className
        )}
      >
        <header className="post-call-bar flex shrink-0 items-center gap-3 bg-dialer-surface px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] leading-5 font-medium text-white">
              {caller.known ? caller.name : caller.number}
            </p>
            {/* Three lines rather than the bar's two. The wide bar can lay the
                number, the duration and the end time out across 1504px; at
                360px they stack, and none of the three is droppable — the
                number is what the call is filed against, and the other two are
                what the agent reports it by. */}
            <p className="truncate text-[11px] leading-4 text-white/70 tabular-nums">
              {caller.known ? caller.number : "No matching contact"}
            </p>
            <p className="truncate text-[11px] leading-4 text-white/50 tabular-nums">
              {formatCallDuration(elapsedMs)} · Ended {endedAt}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={(event) => onClose(event.detail === 0)}
            className="call-close-press flex size-8 shrink-0 items-center justify-center rounded-[4px] text-white/70 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 active:bg-white/16"
          >
            <IconClose size={20} className="call-close-icon" />
          </button>
        </header>

        {/* Above the form rather than inside it, for the same reason the wide
            recap keeps it on the bar: how the line sounded is our record, and
            the disposition is the customer's. */}
        <div className="post-call-body flex shrink-0 items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="min-w-0 flex-1 truncate text-label-sm text-muted-foreground">
            How was the audio quality?
          </span>
          <FeedbackThumbs
            size="sm"
            shape="rounded"
            emphasis="filled"
            value={quality}
            onChange={setQuality}
            upLabel="Call quality was good"
            downLabel="Call quality was poor"
          />
        </div>

        <div className="post-call-body flex min-h-0 flex-1 flex-col">
          <WrapUpPanel
            notes={notes}
            onNotesChange={onNotesChange}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Wrap up — disposition and notes. The recap next door is the raw material: the
 * agent copies the generated summary from there if they want it in the notes,
 * or writes their own.
 *
 * The notes field is the call's notes, not a second set: anything typed in the
 * live Notes pane is already here, and editing either place edits the same
 * value. Nobody should have to re-type what they wrote while talking.
 *
 * In V2 the disposition arrives already filled: Agent Assist heard the whole
 * call, so making the agent re-derive it from memory is busywork. It stays a
 * plain dropdown — changing it is one click, and the sparkle says where it came
 * from so an agent who disagrees knows it wasn't their own earlier pick. V1
 * doesn't listen for a disposition, so there the agent picks it themselves.
 *
 * On V1 the follow-up work lands here too, as secondary buttons under the
 * form. The recap can list what the call asked for but cannot do any of it, so
 * the offer belongs where the agent already is when they close the call —
 * once per kind of errand, rather than once per row.
 */
function WrapUpPanel({
  suggestedOutcome,
  actions,
  notes,
  onNotesChange,
  onClose,
}: {
  /**
   * Omitted when nothing derived a disposition from the call — the account has
   * no Agent Assist, or this is V1, which doesn't ship the suggestion. The
   * field then opens empty and wears no sparkle, which is the honest version:
   * an unfilled dropdown says "you pick", and a filled one with no mark would
   * look like the agent's own earlier answer.
   */
  suggestedOutcome?: CallOutcomeValue;
  /**
   * The distinct jobs the recap's action items leave the agent, offered once
   * each beside Save & close. Omitted where the recap runs its own work, and
   * where there is no recap at all.
   */
  actions?: ReturnType<typeof callActionCtas>;
  notes: NotesEditorValue;
  onNotesChange: (value: NotesEditorValue) => void;
  onClose: (fromKeyboard?: boolean) => void;
}) {
  const [outcome, setOutcome] = useState<string>(suggestedOutcome ?? "");
  // Read once, on the way in: the field stays labelled as carried over even
  // after the agent edits it, because that is still where the text came from.
  const [carriedOver] = useState(() => notes.text.trim().length > 0);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<number | null>(null);
  // Read at the click and spent half a second later, once the button has
  // finished confirming: by then the event that carried it is long gone.
  const savedByKeyboard = useRef(false);

  // Either field is enough to file the call. An empty wrap-up is not — Save &
  // close waits until the agent has picked an outcome or written a note.
  const canSave = Boolean(outcome) || notes.text.trim().length > 0;

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    []
  );

  // Saving is the end of the call: confirm on the button, then let the wrap-up go.
  const save = (event: MouseEvent<HTMLButtonElement>) => {
    if (saveTimer.current || !canSave) return;
    savedByKeyboard.current = event.detail === 0;
    setSaved(true);
    saveTimer.current = window.setTimeout(
      () => onClose(savedByKeyboard.current),
      SAVE_CONFIRM_MS
    );
  };

  const outcomeOptions = CALL_OUTCOMES.map((item) => ({
    value: item.value,
    label: item.label,
    icon: <OutcomeDot tone={item.tone} />,
  }));
  const selected = CALL_OUTCOMES.find((item) => item.value === outcome);
  // The mark is about the value in the field, not about who typed it last: it
  // disappears the moment the agent picks something else, and comes back if
  // they land on the suggestion again.
  const aiFilled = Boolean(suggestedOutcome) && outcome === suggestedOutcome;

  return (
    <section
      aria-label="Wrap up"
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white"
    >
      <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-line px-4">
        <IconCallDisposition size={16} className="size-4 shrink-0 text-muted-foreground" />
        <p className="text-label-md-semi text-foreground">Wrap up</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4">
        <div className="relative shrink-0">
          <Dropdown
            searchable={false}
            label="Call outcome"
            placeholder="Select call outcome"
            options={outcomeOptions}
            leftIcon={selected ? <OutcomeDot tone={selected.tone} /> : undefined}
            value={outcome}
            onValueChange={(value) =>
              setOutcome(Array.isArray(value) ? value[0] ?? "" : value)
            }
            aria-label="Call outcome"
          />
          {/* Sits inside the field, clear of the chevron, so the mark belongs to
              the value rather than to the label. */}
          {aiFilled ? (
            <TooltipTrigger
              placement="top"
              className="absolute right-9 bottom-0 h-10 items-center"
              content={
                <Tooltip
                  theme="dark"
                  arrow="bottom-center"
                  title="Filled in by Agent Assist"
                  description="Suggested from this call — change it if you disagree."
                />
              }
            >
              <span
                tabIndex={0}
                aria-label="Filled in by Agent Assist"
                className="flex size-5 items-center justify-center rounded-[4px] text-ai outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                <IconSparkles size={16} className="size-4 shrink-0" />
              </span>
            </TooltipTrigger>
          ) : null}
        </div>

        {/* Same default height as the design-system textarea. The grabber
            stretches the field only into leftover card space — not past the
            pane, and not over Save & close. Size containment makes that cap
            independent of the field's own height, so dragging cannot grow
            the thing that is supposed to stop it. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <div className="flex shrink-0 items-baseline justify-between gap-2">
            <p className="text-label-md text-foreground">Notes</p>
            {/* Says why the field is already full, so a pre-filled box doesn't
                read as someone else's text. */}
            {carriedOver ? (
              <p className="shrink-0 text-label-sm text-muted-foreground">
                Carried over from the call
              </p>
            ) : null}
          </div>
          {/* 1.5rem is the counter row plus the gap above it, so the field
              stops while those stay visible. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 [container-type:size]">
            <NotesEditor
              placeholder="Add your notes about this call..."
              maxLength={NOTES_MAX}
              value={notes}
              onChange={onNotesChange}
              resizable
              className="h-32 max-h-[calc(100cqh-1.5rem)]"
              ariaLabel="Notes"
            />
            <p className="shrink-0 text-right text-label-sm text-muted-foreground tabular-nums">
              {notes.text.length}/{NOTES_MAX}
            </p>
          </div>
        </div>
      </div>

      {/* What closes the call sits on its own edge, not at the end of a scroll. */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-line px-4 py-3">
        {/* Above the primary, not beside it: these are the errands the call
            left, and saving is the one thing that ends it. Grey outlines keep
            them clearly the lesser weight. They grow to fill the footer the
            way Save & close does, and wrap rather than shrink so a three-
            errand call doesn't squeeze the labels. */}
        {actions && actions.length > 0 ? (
          <div
            role="group"
            aria-label="Follow up on this call"
            className="flex flex-wrap gap-2"
          >
            {actions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={action.kind}
                  type="button"
                  variant="grey-outline"
                  size="sm"
                  className="flex-1"
                  leftIcon={<ActionIcon size={16} />}
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        ) : null}
        <Button
          type="button"
          variant="primary"
          size="md"
          className="w-full"
          disabled={!canSave && !saved}
          leftIcon={saved ? <IconCheck size={20} /> : undefined}
          onClick={save}
        >
          {saved ? "Saved" : "Save & close"}
        </Button>
      </div>
    </section>
  );
}

function OutcomeDot({ tone }: { tone: OutcomeTone }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 shrink-0 rounded-full", OUTCOME_TONE[tone])}
    />
  );
}

/** Sticky-note mark for the light Notes pane — same shape as the dialer asset, muted like sibling headers. */
function NotesPaneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M11.167 6.5V1.833A1.333 1.333 0 0 0 9.833.5H1.833A1.333 1.333 0 0 0 .5 1.833v8A1.333 1.333 0 0 0 1.833 11.167H6.5L11.167 6.5ZM6.5 11.167V7.167c0-.177.07-.347.195-.472.125-.125.295-.195.472-.195h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DialerNav({
  tab,
  onTabChange,
  className,
}: {
  tab: DialerTab;
  onTabChange: (tab: DialerTab) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Dialer"
      className={cn("dialer-nav flex w-full shrink-0 items-start bg-brand", className)}
    >
      {NAV_ITEMS.map((item) => {
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-1 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40",
              active ? "bg-brand-hover" : "bg-brand hover:bg-brand-hover/70"
            )}
          >
            {item.badge && (
              <span className="absolute top-1 right-0 flex items-center justify-center rounded-full bg-error px-1 text-label-xs text-white uppercase">
                {item.badge}
              </span>
            )}
            {item.icon}
            <span className="text-paragraph-sm whitespace-nowrap text-white">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
