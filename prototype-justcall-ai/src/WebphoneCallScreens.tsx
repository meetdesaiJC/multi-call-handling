import * as React from "react";
import { cn } from "@/lib/utils";
import {
  WebphoneCall,
  WebphoneCallEnd,
  WebphoneClose,
  WebphoneDialpad,
  WebphoneExpand,
  WebphoneMic,
  WebphoneNotes,
  WebphonePause,
  WebphonePersonAdd,
  WebphonePersonAddOutline,
  WebphoneSwap,
  WebphoneVoicemail,
} from "./icons/WebphoneIcons";
import { IntegrationLogo } from "./icons/IntegrationLogos";
import {
  LINES,
  callerLabel,
  formatClock,
  heldFor,
  type Call,
  type Caller,
  type TransferTarget,
} from "./webphoneCalls";

/**
 * The production webphone's call screens, now that a rep can be on more than
 * one call. Each keeps production's live-call language — navy surface, ringed
 * controls, the white hang-up pill — and adds only what multi-call needs: a
 * held call, Swap and Merge, a conference, a transfer that hands one caller
 * on while the other waits.
 */

/* -------------------------------------------------------------------------- */
/* Pieces every call screen shares                                            */
/* -------------------------------------------------------------------------- */

function lineText(call: Caller & { inbound: boolean }) {
  return call.inbound
    ? `Line - ${call.line.label} ${call.line.number}`
    : `Calling via - ${call.line.number}`;
}

function RecordPill({ recording, onToggle }: { recording: boolean; onToggle?: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={recording}
      onClick={onToggle}
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
        active ? "border-white bg-white/15" : "border-webphone-control-border hover:border-white"
      )}
    >
      <span className="flex h-5 items-center">{icon}</span>
      <span className="text-[10px] leading-[14px]">{label}</span>
    </button>
  );
}

function HangUpPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-[45px] w-[110px] items-center justify-center rounded-full bg-white shadow-webphone-button outline-none active:scale-[0.97]"
    >
      <WebphoneCallEnd className="size-[34px] text-webphone-hangup" />
    </button>
  );
}

/**
 * The other caller, waiting. Pinned under the top row of every screen that has
 * one, so the rep never loses sight of who is listening to hold music — the
 * PRD's "remaining held call stays on screen".
 */
export function HeldRow({
  call,
  now,
  action,
  onAction,
  note,
}: {
  call: Call;
  now: number;
  action: string;
  onAction?: () => void;
  note?: string;
}) {
  return (
    <div className="flex h-[44px] w-full shrink-0 items-center gap-[10px] bg-webphone-live-strip px-[15px] text-white">
      <span className="flex size-[28px] shrink-0 items-center justify-center rounded-full border border-webphone-control-border">
        <WebphonePause className="size-[14px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] leading-[17px]">{callerLabel(call)}</span>
        <span className="text-[11px] leading-[15px] text-webphone-incoming-muted tabular-nums">
          {note ?? "On hold"} · {formatClock(heldFor(call, now))}
        </span>
      </span>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="flex h-[26px] shrink-0 items-center gap-[5px] rounded-full border border-white px-[11px] text-[12px] outline-none transition-colors hover:bg-white/15"
        >
          {action === "Swap" ? <WebphoneSwap className="size-[14px]" /> : <WebphoneCall className="size-[13px]" />}
          {action}
        </button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Live — one call has the rep's ear, perhaps another on hold                  */
/* -------------------------------------------------------------------------- */

export function LiveScreen({
  call,
  held,
  now,
  onHoldToggle,
  onMute,
  onRecord,
  onSwap,
  onHangUp,
  onTransfer,
  onConsult,
}: {
  call: Call;
  /** Everyone else on the rep's list, on hold — up to two in the queue approach. */
  held: Call[];
  now: number;
  onHoldToggle: () => void;
  onMute: () => void;
  onRecord: () => void;
  /** Talk to this held caller instead; the current one goes on hold. */
  onSwap: (id: string) => void;
  onHangUp: () => void;
  onTransfer: (target: TransferTarget) => void;
  onConsult: (target: TransferTarget) => void;
}) {
  const [transferring, setTransferring] = React.useState(false);
  const onHold = call.heldSince !== null;
  // Each held call costs the screen a row, so the caller block tightens to
  // keep every control above the fold rather than scrolling a phone: one row
  // shrinks the avatar, two shrink it again.
  const compact = held.length > 0;
  const tight = held.length > 1;

  return (
    <div className="relative flex h-full flex-col items-center bg-webphone-live pt-[31px] text-white">
      <RecordPill recording={call.recording} onToggle={onRecord} />
      <SignalReadout />
      {compact ? (
        // One row per held caller, each with its own Swap, so the rep picks who
        // to go back to. Swap is the row's only action: merging callers into a
        // conference is out of scope for this release.
        // z-10: the caller block below keeps its swap-in `translate`, which
        // makes it a stacking context painted after this bar — without the
        // lift it sits over Swap and swallows its clicks.
        <div className="absolute inset-x-0 top-[58px] z-10 divide-y divide-webphone-live">
          {held.map((h) => (
            <div key={h.id} className="webphone-held-in">
              <HeldRow
              call={h}
              now={now}
              action="Swap"
              onAction={() => onSwap(h.id)}
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* Keyed on the caller, so a Swap replays the entrance: the caller the
          rep switches to drops in from the held bar above, and the one they
          left rises into it — the change reads as an exchange, not a cut. */}
      <div key={call.id} className="webphone-swap-in flex w-full flex-col items-center">
        <span
          className={cn(
            "flex items-center justify-center rounded-full border-2 border-white",
            tight
              ? "mt-[121px] size-[48px]"
              : compact
                ? "mt-[92px] size-[64px]"
                : "mt-[53px] size-[82px]"
          )}
        >
          <WebphonePersonAddOutline
            className={cn(
              "mt-[6px]",
              tight ? "size-[34px]" : compact ? "size-[46px]" : "size-[60px]"
            )}
          />
        </span>
        <p className={cn("text-[18px] leading-[26px] font-normal", compact ? "mt-[8px]" : "mt-[10px]")}>
          {call.name ? `${call.name} · ${call.number}` : call.number}
        </p>
        <p className="text-[15px] leading-[21px] font-normal">{lineText(call)}</p>
        <p
          className={cn(
            "flex h-[30px] w-full items-center justify-center bg-webphone-live-strip text-[13px] leading-[19px]",
            compact ? "mt-[8px]" : "mt-[10px]"
          )}
        >
          {onHold ? "On hold :" : "Talking :"}
        </p>
        <p className="text-[18px] leading-[26px] font-normal tabular-nums">
          {formatClock(now - call.startedAt)}
        </p>
      </div>

      {/* Production's four controls, always two by two: a second call never
          rearranges the buttons the rep's hand already knows. */}
      <div
        className={cn(
          "grid grid-cols-2 justify-items-center gap-x-[22px]",
          compact ? "mt-[14px] gap-y-[14px]" : "mt-[40px] gap-y-[22px]"
        )}
      >
        <CallControl
          icon={<WebphoneMic className="size-5" />}
          label={call.muted ? "Unmute" : "Mute"}
          active={call.muted}
          onClick={onMute}
        />
        <CallControl
          icon={<WebphonePause className="size-5" />}
          label={onHold ? "Resume" : "Hold"}
          active={onHold}
          onClick={onHoldToggle}
        />
        <CallControl icon={<WebphoneDialpad className="size-[18px]" />} label="Keypad" />
        <CallControl
          icon={<WebphonePersonAdd className="size-5" />}
          label="Transfer"
          onClick={() => setTransferring(true)}
        />
      </div>

      <div className={cn("relative flex w-full justify-center", compact ? "mt-[12px]" : "mt-[15px]")}>
        <HangUpPill label="Hang up" onClick={onHangUp} />
        <span
          aria-hidden="true"
          className="absolute top-1 left-[257px] flex size-10 items-center justify-center rounded-full bg-white text-webphone-hangup shadow-webphone-button"
        >
          <WebphoneVoicemail className="size-[22px]" />
        </span>
      </div>

      {transferring ? (
        <TransferSheet
          caller={call}
          otherHeld={held[0] ?? null}
          onClose={() => setTransferring(false)}
          onTransfer={(target) => {
            setTransferring(false);
            onTransfer(target);
          }}
          onConsult={(target) => {
            setTransferring(false);
            onConsult(target);
          }}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Held only — the other call ended; this one waits for one click              */
/* -------------------------------------------------------------------------- */

export function HeldScreen({
  call,
  now,
  onResume,
  onEnd,
}: {
  call: Call;
  now: number;
  onResume: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col items-center bg-webphone-live pt-[31px] text-white">
      <RecordPill recording={call.recording} />
      <SignalReadout />
      <span className="mt-[53px] flex size-[82px] items-center justify-center rounded-full border-2 border-webphone-control-border">
        <WebphonePause className="size-[34px]" />
      </span>
      <p className="mt-[10px] text-[18px] leading-[26px] font-normal">
        {call.name ? `${call.name} · ${call.number}` : call.number}
      </p>
      <p className="text-[15px] leading-[21px] font-normal">{lineText(call)}</p>
      <p className="mt-[10px] flex h-[30px] w-full items-center justify-center bg-webphone-live-strip text-[13px] leading-[19px]">
        On hold :
      </p>
      <p className="text-[18px] leading-[26px] font-normal tabular-nums">
        {formatClock(heldFor(call, now))}
      </p>

      <button
        type="button"
        onClick={onResume}
        className="mt-auto flex h-[45px] w-[180px] items-center justify-center gap-[8px] rounded-full bg-webphone-accept text-[15px] font-medium shadow-webphone-button outline-none active:scale-[0.98]"
      >
        <WebphoneCall className="size-5" />
        Resume call
      </button>
      <button
        type="button"
        onClick={onEnd}
        className="mt-[12px] mb-[22px] text-[13px] leading-[21px] text-webphone-incoming-muted underline outline-none hover:text-white"
      >
        End this call
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Conference — both callers merged into one three-way call                    */
/* -------------------------------------------------------------------------- */

export function ConferenceScreen({
  calls,
  now,
  onRemove,
  onToggleHold,
  onLeave,
}: {
  calls: Call[];
  now: number;
  onRemove: (id: string) => void;
  onToggleHold: (id: string) => void;
  onLeave: () => void;
}) {
  const [muted, setMuted] = React.useState(false);
  const startedAt = Math.min(...calls.map((c) => c.startedAt));
  const line = calls[0]?.line;

  return (
    <div className="relative flex h-full flex-col bg-webphone-live pt-[31px] text-white">
      <RecordPill recording />
      <SignalReadout />

      {/* Production's conference layout: a heading, then one white card per
          person — you first, then each caller with their own hold and
          hang-up. Merge lands softly: the heading settles in, then the cards
          drop in one after another, so the rep sees the separate calls
          become one rather than the screen being swapped out. */}
      <div className="webphone-swap-in mt-[36px] border-b border-webphone-live-strip px-[16px] pb-[12px]">
        <p className="text-[14px] leading-[20px]">Conference call</p>
        <p className="truncate text-[12px] leading-[17px] text-webphone-caller">
          {line ? `Calling via ${line.label} - ` : ""}
          {calls.length + 1} Participants
        </p>
      </div>

      <ul className="mt-[16px] flex flex-col gap-[8px] px-[16px]">
        <li className="webphone-merge-in flex flex-col gap-[2px] rounded-[6px] bg-white px-[11px] py-[10px] text-foreground">
          <span className="text-[13px] leading-[19px] font-semibold">You</span>
          <span className="text-[11px] leading-[16px] text-muted-foreground tabular-nums">
            Call Duration : {formatClock(now - startedAt)}
          </span>
        </li>
        {calls.map((call, index) => {
          const held = call.heldSince !== null;
          const label = callerLabel(call);
          return (
            <li
              key={call.id}
              // One micro-step apart: close enough to read as one move.
              style={{ animationDelay: `calc(var(--duration-micro) * ${index + 1})` }}
              className="webphone-merge-in flex items-center gap-[6px] rounded-[6px] bg-white py-[10px] pr-[10px] pl-[11px] text-foreground"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] leading-[19px] font-semibold">
                  {call.name ? `${call.name} - ${call.number}` : call.number}
                </span>
                <span className="mt-[2px] text-[11px] leading-[16px] text-muted-foreground">
                  Customer
                  {held ? <span className="ml-[4px] font-medium text-brand">On Hold</span> : null}
                </span>
              </span>
              <button
                type="button"
                aria-label={held ? `Resume ${label}` : `Hold ${label}`}
                aria-pressed={held}
                onClick={() => onToggleHold(call.id)}
                className={cn(
                  // Production marks a held participant with a blue ring and
                  // glyph rather than a filled button, so the card stays white.
                  "flex size-[28px] shrink-0 items-center justify-center rounded-full border bg-white outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24",
                  held ? "border-brand text-brand" : "border-line text-foreground"
                )}
              >
                <WebphonePause className="size-[13px]" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${label}`}
                onClick={() => onRemove(call.id)}
                className="flex size-[28px] shrink-0 items-center justify-center rounded-full bg-white text-webphone-hangup shadow-webphone-button outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                <WebphoneCallEnd className="size-[18px]" />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Mute and keypad flank the hang-up, as production lays them out:
          mute a solid white disc (filled while muted is the inverse, so the
          state still reads), keypad a ring like the live screen's controls. */}
      <div className="mt-auto mb-[16px] flex items-center justify-center gap-[16px]">
        <button
          type="button"
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          onClick={() => setMuted((value) => !value)}
          className={cn(
            "flex size-[35px] items-center justify-center rounded-full outline-none transition-colors",
            muted ? "border border-white bg-transparent text-white" : "bg-white text-black shadow-webphone-button"
          )}
        >
          <WebphoneMic className="size-5" />
        </button>
        <HangUpPill label="Leave conference" onClick={onLeave} />
        <button
          type="button"
          aria-label="Keypad"
          className="flex size-[35px] items-center justify-center rounded-full border border-webphone-control-border outline-none transition-colors hover:border-white"
        >
          <WebphoneDialpad className="size-[16px]" />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Warm transfer — the rep talks to the target before handing the caller on    */
/* -------------------------------------------------------------------------- */

export function ConsultScreen({
  target,
  startedAt,
  transferring,
  otherHeld,
  now,
  onComplete,
  onCancel,
}: {
  target: TransferTarget;
  startedAt: number;
  transferring: Call;
  otherHeld: Call | null;
  now: number;
  onComplete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col items-center bg-webphone-live pt-[31px] text-white">
      <SignalReadout />
      {/* Above the caller block's swap-in layer, as on the live screen. */}
      <div className="absolute inset-x-0 top-[58px] z-10">
        <HeldRow call={transferring} now={now} action="" note="Waiting to be transferred" />
        {otherHeld ? <HeldRow call={otherHeld} now={now} action="" /> : null}
      </div>

      <span
        className={cn(
          "flex size-[64px] items-center justify-center rounded-full border-2 border-white text-[22px] font-light",
          otherHeld ? "mt-[136px]" : "mt-[92px]"
        )}
      >
        {initials(target.label)}
      </span>
      <p className="mt-[8px] text-[18px] leading-[26px] font-thin">{target.label}</p>
      <p className="text-[13px] leading-[19px] text-webphone-incoming-muted">
        Only you can hear each other
      </p>
      <p className="mt-[10px] flex h-[30px] w-full items-center justify-center bg-webphone-live-strip text-[13px] leading-[19px]">
        Warm transfer :
      </p>
      <p className="text-[18px] leading-[26px] font-thin tabular-nums">{formatClock(now - startedAt)}</p>

      <button
        type="button"
        onClick={onComplete}
        className="mt-auto h-[39px] w-[200px] rounded-full bg-webphone-save text-[15px] outline-none active:scale-[0.98]"
      >
        Complete transfer
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="mt-[10px] mb-[20px] text-[13px] leading-[21px] text-webphone-incoming-muted underline outline-none hover:text-white"
      >
        Cancel and return to {callerLabel(transferring)}
      </button>
    </div>
  );
}

function initials(label: string) {
  return label
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Transfer sheet — production's existing destinations, cold or warm           */
/* -------------------------------------------------------------------------- */

const AGENTS = [
  { label: "Priya Shah", detail: "Available", available: true },
  { label: "Daniel Okafor", detail: "Available", available: true },
  { label: "Sofia Alvarez", detail: "On a call", available: false },
];
const GROUPS = [
  { label: "Sales team", detail: "4 available", available: true },
  { label: "Support · Tier 2", detail: "2 available", available: true },
  { label: "Billing", detail: "Nobody available", available: false },
];
const OWN_NUMBERS = Object.values(LINES).map((line) => ({
  label: `${line.label} line`,
  detail: line.number,
  available: true,
}));

type Tab = "agent" | "group" | "number";
const TAB_LABELS: Record<Tab, string> = { agent: "Agents", group: "Groups", number: "Numbers" };

function TransferSheet({
  caller,
  otherHeld,
  onClose,
  onTransfer,
  onConsult,
}: {
  caller: Call;
  otherHeld: Call | null;
  onClose: () => void;
  onTransfer: (target: TransferTarget) => void;
  onConsult: (target: TransferTarget) => void;
}) {
  const [tab, setTab] = React.useState<Tab>("agent");
  const [selected, setSelected] = React.useState<TransferTarget | null>(null);
  const [external, setExternal] = React.useState("");

  const rows = tab === "agent" ? AGENTS : tab === "group" ? GROUPS : OWN_NUMBERS;
  const target: TransferTarget | null =
    tab === "number" && external.trim()
      ? { kind: "number", label: external.trim() }
      : selected;

  return (
    <div
      role="dialog"
      aria-label="Transfer call"
      className="webphone-sheet-in absolute inset-x-0 top-[40px] bottom-0 z-20 flex flex-col rounded-t-[14px] bg-webphone-card text-foreground"
    >
      <div className="flex items-start justify-between px-[16px] pt-[14px]">
        <span className="flex flex-col">
          <span className="text-[15px] leading-[20px] font-medium">Transfer {callerLabel(caller)}</span>
          <span className="text-[12px] leading-[16px] text-webphone-label">
            {otherHeld
              ? `${callerLabel(otherHeld)} stays on hold with you`
              : "Choose who takes this call"}
          </span>
        </span>
        <button
          type="button"
          aria-label="Close transfer"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-full text-webphone-label outline-none hover:bg-webphone-secondary-action"
        >
          <WebphoneClose className="size-[18px]" />
        </button>
      </div>

      <div className="mt-[10px] flex gap-[18px] border-b border-webphone-select-border px-[16px]" role="tablist">
        {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setSelected(null);
            }}
            className={cn(
              "-mb-px border-b-2 pb-[7px] text-[13px] outline-none",
              tab === key
                ? "border-webphone-link text-webphone-link"
                : "border-transparent text-webphone-label hover:text-foreground"
            )}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "number" ? (
          <div className="px-[16px] pt-[12px] pb-[4px]">
            <input
              type="tel"
              value={external}
              onChange={(event) => {
                setExternal(event.target.value);
                setSelected(null);
              }}
              placeholder="Enter any phone number"
              aria-label="Phone number to transfer to"
              className="h-[34px] w-full rounded-[5px] border border-webphone-select-border px-[10px] text-[13px] outline-none focus:border-webphone-link"
            />
            <p className="mt-[12px] text-[11px] leading-[15px] font-medium tracking-[0.4px] text-webphone-label uppercase">
              Your JustCall numbers
            </p>
          </div>
        ) : null}
        <ul>
          {rows.map((row) => {
            const isSelected = selected?.label === row.label && !external.trim();
            return (
              <li key={row.label}>
                <button
                  type="button"
                  disabled={!row.available}
                  onClick={() => {
                    setExternal("");
                    setSelected({ kind: tab, label: row.label, detail: row.detail });
                  }}
                  className={cn(
                    "flex h-[48px] w-full items-center gap-[10px] px-[16px] text-left outline-none disabled:opacity-50",
                    isSelected ? "bg-webphone-secondary-action" : "hover:bg-webphone-input-bg"
                  )}
                >
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      row.available ? "bg-webphone-accept" : "bg-webphone-decline"
                    )}
                  />
                  <span className="flex flex-1 flex-col">
                    <span className="text-[14px] leading-[18px]">{row.label}</span>
                    <span className="text-[12px] leading-[16px] text-webphone-label">{row.detail}</span>
                  </span>
                  {isSelected ? <span className="text-[12px] text-webphone-link">Selected</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Production's two transfer styles, unchanged: hand over now, or talk
          to the person first. Both leave the held caller where they are. */}
      <div className="flex gap-[10px] border-t border-webphone-select-border px-[16px] py-[12px]">
        <button
          type="button"
          disabled={!target}
          onClick={() => target && onConsult(target)}
          className="h-[36px] flex-1 rounded-full border border-webphone-link text-[13px] text-webphone-link outline-none disabled:opacity-40"
        >
          Talk first
        </button>
        <button
          type="button"
          disabled={!target}
          onClick={() => target && onTransfer(target)}
          className="h-[36px] flex-1 rounded-full bg-webphone-accept text-[13px] font-medium text-white outline-none disabled:opacity-40"
        >
          Transfer now
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The caller's CRM record                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Production's CRM contact pill: the matched record's logo and name on white,
 * with the record switcher beside it. Inert in the prototype — it is there so
 * the caller reads as the same person on every screen.
 */
export function CrmPill({
  crm,
  size = "md",
}: {
  crm: NonNullable<Caller["crm"]>;
  size?: "sm" | "md";
}) {
  const small = size === "sm";
  return (
    <span className="flex min-w-0 items-center gap-[8px]">
      <span
        className={cn(
          "flex min-w-0 items-center rounded-[6px] bg-white text-black",
          small ? "h-[28px] gap-[6px] px-[8px]" : "h-[40px] w-[187px] gap-[8px] px-[8px]"
        )}
      >
        <IntegrationLogo id={crm.id} size={small ? 14 : 18} />
        <span
          className={cn(
            "truncate font-medium",
            small ? "text-[12px] leading-[16px]" : "text-[15px] leading-[20px]"
          )}
        >
          {crm.contact}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-white text-black",
          small ? "size-[22px]" : "size-[25px]"
        )}
      >
        <WebphoneExpand className={small ? "size-[16px]" : "size-[18px]"} />
      </span>
    </span>
  );
}
