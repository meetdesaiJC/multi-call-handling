import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  WebphoneBackspace,
  WebphoneBook,
  WebphoneCall,
  WebphoneCallEnd,
  WebphoneCaret,
  WebphoneClose,
  WebphoneCollapse,
  WebphoneConstruct,
  WebphoneForum,
  WebphoneHelp,
  WebphonePause,
  WebphonePerson,
  WebphoneSwap,
} from "./icons/WebphoneIcons";
import flagSmall from "./assets/legacy-dialer/flag-us-small.png";
import flagLarge from "./assets/legacy-dialer/flag-us-32.png";
import chevronBlue from "./assets/legacy-dialer/chevron-down.svg";
import messageBubbles from "./assets/legacy-dialer/message.svg";
import callerAvatar from "./assets/legacy-dialer/caller-avatar.png";
import {
  ConferenceScreen,
  ConsultScreen,
  HeldScreen,
  LiveScreen,
  CrmPill,
  MissedNotice,
  RingingAlert,
} from "./WebphoneCallScreens";
import { WrapUpScreen } from "./WebphoneWrapUp";
import { useCallWaitingTone } from "./useCallWaitingTone";
import {
  INITIAL_STATE,
  QUEUE_CALL_LIMIT,
  LINES,
  callerLabel,
  reducer,
  useNow,
  type Call,
  type Caller,
} from "./webphoneCalls";

/**
 * The webphone as it ships today — the PHP-era dialer, not the DS 2.0 one in
 * `DialerPanel`. Multi-call handling is a change to *this* product, so its
 * screens are designed on it: a reviewer should recognise the phone they use
 * every day and see only what multi-call adds.
 *
 * Source: Figma "Non-Calling Licenses" › Page 4 (idle 121:13254, live
 * 122:13519, incoming 122:13701). It paints from the --color-webphone-*
 * roles, and is set in Roboto, as production is.
 *
 * It lives in the prototype rather than in `src/components`: it is a stand-in
 * for a legacy screen, not a pattern any new UI should be built from.
 */

/** The line the account calls out on — production's "Call via" default. */
const OWN_LINE = LINES.sales.number;
/** Who rings when the demo plays an inbound call on an idle phone. */
const FIRST_CALLER: Caller = {
  number: "+441341610153",
  line: LINES.sales,
  location: "London, UK",
  crm: { id: "hubspot", contact: "+441341610153" },
};
/** Long enough to see the keypad first, so the call lands on top of it. */
const INBOUND_ARRIVES_MS = 1500;
/**
 * The multi-call moment itself: a second caller, on the other line, a few
 * seconds into the first call — long enough to have settled into it.
 */
const SECOND_CALLER: Caller = {
  name: "Marcus Chen",
  number: "+1 (628) 555-0199",
  line: LINES.support,
  location: "San Francisco, US",
  crm: { id: "hubspot", contact: "Marcus Chen" },
};
const SECOND_CALL_AFTER_MS = 6000;
/**
 * Queue approach only: once the rep has connected the first queued caller,
 * someone else joins the queue. Connecting them too leaves the rep talking to
 * one caller with two on hold.
 */
const THIRD_CALLER: Caller = {
  name: "Priya Raman",
  number: "+1 (415) 555-0163",
  line: LINES.support,
  location: "Oakland, US",
  crm: { id: "salesforce", contact: "Priya Raman" },
};
const THIRD_CALL_AFTER_MS = 6000;
/** How long the second call rings this rep before the queue moves it on. */
const RING_TIMEOUT_MS = 20000;
/** How long "went back to the queue" stays up. */
const MISSED_NOTICE_MS = 4000;

const KEYS: { digit: string; letters?: string }[] = [
  { digit: "1" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*" },
  { digit: "0", letters: "+" },
  { digit: "#" },
];

export interface ProductionDialerProps {
  /** Play an inbound call shortly after the phone opens. */
  ringOnOpen?: boolean;
  /**
   * Ring a second caller a few seconds into the first call, once per call.
   * On by default: it is what this prototype exists to show.
   */
  secondCallDemo?: boolean;
  /**
   * How the second caller announces itself — the two approaches under review.
   * `alert` drops a card over the call with Answer and a countdown; `queue`
   * keeps production's quiet green "caller in queue" chip, which opens the
   * same card only when the rep asks for it.
   */
  secondCallStyle?: SecondCallStyle;
  className?: string;
}

export type SecondCallStyle = "alert" | "queue";

export function ProductionDialer({
  ringOnOpen = false,
  secondCallDemo = true,
  secondCallStyle = "alert",
  className,
}: ProductionDialerProps) {
  const queueStyle = secondCallStyle === "queue";
  const [number, setNumber] = React.useState("");
  /** Queue style only: whether the rep has opened the chip to see who waits. */
  const [queueOpen, setQueueOpen] = React.useState(false);
  /**
   * Queue style only: callers waiting in the queue. They are not ringing this
   * rep, so they live outside the call reducer — and unlike a ring, a queued
   * caller can wait even while both of the rep's lines are busy.
   */
  const [queued, setQueued] = React.useState<QueuedCaller[]>([]);
  /**
   * Queue style only: the caller the rep pressed Connect on. Production then
   * offers them like any inbound call — full screen, Accept or Decline — so
   * the rep sees who it is before their current call goes on hold.
   */
  const [offered, setOffered] = React.useState<QueuedCaller | null>(null);
  /** Queue style only: how many callers the rep has pulled from the queue. */
  const [connectedFromQueue, setConnectedFromQueue] = React.useState(0);
  const [state, dispatch] = React.useReducer(reducer, INITIAL_STATE);
  const now = useNow();
  const at = () => Date.now();

  const focused = state.calls.find((c) => c.id === state.focusedId) ?? null;
  const others = state.calls.filter((c) => c.id !== state.focusedId);
  const held = others[0] ?? null;

  React.useEffect(() => {
    if (!ringOnOpen) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "offer", caller: FIRST_CALLER }),
      INBOUND_ARRIVES_MS
    );
    return () => window.clearTimeout(timer);
  }, [ringOnOpen]);

  // One demo ring per stretch of calls: it plays a few seconds into the first
  // call and not again until the phone is idle, so the caller who rang never
  // rings a second time once they are the only one left on the line.
  const demoRung = React.useRef(false);
  const firstCallId = state.calls[0]?.id;
  const idle = state.calls.length === 0;
  React.useEffect(() => {
    if (!idle) return;
    demoRung.current = false;
    // A fresh stretch of calls starts the demo story over.
    setQueued([]);
    setConnectedFromQueue(0);
    setOffered(null);
  }, [idle]);
  React.useEffect(() => {
    if (!secondCallDemo || !firstCallId || demoRung.current) return;
    const timer = window.setTimeout(() => {
      demoRung.current = true;
      if (queueStyle) {
        setQueued((list) => [...list, { ...SECOND_CALLER, arrivedAt: Date.now() }]);
      } else {
        dispatch({ type: "ring", caller: SECOND_CALLER, at: Date.now() });
      }
    }, SECOND_CALL_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [secondCallDemo, firstCallId, queueStyle]);

  // Queue style: the next caller joins a few seconds after the rep connects
  // the first one — once per stretch, like the first.
  React.useEffect(() => {
    if (!queueStyle || !secondCallDemo || connectedFromQueue !== 1) return;
    const timer = window.setTimeout(
      () => setQueued((list) => [...list, { ...THIRD_CALLER, arrivedAt: Date.now() }]),
      THIRD_CALL_AFTER_MS
    );
    return () => window.clearTimeout(timer);
  }, [queueStyle, secondCallDemo, connectedFromQueue]);

  const offerQueued = (caller: QueuedCaller) => {
    setQueued((list) => list.filter((c) => c !== caller));
    setOffered(caller);
    setQueueOpen(false);
  };
  const acceptOffered = () => {
    if (!offered) return;
    const { arrivedAt: _arrivedAt, ...caller } = offered;
    dispatch({ type: "connect", caller, at: at() });
    setOffered(null);
    setConnectedFromQueue((count) => count + 1);
  };
  // Declining doesn't drop the caller: they go back to their place in the
  // queue, wait time intact, for this rep or the next one.
  // "End current call & connect": the call the rep is talking on ends (its
  // wrap-up waits) and the queued caller takes its place.
  const endAndAcceptOffered = () => {
    if (!offered) return;
    dispatch({ type: "hang-up", at: at() });
    acceptOffered();
  };
  // "Back to queue": nothing was decided, so the rep lands back on the list
  // they pressed Connect from, the caller in their old place.
  const backToQueue = () => {
    declineOffered();
    setQueueOpen(true);
  };
  const declineOffered = () => {
    if (!offered) return;
    setQueued((list) =>
      [...list, offered].sort((a, b) => a.arrivedAt - b.arrivedAt)
    );
    setOffered(null);
  };
  /** The call the rep is talking on right now, if any — the one a choice affects. */
  const talking = focused && focused.heldSince === null ? focused : null;
  const linesFull = state.calls.length >= QUEUE_CALL_LIMIT || state.conference;

  // Unanswered, the call follows the existing queue logic: it stops ringing
  // here and the queue carries on with it.
  React.useEffect(() => {
    if (!state.ringing) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "ring-timeout", at: Date.now() }),
      RING_TIMEOUT_MS
    );
    return () => window.clearTimeout(timer);
  }, [state.ringing]);

  React.useEffect(() => {
    if (!state.missed) return;
    const timer = window.setTimeout(() => dispatch({ type: "clear-missed" }), MISSED_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [state.missed]);

  // Only a ring sounds: the queue chip is production's passive signal.
  useCallWaitingTone(state.ringing !== null);

  const startCall = () => {
    const dialled = number.trim();
    if (!dialled) return;
    dispatch({ type: "start", caller: { number: dialled, line: LINES.sales }, inbound: false, at: at() });
  };

  const consultCall = state.consult
    ? state.calls.find((c) => c.id === state.consult?.callId) ?? null
    : null;
  const wrapUp = state.wrapUps[0] ?? null;

  let screen: React.ReactNode;
  if (state.calls.length === 0 && state.offer) {
    screen = (
      <IncomingScreen
        number={state.offer.number}
        name={state.offer.name}
        location={state.offer.location}
        crm={state.offer.crm}
        onAccept={() =>
          state.offer &&
          dispatch({ type: "start", caller: state.offer, inbound: true, at: at() })
        }
        onDecline={() => dispatch({ type: "decline-offer" })}
      />
    );
  } else if (state.conference) {
    screen = (
      <ConferenceScreen
        calls={state.calls}
        now={now}
        onRemove={(id) => dispatch({ type: "remove-participant", id, at: at() })}
        onLeave={() => dispatch({ type: "leave-conference", at: at() })}
      />
    );
  } else if (state.consult && consultCall) {
    screen = (
      <ConsultScreen
        target={state.consult.target}
        startedAt={state.consult.startedAt}
        transferring={consultCall}
        otherHeld={state.calls.find((c) => c.id !== consultCall.id) ?? null}
        now={now}
        onComplete={() => dispatch({ type: "complete-consult", at: at() })}
        onCancel={() => dispatch({ type: "cancel-consult", at: at() })}
      />
    );
  } else if (focused) {
    screen = (
      <LiveScreen
        call={focused}
        held={others}
        now={now}
        onHoldToggle={() => dispatch({ type: "toggle-hold", at: at() })}
        onMute={() => dispatch({ type: "toggle-mute" })}
        onRecord={() => dispatch({ type: "toggle-record" })}
        onSwap={(id) => dispatch({ type: "resume", id, at: at() })}
        onMerge={() => dispatch({ type: "merge", at: at() })}
        onHangUp={() => dispatch({ type: "hang-up", at: at() })}
        onTransfer={(target) => dispatch({ type: "transfer", target, at: at() })}
        onConsult={(target) => dispatch({ type: "consult", target, at: at() })}
      />
    );
  } else if (wrapUp) {
    // A call just ended. Its wrap-up comes first; a caller still on hold sits
    // on top of it with Resume, one click away.
    screen = (
      <WrapUpScreen
        key={wrapUp.id}
        wrapUp={wrapUp}
        held={held}
        now={now}
        queued={state.wrapUps.length - 1}
        onDraft={(draft) => dispatch({ type: "draft", id: wrapUp.id, draft })}
        onDone={() => {
          if (state.calls.length === 0 && state.wrapUps.length === 1) setNumber("");
          dispatch({ type: "done", id: wrapUp.id });
        }}
        onResumeHeld={() => held && dispatch({ type: "resume", id: held.id, at: at() })}
      />
    );
  } else if (held) {
    screen = (
      <HeldScreen
        call={held}
        now={now}
        onResume={() => dispatch({ type: "resume", id: held.id, at: at() })}
        onEnd={() => {
          dispatch({ type: "resume", id: held.id, at: at() });
          dispatch({ type: "hang-up", at: at() });
        }}
      />
    );
  } else {
    screen = (
      <IdleScreen
        number={number}
        onNumberChange={setNumber}
        onDigit={(digit) => setNumber((value) => value + digit)}
        onCall={startCall}
      />
    );
  }

  return (
    // Production's card: 365 wide, the body a fixed 559 over a 52px tab bar.
    <div
      className={cn(
        "relative flex w-[365px] flex-col overflow-clip rounded-[20px] bg-webphone-card font-webphone shadow-webphone",
        className
      )}
    >
      <div className="relative h-[559px] w-full">
        {screen}
        {/* The second call is a notification over whatever the rep is doing,
            never a takeover: the call they are on keeps its whole screen. */}
        {queueStyle && queued.length > 0 ? (
          <>
            <QueueChip
              // Keyed on the count so a new arrival plays the drop-in again.
              key={queued.length}
              count={queued.length}
              open={queueOpen}
              onToggle={() => setQueueOpen((value) => !value)}
            />
            {queueOpen ? (
              <QueuePanel
                callers={queued}
                now={now}
                linesFull={linesFull}
                onConnect={offerQueued}
                onClose={() => setQueueOpen(false)}
              />
            ) : null}
          </>
        ) : null}
        {offered ? (
          // Over the live call, like production's own incoming screen: the
          // call underneath keeps running until the rep accepts.
          <div className="absolute inset-0 z-30">
            <IncomingScreen
              number={offered.number}
              name={offered.name}
              lineNumber={offered.line.number}
              title="Connect with"
              location={offered.location}
              crm={offered.crm}
              onAccept={acceptOffered}
              onDecline={declineOffered}
              choices={
                <QueueOfferChoices
                  current={talking}
                  onHoldAndConnect={acceptOffered}
                  onEndAndConnect={endAndAcceptOffered}
                  onBack={backToQueue}
                />
              }
            />
          </div>
        ) : null}
        {state.ringing ? (
          <RingingAlert
            caller={state.ringing}
            current={focused && focused.heldSince === null ? focused : null}
            secondsLeft={Math.max(
              1,
              Math.ceil((state.ringing.arrivedAt + RING_TIMEOUT_MS - now) / 1000)
            )}
            onAnswer={() => dispatch({ type: "answer-ringing", at: at() })}
            onDecline={() => dispatch({ type: "decline-ringing", at: at() })}
          />
        ) : state.missed ? (
          <MissedNotice caller={state.missed} />
        ) : null}
        <StatusTab />
      </div>
      <TabBar />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Chrome shared by every screen                                              */
/* -------------------------------------------------------------------------- */

/** The notch hanging off the top edge: the agent's availability. */
function StatusTab() {
  return (
    // Above the incoming screen (as production draws it), below the queue
    // list's scrim (as Figma 130:417 draws it).
    <div className="absolute top-0 left-1/2 z-[35] flex h-[21px] w-[102px] -translate-x-1/2 items-center justify-center gap-[9px] rounded-b-[13px] bg-webphone-status-bg pr-[5px]">
      <span className="size-2 rounded-full bg-webphone-available shadow-webphone-glow" />
      <span className="text-[10px] leading-[14px] text-white">Available</span>
    </div>
  );
}

/**
 * Production's queue signal, kept as it ships: a green tab off the card's
 * top-left corner, tucked under the availability notch. It is the only thing
 * that changes on the call screen until the rep chooses to look.
 */
function QueueChip({
  count,
  open,
  onToggle,
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      // Figma 130:17, to the pixel: 106 × 22, square but for the one corner
      // that curves away from the notch.
      className="webphone-alert-in absolute top-0 left-0 z-20 flex h-[22px] w-[106px] items-center justify-center rounded-[1px] rounded-br-[13px] bg-webphone-queue text-[10px] leading-[18px] font-bold text-white shadow-webphone-queue outline-none"
    >
      {count} caller{count === 1 ? "" : "s"} in queue
    </button>
  );
}

/** Production's queue clock: minutes and seconds, then "min". */
function formatWait(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)} min`;
}

type QueuedCaller = Caller & { arrivedAt: number };

/**
 * What the chip opens — production's queue list, from Figma 130:417. It lays
 * a navy scrim over the call (blurred, so the rep keeps their place without
 * reading it), then one block per JustCall number: its wait times and the
 * callers waiting on it, each with Connect. The handle folds it away.
 */
function QueuePanel({
  callers,
  now,
  linesFull,
  onConnect,
  onClose,
}: {
  callers: QueuedCaller[];
  now: number;
  /** Both of the rep's lines are busy: nobody can be connected yet. */
  linesFull: boolean;
  onConnect: (caller: QueuedCaller) => void;
  onClose: () => void;
}) {
  // Production groups the queue by the number that was called.
  const groups = new Map<string, QueuedCaller[]>();
  for (const caller of callers) {
    groups.set(caller.line.number, [...(groups.get(caller.line.number) ?? []), caller]);
  }

  return (
    <div
      role="dialog"
      aria-label="Callers in queue"
      className="webphone-alert-in absolute inset-0 z-40 flex flex-col bg-webphone-queue-scrim backdrop-blur-[7px]"
    >
      <div className="flex h-full flex-col overflow-y-auto border-t-[20px] border-webphone-queue-edge pb-[35px] text-white">
        {[...groups].map(([lineNumber, group]) => {
          const waits = group.map((c) => now - c.arrivedAt);
          const stats = [
            { label: "Max. Wait Time:", value: formatWait(Math.max(...waits)) },
            {
              label: "Avg. Wait Time:",
              value: formatWait(waits.reduce((sum, w) => sum + w, 0) / waits.length),
            },
          ];
          return (
            <section key={lineNumber}>
              <p className="bg-webphone-queue-header p-[5px] text-[12px] leading-[17px] font-medium tracking-[0.4px]">
                JustCall Number: 1{lineNumber.replace(/\D/g, "")}
              </p>

              <div className="flex h-[65px] items-center bg-webphone-queue-stats pb-[5px]">
                {stats.map((stat, index) => (
                  <React.Fragment key={stat.label}>
                    {index > 0 ? <span className="h-[60px] w-px bg-webphone-queue-muted" /> : null}
                    <span className="flex flex-1 flex-col items-center px-[10px]">
                      <span className="text-[11px] leading-[16px] text-webphone-queue-muted">
                        {stat.label}
                      </span>
                      <span className="pt-[6px] text-[18.2px] leading-[26px] tabular-nums">
                        {stat.value}
                      </span>
                    </span>
                  </React.Fragment>
                ))}
              </div>

              <p className="bg-webphone-queue-section px-[15px] py-[5px] text-[13px] leading-[19px] text-webphone-queue-section-fg">
                Callers in Queue
              </p>
              {linesFull ? (
                // Not in the Figma: the one thing production never had to say,
                // because production never let a rep hold two calls.
                <p className="px-[15px] pt-[7px] text-[11px] leading-[16px] text-webphone-queue-section-fg">
                  You're on {QUEUE_CALL_LIMIT} calls. End or transfer one to connect.
                </p>
              ) : null}

              <div className="flex flex-col gap-[7px] px-[7px] pt-[7px]">
                {group.map((caller) => (
                  <QueueRow
                    key={caller.number}
                    caller={caller}
                    wait={formatWait(now - caller.arrivedAt)}
                    disabled={linesFull}
                    onConnect={() => onConnect(caller)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Close queue"
        onClick={onClose}
        className="absolute bottom-0 left-1/2 flex h-[20px] w-[100px] -translate-x-1/2 items-start justify-center overflow-visible rounded-t-[22px] bg-webphone-queue-handle shadow-webphone-button outline-none"
      >
        <WebphoneCollapse className="-mt-[6px] size-[29px] text-white" />
      </button>
    </div>
  );
}

function QueueRow({
  caller,
  wait,
  disabled,
  onConnect,
}: {
  caller: QueuedCaller;
  wait: string;
  disabled: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[6px] bg-webphone-queue-card px-[15px] py-[10px]">
      <span className="flex items-center gap-[15px]">
        <span className="-m-[5px] flex size-[35px] shrink-0 items-center justify-center rounded-full bg-white text-webphone-queue-avatar-fg">
          <WebphonePerson className="size-[18px]" />
        </span>
        <span className="flex flex-col">
          <span className="pb-[2px] text-[13px] leading-[19px] font-medium tracking-[0.4px]">
            {callerLabel(caller)}
          </span>
          <span className="text-[11px] leading-[16px]">{caller.number}</span>
        </span>
      </span>
      <span className="flex flex-col items-end">
        <button
          type="button"
          onClick={onConnect}
          disabled={disabled}
          className="mb-[4px] rounded-[5px] border border-webphone-queue-connect-border bg-webphone-queue px-[6px] text-[11px] leading-[18px] font-bold shadow-webphone-button outline-none active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
        >
          Connect
        </button>
        <span className="pt-[3px] text-[10px] leading-[14px] tabular-nums">Wait Time: {wait}</span>
      </span>
    </div>
  );
}

/**
 * Picking a caller from the queue mid-call asks one question — what happens
 * to the call you're on? Each button pairs the two halves of its answer: the
 * main glyph says connect (or end), the badge says what becomes of the other
 * call. Red left, green right, the way round production's own incoming call
 * puts end and answer. Smaller than production's ringing buttons: this is a
 * choice the rep is making, not a call demanding an answer.
 */
function QueueOfferChoices({
  current,
  onHoldAndConnect,
  onEndAndConnect,
  onBack,
}: {
  current: Call | null;
  onHoldAndConnect: () => void;
  onEndAndConnect: () => void;
  onBack: () => void;
}) {
  return (
    // Where production's Accept / Decline sit, so the eye finds them there.
    <div className="mt-auto flex w-full flex-col items-center pb-[15px]">
      <div className="flex gap-[16px]">
        {current ? (
          <>
            <OfferButton
              tone="decline"
              icon={<WebphoneCallEnd className="size-[26px]" />}
              badge={<WebphoneCall className="size-[13px] text-webphone-accept" />}
              label="End & connect"
              hint="Ends the current call"
              onClick={onEndAndConnect}
            />
            <OfferButton
              tone="accept"
              icon={<WebphoneCall className="size-[24px]" />}
              badge={<WebphonePause className="size-[13px] text-webphone-incoming" />}
              label="Hold & connect"
              hint="Puts the current call on hold"
              onClick={onHoldAndConnect}
            />
          </>
        ) : (
          <OfferButton
            tone="accept"
            icon={<WebphoneCall className="size-[22px]" />}
            label="Connect"
            hint={null}
            onClick={onHoldAndConnect}
          />
        )}
      </div>
      <button
        type="button"
        onClick={onBack}
        className="mt-[14px] text-[13px] leading-[21px] text-webphone-incoming-muted underline outline-none hover:text-white"
      >
        Back to queue
      </button>
    </div>
  );
}

function OfferButton({
  tone,
  icon,
  badge,
  label,
  hint,
  onClick,
}: {
  tone: "accept" | "decline";
  icon: React.ReactNode;
  /** What becomes of the current call, pinned to the circle's corner. */
  badge?: React.ReactNode;
  label: string;
  hint: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[150px] flex-col items-center outline-none"
    >
      <span
        className={cn(
          "relative flex size-[48px] items-center justify-center rounded-full text-white transition-transform group-active:scale-[0.97]",
          tone === "accept" ? "bg-webphone-accept" : "bg-webphone-decline"
        )}
      >
        {icon}
        {badge ? (
          <span className="absolute -right-[3px] -bottom-[3px] flex size-[22px] items-center justify-center rounded-full bg-white shadow-webphone-button">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="mt-[8px] text-[13px] leading-[18px] font-medium text-white">{label}</span>
      {hint ? (
        <span className="whitespace-nowrap text-[11px] leading-[15px] text-webphone-incoming-muted">
          {hint}
        </span>
      ) : null}
    </button>
  );
}

const TABS = [
  { label: "Phone", icon: <WebphoneCall className="size-5" /> },
  { label: "Logs", icon: <WebphoneSwap className="size-5" /> },
  { label: "Contacts", icon: <WebphoneBook className="size-[18px]" /> },
  { label: "Message", icon: <WebphoneForum className="size-5" /> },
  { label: "Settings", icon: <WebphoneConstruct className="size-[18px]" /> },
];

/**
 * Only Phone is live in the prototype; the rest are there so the phone reads
 * as the real one, and stay inert rather than pretending to navigate.
 */
function TabBar() {
  return (
    <nav className="flex w-full bg-webphone-tabbar text-white" aria-label="Webphone">
      {TABS.map((tab, index) => (
        <span
          key={tab.label}
          aria-current={index === 0 ? "page" : undefined}
          className={cn(
            "flex h-[52px] flex-1 flex-col items-center justify-center gap-[2px]",
            index === 0 && "bg-webphone-tab-active"
          )}
        >
          {tab.icon}
          <span className="text-[10px] leading-[14px]">{tab.label}</span>
        </span>
      ))}
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Idle — the keypad                                                          */
/* -------------------------------------------------------------------------- */

function IdleScreen({
  number,
  onNumberChange,
  onDigit,
  onCall,
}: {
  number: string;
  onNumberChange: (value: string) => void;
  onDigit: (digit: string) => void;
  onCall: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center pt-10">
      <div className="relative h-[65px] w-[325px] rounded-[10px] border border-webphone-input-border bg-webphone-input-bg">
        {/* Production's help badge, hanging just outside the field. */}
        <WebphoneHelp className="absolute top-[24px] -left-[19px] size-[15px] text-webphone-icon" />
        {/* Country picker: production's flag and caret, not yet a menu. */}
        <span className="pointer-events-none absolute top-[27px] left-[9px] flex items-center gap-[6px]">
          <img src={flagSmall} alt="" className="h-[11px] w-5" />
          <WebphoneCaret className="-ml-[3px] size-4 text-foreground" />
        </span>
        <input
          type="tel"
          aria-label="Phone number"
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCall();
          }}
          className="size-full bg-transparent pr-12 pl-[52px] text-[20px] font-normal text-foreground outline-none"
        />
        <button
          type="button"
          aria-label="Delete last digit"
          onClick={() => onNumberChange(number.slice(0, -1))}
          className="absolute top-[18px] right-[14px] flex text-webphone-backspace outline-none"
        >
          <WebphoneBackspace className="h-[16px] w-[19px]" />
        </button>
      </div>

      <div className="mt-[10px] grid w-[325px] grid-cols-3 gap-y-[9px]">
        {KEYS.map((key) => (
          <button
            key={key.digit}
            type="button"
            onClick={() => onDigit(key.digit)}
            className="mx-auto flex size-[67px] flex-col items-center rounded-full pt-2 text-center outline-none transition-colors hover:bg-webphone-secondary-action focus-visible:bg-webphone-secondary-action"
          >
            <span
              className={cn(
                "text-webphone-digit",
                key.digit === "*"
                  ? "text-[48px] leading-[69px]"
                  : key.digit === "#"
                    ? "pt-[5px] text-[24px] leading-[34px]"
                    : "text-[18px] leading-[26px]"
              )}
            >
              {key.digit}
            </span>
            {key.letters ? (
              <span className="text-[9px] leading-[21px] text-webphone-letters">
                {key.letters}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="relative mt-[9px] flex h-[57px] w-full justify-center">
        <button
          type="button"
          aria-label="Call"
          onClick={onCall}
          className="-ml-[15px] flex size-[57px] items-center justify-center rounded-full bg-webphone-call shadow-webphone-button outline-none active:scale-[0.97]"
        >
          <WebphoneCall className="size-[26px] text-white" />
        </button>
        <span
          aria-hidden="true"
          className="absolute top-[5px] left-[218px] flex size-[50px] items-center justify-center rounded-full bg-webphone-secondary-action"
        >
          <img src={messageBubbles} alt="" width={27} height={27} />
        </span>
      </div>

      <div className="mt-[26px] flex w-[325px] items-center">
        <WebphoneHelp className="ml-[9px] size-4 shrink-0 text-webphone-icon" />
        <span className="w-[56px] pr-[5px] text-right text-[13px] leading-[19px] tracking-[0.4px] text-webphone-label">
          Call via
        </span>
        <span className="flex w-[229px] items-center rounded-[5px] border border-webphone-select-border pl-[5px]">
          <img src={flagLarge} alt="" className="size-8" />
          <span className="flex h-[25px] flex-1 items-center justify-between pr-[5px] pl-1 text-[12px] text-webphone-link">
            {OWN_LINE}
            <img src={chevronBlue} alt="" width={10} height={6} />
          </span>
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Incoming                                                                   */
/* -------------------------------------------------------------------------- */

function IncomingScreen({
  number,
  name,
  lineNumber = OWN_LINE,
  title = "Incoming Call",
  location,
  crm,
  onAccept,
  onDecline,
  choices,
}: {
  number: string;
  /** A known contact: production puts the name where the number would be. */
  name?: string;
  /** The JustCall number they rang — a queued caller may be on another line. */
  lineNumber?: string;
  /**
   * "Connect with" when the rep picked this caller from the queue: nothing is
   * ringing them, so the screen shouldn't say it is.
   */
  title?: string;
  location?: string;
  crm?: Caller["crm"];
  onAccept: () => void;
  onDecline: () => void;
  /**
   * Replaces Accept / Decline / Hang Up when picking a caller from the queue
   * mid-call: the choice there is what happens to the call already running.
   */
  choices?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center bg-webphone-incoming">
      {/* Production's two translucent rings around the caller. */}
      <span className="mt-10 size-20 overflow-clip rounded-full border-[5px] border-white shadow-webphone-halo">
        <img src={callerAvatar} alt="" className="size-full object-cover" />
      </span>
      <p className="mt-5 text-[15.5px] leading-[22px] text-webphone-incoming-muted">{title}</p>
      <p className="pt-[10px] text-[19px] leading-[27px] font-medium text-webphone-caller">
        {name ?? number}
      </p>
      <p className="text-[16px] leading-[23px] font-medium text-webphone-caller">{number}</p>
      {location ? (
        <p className="text-[15px] leading-[21px] text-webphone-incoming-muted">{location}</p>
      ) : null}
      {crm ? (
        <div className="mt-[20px]">
          <CrmPill crm={crm} />
        </div>
      ) : null}

      {choices ?? (
      <div className="mt-auto flex w-full flex-col items-center pb-[15px]">
        <div className="flex gap-[58px]">
          <TooltipTrigger content={<Tooltip theme="dark" title="Accept Call" />}>
            <button
              type="button"
              aria-label="Accept call"
              onClick={onAccept}
              className="flex size-[58px] items-center justify-center rounded-full bg-webphone-accept outline-none active:scale-[0.97]"
            >
              <WebphoneCall className="size-[30px] text-white" />
            </button>
          </TooltipTrigger>
          <button
            type="button"
            aria-label="Decline call"
            onClick={onDecline}
            className="flex size-[58px] items-center justify-center rounded-full bg-webphone-decline text-white outline-none active:scale-[0.97]"
          >
            <WebphoneClose className="size-[30px]" />
          </button>
        </div>
        <button
          type="button"
          onClick={onDecline}
          className="mt-[11px] text-[13px] leading-[21px] text-webphone-incoming-muted underline outline-none"
        >
          Hang Up
        </button>
      </div>
      )}

      <p className="mb-[15px] w-full rounded-b-[7px] bg-webphone-line-strip pt-[6px] pb-[7px] text-center text-[15px] leading-[21px] text-white">
        Line: <span className="font-bold">{lineNumber}</span>
      </p>
    </div>
  );
}
