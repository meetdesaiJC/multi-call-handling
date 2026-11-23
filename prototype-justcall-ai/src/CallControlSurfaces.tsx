import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import {
  IconCallOnHold,
  IconCheck,
  IconClear,
  IconClose,
  IconQueue,
  IconSearch,
  IconVoicemailDrop,
} from "@/components/Icon";
import {
  IconCallKeypad,
  IconCallTransfer,
} from "./icons/CallControlIcons";
import { WaveformLoader } from "@/components/WaveformLoader";
import {
  TRANSFER_TARGETS,
  VOICEMAIL_GREETINGS,
  targetUnavailable,
  type TransferTarget,
} from "./callTransferData";

/**
 * The three call-bar controls that open something rather than toggling
 * something: the DTMF keypad, the transfer picker, and the voicemail drop.
 *
 * All three open into the call workspace's right-hand column — the same shell
 * Notes, Transcript and Live Assist use — so every panel the bar can open
 * arrives in one place instead of some over the stage and some beside it.
 * They share `SurfacePanel` for the card and its header; each surface is then
 * just its content. The column itself is owned by `LiveCallStage`.
 *
 * The state they act on lives in `DialerPanel`, above the ringing → live
 * morph: a transfer that ends the call and tones sent down the line both
 * outlive the panel that started them.
 */

/** Which bar control currently owns its surface. One at a time, like the bar. */
export type CallSurface = "keypad" | "transfer" | "voicemail";

/** How the agent handed the call over. */
export type TransferMode = "warm" | "cold";

/**
 * A transfer in flight. `consulting` is the warm middle — the customer is on
 * hold, the agent is talking to the target, and the call has not moved yet.
 */
export type CallTransfer = {
  targetId: string;
  mode: TransferMode;
  stage: "consulting" | "connecting";
  /**
   * Whether the customer was already on hold when the transfer started, so
   * backing out of a warm consult can put them back exactly as it found them
   * rather than resuming a call the agent had deliberately paused.
   */
  heldBefore: boolean;
};

/** The greeting is playing out; the line closes when it finishes. */
export type VoicemailDrop = { greetingId: string };

/**
 * Cold transfer: how long "Transferring to Dana…" stands before the line
 * closes. Long enough to read, short enough that the agent isn't waiting on a
 * prototype. Warm transfers skip it — the consult already was the wait.
 */
export const TRANSFER_CONNECT_MS = 1600;
/** Voicemail drop: the greeting plays, then the call ends. */
export const VOICEMAIL_DROP_MS = 2600;

/**
 * How many tones the readout keeps. It is a reminder of what the IVR on the
 * other end was told, not a transcript — past a dozen the agent is reading the
 * wrong end of the string.
 */
export const DTMF_READOUT_MAX = 14;

/* ── Shell ──────────────────────────────────────────────────────────────── */

/**
 * One panel in the call workspace's right-hand column.
 *
 * The same card the Notes and Transcript panels use — white, hairline border,
 * an 11-high header — so a surface the bar opens is recognisably the same kind
 * of object as a surface the tools open, and the column never changes shape
 * under the agent as they switch between them.
 */
function SurfacePanel({
  icon,
  title,
  closeLabel,
  onClose,
  children,
}: {
  icon: ReactNode;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[16px] border border-line bg-white">
      <header className="flex h-11 shrink-0 items-center justify-between gap-1.5 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
          >
            {icon}
          </span>
          <p className="truncate text-label-md-semi text-foreground">{title}</p>
        </div>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={16} />
        </button>
      </header>
      {children}
    </div>
  );
}

/** Section heading inside a panel — quiet, so the rows under it stay loud. */
function SurfaceLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-label-xs text-muted-foreground uppercase">{children}</p>
  );
}

/* ── Keypad ─────────────────────────────────────────────────────────────── */

const DTMF_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

/**
 * DTMF, not dialling — the number is already connected, so there is no Call
 * button and no field to edit. What the pad owes the agent is a record of what
 * the IVR on the other end has been told, which is the readout at the top.
 */
export function KeypadSurface({
  tones,
  onTone,
  onClear,
  onClose,
}: {
  tones: string;
  onTone: (digit: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <SurfacePanel
      icon={<IconCallKeypad size={16} />}
      title="Keypad"
      closeLabel="Close keypad"
      onClose={onClose}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="min-w-0">
          <SurfaceLabel>Tones sent</SurfaceLabel>
          <p
            aria-live="polite"
            className={cn(
              "truncate text-paragraph-md tabular-nums",
              tones ? "text-foreground" : "text-disabled-fg"
            )}
          >
            {tones || "None yet"}
          </p>
        </div>
        {tones ? (
          <Button
            variant="link"
            size="xs"
            onClick={onClear}
            leftIcon={<IconClear size={16} />}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {/* The column is wider than the pad wants to be. Capped and centred, so
          the keys stay square-ish targets rather than stretching into bars. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto grid w-full max-w-[264px] grid-cols-3 gap-1">
          {DTMF_KEYS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => onTone(digit)}
              aria-label={`Send ${digit}`}
              className="button-press flex h-12 items-center justify-center rounded-md text-heading-lg text-brand tabular-nums outline-none hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24"
            >
              {digit}
            </button>
          ))}
        </div>
      </div>
    </SurfacePanel>
  );
}

/* ── Transfer ───────────────────────────────────────────────────────────── */

/**
 * Handing the call over, in the two shapes it actually takes.
 *
 * "Ask first" is a warm transfer: the customer goes on hold, the agent and the
 * target talk, and only then does the call move — so the panel stays open and
 * turns into the consult it started. "Transfer now" is cold and final, which
 * is why it is the outline button of the pair rather than the primary: the
 * safer of two irreversible acts should be the easier one to hit.
 */
export function TransferSurface({
  active,
  transfer,
  onStart,
  onComplete,
  onCancel,
  onClose,
}: {
  /** The column is showing this panel — hidden siblings stay mounted. */
  active: boolean;
  transfer: CallTransfer | null;
  onStart: (target: TransferTarget, mode: TransferMode) => void;
  onComplete: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listId = useId();
  const searchRef = useRef<HTMLInputElement>(null);

  // A panel the column has switched away from forgets the search but not much
  // else — coming back should start from the full list rather than from a
  // filter the agent can no longer see.
  useEffect(() => {
    if (active) return;
    setQuery("");
  }, [active]);

  // Searching is the first thing this panel is for, so arriving puts the caret
  // there — the same courtesy Notes does when its column opens.
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(
      () => searchRef.current?.focus({ preventScroll: true }),
      0
    );
    return () => window.clearTimeout(timer);
  }, [active]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return TRANSFER_TARGETS;
    return TRANSFER_TARGETS.filter((target) =>
      `${target.name} ${target.detail}`.toLowerCase().includes(needle)
    );
  }, [query]);

  const agents = matches.filter((target) => target.kind === "agent");
  const teams = matches.filter((target) => target.kind === "team");
  const selected = selectedId
    ? (TRANSFER_TARGETS.find((target) => target.id === selectedId) ?? null)
    : null;
  const canTransfer = Boolean(selected && !targetUnavailable(selected));

  // Keyed on the mode rather than the stage, so the body the agent was looking
  // at is the body that animates out. Completing a consult flips the stage to
  // `connecting` and closes the panel in the same commit — reading the stage
  // here would swap the consult back to the picker for the 120ms of the exit.
  const consulting = transfer?.mode === "warm";

  return (
    <SurfacePanel
      icon={<IconCallTransfer size={16} />}
      title="Transfer call"
      closeLabel="Close transfer"
      onClose={onClose}
    >
      {consulting && transfer ? (
        <ConsultingBody
          target={TRANSFER_TARGETS.find((t) => t.id === transfer.targetId)}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      ) : (
        <>
          <div className="shrink-0 border-b border-line px-3 py-2">
            <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 focus-within:border-brand">
              <IconSearch
                size={20}
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people or teams"
                aria-label="Search transfer destinations"
                aria-controls={listId}
                className="min-w-0 flex-1 bg-transparent text-paragraph-sm text-foreground outline-none placeholder:text-disabled-fg"
              />
            </div>
          </div>

          <div
            id={listId}
            role="listbox"
            aria-label="Transfer destinations"
            // Inline, not a popup: it lives in the column for as long as the
            // panel does. The dialer's Escape handler steps aside for an open
            // dropdown's listbox, and this marks itself as not being one.
            data-inline-listbox
            className="min-h-0 flex-1 overflow-y-auto p-1"
          >
            {matches.length === 0 ? (
              <p className="px-3 py-6 text-center text-paragraph-sm text-muted-foreground">
                Nobody here by that name.
              </p>
            ) : null}

            {agents.map((target) => (
              <TargetRow
                key={target.id}
                target={target}
                selected={target.id === selectedId}
                onSelect={() => setSelectedId(target.id)}
              />
            ))}

            {teams.length ? (
              <div className="mt-1 border-t border-line px-3 pt-2 pb-1">
                <SurfaceLabel>Teams</SurfaceLabel>
              </div>
            ) : null}

            {teams.map((target) => (
              <TargetRow
                key={target.id}
                target={target}
                selected={target.id === selectedId}
                onSelect={() => setSelectedId(target.id)}
              />
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-line p-3">
            <Button
              variant="grey-outline"
              size="sm"
              disabled={!canTransfer}
              className="flex-1"
              onClick={() => selected && onStart(selected, "cold")}
            >
              Transfer now
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!canTransfer}
              className="flex-1"
              onClick={() => selected && onStart(selected, "warm")}
            >
              Ask first
            </Button>
          </div>
        </>
      )}
    </SurfacePanel>
  );
}

/**
 * The warm middle. Two customers now — the one on hold and the colleague on
 * the line — so the panel says where each of them stands before it offers the
 * two ways out.
 */
function ConsultingBody({
  target,
  onComplete,
  onCancel,
}: {
  target?: TransferTarget;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const completeRef = useRef<HTMLButtonElement>(null);

  // The panel was already open when this replaced the picker, so the shell's
  // open-time autofocus has long since run — and the button the agent pressed
  // to get here has just unmounted, which would drop focus to the body.
  useEffect(() => {
    completeRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2.5">
        {target?.kind === "team" ? (
          <TeamMark />
        ) : (
          <Avatar
            size="md"
            initials={target?.initials}
            color={target?.color}
            status={target?.status}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-md-semi text-foreground">
            {target?.name ?? "Colleague"}
          </p>
          <p className="flex items-center gap-1.5 text-paragraph-sm text-brand">
            <WaveformLoader className="size-4 text-brand" />
            Connected to you
          </p>
        </div>
      </div>

      <p className="flex items-center gap-1.5 rounded-md bg-secondary-bg px-2.5 py-2 text-paragraph-sm text-muted-foreground">
        <IconCallOnHold size={16} className="size-4 shrink-0" aria-hidden="true" />
        The customer is on hold and can't hear this.
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="grey-outline"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          ref={completeRef}
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={onComplete}
        >
          Complete transfer
        </Button>
      </div>
    </div>
  );
}

/** Teams have no face, so they get the queue mark at avatar size instead. */
function TeamMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand"
    >
      <IconQueue size={16} className="size-4" />
    </span>
  );
}

function TargetRow({
  target,
  selected,
  onSelect,
}: {
  target: TransferTarget;
  selected: boolean;
  onSelect: () => void;
}) {
  const unavailable = targetUnavailable(target);
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={unavailable}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-brand/24",
        selected ? "bg-brand-subtle" : "hover:bg-surface-hover",
        unavailable && "cursor-not-allowed opacity-50 hover:bg-transparent"
      )}
    >
      {target.kind === "team" ? (
        <TeamMark />
      ) : (
        <Avatar
          size="md"
          initials={target.initials}
          color={target.color}
          status={target.status}
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label-md text-foreground">
          {target.name}
        </span>
        <span className="block truncate text-paragraph-sm text-muted-foreground">
          {unavailable ? "Do not disturb" : target.detail}
        </span>
      </span>
      {selected ? (
        <IconCheck size={16} className="size-4 shrink-0 text-brand" />
      ) : null}
    </button>
  );
}

/* ── Voicemail drop ─────────────────────────────────────────────────────── */

/**
 * Confirmation, not a toggle. Dropping a greeting ends the call, and there is
 * no undo on a recording the customer already has — so the agent picks which
 * one plays and commits, rather than firing the last-used one off one click.
 */
export function VoicemailSurface({
  onDrop,
  onClose,
}: {
  onDrop: (greetingId: string) => void;
  onClose: () => void;
}) {
  const [greetingId, setGreetingId] = useState(VOICEMAIL_GREETINGS[0].id);

  return (
    <SurfacePanel
      icon={<IconVoicemailDrop size={16} />}
      title="Voicemail drop"
      closeLabel="Close voicemail drop"
      onClose={onClose}
    >
      <p className="shrink-0 border-b border-line px-4 py-2.5 text-paragraph-sm text-muted-foreground">
        The greeting plays to the customer and the call ends.
      </p>

      <div
        role="radiogroup"
        aria-label="Greeting"
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1"
      >
        {VOICEMAIL_GREETINGS.map((greeting) => {
          const active = greeting.id === greetingId;
          return (
            <button
              key={greeting.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setGreetingId(greeting.id)}
              className={cn(
                "flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-brand/24",
                active ? "bg-brand-subtle" : "hover:bg-surface-hover"
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-label-md text-foreground">
                  {greeting.label}
                </span>
                <span className="shrink-0 text-label-xs text-muted-foreground tabular-nums">
                  {greeting.durationLabel}
                </span>
                {active ? (
                  <IconCheck size={16} className="size-4 shrink-0 text-brand" />
                ) : null}
              </span>
              <span className="line-clamp-2 text-paragraph-sm text-muted-foreground">
                “{greeting.preview}”
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-line p-3">
        <Button
          variant="grey-outline"
          size="sm"
          className="flex-1"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          leftIcon={<IconVoicemailDrop size={16} />}
          onClick={() => onDrop(greetingId)}
        >
          Drop
        </Button>
      </div>
    </SurfacePanel>
  );
}

/* ── The model the bar and the phone share ──────────────────────────────── */

/**
 * Everything the three opening controls need, as one prop.
 *
 * Bundled rather than spread because it travels four components deep — the
 * ringing phone's Keypad and the bar's Keypad are the same control mid-morph,
 * so both ends read the same state, and threading a dozen callbacks through
 * `InCallShell` → `CallMorphStage` → `LiveCallStage` twice over would bury the
 * props that actually differ between them.
 */
export interface CallControlsModel {
  surface: CallSurface | null;
  /** DTMF sent this call, oldest first. */
  tones: string;
  transfer: CallTransfer | null;
  voicemail: VoicemailDrop | null;
  /** The line is on its way somewhere else — nothing else may touch it. */
  busy: boolean;
  onSurfaceToggle: (next: CallSurface) => void;
  onSurfaceClose: () => void;
  onTone: (digit: string) => void;
  onTonesClear: () => void;
  onTransferStart: (target: TransferTarget, mode: TransferMode) => void;
  onTransferComplete: () => void;
  onTransferCancel: () => void;
  onVoicemailDrop: (greetingId: string) => void;
}

/**
 * What the bar says under the caller's name.
 *
 * One line, and the line the agent needs most: a transfer or a voicemail drop
 * is about to take the call away, which outranks the hold it put the customer
 * on to get there. Returns null when there is nothing to say and the clock
 * should stand alone.
 */
export function callStatusLabel(
  controls: Pick<CallControlsModel, "transfer" | "voicemail">,
  onHold: boolean
): string | null {
  if (controls.voicemail) return "Dropping voicemail";
  const { transfer } = controls;
  if (transfer) {
    const target = TRANSFER_TARGETS.find((item) => item.id === transfer.targetId);
    const who = target?.shortName ?? "colleague";
    return transfer.stage === "consulting"
      ? `Consulting ${who}`
      : `Transferring to ${who}`;
  }
  if (onHold) return "On hold";
  return null;
}
