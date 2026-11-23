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
  WebphoneConstruct,
  WebphoneDialpad,
  WebphoneExpand,
  WebphoneForum,
  WebphoneHelp,
  WebphoneMic,
  WebphoneNotes,
  WebphonePause,
  WebphonePersonAdd,
  WebphonePersonAddOutline,
  WebphoneStar,
  WebphoneSwap,
  WebphoneVoicemail,
} from "./icons/WebphoneIcons";
import flagSmall from "./assets/legacy-dialer/flag-us-small.png";
import flagLarge from "./assets/legacy-dialer/flag-us-32.png";
import chevronBlue from "./assets/legacy-dialer/chevron-down.svg";
import messageBubbles from "./assets/legacy-dialer/message.svg";
import callerAvatar from "./assets/legacy-dialer/caller-avatar.png";

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
const OWN_LINE = "(712) 625-7333";
/** Who rings when the demo plays an inbound call. */
const INBOUND_CALLER = "+441341610153";
/** Long enough to see the keypad first, so the call lands on top of it. */
const INBOUND_ARRIVES_MS = 1500;

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

type Phase =
  | { kind: "idle" }
  | { kind: "incoming"; number: string }
  | { kind: "live"; number: string; inbound: boolean; startedAt: number }
  | { kind: "wrapup"; number: string; endedAt: number };

export interface ProductionDialerProps {
  /** Play an inbound call shortly after the phone opens. */
  ringOnOpen?: boolean;
  className?: string;
}

export function ProductionDialer({ ringOnOpen = false, className }: ProductionDialerProps) {
  const [number, setNumber] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>({ kind: "idle" });

  React.useEffect(() => {
    if (!ringOnOpen) return;
    const timer = window.setTimeout(
      () => setPhase({ kind: "incoming", number: INBOUND_CALLER }),
      INBOUND_ARRIVES_MS
    );
    return () => window.clearTimeout(timer);
  }, [ringOnOpen]);

  const startCall = () => {
    const dialled = number.trim();
    if (!dialled) return;
    setPhase({ kind: "live", number: dialled, inbound: false, startedAt: Date.now() });
  };

  return (
    // Production's card: 365 wide, the body a fixed 559 over a 52px tab bar.
    <div
      className={cn(
        "relative flex w-[365px] flex-col overflow-clip rounded-[20px] bg-webphone-card font-webphone shadow-webphone",
        className
      )}
    >
      <div className="relative h-[559px] w-full">
        {phase.kind === "idle" ? (
          <IdleScreen
            number={number}
            onNumberChange={setNumber}
            onDigit={(digit) => setNumber((value) => value + digit)}
            onCall={startCall}
          />
        ) : phase.kind === "incoming" ? (
          <IncomingScreen
            number={phase.number}
            onAccept={() =>
              setPhase({
                kind: "live",
                number: phase.number,
                inbound: true,
                startedAt: Date.now(),
              })
            }
            onDecline={() => setPhase({ kind: "idle" })}
          />
        ) : phase.kind === "live" ? (
          <LiveScreen
            key={phase.startedAt}
            number={phase.number}
            startedAt={phase.startedAt}
            onHangup={() =>
              setPhase({ kind: "wrapup", number: phase.number, endedAt: Date.now() })
            }
          />
        ) : (
          // Saving and dismissing both land on a clean keypad: the call is
          // logged either way, and the next act is dialling again.
          <WrapUpScreen
            key={phase.endedAt}
            number={phase.number}
            onDone={() => {
              setNumber("");
              setPhase({ kind: "idle" });
            }}
          />
        )}
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
    <div className="absolute top-0 left-1/2 flex h-[21px] w-[102px] -translate-x-1/2 items-center justify-center gap-[9px] rounded-b-[13px] bg-webphone-status-bg pr-[5px]">
      <span className="size-2 rounded-full bg-webphone-available shadow-webphone-glow" />
      <span className="text-[10px] leading-[14px] text-white">Available</span>
    </div>
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
          className="size-full bg-transparent pr-12 pl-[52px] text-[20px] font-light text-foreground outline-none"
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
  onAccept,
  onDecline,
}: {
  number: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center bg-webphone-incoming">
      {/* Production's two translucent rings around the caller. */}
      <span className="mt-10 size-20 overflow-clip rounded-full border-[5px] border-white shadow-webphone-halo">
        <img src={callerAvatar} alt="" className="size-full object-cover" />
      </span>
      <p className="mt-5 text-[15.5px] leading-[22px] text-webphone-incoming-muted">
        Incoming Call
      </p>
      <p className="pt-[10px] text-[19px] leading-[27px] font-medium text-webphone-caller">
        {number}
      </p>
      <p className="text-[16px] leading-[23px] font-medium text-webphone-caller">{number}</p>

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

      <p className="mb-[15px] w-full rounded-b-[7px] bg-webphone-line-strip pt-[6px] pb-[7px] text-center text-[15px] leading-[21px] text-white">
        Line: <span className="font-bold">{OWN_LINE}</span>
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Live                                                                       */
/* -------------------------------------------------------------------------- */

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

function LiveScreen({
  number,
  startedAt,
  onHangup,
}: {
  number: string;
  startedAt: number;
  onHangup: () => void;
}) {
  const [now, setNow] = React.useState(() => Date.now());
  const [muted, setMuted] = React.useState(false);
  const [onHold, setOnHold] = React.useState(false);
  const [recording, setRecording] = React.useState(true);

  React.useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  return (
    <div className="relative flex h-full flex-col items-center bg-webphone-live pt-[31px] text-white">
      <button
        type="button"
        aria-pressed={recording}
        onClick={() => setRecording((value) => !value)}
        className="absolute top-[25px] left-[10px] flex h-[22px] items-center gap-[3px] rounded-full bg-white px-[9px] shadow-webphone-button outline-none"
      >
        <span className="text-[11px] leading-[10px] font-semibold text-webphone-hangup">
          {recording ? "Record" : "Paused"}
        </span>
        <span
          className={cn(
            "size-[7px] rounded-full",
            recording ? "bg-webphone-record-dot" : "bg-webphone-control-border"
          )}
        />
      </button>

      <SignalReadout />

      <span className="mt-[53px] flex size-[82px] items-center justify-center rounded-full border-2 border-white">
        <WebphonePersonAddOutline className="mt-[6px] size-[60px]" />
      </span>
      <p className="mt-[10px] text-[18px] leading-[26px] font-thin">{number}</p>
      <p className="text-[15px] leading-[21px] font-thin">Calling via - {OWN_LINE}</p>
      <p className="mt-[10px] flex h-[30px] w-full items-center justify-center bg-webphone-live-strip text-[13px] leading-[19px]">
        {onHold ? "On hold :" : "Talking :"}
      </p>
      <p className="text-[18px] leading-[26px] font-thin tabular-nums">
        {formatClock(now - startedAt)}
      </p>

      <div className="mt-[40px] grid grid-cols-2 gap-x-[22px] gap-y-[22px]">
        <CallControl icon={<WebphoneMic className="size-5" />} label={muted ? "Unmute" : "Mute"} active={muted} onClick={() => setMuted((v) => !v)} />
        <CallControl icon={<WebphonePause className="size-5" />} label={onHold ? "Resume" : "Hold"} active={onHold} onClick={() => setOnHold((v) => !v)} />
        <CallControl icon={<WebphoneDialpad className="size-[18px]" />} label="Keypad" />
        <CallControl icon={<WebphonePersonAdd className="size-5" />} label="Transfer" />
      </div>

      <div className="relative mt-[15px] flex w-full justify-center">
        <button
          type="button"
          aria-label="Hang up"
          onClick={onHangup}
          className="flex h-[45px] w-[110px] items-center justify-center rounded-full bg-white shadow-webphone-button outline-none active:scale-[0.97]"
        >
          <WebphoneCallEnd className="size-[34px] text-webphone-hangup" />
        </button>
        <span
          aria-hidden="true"
          className="absolute top-1 left-[257px] flex size-10 items-center justify-center rounded-full bg-white text-webphone-hangup shadow-webphone-button"
        >
          <WebphoneVoicemail className="size-[22px]" />
        </span>
      </div>
    </div>
  );
}

/** Production's call controls: a ring with the icon and its label inside. */
function CallControl({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        "flex size-[65px] flex-col items-center gap-px rounded-full border pt-[15px] outline-none transition-colors",
        active
          ? "border-white bg-white/15"
          : "border-webphone-control-border hover:border-white"
      )}
    >
      <span className="flex h-5 items-center">{icon}</span>
      <span className="text-[10px] leading-[14px]">{label}</span>
    </button>
  );
}

/** Top-right: the collapse caret, four signal bars, and the call-notes sheet. */
function SignalReadout() {
  return (
    <span aria-hidden="true" className="absolute top-[25px] right-[10px] flex items-end gap-[6px]">
      <WebphoneExpand className="mb-[1px] size-5 text-white" />
      <span className="flex items-end gap-[3px] pb-[2px]">
        {["h-[6px]", "h-[9px]", "h-[12px]", "h-[15px]"].map((height) => (
          <span key={height} className={cn("w-1 rounded-full bg-webphone-signal", height)} />
        ))}
      </span>
      <WebphoneNotes className="size-[26px] text-webphone-quality" />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Wrap-up — after the call ends                                              */
/* -------------------------------------------------------------------------- */

/** Production's outcome list is per-account; these stand in for a typical one. */
const CALL_OUTCOMES = [
  "Interested",
  "Not interested",
  "Call back later",
  "Left voicemail",
  "Wrong number",
];
const NOTE_LIMIT = 1500;

function WrapUpScreen({ number, onDone }: { number: string; onDone: () => void }) {
  const [rating, setRating] = React.useState(0);
  const [hovered, setHovered] = React.useState(0);
  const [outcome, setOutcome] = React.useState("");
  const [note, setNote] = React.useState("");
  const shown = hovered || rating;

  return (
    <div className="flex h-full flex-col bg-webphone-live text-white">
      <div className="flex h-[35px] shrink-0 items-end justify-end bg-webphone-wrapup-header px-[10px] pb-[3px]">
        <button
          type="button"
          onClick={onDone}
          className="text-[12px] leading-[16px] tracking-[0.4px] text-webphone-incoming-muted underline outline-none hover:text-white"
        >
          Dismiss
        </button>
      </div>

      {/* The call that just ended: production's red ring, not a live control. */}
      <div className="flex h-[74px] shrink-0 items-center gap-[14px] bg-webphone-wrapup-summary pl-[31px]">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full border-2 border-webphone-ended text-webphone-ended">
          <WebphoneCallEnd className="size-[30px]" />
        </span>
        <span className="flex flex-col">
          <span className="text-[15px] leading-[20px] font-thin">{number}</span>
          <span className="text-[13px] leading-[19px] font-thin">Calling via - {OWN_LINE}</span>
        </span>
      </div>

      <div className="flex h-[42px] shrink-0 items-center justify-between border-b-2 border-webphone-wrapup-rule px-[15px]">
        <span className="text-[15px] leading-[20px] font-thin">Rate this call</span>
        <span className="flex" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              aria-pressed={rating === star}
              onMouseEnter={() => setHovered(star)}
              onClick={() => setRating(star)}
              className={cn(
                "outline-none transition-colors",
                star <= shown ? "text-webphone-quality" : "text-webphone-star"
              )}
            >
              <WebphoneStar className="size-[19px]" />
            </button>
          ))}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center pt-[15px]">
        <p className="text-[15px] leading-[20px] font-thin">Add a note</p>

        <label className="relative mt-[12px] w-[250px]">
          <span className="sr-only">Call outcome</span>
          <select
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
            className="h-[28px] w-full appearance-none rounded-[3px] bg-white pr-6 pl-[10px] text-[12px] text-foreground outline-none"
          >
            <option value="" disabled>
              Select call outcome
            </option>
            {CALL_OUTCOMES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <WebphoneCaret className="pointer-events-none absolute top-[6px] right-[4px] size-4 text-webphone-star" />
        </label>

        <label className="mt-[6px] w-[250px]">
          <span className="sr-only">Notes</span>
          <textarea
            value={note}
            maxLength={NOTE_LIMIT}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Notes"
            className="block h-[102px] w-full resize-none bg-webphone-wrapup-field px-[4px] py-[6px] text-[12px] leading-[17px] text-white outline-none placeholder:text-webphone-placeholder"
          />
        </label>
        <span className="mt-[3px] w-[250px] text-right text-[10px] leading-[14px] font-medium text-webphone-caller">
          {note.length}/{NOTE_LIMIT}
        </span>

        <button
          type="button"
          onClick={onDone}
          className="mt-[26px] h-[39px] w-[180px] rounded-full bg-webphone-save text-[15px] text-white outline-none active:scale-[0.98]"
        >
          Save
        </button>
        {/* Both stay inert: the prototype has no SMS composer or scheduler. */}
        <span className="mt-[9px] text-[14px] leading-[22px] font-medium">Send a text message</span>
        <span className="mt-auto mb-[17px] text-[14px] leading-[20px] font-medium underline">
          Schedule follow up call
        </span>
      </div>
    </div>
  );
}
