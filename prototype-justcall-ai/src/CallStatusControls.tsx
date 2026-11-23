import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";
import { usePresence } from "@/lib/usePresence";
import { Button } from "@/components/Button";
import { IconClose, IconVoice } from "@/components/Icon";
import { Tabs } from "@/components/Tabs";
import { IconCallRecord, IconCallStop } from "./icons/CallControlIcons";
import {
  IconQualityArticle,
  IconQualityFeedback,
  IconQualityHeadphones,
  IconQualityLevels,
  IconQualityNetworkTest,
  IconQualitySignal,
} from "./icons/CallQualityIcons";
import {
  CallPopover,
  CallPopoverRow,
  CallPopoverSection,
  SignalStrength,
  useCallPopover,
} from "./CallPopover";
import {
  CALL_QUALITY_COPY,
  NETWORK_CHECK_COPY,
  NETWORK_TIERS,
  QUALITY_HELP_LINKS,
  QUALITY_TIP_GROUPS,
  SELECTABLE_AVAILABILITY,
  availabilityById,
  busyReasonById,
  offeredBusyReasons,
  type AvailabilityId,
  type BusyReason,
  type BusyReasonId,
  type NetworkReading,
  type NetworkTier,
  type QualityTipIcon,
} from "./callDeviceData";
/**
 * The bar controls that report on the call rather than run it: how the agent's
 * availability stands, how the line is holding up, whether the call is being
 * recorded, and which devices the audio is going through.
 *
 * Grouped apart from `CallLineControls` because none of them touch the line.
 * The distinction is visible on the bar too — these sit on the left, beside the
 * caller, and the ones that act on the call sit on the right beside End call.
 */

/* ── Availability ──────────────────────────────────────────────────────── */

/**
 * Available or Unavailable, and nothing else.
 *
 * A switch rather than a list because there are only ever two answers to the
 * question it asks — *are you taking calls* — and a two-item list makes the
 * agent read both rows to find out which one they are on. The switch says it
 * with position.
 *
 * The thumb is absolutely positioned and animates `translate` alone, so
 * nothing in flow reflows and the label under it never re-wraps mid-slide
 * (CLAUDE.md §4).
 */
function AvailabilityToggle({
  value,
  onChange,
  className,
}: {
  value: AvailabilityId;
  onChange: (next: AvailabilityId) => void;
  className?: string;
}) {
  const index = Math.max(
    0,
    SELECTABLE_AVAILABILITY.findIndex((item) => item.id === value)
  );

  return (
    <div
      role="radiogroup"
      aria-label="Your status"
      className={cn(
        "relative mx-4 my-1 flex h-8 rounded-full bg-secondary-bg p-0.5",
        className
      )}
    >
      <span
        aria-hidden="true"
        style={{ translate: `calc(${index * 100}%) 0` }}
        // Half the track less its own 2px gutter, so one segment of travel is
        // exactly 100% of the thumb — same arithmetic as `CallPopoverTabs`.
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-background shadow-100 transition-[translate] duration-moderate ease-standard motion-reduce:transition-none"
      />
      {SELECTABLE_AVAILABILITY.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={item.id === value}
          onClick={() => onChange(item.id)}
          className={cn(
            "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] leading-4 outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-brand/24",
            item.id === value
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span
            aria-hidden="true"
            className={cn("size-2 shrink-0 rounded-full", item.dot)}
          />
          {item.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The status picker as the idle phone offers it: the switch, and — once
 * Unavailable is on — the reason it is carrying.
 *
 * Unavailable is not a status on its own, it is a status *and* a reason.
 * Tapping it therefore lands on the first offered reason immediately: an
 * agent who toggles Unavailable and closes without picking one is still
 * Unavailable, and the check on that first row is how they know they can
 * change it. Picking a different reason, or Available, is what puts the
 * panel away.
 */
function AvailabilityPicker({
  status,
  reason,
  reasons,
  onPick,
  onDismiss,
}: {
  status: AvailabilityId;
  reason: BusyReasonId | null;
  reasons: BusyReason[];
  onPick: (next: AvailabilityId, reason: BusyReasonId | null) => void;
  onDismiss: () => void;
}) {
  const offered = offeredBusyReasons(reasons);
  const value = status === "busy" ? "busy" : "available";

  const commit = (next: AvailabilityId, nextReason: BusyReasonId | null) => {
    onPick(next, nextReason);
    onDismiss();
  };

  return (
    <>
      <AvailabilityToggle
        value={value}
        onChange={(next) => {
          if (next === "available") {
            commit("available", null);
            return;
          }
          // Unavailable with no reasons set up is the whole answer — there
          // is no second half to ask for.
          if (offered.length === 0) {
            commit("busy", null);
            return;
          }
          // Already Unavailable: the list is up with their reason checked.
          // Re-tapping the switch they are on must not wipe Lunch back to
          // On a break.
          if (status === "busy") return;
          onPick("busy", offered[0].id);
        }}
      />
      {value === "busy" && offered.length > 0 ? (
        <CallPopoverSection label="Reason">
          {offered.map((item) => (
            <CallPopoverRow
              key={item.id}
              label={item.label}
              selected={reason === item.id}
              onClick={() => commit("busy", item.id)}
            />
          ))}
        </CallPopoverSection>
      ) : null}
    </>
  );
}

/**
 * Agent availability, in the three places it has to read: the idle phone's
 * notch, the live call bar, and wrap-up.
 *
 * `locked` is the whole design. On a call the status is a *consequence* — the
 * phone sets it, and offering the agent "Available" while they are mid-sentence
 * would be a lie. So a locked pill shows what the phone decided and moves the
 * switch to the only question the agent can actually answer: what happens once
 * this call is filed.
 */
export function AvailabilityControl({
  status,
  locked,
  reason = null,
  reasons = [],
  onStatusChange,
  side = "bottom",
  align = "center",
  className,
}: {
  status: AvailabilityId;
  /** Set by the phone, not the agent — on a call, or in wrap-up. */
  locked?: boolean;
  /** Why they are Unavailable. Meaningless on any other status. */
  reason?: BusyReasonId | null;
  /**
   * The unavailability reasons the admin has set up for this account.
   *
   * Only the unlocked picker reads it — `locked` has nothing to ask. An
   * account with none set up offers Unavailable on its own, so an empty list
   * is a real state here rather than a missing prop.
   */
  reasons?: BusyReason[];
  onStatusChange?: (next: AvailabilityId, reason: BusyReasonId | null) => void;
  side?: "bottom" | "top";
  align?: "start" | "end" | "center";
  className?: string;
}) {
  const popover = useCallPopover();
  const current = availabilityById(status);
  const busyReason = status === "busy" ? busyReasonById(reasons, reason) : null;

  // On a call there is nothing here to answer. The phone went Unavailable at
  // pickup and goes back to Available the moment the call is filed, so the
  // notch reports that and stops — a control whose only outcome is the one
  // the phone already picked reads as a choice the agent doesn't have.
  if (locked) {
    return (
      <span
        className={cn(
          "flex h-5 shrink-0 items-center gap-1.5 rounded-b-lg bg-badge-beta px-2",
          className
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-2 shrink-0 rounded-full", current.dot)}
        />
        <span className="text-[10px] leading-3 whitespace-nowrap text-white">
          {current.label}
        </span>
      </span>
    );
  }

  return (
    <div ref={popover.anchorRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`Your status: ${
          busyReason ? `${current.label}, ${busyReason.label}` : current.label
        }. Change it.`}
        aria-expanded={popover.open}
        onClick={popover.toggle}
        className={cn(
          "flex h-5 items-center gap-1.5 rounded-b-lg bg-badge-beta px-2 outline-none transition-colors duration-base hover:bg-gray-600 focus-visible:ring-2 focus-visible:ring-white/40",
          className
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-2 shrink-0 rounded-full", current.dot)}
        />
        {/* The reason replaces the status rather than trailing it: the red
            dot already says off the queue, so spelling out "Unavailable" next
            to "On a break" spends the notch's width saying the same thing
            twice. An agent who went unavailable an hour ago has forgotten
            which reason they gave, and it is the half a floor lead reads. */}
        <span className="text-[10px] leading-3 whitespace-nowrap text-white">
          {busyReason ? busyReason.label : current.label}
        </span>
      </button>

      {popover.mounted ? (
        <CallPopover
          state={popover.state}
          side={side}
          align={align}
          className="w-[264px]"
          title="Your status"
        >
          <AvailabilityPicker
            status={status}
            reason={reason}
            reasons={reasons}
            onPick={(next, nextReason) => {
              onStatusChange?.(next, nextReason);
            }}
            onDismiss={popover.close}
          />
        </CallPopover>
      ) : null}
    </div>
  );
}

/**
 * The status, with nothing to press.
 *
 * Every place this appears — the live call bar, wrap-up — is a moment the phone
 * owns the status outright. The agent is mid-sentence or already filing; there
 * is no version of the question they could answer now that they could not
 * answer before pickup, so the pill reports and stops there rather than
 * offering a control that only ever leads to one honest answer.
 *
 * It reports the current status alone. Where the status goes next is not a
 * decision the agent makes mid-call — the phone takes them off the queue at
 * pickup and puts them back on once the call is filed — so there is no second
 * half worth the room, and an arrow here would announce a choice they never
 * made.
 */
export function AvailabilityStatusPill({
  status,
  className,
  style,
}: {
  status: AvailabilityId;
  className?: string;
  style?: CSSProperties;
}) {
  const current = availabilityById(status);
  return (
    <span
      className={cn(
        "flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-white/12 px-2",
        className
      )}
      style={style}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", current.dot)}
      />
      <span className="text-[10px] leading-3 whitespace-nowrap text-white">
        {current.label}
      </span>
    </span>
  );
}

/* ── Network status & call quality ─────────────────────────────────────── */

const TIER_TONE = { good: "good", fair: "warn", poor: "bad" } as const;

/** The verdict word's colour — badge text tokens, so it reads as a label. */
const TIER_TEXT: Record<NetworkTier, string> = {
  good: "text-success-text",
  fair: "text-warning-text",
  poor: "text-error",
};

/** The banner's surface, one tint per verdict. */
const TIER_SURFACE: Record<NetworkTier, string> = {
  good: "bg-success-secondary",
  fair: "bg-warning-secondary",
  poor: "bg-error-secondary",
};

/**
 * Reception, and the two-step flow behind it.
 *
 * The bars alone are the ambient signal — they change colour on their own when
 * the line degrades, which is the only thing an agent mid-sentence has
 * attention for. A word appears beside them only once there is something
 * wrong, because "Good connection" spelled out next to four green bars is the
 * same information twice.
 *
 * Opening them gives the verdict and nothing else (`CheckNetworkCard`). The
 * advice — six tips and three articles — is a second step, behind
 * Troubleshoot, because on a good line it is nine rows the agent never wanted.
 */
export function NetworkStatusControl({
  reading,
  className,
  style,
}: {
  reading: NetworkReading;
  className?: string;
  style?: CSSProperties;
}) {
  const popover = useCallPopover();
  const [advice, setAdvice] = useState(false);

  // Reopening starts at step one again: the advice is somewhere the agent
  // asked to go, not where the control lives. Reset once the panel is gone
  // rather than when it starts closing, so the card doesn't swap mid-exit.
  useEffect(() => {
    if (!popover.mounted) setAdvice(false);
  }, [popover.mounted]);

  return (
    <div ref={popover.anchorRef} className="relative shrink-0" style={style}>
      <SignalTrigger
        reading={reading}
        open={popover.open}
        onClick={popover.toggle}
        className={className}
      />

      {popover.mounted ? (
        // The design puts the advice in a modal over the phone. On the bar it
        // can't be one: the agent is mid-sentence and the thing they were
        // reading is the workspace behind the bar, so the same card hangs off
        // the same trigger instead.
        <NetworkPanel
          state={popover.state}
          label={advice ? CALL_QUALITY_COPY.title : NETWORK_CHECK_COPY.title}
          pointer={!advice}
          className={advice ? "w-[302px]" : "w-[208px]"}
        >
          {advice ? (
            <CallQualityCard reading={reading} onClose={popover.close} />
          ) : (
            <CheckNetworkCard
              reading={reading}
              onTroubleshoot={() => setAdvice(true)}
            />
          )}
        </NetworkPanel>
      ) : null}
    </div>
  );
}

/**
 * The reception bars as a button, on the navy bar and inside the navy phone.
 * One drawing for both, so the two surfaces can never report the same line
 * two ways.
 */
function SignalTrigger({
  reading,
  open,
  onClick,
  className,
}: {
  reading: NetworkReading;
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  const tier = NETWORK_TIERS[reading.tier];

  return (
    <button
      type="button"
      aria-label={`${tier.label}. Check your network.`}
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        "flex h-6 items-center gap-1.5 rounded-full px-1.5 outline-none transition-colors duration-base hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/40",
        open && "bg-white/12",
        className
      )}
    >
      <SignalStrength bars={tier.bars} tone={TIER_TONE[reading.tier]} />
      {reading.tier !== "good" ? (
        <span
          className={cn(
            "text-[10px] leading-3 whitespace-nowrap",
            reading.tier === "fair" ? "text-warning" : "text-error-icon"
          )}
        >
          {tier.label}
        </span>
      ) : null}
    </button>
  );
}

/**
 * The popover shell for this flow, rather than `CallPopover`: the design's
 * card carries a pointer and no border, and the pointer has to sit *outside*
 * the card's rounded, clipped box. Everything else — the enter and exit skin,
 * the dismissal — is the same `.dropdown-panel` every other menu uses.
 */
function NetworkPanel({
  state,
  label,
  pointer,
  className,
  children,
}: {
  state: "open" | "closed";
  label: string;
  /** The tip that lands on the trigger. Off for the wider advice card. */
  pointer?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={label}
      data-state={state}
      className={cn(
        "dropdown-panel absolute top-full left-0 z-50 flex flex-col",
        className
      )}
    >
      {pointer ? (
        <span aria-hidden="true" className="relative h-2 shrink-0">
          {/* A rotated square rather than a triangle, so the diagonal
              inherits the card's own fill. Its lower half lands under the
              card, which paints after it and covers the seam. */}
          <span className="absolute top-[2px] left-3 size-3 rotate-45 rounded-tl-[2px] bg-background" />
        </span>
      ) : null}
      <div className="flex max-h-[420px] min-h-0 flex-col overflow-hidden rounded-md bg-background shadow-600">
        {children}
      </div>
    </div>
  );
}

/**
 * Step one — the verdict, in one word, and a way out if the agent disagrees
 * with it. Deliberately says nothing about latency or jitter: a number an
 * agent can't act on is a number that costs them a second mid-call.
 */
export function CheckNetworkCard({
  reading,
  onTroubleshoot,
}: {
  reading: NetworkReading;
  onTroubleshoot: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 p-3">
        <p className="text-label-sm text-foreground">
          {NETWORK_CHECK_COPY.title}
        </p>
        <p className={cn("text-label-sm capitalize", TIER_TEXT[reading.tier])}>
          {NETWORK_TIERS[reading.tier].word}
        </p>
      </div>
      <div className="h-px shrink-0 bg-line" />
      <div className="flex flex-col gap-3 p-3">
        <p className="text-paragraph-sm text-muted-foreground">
          {NETWORK_CHECK_COPY.message}
        </p>
        <p className="text-paragraph-sm text-muted-foreground">
          {NETWORK_CHECK_COPY.prompt}
        </p>
        <Button
          variant="grey-outline"
          size="sm"
          className="w-full text-brand"
          onClick={onTroubleshoot}
        >
          {NETWORK_CHECK_COPY.action}
        </Button>
      </div>
    </>
  );
}

/* ── Call quality ──────────────────────────────────────────────────────── */

type QualityTab = "tips" | "links";

const QUALITY_TABS = [
  { key: "tips", label: "Quick tips" },
  { key: "links", label: "Help links" },
];

/**
 * Step two — the advice. The banner repeats the verdict the agent just read,
 * because by the time this card is open the popover that carried it is gone
 * and the tips only make sense against a reading.
 *
 * Fills whatever box it is given: a 302px panel on the bar, and the phone's
 * modal at the same width.
 */
export function CallQualityCard({
  reading,
  onClose,
  className,
}: {
  reading: NetworkReading;
  onClose: () => void;
  className?: string;
}) {
  const [tab, setTab] = useState<QualityTab>("tips");
  const tier = NETWORK_TIERS[reading.tier];

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-4 overflow-hidden bg-background p-4",
        className
      )}
    >
      <header className="relative flex h-6 shrink-0 items-center justify-center">
        <p className="text-label-md text-foreground">
          {CALL_QUALITY_COPY.title}
        </p>
        <button
          type="button"
          aria-label="Close call quality"
          onClick={onClose}
          className="absolute top-1/2 right-0 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors duration-micro hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={20} />
        </button>
      </header>

      <div
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-sm p-3",
          TIER_SURFACE[reading.tier]
        )}
      >
        <SignalStrength
          bars={tier.bars}
          tone={TIER_TONE[reading.tier]}
          surface="light"
        />
        <p className="min-w-0 flex-1 text-label-md text-foreground">
          {CALL_QUALITY_COPY.banner}
          <span className={TIER_TEXT[reading.tier]}>{tier.word}</span>
        </p>
      </div>

      <Tabs
        items={QUALITY_TABS}
        value={tab}
        onValueChange={(key) => setTab(key as QualityTab)}
        aria-label="Call quality advice"
        className="flex w-full shrink-0 border-b border-line"
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "tips" ? <QualityTips /> : <QualityHelpLinks />}
      </div>
    </div>
  );
}

/**
 * The advice as a modal over the phone's body — the design's own treatment,
 * and the right one at 360px: one thing at a time, with the nav still
 * reachable underneath.
 *
 * Mount it inside the phone's body region, not inside the row the bars sit in:
 * `inset-0` is what puts the scrim over everything the agent was reading.
 */
export function CallQualityModal({
  state,
  reading,
  onClose,
}: {
  state: "open" | "closed";
  reading: NetworkReading;
  onClose: () => void;
}) {
  return (
    <>
      <div
        aria-hidden="true"
        data-state={state}
        onClick={onClose}
        className="modal-scrim absolute inset-0 z-30 bg-foreground/40"
      />
      <div
        role="dialog"
        aria-label={CALL_QUALITY_COPY.title}
        data-state={state}
        className="modal-panel absolute inset-x-[29px] top-4 bottom-0 z-40 flex flex-col"
      >
        <CallQualityCard
          reading={reading}
          onClose={onClose}
          className="min-h-0 flex-1 rounded-lg shadow-600"
        />
      </div>
    </>
  );
}

/** Presence for the phone's modal — matches `.modal-panel`'s exit in base.css. */
export function useCallQualityModal() {
  const [open, setOpen] = useState(false);
  const { mounted, state } = usePresence(open, DURATION.base);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  return {
    mounted,
    state,
    show: useCallback(() => setOpen(true), []),
    close: useCallback(() => setOpen(false), []),
  };
}

/**
 * The bars and their popover, inside the phone. Same trigger and same step
 * one as the bar; step two is raised to the card, which is the only thing in a
 * position to put a modal over the whole body.
 */
export function PhoneNetworkCheck({
  reading,
  onTroubleshoot,
}: {
  reading: NetworkReading;
  onTroubleshoot: () => void;
}) {
  const popover = useCallPopover();

  return (
    <div ref={popover.anchorRef} className="relative shrink-0">
      <SignalTrigger
        reading={reading}
        open={popover.open}
        onClick={popover.toggle}
      />
      {popover.mounted ? (
        <NetworkPanel
          state={popover.state}
          label={NETWORK_CHECK_COPY.title}
          pointer
          className="w-[208px]"
        >
          <CheckNetworkCard
            reading={reading}
            onTroubleshoot={() => {
              popover.close();
              onTroubleshoot();
            }}
          />
        </NetworkPanel>
      ) : null}
    </div>
  );
}

/* ── Quick tips & help links ───────────────────────────────────────────── */

const TIP_ICONS: Record<QualityTipIcon, ReactNode> = {
  headphones: <IconQualityHeadphones />,
  mic: <IconVoice size={16} />,
  levels: <IconQualityLevels />,
  feedback: <IconQualityFeedback />,
  signal: <IconQualitySignal />,
  "network-test": <IconQualityNetworkTest />,
};

/**
 * What to try, grouped by whose problem it is. The icon is the only thing
 * carrying the group at a glance once the agent has read it once, which is
 * why every tip has one even though the heading already says the same.
 *
 * Groups sit a step further apart than the rows inside them, so the two
 * headings read as siblings rather than as one long list of eight.
 */
function QualityTips() {
  return (
    <div className="flex flex-col gap-4">
      {QUALITY_TIP_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-3">
          <p className="text-label-sm text-foreground">{group.label}</p>
          {group.tips.map((tip) => (
            <div key={tip.text} className="flex items-start gap-2">
              <span className="flex size-4 shrink-0 items-center justify-center text-brand">
                {TIP_ICONS[tip.icon]}
              </span>
              <p className="min-w-0 flex-1 text-paragraph-sm text-muted-foreground">
                {tip.text}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The longer answers, which live in the help centre. They open in a new tab
 * deliberately — the one thing this card must never do is take the agent off
 * the call they are on.
 */
function QualityHelpLinks() {
  return (
    <div className="flex flex-col gap-3">
      {QUALITY_HELP_LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="flex items-start gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <span className="flex size-4 shrink-0 items-center justify-center text-brand">
            <IconQualityArticle />
          </span>
          <span className="min-w-0 flex-1 text-paragraph-sm text-brand hover:underline">
            {link.title}
          </span>
        </a>
      ))}
    </div>
  );
}

/* ── Recording ─────────────────────────────────────────────────────────── */

export type RecordingState = "recording" | "stopped";

export interface RecordingController {
  state: RecordingState;
  /** Length of the file being captured, frozen once it is closed. */
  recordedMs: number;
  start: () => void;
  stop: () => void;
}

/**
 * Recording, measured off the call's own clock rather than a second timer.
 *
 * The call already ticks `elapsedMs`; deriving from it means the recording
 * counter can never drift from the call duration next to it.
 *
 * Two states, because the recorder only has two: it is capturing or it is
 * not. There is deliberately no pause — a paused recording closes its file
 * exactly the way a stopped one does, so offering both would be two words for
 * one outcome, and the softer word is the one agents would reach for without
 * realising it ends the take.
 *
 * Starts armed: a JustCall call is recorded by default, so `stopped` is only
 * ever reached by an agent stopping one.
 */
export function useRecording(elapsedMs: number): RecordingController {
  const [state, setState] = useState<RecordingState>("recording");
  const [startedAt, setStartedAt] = useState(0);
  // Frozen at the moment of Stop, so the pill keeps reporting the length of
  // what was captured instead of counting on past the end of it.
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);

  const recordedMs = Math.max(0, (stoppedAt ?? elapsedMs) - startedAt);

  return {
    state,
    recordedMs,
    start: () => {
      setStartedAt(elapsedMs);
      setStoppedAt(null);
      setState("recording");
    },
    stop: () => {
      setStoppedAt(elapsedMs);
      setState("stopped");
    },
  };
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

const RECORDING_COPY: Record<
  RecordingState,
  { label: string; dot: string; pill: string; text: string }
> = {
  recording: {
    label: "Recording",
    dot: "bg-error",
    pill: "bg-white",
    text: "text-error",
  },
  stopped: {
    label: "Not recording",
    dot: "bg-disabled-fg",
    pill: "bg-white/12",
    text: "text-white/70",
  },
};

/**
 * The recording pill. It was a static label; whether a call is being captured
 * is consequential — a stopped recording that reads as running is a compliance
 * problem — so the pill says which it is, and opens the way out of it.
 *
 * The panel behind it is deliberately short. Stopping used to be spelled out —
 * a caution line under the row saying the file couldn't be resumed — but the
 * state is already named twice above it, and one loud verb plus `danger` reads
 * as consequential faster than a sentence explaining that it is. The
 * read-out carries the facts; the row carries the one thing to do.
 */
/**
 * Header line for the phone's sheet, which needs a title to hang its close
 * button off. The bar's popover renders no header at all: its trigger is a
 * pill that already reads "Recording 0:04" or "Not recording", so a panel
 * repeating that above a single action was saying the state twice.
 */
export function recordingCopy(recording: RecordingController) {
  return {
    title: "Recording",
    description:
      recording.state === "recording"
        ? `Capturing · ${formatClock(recording.recordedMs)}`
        : recording.recordedMs > 0
          ? `Stopped · ${formatClock(recording.recordedMs)} captured`
          : "Not recording",
  };
}

/**
 * The one transition out of whatever state the recording is in — there is only
 * ever one, because there are only two states to move between.
 */
export function RecordingBody({
  recording,
  onDone,
}: {
  recording: RecordingController;
  /** Close the surface — one tap should both act and put the panel away. */
  onDone: () => void;
}) {
  const act = (run: () => void) => () => {
    run();
    onDone();
  };

  return (
    <CallPopoverSection>
      {recording.state === "recording" ? (
        <CallPopoverRow
          label="Stop recording"
          danger
          leading={<IconCallStop size={16} className="size-4" />}
          trailing={null}
          onClick={act(recording.stop)}
        />
      ) : (
        <CallPopoverRow
          label="Start recording"
          leading={<IconCallRecord size={16} className="size-4" />}
          trailing={null}
          onClick={act(recording.start)}
        />
      )}
    </CallPopoverSection>
  );
}

export function RecordingControl({
  recording,
  onOpenSheet,
  sheetOpen,
  className,
  style,
}: {
  recording: RecordingController;
  /**
   * Hand the transitions to a surface the caller owns instead of opening a
   * popover here. The phone passes this: its card clips its own overflow, so a
   * 268px panel hanging off a pill in the top-right corner is cut in half.
   */
  onOpenSheet?: () => void;
  sheetOpen?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const popover = useCallPopover();
  const copy = RECORDING_COPY[recording.state];
  const live = recording.state === "recording";

  return (
    <div ref={popover.anchorRef} className="relative shrink-0" style={style}>
      <button
        type="button"
        aria-label={`${copy.label}. Open recording controls.`}
        aria-expanded={onOpenSheet ? sheetOpen : popover.open}
        onClick={onOpenSheet ?? popover.toggle}
        className={cn(
          "flex h-6 items-center gap-1.5 rounded-full px-2 outline-none transition-colors duration-base focus-visible:ring-2 focus-visible:ring-white/40",
          copy.pill,
          live ? "hover:bg-surface-hover" : "hover:bg-white/20",
          className
        )}
      >
        <span
          aria-hidden="true"
          data-state={recording.state}
          className={cn(
            "recording-dot size-2 shrink-0 rounded-full",
            copy.dot
          )}
        />
        <span
          className={cn("text-[10px] leading-3 whitespace-nowrap", copy.text)}
        >
          {copy.label}
        </span>
        {live ? (
          <span
            className={cn(
              "text-[10px] leading-3 whitespace-nowrap tabular-nums",
              copy.text
            )}
          >
            {formatClock(recording.recordedMs)}
          </span>
        ) : null}
      </button>

      {!onOpenSheet && popover.mounted ? (
        <CallPopover
          state={popover.state}
          align="start"
          className="w-[268px]"
          label="Recording"
        >
          <RecordingBody recording={recording} onDone={popover.close} />
        </CallPopover>
      ) : null}
    </div>
  );
}
