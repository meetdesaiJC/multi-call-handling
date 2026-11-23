import { useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { IconAlertTriangleFilled, IconCircleCheckFilled } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { type GuidanceResource } from "./guidanceData";
import {
  GUIDANCE_AI_THEME,
  GuidanceAiHeader,
  GuidanceFeedbackBar,
  GuidanceResourceLink,
  GuidanceResourcePreview,
  GuidanceSuggestedResponse,
  GuidanceTalkingPoints,
  type GuidanceFeedback,
} from "./GuidanceCard";
import type { GuidanceSuggestion } from "./callSimulation";
import type { GuidanceCardStatus } from "./useGuidanceStream";

/**
 * State chip. Quiet by design: it tells the agent something landed without
 * asking for their attention — no pulse, no glow (§11).
 *
 * Unread is a dot rather than a word, because it has to outlive the entrance
 * pulse without competing with the card title for the rest of the call. The
 * word "New" rides alongside it for the first few seconds only — long enough
 * to say what the dot means, short enough that a column of closed cards
 * doesn't turn into a wall of labels (§12).
 */
export function GuidanceStateBadge({
  status,
  relevantAgain,
  expanded,
  newLabel = false,
  reduced,
}: {
  status?: GuidanceCardStatus;
  relevantAgain?: boolean;
  expanded?: boolean;
  /** Still inside the window where the dot spells itself out. */
  newLabel?: boolean;
  reduced?: boolean;
}) {
  // Open is read, so the unread dot is only ever about a card the agent closed.
  // The words stay either way: "Earlier" explains why an open card just sank
  // down the column, and "Relevant again" why one came back up.
  const unread = !expanded && !relevantAgain && status === "new";
  const label = relevantAgain
    ? "Relevant again"
    : status === "expired"
      ? "Earlier"
      : null;
  if (!unread && !label) return null;

  const word = cn(
    "text-[11px] leading-4 font-medium whitespace-nowrap",
    status === "expired" && !relevantAgain
      ? "text-muted-foreground"
      : "text-brand"
  );

  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1.5",
        !reduced && "assist-badge-in"
      )}
    >
      {unread ? (
        <>
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-brand"
          />
          {/* The dot carries no text of its own, so the word is either shown
              or read out — never neither. */}
          {newLabel ? <span className={word}>New</span> : <span className="sr-only">New</span>}
        </>
      ) : (
        <span className={word}>{label}</span>
      )}
    </span>
  );
}

export function LiveGuidanceCard({
  item,
  reduced,
  cardRef,
  expanded = true,
  arriving = false,
  attention = false,
  status,
  relevantAgain = false,
  newLabel = false,
  pinned = false,
  pinDisabled = false,
  onToggle,
  onPin,
  onViewResource,
  actionSlot,
  className,
}: {
  item: GuidanceSuggestion;
  reduced: boolean;
  cardRef?: Ref<HTMLDivElement>;
  expanded?: boolean;
  arriving?: boolean;
  attention?: boolean;
  status?: GuidanceCardStatus;
  relevantAgain?: boolean;
  newLabel?: boolean;
  pinned?: boolean;
  pinDisabled?: boolean;
  onToggle?: () => void;
  onPin?: () => void;
  onViewResource: (resource: GuidanceResource) => void;
  /**
   * Recommended actions sit at the bottom of the guidance they belong to (§27),
   * so the agent reads what to say and what to do in one place.
   */
  actionSlot?: ReactNode;
  className?: string;
}) {
  const [feedback, setFeedback] = useState<GuidanceFeedback>(null);
  const response = item.item.suggestedResponse.trim();
  const talkingPoints = item.item.talkingPoints.filter((point) => point.trim()).slice(0, 3);
  const images = item.item.resources.filter((resource) => resource.type === "image");
  const links = item.item.resources.filter((resource) => resource.type === "link");
  const hasTalking = talkingPoints.length > 0;
  const pulse = !reduced && attention;

  return (
    <article
      ref={cardRef}
      role={item.priority === "critical" ? "alert" : undefined}
      className={cn(
        expanded ? GUIDANCE_AI_THEME.card : GUIDANCE_AI_THEME.cardCollapsed,
        !reduced && arriving && "assist-card-enter",
        pulse && "assist-card-attention",
        className
      )}
    >
      <GuidanceAiHeader
        title={item.item.name}
        expanded={expanded}
        onToggle={onToggle}
        action={
          onPin ? (
            <PinButton pinned={pinned} disabled={pinDisabled} onClick={onPin} />
          ) : undefined
        }
        badge={
          <GuidanceStateBadge
            status={status}
            relevantAgain={relevantAgain}
            expanded={expanded}
            newLabel={newLabel}
            reduced={reduced}
          />
        }
      />

      <div
        className={cn(
          "assist-card-body",
          expanded ? "assist-card-body-open" : "assist-card-body-closed"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-4 bg-white px-4 pt-4 pb-4">
            {response ? <GuidanceSuggestedResponse text={response} /> : null}

            {hasTalking ? <GuidanceTalkingPoints points={talkingPoints} /> : null}

            {images.map((resource) => (
              <GuidanceResourcePreview
                key={resource.id}
                resource={resource}
                onView={onViewResource}
              />
            ))}

            {links.map((resource) => (
              <GuidanceResourceLink key={resource.id} resource={resource} />
            ))}
          </div>

          {actionSlot}

          <GuidanceFeedbackBar
            feedback={feedback}
            onHelpful={() =>
              setFeedback((current) => (current === "helpful" ? null : "helpful"))
            }
            onNotHelpful={() =>
              setFeedback((current) => (current === "not-helpful" ? null : "not-helpful"))
            }
            className={GUIDANCE_AI_THEME.feedback}
          />
        </div>
      </div>
    </article>
  );
}

export function InCallGuidanceSlot({
  item,
  reduced,
  expanded,
  arriving,
  arrivalIndex = 0,
  attention,
  status,
  relevantAgain,
  newLabel,
  pinned,
  pinDisabled,
  onToggle,
  onPin,
  onViewResource,
  onEngage,
  onDisengage,
  actionSlot,
  cardRef,
  className,
}: {
  item: GuidanceSuggestion;
  reduced: boolean;
  expanded: boolean;
  arriving: boolean;
  /**
   * Place in the burst this card arrived with. Cards that land together enter
   * one `micro` step apart so the column reads as a sequence rather than a
   * shove — see `--assist-stagger` in styles.css (§10).
   */
  arrivalIndex?: number;
  attention: boolean;
  status?: GuidanceCardStatus;
  relevantAgain?: boolean;
  newLabel?: boolean;
  pinned?: boolean;
  pinDisabled?: boolean;
  onToggle: () => void;
  onPin?: () => void;
  onViewResource: (resource: GuidanceResource) => void;
  onEngage: () => void;
  onDisengage?: () => void;
  actionSlot?: ReactNode;
  cardRef?: Ref<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div
      ref={cardRef}
      className={cn(
        "shrink-0",
        !reduced && arriving && "assist-space-in",
        (reduced || !arriving) && "grid grid-rows-[1fr]",
        className
      )}
      // Inherited by the card and its pulse, so all three phases of the
      // arrival stay on the same clock.
      style={
        arriving && arrivalIndex > 0
          ? ({
              "--assist-stagger": `calc(${arrivalIndex} * var(--duration-micro))`,
            } as CSSProperties)
          : undefined
      }
      onPointerEnter={onEngage}
      onPointerLeave={onDisengage}
      onFocusCapture={onEngage}
    >
      <div className="min-h-0 overflow-hidden">
        <LiveGuidanceCard
          item={item}
          reduced={reduced}
          expanded={expanded}
          arriving={arriving}
          attention={attention}
          status={status}
          relevantAgain={relevantAgain}
          newLabel={newLabel}
          pinned={pinned}
          pinDisabled={pinDisabled}
          onToggle={onToggle}
          onPin={onPin}
          onViewResource={onViewResource}
          actionSlot={actionSlot}
        />
      </div>
    </div>
  );
}

export function PinButton({
  pinned,
  disabled,
  onClick,
}: {
  pinned: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={pinned ? "Unpin card" : "Pin card"}
      title={disabled ? "You can pin up to 3 cards" : pinned ? "Unpin card" : "Pin card"}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-[4px] outline-none transition-colors",
        pinned
          ? "bg-brand text-white hover:bg-brand-hover"
          : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        disabled &&
          "cursor-not-allowed text-disabled-fg hover:bg-transparent hover:text-disabled-fg",
        "focus-visible:ring-2 focus-visible:ring-brand/24"
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
        <path
          d="M5.1 2.5h5.8l-1.1 3 1.7 1.7v1H8.7V13L8 14l-.7-1V8.2H4.5v-1l1.7-1.7-1.1-3Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * The one interruption the agent gets. Critical guidance queues under the card
 * they're reading like everything else — this says so out loud instead of
 * swapping the column out from under them (§7).
 */
export function CriticalGuidanceAlert({
  name,
  reduced,
  onFocus,
}: {
  name: string;
  reduced: boolean;
  onFocus: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFocus}
      aria-live="assertive"
      aria-label={`Important guidance available: ${name}`}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-warning-border bg-warning-secondary px-3 py-2 text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24",
        !reduced && "assist-card-enter"
      )}
    >
      <IconAlertTriangleFilled
        size={16}
        className="size-4 shrink-0 text-warning-text"
      />
      {/* The card itself is right underneath, so the name doesn't repeat here. */}
      <span className="min-w-0 flex-1 truncate text-label-md font-medium text-foreground">
        Important guidance available
      </span>
    </button>
  );
}

/**
 * The stack stays about four cards deep. Everything else is still there —
 * one tap away, not gone (§4).
 */
export function GuidanceStackOverflow({
  count,
  reduced,
  onShowAll,
}: {
  count: number;
  reduced: boolean;
  onShowAll: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onShowAll}
      className={cn(
        "shrink-0 cursor-pointer self-start rounded-[4px] px-0.5 py-0.5 text-[11px] leading-4 text-muted-foreground",
        "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
        !reduced && "animate-[assist-queue-in_160ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
    >
      {count} more {count === 1 ? "suggestion" : "suggestions"}
    </button>
  );
}

export function GuidanceQueue({
  items,
  unseenIds,
  reduced,
  expanded,
  onOpen,
  onExpand,
}: {
  items: GuidanceSuggestion[];
  unseenIds: Set<string>;
  reduced: boolean;
  expanded: boolean;
  onOpen: (id: string) => void;
  onExpand: () => void;
}) {
  if (items.length === 0) return null;

  const visible = expanded || items.length <= 2 ? items : items.slice(0, 2);
  const hidden = items.length - visible.length;
  const unseenCount = items.filter((item) => unseenIds.has(item.id)).length;

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        !reduced && "animate-[assist-queue-in_160ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
    >
      {unseenCount > 0 && items.length > 2 ? (
        <p className="px-0.5 text-[11px] leading-4 text-muted-foreground tabular-nums">
          {unseenCount} new guidance
        </p>
      ) : null}
      <ul className="overflow-hidden rounded-lg border border-line">
        {visible.map((item) => {
          const unseen = unseenIds.has(item.id);
          return (
            <li key={item.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => onOpen(item.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24",
                  unseen &&
                    !reduced &&
                    "animate-[assist-new-row_900ms_cubic-bezier(0.23,1,0.32,1)_both]"
                )}
              >
                <span className="min-w-0 flex-1 truncate text-paragraph-sm text-foreground">
                  {item.item.name}
                </span>
                {unseen ? (
                  <span className="shrink-0 text-[11px] leading-4 font-medium text-brand">
                    New
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={onExpand}
          className="cursor-pointer self-start px-0.5 text-[11px] leading-4 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          +{hidden} more
        </button>
      ) : null}
    </div>
  );
}

export function CriticalPin({
  item,
  reduced,
}: {
  item: GuidanceSuggestion;
  reduced: boolean;
}) {
  const [feedback, setFeedback] = useState<GuidanceFeedback>(null);
  const response = item.item.suggestedResponse.trim();
  const talkingPoints = item.item.talkingPoints.filter((point) => point.trim()).slice(0, 3);

  return (
    <div
      role="alert"
      className={cn(
        GUIDANCE_AI_THEME.card,
        !reduced && "assist-card-enter"
      )}
    >
      <GuidanceAiHeader title={item.item.name} />
      <div className="flex flex-col gap-4 bg-white px-4 pt-4 pb-4">
        {response ? <GuidanceSuggestedResponse text={response} /> : null}
        <GuidanceTalkingPoints points={talkingPoints} />
      </div>
      <GuidanceFeedbackBar
        feedback={feedback}
        onHelpful={() =>
          setFeedback((current) => (current === "helpful" ? null : "helpful"))
        }
        onNotHelpful={() =>
          setFeedback((current) => (current === "not-helpful" ? null : "not-helpful"))
        }
        className={GUIDANCE_AI_THEME.feedback}
      />
    </div>
  );
}

export function HandledNotice({
  name,
  reduced,
  onUndo,
}: {
  name: string;
  reduced: boolean;
  onUndo?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-1 py-1",
        !reduced && "animate-[assist-queue-in_160ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
    >
      <IconCircleCheckFilled size={16} className="size-4 shrink-0 text-success" />
      <p className="min-w-0 flex-1 truncate text-paragraph-sm text-muted-foreground">
        {name}
      </p>
      {onUndo ? (
        <button
          type="button"
          onClick={onUndo}
          className="shrink-0 cursor-pointer text-[11px] leading-4 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          Undo
        </button>
      ) : null}
    </div>
  );
}
