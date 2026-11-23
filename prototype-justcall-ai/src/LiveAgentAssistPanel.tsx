import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
  type SVGProps,
} from "react";
import {
  IconAlertTriangleFilled,
  IconChevronDown,
  IconClose,
  IconInfoCircle,
  IconSearch,
} from "@/components/Icon";
import { WaveformLoader } from "@/components/WaveformLoader";
import { cn } from "@/lib/utils";
import {
  SEED_GUIDANCE,
  type GuidanceItem,
  type GuidanceResource,
} from "./guidanceData";
import {
  SEED_KNOWLEDGE_SOURCES,
  knowledgeFacts,
  retrieveKnowledge,
  type KnowledgeSourceRecord,
} from "./knowledgeData";
import {
  SEED_COACHING_RULES,
  coachingCardMessage,
  type CoachingRule,
} from "./coachingData";
import { type AgentAssistScope } from "./agentAssistScope";
import { CoachingCardFace, coachingTone } from "./coachingVisuals";
import {
  InCallActionDoneCard,
  InCallActionReviewCard,
  InCallActionSuggestionCard,
  InCallEmailReviewCard,
  InCallEmailSuggestionCard,
} from "./InCallActionCard";
import {
  SEED_ACTIONS,
  SEED_INTEGRATIONS,
  integrationById,
  integrationDoneLabel,
  integrationFailedLabel,
  integrationWriteLabel,
  type ActionState,
  type AgentAction,
  type Integration,
  type SuggestedAction,
} from "./actionsData";
import {
  simulationAt,
  type CallScenario,
  type CoachingCue,
  type GuidanceSuggestion,
  type KnowledgeSurface,
} from "./callSimulation";
import {
  GUIDANCE_AI_THEME,
  GuidanceFeedbackBar,
  GuidanceResourceLink,
  GuidanceResourceModal,
  GuidanceSparklesIcon,
  type GuidanceFeedback,
} from "./GuidanceCard";
import {
  CriticalGuidanceAlert,
  InCallGuidanceSlot,
  LiveGuidanceCard,
  PinButton,
} from "./LiveGuidance";
import {
  CARD_ENTER_MS,
  useGuidanceStream,
  type GuidanceStreamCard,
} from "./useGuidanceStream";
import { isAtFeedGrowthEdge, useGuidanceFeed } from "./useGuidanceFeed";

/**
 * In-call Agent Assist — one panel for everything the agent gets in real time.
 * There are no tabs. Cards share a single stream: each one lands in the order
 * it fired. Guidance, knowledge, and actions stay; coaching is a live nudge
 * about this moment, so a new cue replaces the last one instead of stacking.
 */

/**
 * The newest card lands at the top of this column — see `useStableStreamOrder`.
 * Mid-call the thing that just became relevant is the thing to read, so it goes
 * where the agent's eye already is. Every rule about not disturbing their
 * reading position depends on knowing that, because it means an arrival always
 * lands *above* whatever they have scrolled down to.
 */
const FEED_GROWTH = "top" as const;

/** Executed actions confirm, then collapse out of the way. */
const ACTION_DONE_HOLD_MS = 4200;
const ACTION_EXECUTE_MS = 750;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// ---------------------------------------------------------------------------
// Coaching
// ---------------------------------------------------------------------------

/** Outlined bulb — `icon-library/JustCall AI/bulb.svg`. */
function IconCoaching(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 10H3.33333M10 2.5V3.33333M16.6667 10H17.5M4.66667 4.66667L5.25 5.25M15.3333 4.66667L14.75 5.25M8.08333 14.1667H11.9167M7.5 13.3333C6.80039 12.8086 6.28361 12.0771 6.02286 11.2424C5.76211 10.4076 5.77061 9.51202 6.04715 8.68238C6.3237 7.85275 6.85427 7.13116 7.56371 6.61982C8.27315 6.10849 9.12549 5.83333 10 5.83333C10.8745 5.83333 11.7269 6.10849 12.4363 6.61982C13.1457 7.13116 13.6763 7.85275 13.9528 8.68238C14.2294 9.51202 14.2379 10.4076 13.9771 11.2424C13.7164 12.0771 13.1996 12.8086 12.5 13.3333C12.1746 13.6554 11.9297 14.0495 11.7849 14.4839C11.6401 14.9182 11.5996 15.3805 11.6667 15.8333C11.6667 16.2754 11.4911 16.6993 11.1785 17.0118C10.866 17.3244 10.442 17.5 10 17.5C9.55797 17.5 9.13405 17.3244 8.82149 17.0118C8.50893 16.6993 8.33333 16.2754 8.33333 15.8333C8.40038 15.3805 8.35988 14.9182 8.21511 14.4839C8.07034 14.0495 7.82536 13.6554 7.5 13.3333Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Coaching is about this moment, not a running list. Frequency still gates
 * whether a rule may fire again; a newer cue replaces the live card so
 * behavioural notes never pile up. Resolved cues come back at wrap.
 */
function useCoachingStack(cues: CoachingCue[], resetKey: string, reduced: boolean) {
  const [stack, setStack] = useState<CoachingCue[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [arrivingIds, setArrivingIds] = useState<Set<string>>(new Set());
  const seenCueIds = useRef(new Set<string>());
  const ruleHistory = useRef(new Map<string, number>());
  const stackRef = useRef<CoachingCue[]>([]);
  const prevReset = useRef(resetKey);
  stackRef.current = stack;

  const latestSig = cues.map((cue) => cue.id).join("|");

  useEffect(() => {
    let base = stackRef.current;
    if (prevReset.current !== resetKey) {
      prevReset.current = resetKey;
      seenCueIds.current = new Set();
      ruleHistory.current = new Map();
      base = [];
      setDismissedIds(new Set());
    }

    const fresh = cues.filter((cue) => !seenCueIds.current.has(cue.id));
    if (fresh.length === 0) {
      if (base !== stackRef.current) {
        stackRef.current = base;
        setStack(base);
        setArrivingIds(new Set());
      }
      return;
    }

    const accepted: CoachingCue[] = [];
    for (const cue of fresh) {
      seenCueIds.current.add(cue.id);
      const rule = cue.rule;
      const lastAt = ruleHistory.current.get(rule.id);
      if (lastAt !== undefined) {
        if (rule.frequency === "once") continue;
        if (
          rule.frequency === "cooldown" &&
          cue.atMs - lastAt < rule.cooldownMinutes * 60_000
        ) {
          continue;
        }
      }
      ruleHistory.current.set(rule.id, cue.atMs);
      accepted.push(cue);
    }

    if (accepted.length === 0) {
      if (base !== stackRef.current) {
        stackRef.current = base;
        setStack(base);
        setArrivingIds(new Set());
      }
      return;
    }

    const next = [...base, ...accepted];
    stackRef.current = next;
    setStack(next);
    const liveArriving = accepted.filter((cue) => !cue.resolved);
    const newest = liveArriving[liveArriving.length - 1];
    if (newest) {
      const superseded = [
        ...base.filter((cue) => !cue.resolved).map((cue) => cue.id),
        ...liveArriving.slice(0, -1).map((cue) => cue.id),
      ];
      if (superseded.length) {
        setDismissedIds((current) => {
          const nextIds = new Set(current);
          for (const id of superseded) nextIds.add(id);
          return nextIds;
        });
      }
      setArrivingIds(new Set([newest.id]));
    } else {
      setArrivingIds(new Set());
    }
    // Cue arrival is the only trigger; the cue list itself is derived state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestSig, resetKey]);

  const resolvedSig = cues
    .filter((cue) => cue.resolved)
    .map((cue) => cue.id)
    .join("|");

  useEffect(() => {
    if (!resolvedSig) return;
    const resolved = new Set(resolvedSig.split("|").filter(Boolean));
    setStack((current) =>
      current.map((cue) => (resolved.has(cue.id) ? { ...cue, resolved: true } : cue))
    );
  }, [resolvedSig]);

  useEffect(() => {
    if (arrivingIds.size === 0) return;
    const timer = window.setTimeout(
      () => setArrivingIds(new Set()),
      reduced ? 0 : CARD_ENTER_MS + 10
    );
    return () => window.clearTimeout(timer);
  }, [arrivingIds, reduced]);

  const unresolved = stack.filter(
    (cue) => !cue.resolved && !dismissedIds.has(cue.id)
  );
  const latestLive = unresolved[unresolved.length - 1];
  const latestResolved = stack.filter(
    (cue) => cue.resolved && !dismissedIds.has(cue.id)
  ).at(-1);

  return {
    stack: latestLive ? [latestLive] : latestResolved ? [latestResolved] : [],
    arrivingIds,
    acknowledge: (id: string) => {
      setDismissedIds((current) => {
        const next = new Set(current);
        next.add(id);
        return next;
      });
    },
  };
}

function CoachingCard({
  cue,
  arriving,
  reduced,
  onAcknowledge,
}: {
  cue: CoachingCue;
  arriving: boolean;
  reduced: boolean;
  onAcknowledge: () => void;
}) {
  const resolved = Boolean(cue.resolved);
  const observation = cue.detail || coachingCardMessage(cue.rule);
  const tone = coachingTone(cue.rule.templateId);

  return (
    <article
      role="status"
      className={cn(
        "shrink-0 overflow-hidden rounded-lg",
        resolved ? "border border-line bg-secondary-bg" : tone.card,
        !reduced && arriving && "assist-card-enter"
      )}
    >
      <CoachingCardFace
        rule={cue.rule}
        observation={observation}
        resolved={resolved}
        action={
          resolved ? (
            <span className="-mt-0.5 -mr-1 inline-flex h-7 shrink-0 items-center px-2 text-label-sm font-medium text-muted-foreground">
              Resolved
            </span>
          ) : (
            <button
              type="button"
              onClick={onAcknowledge}
              className={cn(
                "-mt-0.5 -mr-1 inline-flex h-7 shrink-0 cursor-pointer items-center rounded-[4px] px-2 text-label-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
                tone.ink,
                tone.hover
              )}
            >
              Got it
            </button>
          )
        }
      />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Knowledge
// ---------------------------------------------------------------------------

function IconKnowledge(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 3.25A1.25 1.25 0 0 1 3.75 2H7a1.5 1.5 0 0 1 1 .38A1.5 1.5 0 0 1 9 2h3.25a1.25 1.25 0 0 1 1.25 1.25v8.5A1.25 1.25 0 0 1 12.25 13H9.5a1.5 1.5 0 0 0-1.5 1 1.5 1.5 0 0 0-1.5-1H3.75A1.25 1.25 0 0 1 2.5 11.75v-8.5ZM8 3.5V14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Auto-surfaced answer. Brand-blue so it reads as retrieved knowledge, not
 * generated guidance. Facts first, source as a plain title link, then
 * the same feedback Guidance collects (§33).
 */
function KnowledgeCard({
  surface,
  expanded,
  arriving,
  reduced,
  pinned = false,
  pinDisabled = false,
  onPin,
  onToggle,
  cardRef,
  className,
}: {
  surface: KnowledgeSurface;
  expanded: boolean;
  arriving: boolean;
  reduced: boolean;
  pinned?: boolean;
  pinDisabled?: boolean;
  onPin?: () => void;
  onToggle: () => void;
  className?: string;
  /**
   * Registered with the feed's reading state, same as a guidance card: the
   * agent has one column and one unread count, so knowledge has to be visible
   * to the same observer that decides what has been read (§22).
   */
  cardRef?: Ref<HTMLElement>;
}) {
  const [feedback, setFeedback] = useState<GuidanceFeedback>(null);
  const uncertain = surface.confidence === "low";
  const { summary, points } = knowledgeFacts(surface.entry);

  return (
    <article
      ref={cardRef}
      className={cn(
        // shrink-0 matters: `overflow-hidden` zeroes the flex automatic
        // minimum size, so without it the card collapses to its borders
        // once the panel column runs out of room.
        "shrink-0 overflow-hidden rounded-lg border border-info-border bg-white",
        !expanded && "border-line",
        !reduced && arriving && "assist-card-enter",
        className
      )}
    >
      <div
        className={cn(
          "flex w-full items-center gap-1 pr-3",
          expanded && "bg-info-secondary"
        )}
      >
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24"
        >
          <IconKnowledge className="size-4 shrink-0 text-brand" />
          <span className="min-w-0 flex-1 truncate text-label-md font-medium text-foreground">
            {surface.entry.title}
          </span>
          <span
            className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
            aria-hidden="true"
          >
            <IconChevronDown
              size={16}
              className={cn(
                "transition-[rotate] duration-moderate ease-standard motion-reduce:transition-none",
                expanded && "rotate-180"
              )}
            />
          </span>
        </button>
        {onPin ? (
          <PinButton pinned={pinned} disabled={pinDisabled} onClick={onPin} />
        ) : null}
      </div>

      <div
        className={cn(
          "assist-card-body",
          expanded ? "assist-card-body-open" : "assist-card-body-closed"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 px-4 pt-3 pb-3">
            {uncertain ? (
              <p className="flex items-start gap-1.5 rounded-[6px] bg-warning-secondary px-2 py-1.5 text-paragraph-sm text-foreground">
                <IconInfoCircle size={16} className="mt-px size-4 shrink-0 text-warning" />
                <span className="text-pretty">
                  I found potentially relevant information — check it before you
                  say it.
                </span>
              </p>
            ) : null}

            {summary ? (
              <p className="text-pretty text-label-md text-foreground">
                {summary}
              </p>
            ) : null}

            {points.length > 0 ? (
              <ul className="list-disc space-y-1.5 pl-5">
                {points.map((point) => (
                  <li
                    key={point.heading}
                    className="text-pretty text-paragraph-md text-foreground marker:text-muted-foreground"
                  >
                    {point.heading}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-pretty text-paragraph-md text-foreground">
                {surface.entry.answer}
              </p>
            )}

            {/* Where the answer came from is always named — an agent about to
                say it out loud should be able to check it. The name is the
                page, not the Knowledge Base: the agent is deciding whether to
                open this link, and the base it sits in tells them nothing. */}
            <GuidanceResourceLink
              resource={{
                id: surface.entry.id,
                type: "link",
                name: surface.entry.sourceTitle ?? surface.sourceName,
                url: surface.entry.sourceUrl,
              }}
            />
          </div>
          <GuidanceFeedbackBar
            feedback={feedback}
            onHelpful={() =>
              setFeedback((current) => (current === "helpful" ? null : "helpful"))
            }
            onNotHelpful={() =>
              setFeedback((current) =>
                current === "not-helpful" ? null : "not-helpful"
              )
            }
            className={GUIDANCE_AI_THEME.feedback}
          />
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Suggested actions
// ---------------------------------------------------------------------------

function IconRetry(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M13.5 8a5.5 5.5 0 1 1-1.9-4.16M13.5 2.5V6H10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ActionRuntime {
  state: ActionState;
  /** Values the agent filled in for anything the conversation didn't supply. */
  filled: Record<string, string>;
  /** True once a first attempt has failed, so a retry can succeed. */
  attempted: boolean;
  /** The agent opened the review form, so sending stays inside it. */
  reviewed?: boolean;
}

function resolvedFields(action: SuggestedAction, runtime: ActionRuntime) {
  return action.fields.map((field) => ({
    ...field,
    value: field.missing ? runtime.filled[field.label] ?? "" : field.value,
    missing: field.missing && !runtime.filled[field.label]?.trim(),
  }));
}

function proposedValue(action: SuggestedAction, runtime: ActionRuntime) {
  const field =
    resolvedFields(action, runtime).find((item) => item.label === "New value") ??
    resolvedFields(action, runtime).find((item) => item.missing) ??
    resolvedFields(action, runtime)[resolvedFields(action, runtime).length - 1];
  return field;
}

/**
 * Independent Action card. Lightning, not sparkle — this is work to perform,
 * not generated guidance. Emails stay in review until the agent sends them
 * when confirmation is on; other writes follow the same rule.
 */
function SuggestedActionRow({
  action,
  runtime,
  reduced,
  integrations,
  onReview,
  onCancelReview,
  onFieldChange,
  onConfirm,
  onDismiss,
  onRetry,
}: {
  action: SuggestedAction;
  runtime: ActionRuntime;
  reduced: boolean;
  integrations: Integration[];
  onReview: () => void;
  onCancelReview: () => void;
  onFieldChange: (label: string, value: string) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  if (runtime.state === "dismissed") return null;

  const name = integrationName(action, integrations);
  const writeLabel = integrationWriteLabel(action, integrations);
  const busy = runtime.state === "executing";
  const reviewing = runtime.state === "reviewing";
  // An email the agent opened stays in its review form while it sends and if
  // it fails — the recipient, copy, and attachment they checked are still
  // there to retry from. Auto-sent emails never had a form to keep.
  const emailFormOpen =
    Boolean(action.email) &&
    (reviewing ||
      (Boolean(runtime.reviewed) && (busy || runtime.state === "failed")));

  if (runtime.state === "done") {
    return (
      <InCallActionDoneCard
        label={integrationDoneLabel(action, integrations)}
        viewUrl={action.viewUrl}
        viewName={name}
        className={cn(!reduced && "assist-card-enter")}
      />
    );
  }

  if (runtime.state === "permission_denied") {
    return (
      <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-warning-border bg-warning-secondary px-3 py-2.5">
        <div className="flex items-start gap-2">
          <IconAlertTriangleFilled
            size={16}
            className="mt-px size-4 shrink-0 text-warning"
          />
          <div className="min-w-0 flex-1">
            <p className="text-pretty text-label-md font-medium text-foreground">
              Action unavailable
            </p>
            <p className="text-pretty text-paragraph-sm text-muted-foreground">
              You don’t have permission to{" "}
              {action.email ? "send this email" : `update this ${name} record`}.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-7 cursor-pointer items-center self-end rounded-[4px] px-2 text-label-sm text-muted-foreground outline-none transition-colors hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (action.email && emailFormOpen) {
    return (
      <InCallEmailReviewCard
        title={action.title}
        toName={action.email.to}
        toEmail={runtime.filled["To email"] ?? action.email.toEmail}
        subject={runtime.filled.Subject ?? action.email.subject}
        message={runtime.filled.Message ?? action.email.body}
        attachments={action.email.attachments}
        sendState={
          busy ? "sending" : runtime.state === "failed" ? "failed" : "idle"
        }
        onToEmailChange={(value) => onFieldChange("To email", value)}
        onSubjectChange={(value) => onFieldChange("Subject", value)}
        onMessageChange={(value) => onFieldChange("Message", value)}
        onCancel={onCancelReview}
        onConfirm={runtime.state === "failed" ? onRetry : onConfirm}
        className={cn(!reduced && "assist-card-enter")}
      />
    );
  }

  if (runtime.state === "failed") {
    return (
      <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-error-border bg-error-subtle px-3 py-2.5">
        <div className="flex items-start gap-2">
          <IconAlertTriangleFilled
            size={16}
            className="mt-px size-4 shrink-0 text-error"
          />
          <div className="min-w-0 flex-1">
            <p className="text-pretty text-label-md font-medium text-foreground">
              {integrationFailedLabel(action, integrations)}
            </p>
            <p className="text-pretty text-paragraph-sm text-muted-foreground">
              {action.email
                ? "Something went wrong while sending this email. Nothing was sent."
                : "Something went wrong while updating this record. Nothing was changed."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-end">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-7 cursor-pointer items-center rounded-[4px] px-2 text-label-sm text-muted-foreground outline-none transition-colors hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-[4px] px-2 text-label-sm font-medium text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconRetry className="size-4 shrink-0" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  const fields = resolvedFields(action, runtime);
  const blocked = fields.some((field) => field.missing);
  const proposed = proposedValue(action, runtime);
  const property =
    fields.find((field) => field.label === "Property")?.value ?? action.summary;
  const editableFields = fields.filter(
    (field) => field.missing || runtime.filled[field.label] !== undefined
  );
  const readonlyFields = fields.filter(
    (field) => !editableFields.some((item) => item.label === field.label)
  );

  if (!reviewing && action.email) {
    const cta = action.requiresConfirmation ? "Review email" : "Send email";
    return (
      <InCallEmailSuggestionCard
        title={action.title}
        to={action.email.to}
        toEmail={runtime.filled["To email"] ?? action.email.toEmail}
        subject={action.email.subject}
        body={action.email.body}
        attachments={action.email.attachments}
        cta={cta}
        busy={busy}
        onReview={action.requiresConfirmation ? onReview : onConfirm}
        className={cn(!reduced && "assist-card-enter")}
      />
    );
  }

  if (!reviewing) {
    return (
      <InCallActionSuggestionCard
        title={action.title}
        property={property}
        value={
          proposed?.missing
            ? "Select a value"
            : proposed?.value || action.summary
        }
        recordLabel={`${name} ${action.recordLabel}`}
        recordValue={action.recordValue}
        busy={busy}
        onReview={onReview}
        className={cn(!reduced && "assist-card-enter")}
      />
    );
  }

  return (
    <InCallActionReviewCard
      writeLabel={writeLabel}
      recordLabel={action.recordLabel}
      recordValue={action.recordValue}
      readonlyFields={readonlyFields.map((field) => ({
        label: field.label,
        value: field.value,
      }))}
      editableFields={editableFields.map((field) => ({
        label: field.label,
        inputLabel: field.label === "New value" ? property : field.label,
        value: runtime.filled[field.label] ?? field.value,
        placeholder: `Select ${property.toLowerCase()}`,
        missing: field.missing,
        helpText: field.missing
          ? "Not found in the conversation — add it to continue."
          : undefined,
      }))}
      integrationName={name}
      onFieldChange={onFieldChange}
      onCancel={onCancelReview}
      onConfirm={onConfirm}
      confirmDisabled={blocked}
      className={cn(!reduced && "assist-card-enter")}
    />
  );
}

function integrationName(action: SuggestedAction, integrations: Integration[]): string {
  return (
    integrationById(integrations, action.integrationId)?.name ?? action.integrationId
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface StreamRow {
  id: string;
  atMs: number;
}

/**
 * How far ahead the panel looks for the next card. Long enough that "Building
 * context…" reads as work in progress, short enough that it only ever fires on
 * a moment that actually produces guidance — not on routine ticking.
 */
const PREPARING_LEAD_MS = 2000;

/**
 * The column before anything has landed. Agent Assist is listening either way;
 * this only says so, in one line, and stops as soon as the first card arrives.
 * It never comes back — once cards exist, the stream is the state.
 *
 * Driven by `show` rather than mounted conditionally, because the waveform
 * owns its own exit: unmounting the row the instant the first card lands would
 * cut that off, and the wait would end with a pop in the middle of a call.
 */
function GuidanceListeningState({
  show,
  preparing,
}: {
  show: boolean;
  preparing: boolean;
}) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (show) setGone(false);
  }, [show]);

  if (!show && gone) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-0.5 pt-3.5",
        !show && "assist-listen-out"
      )}
      aria-live="polite"
    >
      {/* Sits in the sparkle's slot. The wait has no progress to report, so
          the indicator says "working" and nothing more — and it says it with
          movement the agent can ignore while they are on a call. */}
      <span className="text-ai">
        <WaveformLoader show={show} onExited={() => setGone(true)} />
      </span>
      {/* Both lines share one grid cell, so the swap crossfades in place. */}
      <span className="grid text-paragraph-sm text-muted-foreground">
        <span
          aria-hidden={preparing}
          className={cn(
            "col-start-1 row-start-1 assist-listen-line",
            preparing && "is-out"
          )}
        >
          Listening to the conversation…
        </span>
        <span
          aria-hidden={!preparing}
          className={cn(
            "col-start-1 row-start-1 assist-listen-line",
            !preparing && "is-out"
          )}
        >
          Building context…
        </span>
      </span>
    </div>
  );
}

/**
 * Arrival order, frozen. New cards prepend newest-first so the latest cue is
 * at the top; cards already on screen never swap places with each other.
 */
function useStableStreamOrder<T extends StreamRow>(rows: T[]) {
  const orderRef = useRef<string[]>([]);
  const byId = new Map(rows.map((row) => [row.id, row]));

  const kept = orderRef.current.filter((id) => byId.has(id));
  const added = rows
    .filter((row) => !kept.includes(row.id))
    .sort((a, b) => b.atMs - a.atMs)
    .map((row) => row.id);

  const order = [...added, ...kept];
  orderRef.current = order;
  return order.map((id) => byId.get(id)!).filter(Boolean);
}

type PinnedAssistCard =
  | { key: string; kind: "guidance"; suggestion: GuidanceSuggestion }
  | { key: string; kind: "knowledge"; surface: KnowledgeSurface };

const MAX_PINNED_CARDS = 3;

export interface LiveAgentAssistPanelProps {
  elapsedMs: number;
  /**
   * V1 shows script guidance and knowledge answers only — no coaching cues and
   * no suggested actions. See `agentAssistScope`.
   */
  scope?: AgentAssistScope;
  scenario: CallScenario;
  guidanceItems?: GuidanceItem[];
  knowledgeSources?: KnowledgeSourceRecord[];
  coachingRules?: CoachingRule[];
  integrations?: Integration[];
  actions?: AgentAction[];
  /** Hangup — the live stream lets go before the phone changes state. */
  exiting?: boolean;
  /** Keep wrap-up in sync with actions the agent already ran. */
  onActionStatesChange?: (states: Record<string, ActionState>) => void;
  className?: string;
}

export function LiveAgentAssistPanel({
  elapsedMs,
  scope = "v2",
  scenario,
  guidanceItems = SEED_GUIDANCE,
  knowledgeSources = SEED_KNOWLEDGE_SOURCES,
  coachingRules = SEED_COACHING_RULES,
  integrations = SEED_INTEGRATIONS,
  actions: actionLibrary = SEED_ACTIONS,
  exiting = false,
  onActionStatesChange,
  className,
}: LiveAgentAssistPanelProps) {
  const reduced = prefersReducedMotion();
  /**
   * The simulation still produces coaching and actions in V1 — the scenarios
   * are shared. They are filtered at the point of display instead, so the
   * script and knowledge beats keep the timing they were authored with rather
   * than sliding earlier to fill the gaps.
   */
  const showsV2Stream = scope === "v2";
  const libraries = {
    knowledge: knowledgeSources,
    coaching: coachingRules,
    integrations,
    actions: actionLibrary,
  };
  const snapshot = simulationAt(scenario, elapsedMs, guidanceItems, libraries);

  const [viewingResource, setViewingResource] = useState<GuidanceResource | null>(null);
  const [collapsedKnowledge, setCollapsedKnowledge] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [pinnedCards, setPinnedCards] = useState<PinnedAssistCard[]>([]);
  const [collapsedPinned, setCollapsedPinned] = useState<Set<string>>(new Set());
  const [collapsedSearch, setCollapsedSearch] = useState<Set<string>>(new Set());
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  /**
   * Knowledge cards mid-entrance. Opt-in, like the guidance stream's own set:
   * the card mounts still and is only then told to animate, because whether it
   * may animate at all depends on where the agent is reading — and that is a
   * question you can only answer once the card is in the DOM.
   *
   * The guidance stream decides this for its own cards; knowledge arrives by a
   * different path and has to be held to the same rule, or the two card types
   * would answer the agent's scroll position differently (§3, §18).
   */
  const [enteringKnowledgeIds, setEnteringKnowledgeIds] = useState<Set<string>>(
    new Set()
  );
  const [actionRuntimes, setActionRuntimes] = useState<Record<string, ActionRuntime>>({});
  /** Done receipts leave the stream; the outcome still has to survive hangup. */
  const [collapsedActionIds, setCollapsedActionIds] = useState<Set<string>>(
    () => new Set()
  );

  /**
   * The scrolling column. Both hooks read it: the stream to decide whether the
   * agent is watching the end of the feed, the feed to decide what has been
   * read and to hold the reading position steady across arrivals.
   */
  const feedRef = useRef<HTMLDivElement | null>(null);

  const stream = useGuidanceStream({
    suggestions: snapshot.suggestions,
    steps: scenario.steps,
    playhead: Math.min(snapshot.scriptIndex, scenario.steps.length),
    reduced,
    handledIds: snapshot.handledIds,
    feedRef,
    feedGrowth: FEED_GROWTH,
  });
  const coaching = useCoachingStack(snapshot.coaching, scenario.id, reduced);

  useEffect(() => {
    setViewingResource(null);
    setActionRuntimes({});
    setCollapsedActionIds(new Set());
    setKnownIds(new Set());
    setEnteringKnowledgeIds(new Set());
    setCollapsedKnowledge(new Set());
    setQuery("");
    setPinnedCards([]);
    setCollapsedPinned(new Set());
    setCollapsedSearch(new Set());
  }, [scenario.id]);

  const pinnedKeys = new Set(pinnedCards.map((card) => card.key));
  const pinCard = (card: PinnedAssistCard) => {
    setPinnedCards((current) => {
      if (current.some((item) => item.key === card.key)) {
        return current.filter((item) => item.key !== card.key);
      }
      if (current.length >= MAX_PINNED_CARDS) {
        // Keep pinning a one-click action: the oldest response makes room for
        // the new one once the three-card limit is reached.
        return [...current.slice(1), card];
      }
      return [...current, card];
    });
  };

  const normalizedQuery = query.trim().toLowerCase();
  const searchedGuidance: GuidanceSuggestion[] = normalizedQuery
    ? guidanceItems
        .filter((item) => item.status === "live")
        .filter((item) =>
          [
            item.name,
            item.trigger,
            item.suggestedResponse,
            ...item.examplePhrases,
            ...item.talkingPoints,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        )
        .slice(0, 5)
        .map((item) => ({
          id: `search-guidance-${item.id}`,
          atMs: elapsedMs,
          quote: query,
          item,
          priority: "normal" as const,
          stance: "recommended" as const,
        }))
    : [];
  const searchedKnowledge: KnowledgeSurface[] = normalizedQuery
    ? retrieveKnowledge(query, knowledgeSources, 5).map((hit) => ({
        id: `search-knowledge-${hit.entry.id}`,
        atMs: elapsedMs,
        entry: hit.entry,
        sourceName: hit.source.name,
        sourceOrigin: hit.source.origin,
        confidence: hit.confidence,
        query,
      }))
    : [];

  // Knowledge answers a question that was just asked, so it lands open and
  // stays open — the agent closes it when they're done with it, and an answer
  // arriving for the next question doesn't fold the last one away (§32).
  const knowledgeSig = snapshot.knowledge.map((item) => item.id).join("|");
  // Layout, not post-paint: the entrance class has to be on the card before the
  // browser paints it, or it shows one frame of its settled state and then
  // fades in from nothing. Reading the scroll position here also gets it before
  // the feed's anchor correction moves it.
  useLayoutEffect(() => {
    const arriving = snapshot.knowledge.filter((item) => !knownIds.has(item.id));
    if (arriving.length === 0) return;
    if (isAtFeedGrowthEdge(feedRef.current, FEED_GROWTH)) {
      setEnteringKnowledgeIds(
        (current) => new Set([...current, ...arriving.map((item) => item.id)])
      );
    }
    setKnownIds(new Set(snapshot.knowledge.map((item) => item.id)));
    // A replay reuses ids, so an id the agent closed last time has to be let go.
    setCollapsedKnowledge((current) => {
      if (!arriving.some((item) => current.has(item.id))) return current;
      const next = new Set(current);
      arriving.forEach((item) => next.delete(item.id));
      return next;
    });
    // Arrival drives this; the list itself is derived from elapsed time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledgeSig]);

  // `animation-fill-mode: both` means pulling the class early snaps the card,
  // so it stays for the length of the entrance and no longer.
  useEffect(() => {
    if (enteringKnowledgeIds.size === 0) return;
    const timer = window.setTimeout(
      () => setEnteringKnowledgeIds(new Set()),
      reduced ? 0 : CARD_ENTER_MS + 10
    );
    return () => window.clearTimeout(timer);
  }, [enteringKnowledgeIds, reduced]);

  const runtimeFor = (id: string): ActionRuntime =>
    actionRuntimes[id] ?? { state: "suggested", filled: {}, attempted: false };

  const patchRuntime = (id: string, patch: Partial<ActionRuntime>) => {
    setActionRuntimes((current) => ({
      ...current,
      [id]: { ...runtimeFor(id), ...patch },
    }));
  };

  const openReview = (action: SuggestedAction) => {
    const runtime = runtimeFor(action.id);
    const filled = { ...runtime.filled };
    if (action.email) {
      if (filled["To email"] === undefined)
        filled["To email"] = action.email.toEmail;
      if (filled.Subject === undefined) filled.Subject = action.email.subject;
      if (filled.Message === undefined) filled.Message = action.email.body;
    } else {
      action.fields.forEach((field) => {
        if (field.missing && filled[field.label] === undefined) filled[field.label] = "";
      });
    }
    patchRuntime(action.id, { state: "reviewing", filled, reviewed: true });
  };

  const executeAction = (action: SuggestedAction) => {
    const runtime = runtimeFor(action.id);
    patchRuntime(action.id, { state: "executing" });
    window.setTimeout(() => {
      const permission = Boolean(action.simulatePermissionDenied);
      const fails = Boolean(action.simulateFailure) && !runtime.attempted;
      setActionRuntimes((current) => {
        const previous = current[action.id] ?? {
          state: "executing" as ActionState,
          filled: {},
          attempted: false,
        };
        return {
          ...current,
          [action.id]: {
            ...previous,
            state: permission
              ? "permission_denied"
              : fails
                ? "failed"
                : "done",
            attempted: true,
          },
        };
      });
    }, ACTION_EXECUTE_MS);
  };

  const demoStateSig = snapshot.actions
    .map((entry) => `${entry.id}:${entry.state ?? ""}`)
    .join("|");
  const demoDriven = snapshot.actions.some((entry) => entry.state);

  useEffect(() => {
    if (!demoDriven) return;
    setActionRuntimes((current) => {
      let changed = false;
      const next = { ...current };
      for (const entry of snapshot.actions) {
        if (!entry.state) continue;
        const previous = next[entry.id] ?? {
          state: "suggested" as ActionState,
          filled: {},
          attempted: false,
        };
        if (previous.state === entry.state) continue;
        next[entry.id] = {
          ...previous,
          state: entry.state,
          attempted: entry.state === "done" || previous.attempted,
        };
        changed = true;
      }
      return changed ? next : current;
    });
    // Demo clock drives this; the action list is derived from elapsed time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoStateSig]);

  const runtimeSig = Object.entries(actionRuntimes)
    .map(([id, runtime]) => `${id}:${runtime.state}`)
    .join("|");

  useEffect(() => {
    if (!onActionStatesChange) return;
    const merged: Record<string, ActionState> = {};
    for (const entry of snapshot.actions) {
      if (!entry.state) continue;
      merged[entry.id] = entry.state;
      if (entry.action.actionId) merged[entry.action.actionId] = entry.state;
    }
    for (const [id, runtime] of Object.entries(actionRuntimes)) {
      // Dismissing a suggestion is not an outcome. A completed receipt that
      // collapsed off the stream still has to land on the recap as done.
      if (runtime.state === "dismissed") continue;
      merged[id] = runtime.state;
    }
    onActionStatesChange(merged);
    // Parent stores this across hangup; snapshot + runtime are the sources.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoStateSig, runtimeSig]);

  // A confirmation is a receipt, not a permanent row — it collapses on its own
  // unless the demo is already choreographing completion and collapse.
  useEffect(() => {
    if (demoDriven) return;
    const doneIds = Object.entries(actionRuntimes)
      .filter(([, runtime]) => runtime.state === "done")
      .map(([id]) => id);
    if (doneIds.length === 0) return;
    const timers = doneIds.map((id) =>
      window.setTimeout(
        () =>
          setCollapsedActionIds((current) => {
            if (current.has(id)) return current;
            const next = new Set(current);
            next.add(id);
            return next;
          }),
        ACTION_DONE_HOLD_MS
      )
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    demoDriven,
    Object.entries(actionRuntimes)
      .filter(([, runtime]) => runtime.state === "done")
      .map(([id]) => id)
      .join("|"),
  ]);

  const isActionVisible = (id: string) =>
    runtimeFor(id).state !== "dismissed" && !collapsedActionIds.has(id);

  const visibleStreamActions = snapshot.actions
    .map((entry) => entry.action)
    .filter((action) => isActionVisible(action.id));

  const renderAction = (action: SuggestedAction) => (
    <SuggestedActionRow
      key={action.id}
      action={action}
      runtime={runtimeFor(action.id)}
      reduced={reduced}
      integrations={integrations}
      onReview={() => openReview(action)}
      onCancelReview={() => patchRuntime(action.id, { state: "suggested" })}
      onFieldChange={(label, value) =>
        patchRuntime(action.id, {
          filled: { ...runtimeFor(action.id).filled, [label]: value },
        })
      }
      onConfirm={() => executeAction(action)}
      onDismiss={() => patchRuntime(action.id, { state: "dismissed" })}
      onRetry={() => executeAction(action)}
    />
  );

  const renderGuidance = (entry: GuidanceStreamCard) => (
    <InCallGuidanceSlot
      key={entry.suggestion.id}
      item={entry.suggestion}
      reduced={reduced}
      expanded={stream.isExpanded(entry.suggestion.id)}
      status={entry.status}
      relevantAgain={stream.relevantAgainIds.has(entry.suggestion.id)}
      arriving={stream.arrivingIds.has(entry.suggestion.id)}
      arrivalIndex={stream.arrivingIds.get(entry.suggestion.id) ?? 0}
      newLabel={stream.newLabelIds.has(entry.suggestion.id)}
      pinned={pinnedKeys.has(`guidance:${entry.suggestion.item.id}`)}
      attention={stream.attentionIds.has(entry.suggestion.id)}
      onToggle={() => stream.toggleCard(entry.suggestion.id)}
      onPin={() =>
        pinCard({
          key: `guidance:${entry.suggestion.item.id}`,
          kind: "guidance",
          suggestion: entry.suggestion,
        })
      }
      onViewResource={setViewingResource}
      onEngage={stream.engage}
      onDisengage={stream.disengage}
      cardRef={feed.cardRef(entry.suggestion.id)}
    />
  );

  // One line, one card each. Arrival time is the only order — a coaching cue
  // that fires between two guidance cards sits between them, not under both.
  const streamStack = [
    ...stream.cards.map((entry) => ({
      kind: "guidance" as const,
      atMs: entry.suggestion.atMs,
      id: entry.suggestion.id,
      entry,
    })),
    ...(showsV2Stream
      ? coaching.stack.map((cue) => ({
          kind: "coaching" as const,
          atMs: cue.atMs,
          id: cue.id,
          cue,
        }))
      : []),
    ...snapshot.knowledge.map((surface) => ({
      kind: "knowledge" as const,
      atMs: surface.atMs,
      id: surface.id,
      surface,
    })),
    ...(showsV2Stream
      ? snapshot.actions
          .filter((entry) => isActionVisible(entry.id))
          .map((entry) => ({
            kind: "action" as const,
            atMs: entry.atMs,
            id: entry.id,
            action: entry.action,
          }))
      : []),
  ];

  const ordered = useStableStreamOrder(streamStack);

  /**
   * Guidance and knowledge share one unread count. They are matched by
   * different machinery and drawn differently, but the agent has one column and
   * one question about it, so a response card and a knowledge card are the same
   * kind of thing to the "2 new" indicator (§22).
   *
   * Coaching cues and suggested actions stay out of it: a cue is about this
   * second and is gone by the time an unread count would matter, and an action
   * carries its own state in the row itself.
   */
  const readableIds = ordered
    .filter((item) => item.kind === "guidance" || item.kind === "knowledge")
    .map((item) => item.id);

  const feed = useGuidanceFeed({
    feedRef,
    cardIds: readableIds,
    growth: FEED_GROWTH,
    reduced,
    onNode: stream.registerCard,
  });

  /**
   * The header acknowledges an arrival once and then stops — one pulse per
   * event, however many cards the event brought, and nothing that keeps moving
   * while unread cards remain (§5).
   */
  const [cuePulse, setCuePulse] = useState(0);
  const seenCardCount = useRef(0);
  useEffect(() => {
    if (readableIds.length > seenCardCount.current) {
      setCuePulse((current) => current + 1);
    }
    seenCardCount.current = readableIds.length;
  }, [readableIds.length]);

  const nothingYet =
    stream.cards.length === 0 &&
    snapshot.knowledge.length === 0 &&
    (!showsV2Stream ||
      (visibleStreamActions.length === 0 && coaching.stack.length === 0));

  /**
   * "Building context…" is earned, not decorative: the panel replays the call a
   * couple of seconds ahead and only switches over when that pass actually
   * produces something. Asked while the column is empty, so the second pass
   * costs nothing for the rest of the call.
   */
  const ahead = nothingYet
    ? simulationAt(scenario, elapsedMs + PREPARING_LEAD_MS, guidanceItems, libraries)
    : null;
  const preparing =
    ahead !== null &&
    (ahead.suggestions.length > 0 ||
      ahead.knowledge.length > 0 ||
      (showsV2Stream &&
        (ahead.coaching.length > 0 || ahead.actions.length > 0)));

  const renderKnowledge = (surface: KnowledgeSurface) => (
    <KnowledgeCard
      key={surface.id}
      surface={surface}
      cardRef={feed.cardRef(surface.id)}
      expanded={!collapsedKnowledge.has(surface.id)}
      arriving={enteringKnowledgeIds.has(surface.id)}
      reduced={reduced}
      pinned={pinnedKeys.has(`knowledge:${surface.entry.id}`)}
      onPin={() =>
        pinCard({
          key: `knowledge:${surface.entry.id}`,
          kind: "knowledge",
          surface,
        })
      }
      onToggle={() =>
        setCollapsedKnowledge((current) => {
          const next = new Set(current);
          if (next.has(surface.id)) next.delete(surface.id);
          else next.add(surface.id);
          return next;
        })
      }
    />
  );

  return (
    <section
      aria-label="Conversation guidance"
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white",
        className
      )}
    >
      <header
        className={cn(
          "flex h-11 shrink-0 items-center gap-1.5 border-b border-line px-4",
          !reduced && "assist-head-in"
        )}
      >
        {/* Remounted on each arrival so the pulse restarts — re-setting
            `animation-name` on a finished run is a no-op (§5). */}
        <span
          key={cuePulse}
          className={cn(
            "flex shrink-0",
            !reduced && cuePulse > 0 && "assist-cue-pulse"
          )}
        >
          <GuidanceSparklesIcon className="size-4 shrink-0" />
        </span>
        <p className="text-label-md-semi text-foreground">Conversation guidance</p>
      </header>

      <div className="shrink-0 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 transition-colors focus-within:border-brand">
          <IconSearch size={16} className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            inputMode="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-paragraph-sm text-foreground outline-none placeholder:text-disabled-fg"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="flex size-5 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
            >
              <IconClose size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <div
        ref={feedRef}
        className={cn(
          "call-pane-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-2.5",
          !reduced && exiting && "assist-stream-out"
        )}
        {...stream.scrollHandlers}
      >
        {pinnedCards.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="px-0.5 text-label-sm font-medium text-muted-foreground">
              Pinned responses · {pinnedCards.length} of {MAX_PINNED_CARDS}
            </p>
            {pinnedCards.map((card) => {
              const expanded = normalizedQuery
                ? false
                : !collapsedPinned.has(card.key);
              const toggle = () =>
                setCollapsedPinned((current) => {
                  const next = new Set(current);
                  if (next.has(card.key)) next.delete(card.key);
                  else next.add(card.key);
                  return next;
                });
              return card.kind === "guidance" ? (
                <LiveGuidanceCard
                  key={card.key}
                  item={card.suggestion}
                  reduced={reduced}
                  expanded={expanded}
                  pinned
                  onToggle={toggle}
                  onPin={() => pinCard(card)}
                  onViewResource={setViewingResource}
                  className={!expanded ? "border-line bg-secondary-bg/20" : undefined}
                />
              ) : (
                <KnowledgeCard
                  key={card.key}
                  surface={card.surface}
                  expanded={expanded}
                  arriving={false}
                  reduced={reduced}
                  pinned
                  onToggle={toggle}
                  onPin={() => pinCard(card)}
                  className={!expanded ? "border-line bg-secondary-bg/20" : undefined}
                />
              );
            })}
          </div>
        ) : null}

        {!normalizedQuery ? (
          <div className="flex items-center gap-1 px-0.5 pt-1">
            <p className="text-label-sm font-medium text-muted-foreground">
              Live suggestions
            </p>
            {feed.unseenCount > 0 ? (
              <button
                type="button"
                aria-live="polite"
                aria-label={`${feed.unseenCount} unread ${
                  feed.unseenCount === 1 ? "suggestion" : "suggestions"
                } — go to the first`}
                onClick={feed.revealFirstUnseen}
                className="rounded-[4px] px-0.5 text-label-xs font-medium text-brand tabular-nums outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                · {feed.unseenCount} new
              </button>
            ) : null}
          </div>
        ) : null}

        {!normalizedQuery ? (
          <GuidanceListeningState show={nothingYet} preparing={preparing} />
        ) : null}

        {!normalizedQuery && stream.criticalAlert ? (
          <CriticalGuidanceAlert
            name={stream.criticalAlert.suggestion.item.name}
            reduced={reduced}
            onFocus={stream.focusCriticalAlert}
          />
        ) : null}

        {normalizedQuery ? (
          searchedGuidance.length + searchedKnowledge.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-6 py-8 text-center">
              <p className="text-label-md font-medium text-foreground">No guidance found</p>
              <p className="text-paragraph-sm text-muted-foreground">
                Try a product, policy, integration, or customer objection.
              </p>
            </div>
          ) : (
            <>
              <p className="px-0.5 text-paragraph-sm text-muted-foreground">
                {searchedGuidance.length + searchedKnowledge.length} results
              </p>
              {searchedGuidance.map((suggestion) => {
                const key = `guidance:${suggestion.item.id}`;
                if (pinnedKeys.has(key)) return null;
                const expanded = !collapsedSearch.has(key);
                return (
                  <LiveGuidanceCard
                    key={key}
                    item={suggestion}
                    reduced={reduced}
                    expanded={expanded}
                    onToggle={() =>
                      setCollapsedSearch((current) => {
                        const next = new Set(current);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    onPin={() =>
                      pinCard({ key, kind: "guidance", suggestion })
                    }
                    onViewResource={setViewingResource}
                  />
                );
              })}
              {searchedKnowledge.map((surface) => {
                const key = `knowledge:${surface.entry.id}`;
                if (pinnedKeys.has(key)) return null;
                const expanded = !collapsedSearch.has(key);
                return (
                  <KnowledgeCard
                    key={key}
                    surface={surface}
                    expanded={expanded}
                    arriving={false}
                    reduced={reduced}
                    onToggle={() =>
                      setCollapsedSearch((current) => {
                        const next = new Set(current);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    onPin={() => pinCard({ key, kind: "knowledge", surface })}
                  />
                );
              })}
            </>
          )
        ) : ordered.map((item) =>
          pinnedKeys.has(
            item.kind === "guidance"
              ? `guidance:${item.entry.suggestion.item.id}`
              : item.kind === "knowledge"
                ? `knowledge:${item.surface.entry.id}`
                : ""
          ) ? null :
          item.kind === "coaching" ? (
            <CoachingCard
              key={item.id}
              cue={item.cue}
              arriving={coaching.arrivingIds.has(item.id)}
              reduced={reduced}
              onAcknowledge={() => coaching.acknowledge(item.id)}
            />
          ) : item.kind === "guidance" ? (
            renderGuidance(item.entry)
          ) : item.kind === "action" ? (
            renderAction(item.action)
          ) : (
            renderKnowledge(item.surface)
          )
        )}
      </div>

      <GuidanceResourceModal
        resource={viewingResource}
        onClose={() => setViewingResource(null)}
      />
    </section>
  );
}

export { IconKnowledge, IconCoaching, SuggestedActionRow };
export type { ActionRuntime };
