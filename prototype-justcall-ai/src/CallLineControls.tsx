import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  Avatar,
  initialsFromName,
  type AvatarStatus,
} from "@/components/Avatar";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { Tabs } from "@/components/Tabs";
import { WaveformLoader } from "@/components/WaveformLoader";
import {
  IconAlertTriangleFilled,
  IconClose,
  IconSearch,
  IconVoicemailDrop,
} from "@/components/Icon";
import {
  IconCallDrop,
  IconCallHold,
  IconCallKeypad,
  IconCallMerge,
  IconCallTransfer,
  IconCallUsers,
} from "./icons/CallControlIcons";
import { BarControl } from "./CallBarControl";
import {
  CallPopoverRow,
  CallPopoverSection,
} from "./CallPopover";
import {
  TRANSFER_ANSWER_MS,
  TRANSFER_COMPLETE_MS,
  TRANSFER_TARGETS,
  formatCallDuration,
  transferTargetLine,
  type AvailabilityId,
  type TransferTarget,
  type VoicemailGreeting,
} from "./callDeviceData";

/**
 * The three controls that act on the line itself and needed a surface to do it
 * in: the keypad, transfer (and the merge a warm transfer can turn into), and
 * voicemail drop.
 *
 * Each one is split three ways on purpose — a hook holding the state, a body
 * rendering it, and a bar trigger that does nothing but say whether the panel
 * is open. Neither surface is owned here: in the workspace the body goes in
 * the right-hand column beside Notes and Transcript, and inside the 360px
 * phone it goes in a `PhoneSheet` over the card. Splitting the state out is
 * what lets a transfer survive being opened from the phone and read on the
 * bar — the flow belongs to the call, not to the panel showing it.
 *
 * The three triggers used to own popovers. A popover shuts the moment
 * attention moves, which is wrong for every one of them: the keypad is worked
 * while listening to an IVR read out its options, and choosing a transfer
 * target is two decisions with a wait in the middle that the agent spends
 * reading the transcript. So they became controlled — the screen decides which
 * of its panels is showing, exactly as it already did for Notes.
 */

const KEYPAD_ROWS: { digit: string; letters: string }[][] = [
  [
    { digit: "1", letters: "" },
    { digit: "2", letters: "ABC" },
    { digit: "3", letters: "DEF" },
  ],
  [
    { digit: "4", letters: "GHI" },
    { digit: "5", letters: "JKL" },
    { digit: "6", letters: "MNO" },
  ],
  [
    { digit: "7", letters: "PQRS" },
    { digit: "8", letters: "TUV" },
    { digit: "9", letters: "WXYZ" },
  ],
  [
    { digit: "*", letters: "" },
    { digit: "0", letters: "+" },
    { digit: "#", letters: "" },
  ],
];

/** Digits the pad can send — typed, pasted, or tapped. */
const KEYPAD_CHAR = /[0-9*#+]/;

function sanitizeKeypad(value: string) {
  return value.replace(/[^0-9*#+]/g, "");
}

function digitFromKey(key: string) {
  return KEYPAD_CHAR.test(key) ? key : null;
}

function isTypingTarget(node: EventTarget | null) {
  if (!(node instanceof HTMLElement)) return false;
  return Boolean(node.closest("input, textarea, select, [contenteditable=true]"));
}

/* ── Keypad ────────────────────────────────────────────────────────────── */

export interface KeypadFlow {
  sent: string;
  press: (digit: string) => void;
  replace: (value: string) => void;
}

/**
 * Tones sent on this call. Held above the panel so closing the keypad to read
 * an IVR prompt and opening it again doesn't lose the record of what was
 * already pressed. Append-only: a tone that went down the line cannot be
 * taken back, which is why there is no backspace.
 */
export function useKeypad(): KeypadFlow {
  const [sent, setSent] = useState("");
  return {
    sent,
    press: (digit) => setSent((value) => `${value}${digit}`),
    replace: (value) => setSent(sanitizeKeypad(value)),
  };
}

/**
 * The twelve keys themselves. Shared with the idle dialer so the in-call pad
 * cannot drift into a different control — same pill, same 104×52, same type.
 *
 * `mousedown` is cancelled so tapping a key does not steal focus from the
 * field above it. That is what lets typing and tapping compose the same
 * number without clicking back into the field after every digit.
 */
export function KeypadGrid({ onDigit }: { onDigit: (digit: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {KEYPAD_ROWS.map((row) => (
        <div key={row.map((key) => key.digit).join("")} className="flex gap-2">
          {row.map((key) => (
            <button
              key={key.digit}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onDigit(key.digit)}
              className="flex h-[52px] w-[104px] flex-col items-center justify-center rounded-full outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24 active:scale-[0.97] motion-reduce:active:scale-100"
            >
              <span className="text-[18px] leading-[26px] font-medium text-brand tabular-nums">
                {key.digit}
              </span>
              <span className="min-h-3.5 text-[10px] leading-[14px] font-medium text-muted-foreground uppercase">
                {key.letters || "\u00a0"}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The in-call keypad. Same pad as the idle dialer — a field over the same
 * twelve keys — because a pad that looks different in-call reads as a
 * different control. Each digit is a tone already gone down the line, so the
 * field is a record, not a number being composed: typing and tapping both
 * append, and there is no backspace.
 */
export function KeypadBody({
  keypad,
  fill,
  active,
}: {
  keypad: KeypadFlow;
  /**
   * Spread into the height available instead of hugging it. Set by the
   * phone's sheet and the aside column, both a whole card tall.
   */
  fill?: boolean;
  /** The panel is the one in front — focus the field so typing just works. */
  active?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const keypadRef = useRef(keypad);
  keypadRef.current = keypad;

  const insertDigit = (digit: string) => {
    keypadRef.current.press(digit);
    inputRef.current?.focus();
  };

  const insertDigitRef = useRef(insertDigit);
  insertDigitRef.current = insertDigit;

  useEffect(() => {
    if (!active) return;
    inputRef.current?.focus();
  }, [active]);

  /**
   * Digits typed while the pad is open, even if the field isn't focused —
   * Tab landed on a key, or the pointer is still on the panel chrome.
   * Left alone when another field has the caret, so a notes keystroke never
   * becomes a tone. Backspace is ignored: a tone already sent cannot be
   * unsent.
   */
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) && event.target !== inputRef.current) {
        return;
      }
      const digit = digitFromKey(event.key);
      if (digit) {
        event.preventDefault();
        insertDigitRef.current(digit);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = sanitizeKeypad(event.clipboardData.getData("text"));
    if (!digits) return;
    keypadRef.current.replace(`${keypadRef.current.sent}${digits}`);
  };

  return (
    <div className={cn("flex flex-col", fill && "min-h-0 flex-1")}>
      <div className="shrink-0 px-4 pt-4">
        <InputField
          ref={inputRef}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="Enter a number"
          value={keypad.sent}
          readOnly
          onPaste={onPaste}
          clearable={false}
          aria-label="Digits sent"
        />
      </div>
      <div
        className={cn(
          "flex justify-center py-4",
          fill && "min-h-0 flex-1 items-center"
        )}
      >
        <KeypadGrid onDigit={insertDigit} />
      </div>
    </div>
  );
}

export const KEYPAD_COPY = { title: "Keypad" };

export function KeypadControl({
  open,
  onToggle,
  morphKey,
  className,
  style,
}: {
  open?: boolean;
  onToggle?: () => void;
  morphKey?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <BarControl
      morphKey={morphKey}
      label={open ? "Hide keypad" : "Keypad"}
      pressed={open}
      onClick={onToggle}
      className={className}
      style={style}
    >
      <IconCallKeypad size={20} />
    </BarControl>
  );
}

/* ── Transfer & merge ──────────────────────────────────────────────────── */

/**
 * A transfer is two decisions, not one, and the flow is built around that.
 *
 * `picking` → who. Then either *ask first* (warm: the customer goes on hold
 * while the second leg rings) or *transfer now* (blind: hand over and drop).
 * A warm transfer that connects can go two ways — hand the call over, or
 * **merge**, which brings the customer back off hold into a three-way. Merge is
 * a state of a warm transfer rather than a control of its own, because it is
 * only ever reachable from one.
 *
 * The second leg can also simply not answer. That is not a stage: the call the
 * agent is on never went anywhere, so the flow drops back to `picking` and
 * carries the name that failed alongside it. The design puts that failure in a
 * banner across the whole phone; here it is a notice at the top of the panel
 * the agent was already looking at, plus a dot on the shut control so it is
 * still findable if they closed the panel while it rang.
 */
/**
 * The two tabs the picker offers. A teammate is somebody with presence and an
 * extension; a contact is a saved number with neither.
 */
export type TransferDirectory = "team" | "contacts";

function directoryOf(target: TransferTarget): TransferDirectory {
  return target.kind === "agent" ? "team" : "contacts";
}

type TransferStage =
  | { kind: "picking" }
  | { kind: "ringing"; target: TransferTarget }
  | { kind: "consulting"; target: TransferTarget }
  | { kind: "merged"; target: TransferTarget }
  | { kind: "handing-off"; target: TransferTarget };

export interface TransferFlow {
  stage: TransferStage;
  /**
   * Who the agent is actually talking to, and for how long — the two things a
   * participant list needs that a transfer doesn't. Carried on the flow rather
   * than passed to the panel because both surfaces that render the panel would
   * otherwise have to thread them through, and the phone's sheet already takes
   * nine props.
   */
  customerName: string;
  elapsedMs: number;
  /** Which tab the picker is on. Switching it drops any pending choice. */
  directory: TransferDirectory;
  setDirectory: (next: TransferDirectory) => void;
  query: string;
  setQuery: (value: string) => void;
  selected: string | null;
  setSelected: (id: string) => void;
  /** Backing out of the confirmation without leaving the panel. */
  clearSelection: () => void;
  /** Matches on the tab in front of the agent. */
  results: TransferTarget[];
  /**
   * Matches on the tab they aren't looking at. Offered as a way across rather
   * than merged into one list: a search that silently returns results from
   * somewhere else makes the tabs a lie.
   */
  otherMatches: number;
  target: TransferTarget | null;
  /** A transfer is in flight — the bar's control shows it even when shut. */
  active: boolean;
  merged: boolean;
  /** Who didn't answer, until the agent has seen it. Drives the control's dot. */
  failed: TransferTarget | null;
  dismissFailure: () => void;
  /** The customer's hold, as the phone reports it — the flow doesn't own it. */
  customerHeld: boolean;
  toggleCustomerHold: () => void;
  /** The second leg's hold, which only exists while there is a second leg. */
  thirdPartyHeld: boolean;
  toggleThirdPartyHold: () => void;
  askFirst: (target: TransferTarget) => void;
  handOff: (target: TransferTarget) => void;
  merge: (target: TransferTarget) => void;
  reset: () => void;
}

export function useTransferFlow({
  customerName,
  elapsedMs,
  customerHeld,
  onCustomerHoldChange,
  onCallHandedOff,
  onMergedChange,
}: {
  /** The caller as the bar names them — a contact name, or the raw number. */
  customerName: string;
  /** The live call clock, so the agent's own row can carry it. */
  elapsedMs: number;
  /**
   * Hold, as the phone currently has it. Read rather than mirrored, so the
   * participant rows and the bar's Hold control can never disagree about
   * whether the customer can hear the room.
   */
  customerHeld: boolean;
  /**
   * A warm transfer parks the customer. The phone owns hold, so the flow asks
   * for it rather than keeping a second copy of the same state — which is what
   * lets the bar's Hold control go red while a consult is running.
   */
  onCustomerHoldChange: (held: boolean) => void;
  /** The call is no longer ours: the transfer completed. */
  onCallHandedOff: () => void;
  /** Reported so the bar can say "3-way" instead of the caller's name. */
  onMergedChange?: (target: TransferTarget | null) => void;
}): TransferFlow {
  const [directory, setDirectoryState] = useState<TransferDirectory>("team");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [stage, setStage] = useState<TransferStage>({ kind: "picking" });
  const [failed, setFailed] = useState<TransferTarget | null>(null);
  const [thirdPartyHeld, setThirdPartyHeld] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  /**
   * Everything the query matches, both tabs. Searched across the number and
   * the extension as well as the name, because "5070" is how an agent who
   * knows the floor looks somebody up.
   */
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return TRANSFER_TARGETS;
    return TRANSFER_TARGETS.filter((target) =>
      [target.name, target.meta, target.extension ?? "", target.number ?? ""].some(
        (field) => field.toLowerCase().includes(needle)
      )
    );
  }, [query]);

  const results = useMemo(
    () => matches.filter((target) => directoryOf(target) === directory),
    [matches, directory]
  );

  const reset = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setStage({ kind: "picking" });
    setSelected(null);
    setThirdPartyHeld(false);
    onCustomerHoldChange(false);
    onMergedChange?.(null);
  };

  /** Rang out. The customer comes back, and the name stays on screen. */
  const ringOut = (target: TransferTarget) => {
    timer.current = null;
    setStage({ kind: "picking" });
    setSelected(null);
    setThirdPartyHeld(false);
    setFailed(target);
    onCustomerHoldChange(false);
    onMergedChange?.(null);
  };

  return {
    stage,
    customerName,
    elapsedMs,
    directory,
    // Changing tab drops the pending choice with it — the confirmation names
    // somebody who is no longer on the list behind it otherwise.
    setDirectory: (next) => {
      setSelected(null);
      setDirectoryState(next);
    },
    query,
    setQuery,
    selected,
    // Choosing somebody new answers the failure notice, so it goes rather than
    // sitting over the list the agent has already moved on from.
    setSelected: (id) => {
      setFailed(null);
      setSelected(id);
    },
    clearSelection: () => setSelected(null),
    results,
    otherMatches: matches.length - results.length,
    target: TRANSFER_TARGETS.find((item) => item.id === selected) ?? null,
    active: stage.kind !== "picking",
    merged: stage.kind === "merged",
    failed,
    dismissFailure: () => setFailed(null),
    customerHeld,
    toggleCustomerHold: () => onCustomerHoldChange(!customerHeld),
    thirdPartyHeld,
    toggleThirdPartyHold: () => setThirdPartyHeld((held) => !held),
    askFirst: (next) => {
      setFailed(null);
      onCustomerHoldChange(true);
      setStage({ kind: "ringing", target: next });
      timer.current = window.setTimeout(() => {
        if (next.ringsOut) {
          ringOut(next);
          return;
        }
        setStage({ kind: "consulting", target: next });
      }, TRANSFER_ANSWER_MS);
    },
    handOff: (next) => {
      setFailed(null);
      setStage({ kind: "handing-off", target: next });
      // A blind transfer to somebody who never picks up takes as long to fail
      // as a warm one does to connect — the wait *is* the ringing.
      timer.current = window.setTimeout(
        () => {
          if (next.ringsOut) {
            ringOut(next);
            return;
          }
          onCustomerHoldChange(false);
          onMergedChange?.(null);
          onCallHandedOff();
        },
        next.ringsOut ? TRANSFER_ANSWER_MS : TRANSFER_COMPLETE_MS
      );
    },
    merge: (next) => {
      onCustomerHoldChange(false);
      setThirdPartyHeld(false);
      onMergedChange?.(next);
      setStage({ kind: "merged", target: next });
    },
    reset,
  };
}

export function transferCopy(flow: TransferFlow) {
  // The header counts the room, because once there are three rows the list
  // stops being scannable as "how many people can hear me" — which is the
  // question a merged call raises and a two-leg transfer never did.
  const first =
    flow.stage.kind === "picking"
      ? null
      : flow.stage.target.name.split(" ")[0];
  if (flow.merged) {
    return {
      title: "Conference call",
      description: `3 participants — you, the customer and ${first}.`,
    };
  }
  if (flow.stage.kind === "handing-off") {
    return { title: "Transferring", description: `Handing the call to ${first}.` };
  }
  if (flow.stage.kind !== "picking") {
    return {
      title: "Transferring",
      description: `3 participants — you, the customer and ${first}.`,
    };
  }
  // No subtext on the picking stage: the two directory tabs and the search
  // field under this header already say what the panel wants.
  return { title: "Transfer to" };
}

export function TransferBody({ flow }: { flow: TransferFlow }) {
  const stage = flow.stage;

  // A blind transfer is the one stage with nothing to decide and nobody to put
  // on hold: the agent has committed, and what is left is a wait on the
  // system. That is a processing state, not a participant list.
  if (stage.kind === "handing-off") {
    return <TransferProcessing flow={flow} target={stage.target} />;
  }
  if (stage.kind !== "picking") {
    // The panel's own scroller, because the picking branch below turns it off
    // for the confirmation and the participant list still has to fit.
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TransferProgress flow={flow} stage={stage} />
      </div>
    );
  }

  const target = flow.target;
  const directoryLabel = flow.directory === "team" ? "My Team" : "Contacts";

  return (
    // `relative`, because the confirmation is pinned to the panel's bottom
    // edge over the list rather than pushed in below it — see
    // `TransferConfirmSheet`.
    <div className="relative flex min-h-0 flex-1 flex-col">
      {flow.failed ? (
        <TransferFailureNotice
          target={flow.failed}
          onDismiss={flow.dismissFailure}
        />
      ) : null}

      {/* Two tabs, not one list with headings. A teammate and a saved number
          are chosen for different reasons — "who on the floor knows this" vs
          "which outside party owns this" — and the design splits them for the
          same reason the phone's own contacts app does: the agent already
          knows which kind of person they are looking for. */}
      <Tabs
        items={[
          { key: "team", label: "My Team" },
          { key: "contacts", label: "Contacts" },
        ]}
        value={flow.directory}
        onValueChange={(key) => flow.setDirectory(key as TransferDirectory)}
        className="flex w-full shrink-0 justify-around gap-0 border-b border-line px-4"
      />

      <div className="shrink-0 px-4 py-3">
        <div className="flex items-center gap-2 rounded-md border border-line px-3 py-2 transition-colors duration-base focus-within:border-brand">
          <IconSearch
            size={16}
            className="size-4 shrink-0 text-muted-foreground"
          />
          <input
            value={flow.query}
            onChange={(event) => flow.setQuery(event.target.value)}
            placeholder="Type a contact name or number"
            aria-label={`Search ${directoryLabel}`}
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-5 text-foreground outline-none placeholder:text-disabled-fg"
          />
          {flow.query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => flow.setQuery("")}
              className="flex size-5 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors duration-micro hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
            >
              <IconClose size={16} className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {flow.results.length === 0 ? (
          <TransferNoMatches flow={flow} />
        ) : (
          flow.results.map((item) => (
            <TransferRow
              key={item.id}
              target={item}
              selected={flow.selected === item.id}
              onSelect={() => flow.setSelected(item.id)}
            />
          ))
        )}
      </div>

      {target ? <TransferConfirmSheet flow={flow} target={target} /> : null}
    </div>
  );
}

export function TransferControl({
  flow,
  open,
  onToggle,
  morphKey,
  className,
  style,
}: {
  flow: TransferFlow;
  open?: boolean;
  onToggle?: () => void;
  morphKey?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <BarControl
      morphKey={morphKey}
      label={
        flow.merged ? "Conference call" : open ? "Hide transfer" : "Transfer"
      }
      pressed={open || flow.active}
      // A transfer that rang out while the panel was shut is the one thing
      // this control has to be able to report on its own.
      badge={Boolean(flow.failed) && !open}
      onClick={onToggle}
      className={className}
      style={style}
    >
      {flow.merged ? (
        <IconCallUsers size={20} />
      ) : (
        <IconCallTransfer size={20} />
      )}
    </BarControl>
  );
}

/**
 * The presence dot the avatar carries, from the status the directory reports.
 *
 * Transfer only needs a binary answer: green can receive the call, grey
 * cannot. More specific source statuses do not change the agent's next step.
 */
const AVATAR_STATUS: Record<AvailabilityId, AvatarStatus> = {
  available: "available",
  busy: "ooo",
  "on-call": "ooo",
  "wrap-up": "ooo",
};

/**
 * One possible destination.
 *
 * The extension sits in a chip under the name rather than on the line beside
 * it, because it is the thing an agent reads back to the customer — "putting
 * you through to Priya on 5070" — and a number that has to be picked out of a
 * sentence gets misread. Availability is the only thing on the right, so the
 * column scans as a single yes/no down the list.
 *
 * The avatar leads the row for the reason a phone's contact list has one: the
 * agent is looking for somebody they already know, and a coloured disc with
 * two letters is matched faster than a name is read. On a teammate it doubles
 * as the presence dot, which is why the word on the right stays — the dot
 * carries the scan down the column and the word says *which* kind of
 * unavailable. A saved number gets no dot at all: there is no presence on the
 * far end of one to report, and a green dot that only ever means "this row is
 * a phone number" is a dot that lies.
 */
function TransferRow({
  target,
  selected,
  onSelect,
}: {
  target: TransferTarget;
  selected: boolean;
  onSelect: () => void;
}) {
  // A teammate on a call or on DND can't take a transfer. A saved number
  // always can — there is no presence on the far end of one to read.
  const unavailable =
    target.kind === "agent" && target.availability !== "available";

  return (
    <button
      type="button"
      disabled={unavailable}
      aria-pressed={selected}
      onClick={unavailable ? undefined : onSelect}
      className={cn(
        "flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left outline-none transition-colors duration-micro",
        unavailable
          ? "cursor-not-allowed"
          : "hover:bg-surface-hover focus-visible:bg-surface-hover",
        selected && "bg-brand-subtle"
      )}
    >
      {/* Decorative: the name is right beside it, so the initials would only
          be read out twice. `pointer-events-none` keeps `Avatar`'s own hover
          ring from firing when the pointer is really over the row — the disc
          is not separately clickable here.

          Deliberately *not* passed `disabled`: an unavailable teammate is
          still a person the agent recognises, and greying the disc as well as
          the name makes the row read as broken rather than as busy. The dot
          is what says they can't take this call. */}
      <Avatar
        aria-hidden="true"
        size="md"
        initials={initialsFromName(target.name)}
        color="indigo"
        status={
          target.kind === "agent"
            ? AVATAR_STATUS[target.availability]
            : undefined
        }
        className="pointer-events-none [&>span.absolute]:size-2 [&>span.absolute]:border"
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[13px] leading-5 font-medium",
            unavailable ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {target.name}
        </span>
        <span className="mt-1 flex">
          <span className="max-w-full truncate rounded-[4px] bg-secondary-bg px-1.5 py-0.5 text-[11px] leading-4 text-muted-foreground tabular-nums">
            {transferTargetLine(target)}
          </span>
        </span>
      </span>
      {/* Presence only applies to teammates. Saved contacts are phone-book
          entries, so showing them as "Available" would imply live status. */}
      {target.kind === "agent" ? (
        <span
          className={cn(
            "shrink-0 text-[12px] leading-4",
            unavailable ? "text-muted-foreground" : "text-success"
          )}
        >
          {unavailable ? "Unavailable" : "Available"}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Nothing on this tab matches — but something on the other one might, and
 * saying so is cheaper than making the agent find the tab themselves while
 * the customer waits. The results are still not merged: a search that
 * silently returns rows from somewhere else makes the tabs a lie.
 */
function TransferNoMatches({ flow }: { flow: TransferFlow }) {
  const other: TransferDirectory =
    flow.directory === "team" ? "contacts" : "team";
  const otherLabel = other === "team" ? "My Team" : "Contacts";

  return (
    <div className="flex flex-col items-center gap-1 px-6 py-8 text-center">
      <p className="text-[12px] leading-4 text-muted-foreground">
        Nobody in {flow.directory === "team" ? "My Team" : "Contacts"} matches
        “{flow.query}”.
      </p>
      {flow.otherMatches > 0 ? (
        <Button variant="link" size="sm" onClick={() => flow.setDirectory(other)}>
          {flow.otherMatches} in {otherLabel}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The two ways to hand a call over, asked once somebody is chosen.
 *
 * It comes up over the list rather than replacing it, because the choice is
 * still provisional: the agent can see they picked the right row, and backing
 * out puts them exactly where they were rather than at the top of a list they
 * have to scroll again. The scrim is what makes that legible — the list is
 * visible but no longer live, so there is one decision on screen at a time.
 *
 * *Transfer now* is blind: the call goes and the agent drops off. *Talk to X
 * first* is warm: the customer is parked while the second leg rings, and the
 * agent gets to introduce the problem before handing it over. Warm is the one
 * with a way back, which is why blind is not the quiet default — both are
 * named for what they do to the customer, not for what they cost the agent.
 */
function TransferConfirmSheet({
  flow,
  target,
}: {
  flow: TransferFlow;
  target: TransferTarget;
}) {
  const first = target.name.split(" ")[0];
  const { clearSelection } = flow;

  /**
   * Escape backs out of the choice rather than closing the panel. Taken on the
   * capture phase and stopped, so the workspace's own Escape — which shuts the
   * whole aside column — never also fires: one press, one step back.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      clearSelection();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [clearSelection]);

  return (
    <>
      {/* A button, not a div: dismissing by clicking away is a real action and
          it should be reachable without a pointer. */}
      <button
        type="button"
        aria-label="Cancel transfer"
        onClick={flow.clearSelection}
        className="transfer-confirm-scrim absolute inset-0 z-10 cursor-default bg-foreground/20 outline-none"
      />
      <div
        role="group"
        aria-label={`Transfer this call to ${target.name}`}
        className="transfer-confirm-sheet absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t border-line bg-background px-4 pt-3 pb-4 shadow-400"
      >
        <p className="text-[12px] leading-4 text-muted-foreground">
          Transfer to{" "}
          <span className="font-medium text-foreground">{target.name}</span> ·{" "}
          {transferTargetLine(target)}
        </p>
        <Button
          size="sm"
          className="w-full"
          onClick={() => flow.handOff(target)}
        >
          Transfer now
        </Button>
        <Button
          variant="primary-outline"
          size="sm"
          className="w-full"
          onClick={() => flow.askFirst(target)}
        >
          Talk to {first} first
        </Button>
        <Button
          variant="link"
          size="sm"
          className="w-full"
          onClick={flow.clearSelection}
        >
          Cancel
        </Button>
      </div>
    </>
  );
}

/**
 * The wait after a blind transfer.
 *
 * There is nothing to offer here and that is the point: the call is on its way
 * to somebody else, and a Cancel would be a promise the flow can't keep once
 * the switch has it. So the panel reports and nothing more — which is exactly
 * why it needs a loader rather than a line of text. A screen with no controls
 * and no movement reads as a screen that has hung.
 */
function TransferProcessing({
  flow,
  target,
}: {
  flow: TransferFlow;
  target: TransferTarget;
}) {
  const first = target.name.split(" ")[0];

  return (
    <div
      // The panel unmounts with the call the moment this finishes, so the
      // read-out has to be announced rather than waited for.
      aria-live="polite"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center"
    >
      <WaveformLoader className="text-brand" />
      <div className="flex flex-col gap-1">
        <p className="text-[14px] leading-5 font-medium text-foreground">
          Transferring to {target.name}
        </p>
        <p className="text-[12px] leading-4 text-muted-foreground">
          {flow.customerName} is being handed over. You drop off as soon as{" "}
          {first} picks up.
        </p>
      </div>
    </div>
  );
}

/**
 * A transfer in flight — the participant list, and whatever decisions are
 * still open.
 *
 * Every stage draws the same three rows, because the thing an agent forgets
 * during a consult is that somebody is sitting on hold, and a list that
 * changes shape between stages makes them re-read it each time. What changes
 * is what each row *says* and which of its two controls are live.
 *
 * The agent's own row is first and has no controls, which looks like a wasted
 * row until the call merges: from then on "who is on this call" has three
 * answers and the header counts three, so a list that shows two is a list the
 * agent has to do arithmetic on. It also gives the clock somewhere to live
 * inside the panel — during a consult the bar behind it is showing *On hold*,
 * and the elapsed time is the one thing on the bar that stays true.
 *
 * The design gives each participant a hold and a hangup on the row itself, and
 * that is worth keeping at this width: reaching the customer's hold through
 * the bar's global Hold control works, but "hold" then means something
 * different depending on how many people are on the call.
 */
function TransferProgress({
  flow,
  stage,
}: {
  flow: TransferFlow;
  stage: Exclude<TransferStage, { kind: "picking" }>;
}) {
  const { target } = stage;
  const merged = stage.kind === "merged";
  const ringing = stage.kind === "ringing" || stage.kind === "handing-off";
  const firstName = target.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex flex-col gap-2">
        <ParticipantRow
          name="You"
          role="Call duration"
          state={formatCallDuration(flow.elapsedMs)}
          tone="live"
        />
        <ParticipantRow
          name={flow.customerName}
          role="Customer"
          state={flow.customerHeld ? "On hold" : "On the line"}
          tone={flow.customerHeld ? "held" : "live"}
          held={flow.customerHeld}
          // Taking the customer back off hold while a consult is live is the
          // same act as merging, so it is offered as Merge below instead —
          // two controls for one outcome is how a demo gets caught out.
          onHoldToggle={
            stage.kind === "consulting" ? undefined : flow.toggleCustomerHold
          }
          // No hangup on this row, at any stage. Dropping the customer out of a
          // conference leaves the agent on an internal call with the third
          // party — a state the flow has no stage for and the bar behind it
          // would still label with the customer's name. The two rows read as
          // asymmetric because they are: only one of them can leave without
          // ending the call the agent is being measured on.
        />
        <ParticipantRow
          name={target.name}
          // Always the role now — the picker offers people, never a queue, so
          // there is no longer a target whose "role" is the word "Team".
          role={target.meta}
          state={
            stage.kind === "ringing"
              ? "Ringing…"
              : stage.kind === "handing-off"
                ? "Handing over…"
                : flow.thirdPartyHeld
                  ? "On hold"
                  : "On the line"
          }
          tone={
            ringing ? "pending" : flow.thirdPartyHeld ? "held" : "live"
          }
          held={flow.thirdPartyHeld}
          onHoldToggle={merged ? flow.toggleThirdPartyHold : undefined}
          onDrop={stage.kind === "handing-off" ? undefined : flow.reset}
          dropLabel={
            ringing ? `Stop ringing ${firstName}` : `Drop ${firstName}`
          }
        />
      </div>

      {stage.kind === "consulting" ? (
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            className="w-full"
            leftIcon={<IconCallMerge size={16} className="size-4" />}
            onClick={() => flow.merge(target)}
          >
            Merge into one call
          </Button>
          <Button
            variant="grey-outline"
            size="sm"
            className="w-full"
            onClick={() => flow.handOff(target)}
          >
            Complete transfer &amp; leave
          </Button>
          <Button
            variant="error-secondary"
            size="sm"
            className="w-full"
            onClick={flow.reset}
          >
            Cancel — take the customer back
          </Button>
        </div>
      ) : null}

      {merged ? (
        <>
          {/* Who can hear whom, said out loud. Two hold buttons on one panel
              means the room can be in four states, and "all three of you can
              hear each other" is a lie in three of them. */}
          <p className="text-[11px] leading-4 text-muted-foreground">
            {flow.customerHeld && flow.thirdPartyHeld
              ? `Both are on hold — neither can hear you.`
              : flow.customerHeld
                ? `The customer is on hold. You and ${firstName} can hear each other.`
                : flow.thirdPartyHeld
                  ? `${firstName} is on hold. You and the customer can hear each other.`
                  : "All three of you can hear each other."}{" "}
            Leaving hands the call to {firstName}.
          </p>
          <Button
            variant="grey-outline"
            size="sm"
            className="w-full"
            onClick={() => flow.handOff(target)}
          >
            Leave — {firstName} keeps the call
          </Button>
        </>
      ) : null}
    </div>
  );
}

/**
 * One leg of the call, with the two things that can be done to it.
 *
 * The controls are icon-only and unlabelled on purpose — at 300px a row that
 * spells out "Hold" twice reads as a form. The dot is the state, the line
 * under the name is who they are and what they are doing, and the buttons are
 * what to do about it; a control that would mean nothing at this stage is left
 * out rather than disabled, so the row never offers something that does
 * nothing.
 *
 * `role` and `state` share that line but not their weight: the role is fixed
 * for the whole call and the state changes under the agent's hands, so the
 * half that moves is the half that reads as foreground. The design tints the
 * state instead, which here would be a third colour saying what the dot
 * already says.
 */
function ParticipantRow({
  name,
  role,
  state,
  tone,
  held,
  onHoldToggle,
  onDrop,
  dropLabel,
}: {
  name: string;
  role: string;
  state: string;
  tone: "live" | "held" | "pending";
  held?: boolean;
  onHoldToggle?: () => void;
  onDrop?: () => void;
  dropLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md bg-secondary-bg px-3 py-2">
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          tone === "live" && "bg-success",
          tone === "held" && "bg-error",
          tone === "pending" && "bg-warning"
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] leading-5 text-foreground">
          {name}
        </span>
        <span className="block truncate text-[11px] leading-4 text-muted-foreground tabular-nums">
          {role} · <span className="text-foreground">{state}</span>
        </span>
      </span>
      {onHoldToggle ? (
        <ParticipantAction
          label={held ? `Take ${name} off hold` : `Put ${name} on hold`}
          pressed={held}
          onClick={onHoldToggle}
        >
          <IconCallHold size={16} />
        </ParticipantAction>
      ) : null}
      {onDrop ? (
        <ParticipantAction label={dropLabel ?? `Drop ${name}`} danger onClick={onDrop}>
          <IconCallDrop size={16} />
        </ParticipantAction>
      ) : null}
    </div>
  );
}

/**
 * Native `title` rather than the bar's `Tooltip`: this button already sits
 * inside an overlay, and a second floating layer anchored to a row inside a
 * scrolling panel is how a tooltip ends up clipped by the panel that owns it.
 * The label is on `aria-label` either way, so nothing is lost.
 */
function ParticipantAction({
  label,
  pressed,
  danger,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-base focus-visible:ring-2 focus-visible:ring-brand/24",
        danger
          ? "text-error-icon hover:bg-error-subtle"
          : pressed
            ? "bg-error text-white hover:bg-error-hover"
            : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/**
 * The second leg never picked up. Sits over the list the agent was choosing
 * from, because the only useful next move is choosing again — the design's
 * full-width banner says the same thing, but it says it over a screen where
 * there is nothing to do about it.
 */
function TransferFailureNotice({
  target,
  onDismiss,
}: {
  target: TransferTarget;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-line bg-error-subtle px-3.5 py-2.5">
      <span className="flex size-5 shrink-0 items-center justify-center text-error-icon">
        <IconAlertTriangleFilled size={16} />
      </span>
      <p className="min-w-0 flex-1 text-[12px] leading-4 text-foreground">
        {target.name} didn’t answer.
        <span className="block text-muted-foreground">
          The customer is still with you — try someone else.
        </span>
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="flex size-5 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors duration-micro hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
      >
        <IconClose size={16} className="size-4" />
      </button>
    </div>
  );
}

/* ── Voicemail drop ────────────────────────────────────────────────────── */

type DropStage =
  | { kind: "picking" }
  | { kind: "dropping"; greeting: VoicemailGreeting };

/** The beat it takes to reach the mailbox and hand the message over. */
const VOICEMAIL_CONNECT_MS = 900;

export interface VoicemailFlow {
  /**
   * The drops the account has, in the order Settings lists them. Carried on
   * the flow rather than read from the fixture, because an agent can upload
   * one between calls and the popover has to offer it on the next call.
   */
  greetings: VoicemailGreeting[];
  stage: DropStage;
  /** A drop is in flight — the bar's control shows it even when shut. */
  running: boolean;
  drop: (greeting: VoicemailGreeting) => void;
}

/**
 * Voicemail drop. Nobody picked up, so the agent leaves a pre-recorded message
 * and moves on — and *moving on* is the entire feature: the message keeps
 * playing at the other end after the line is released, so there is nothing
 * here for the agent to sit through.
 *
 * So picking a drop is the last decision on the call. It hands the message
 * over, releases the line, and puts the agent back on the dialer — no playback
 * bar to watch, no Dropped panel to dismiss, and no wrap-up: a mailbox has
 * nothing to dispose or write up, and asking for a disposition on one is how a
 * dialling session loses its rhythm. The confirmation is a toast on the dialer
 * the agent is already looking at.
 */
export function useVoicemailDrop({
  greetings,
  onDropped,
}: {
  greetings: VoicemailGreeting[];
  /** The message is away and the line is ours to release. */
  onDropped: (greeting: VoicemailGreeting) => void;
}): VoicemailFlow {
  const [stage, setStage] = useState<DropStage>({ kind: "picking" });
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  return {
    greetings,
    stage,
    running: stage.kind === "dropping",
    drop: (greeting) => {
      // One drop per call — a second tap while the first is reaching the
      // mailbox would queue a second hangup behind it.
      if (timer.current) return;
      setStage({ kind: "dropping", greeting });
      // A beat before the line goes, so the drop reads as something that
      // happened rather than as the call vanishing under the agent's cursor.
      timer.current = window.setTimeout(() => {
        timer.current = null;
        setStage({ kind: "picking" });
        onDropped(greeting);
      }, VOICEMAIL_CONNECT_MS);
    },
  };
}

export function voicemailCopy(flow: VoicemailFlow) {
  return {
    title:
      flow.stage.kind === "picking"
        ? "Leave a voicemail and end the call"
        : "Voicemail drop",
  };
}

export function VoicemailBody({ flow }: { flow: VoicemailFlow }) {
  if (flow.stage.kind === "dropping") {
    return <DropInFlight greeting={flow.stage.greeting} />;
  }

  // An account with no drops is a real state — the library is uploaded, not
  // shipped — and the popover is where the agent finds out, so it says where
  // to fix it rather than opening empty.
  if (flow.greetings.length === 0) {
    return (
      <div className="flex flex-col gap-1 px-4 py-4">
        <p className="text-[13px] leading-5 text-foreground">
          No drops uploaded yet
        </p>
        <p className="text-[11px] leading-4 text-muted-foreground">
          Add one under Settings → Voicemail Settings and it shows up here.
        </p>
      </div>
    );
  }

  return (
    <CallPopoverSection>
      {flow.greetings.map((greeting) => (
        <CallPopoverRow
          key={greeting.id}
          /* Ruled the way the transfer directory is: every row here ends the
             call, so they read as a list of decisions rather than as one
             block of text. The last rule is dropped so the list doesn't
             close on a line hanging over the section's own padding. */
          className="group border-b border-line last:border-b-0"
          label={greeting.label}
          onClick={() => flow.drop(greeting)}
          trailing={
            /* Picking a drop hangs the call up, and the row is where that
               decision is taken — so the row is where it has to be said. The
               panel title carries it once, before the agent has anything to
               point at; the consequence belongs on the thing being clicked, at
               the moment of pointing at it.

               It sits *beside* the length rather than replacing it: both are
               reasons to pick one drop over another, and a cross-fade in one
               slot has the two texts overlapping through the swap because they
               share a right edge. Reserving room for both costs a strip of
               empty space no one can see while the row rests, which is the
               cheaper of the two. The CTA stays in the DOM at zero opacity
               rather than mounting on hover, so it is also in the row's
               accessible name — a screen reader gets the warning without a
               hover to trigger it. */
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] leading-4 font-medium whitespace-nowrap text-error-icon opacity-0 transition-opacity duration-micro group-hover:opacity-100 group-focus-visible:opacity-100">
                Drop &amp; end call
              </span>
              <span className="text-[11px] leading-4 text-muted-foreground tabular-nums">
                0:{String(greeting.seconds).padStart(2, "0")}
              </span>
            </span>
          }
        />
      ))}
    </CallPopoverSection>
  );
}

export function VoicemailDropControl({
  flow,
  open,
  onToggle,
  className,
  style,
}: {
  flow: VoicemailFlow;
  open?: boolean;
  onToggle?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <BarControl
      label={open ? "Hide voicemail drop" : "Voicemail drop"}
      // A drop that is already running keeps the control lit even if the agent
      // shut the panel — the line is about to go, and that is worth showing.
      pressed={open || flow.running}
      onClick={onToggle}
      className={className}
      style={style}
    >
      <IconVoicemailDrop size={20} />
    </BarControl>
  );
}

/**
 * The one beat between the tap and the line going. It reports which message is
 * being left and nothing else — there is no decision left to offer, and a
 * Cancel here would be a promise the flow can't keep once the mailbox has the
 * recording.
 */
function DropInFlight({ greeting }: { greeting: VoicemailGreeting }) {
  return (
    <div
      // The panel is about to unmount with the call, so the read-out has to be
      // announced rather than waited for.
      aria-live="polite"
      className="flex flex-col items-center gap-2 px-4 py-6 text-center"
    >
      <WaveformLoader className="text-brand" />
      <p className="text-[13px] leading-5 font-medium text-foreground">
        Leaving {greeting.label}
      </p>
      <p className="text-[11px] leading-4 text-muted-foreground">
        The message finishes on its own — you're done with this call.
      </p>
    </div>
  );
}
