import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SVGProps,
} from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Dropdown } from "@/components/Dropdown";
import {
  IconAlertTriangleFilled,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconCreateAction,
  IconFile,
  IconMessages,
  IconPencil,
  IconScheduler,
  IconSparkles,
} from "@/components/Icon";
import { IconJcaiAgentAssist } from "./icons/JustCallAiNavIcons";
import {
  CALL_SCENARIOS,
  callActionProgressLabel,
  POST_CALL_SECTION_TITLE,
  resolvePostCallActionItems,
  resolveScenarioText,
  simulationAt,
  type CallActionItem,
  type CallActionKind,
  type CallActionResult,
  type CallActionStatus,
  type CallScenario,
  type GuidanceSuggestion,
  type ResolvedCallActionItem,
  type SimulationSnapshot,
  type TranscriptSpeaker,
  type TranscriptTurn,
} from "./callSimulation";
import type { ActionState } from "./actionsData";
import type { AgentAssistScope } from "./agentAssistScope";
import {
  SEED_GUIDANCE,
  type GuidanceItem,
  type GuidanceResource,
} from "./guidanceData";
import { InCallGuidanceSlot } from "./LiveGuidance";
import { GuidanceResourceModal } from "./GuidanceCard";
import {
  ScriptStepRow,
  useScriptChecklistMotion,
} from "./ScriptChecklist";
import {
  useGuidanceStream,
  type GuidanceStreamCard,
} from "./useGuidanceStream";

/**
 * In-call Agent Assist — one stream. The full script stays open so any
 * spoken line can check off. Guidance cards insert under the step they
 * belong to. Only one card is expanded; the rest sit as compact
 * suggestions. Cards stay until the agent dismisses them — never on a
 * timer, and never because the script moved on.
 */

/** Panel opens — a short prepare beat before the script is on screen. */
const PREPARE_MS = 420;
/** Script appears — each line fades upward behind the one before it. */
const SCRIPT_STEP_MS = 180;
const SCRIPT_STAGGER_MS = 35;
const SCRIPT_STAGGER_CAP = 8;

/** Guidance lives in its own column — the script never pins a card of its own. */
const EMPTY_SUGGESTIONS: GuidanceSuggestion[] = [];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

function IconScript(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12.5 17.5H5C4.33696 17.5 3.70107 17.2366 3.23223 16.7678C2.76339 16.2989 2.5 15.663 2.5 15V14.1667H10.8333V15.8333C10.8333 16.2754 11.0089 16.6993 11.3215 17.0118C11.6341 17.3244 12.058 17.5 12.5 17.5ZM12.5 17.5C12.942 17.5 13.366 17.3244 13.6785 17.0118C13.9911 16.6993 14.1667 16.2754 14.1667 15.8333V4.16667C14.1667 3.83703 14.2644 3.5148 14.4476 3.24072C14.6307 2.96664 14.891 2.75301 15.1955 2.62687C15.5001 2.50072 15.8352 2.46772 16.1585 2.53203C16.4818 2.59633 16.7788 2.75507 17.0118 2.98816C17.2449 3.22124 17.4037 3.51822 17.468 3.84152C17.5323 4.16482 17.4993 4.49993 17.3731 4.80447C17.247 5.10902 17.0334 5.36931 16.7593 5.55245C16.4852 5.73559 16.163 5.83333 15.8333 5.83333H14.1667M15.8333 2.5H6.66667C6.00363 2.5 5.36774 2.76339 4.8989 3.23223C4.43006 3.70107 4.16667 4.33696 4.16667 5V14.1667M7.5 5.83333H10.8333M7.5 9.16667H10.8333"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface AgentAssistCallSheetProps {
  elapsedMs: number;
  scenario: CallScenario;
  onScenarioChange: (id: string) => void;
  guidanceItems?: GuidanceItem[];
  /** The panel has taken its width — play the prepare beat, then the script. */
  active?: boolean;
  /** Hangup — the live stream lets go before the phone changes state. */
  exiting?: boolean;
  /** Hangup — script and transcript yield to the generated recap. */
  ended?: boolean;
  /** Post-call — the pane is showing the full transcript instead of the recap. */
  transcriptOpen?: boolean;
  onTranscriptOpenChange?: (open: boolean) => void;
  /** The transcript already has its own pane beside this one — drop the toggle. */
  transcriptDetached?: boolean;
  /**
   * Guidance has its own column beside this one — the script runs clean, with
   * no cards inserted between the steps.
   */
  guidanceDetached?: boolean;
  /** Actions already run on this call — the recap must not re-offer them. */
  actionStates?: Record<string, ActionState>;
  /** V1 has no in-call actions, so the recap can never open pre-completed. */
  scope?: AgentAssistScope;
  /**
   * Something around this pane already names the view — a tab row above it in
   * the CRM panel — so the header keeps only its controls. Dropping the whole
   * header instead would take the script picker with it.
   */
  titleHidden?: boolean;
  className?: string;
}

export function AgentAssistCallSheet({
  elapsedMs,
  scenario,
  onScenarioChange,
  guidanceItems = SEED_GUIDANCE,
  active = true,
  exiting = false,
  ended = false,
  transcriptOpen = false,
  onTranscriptOpenChange,
  transcriptDetached = false,
  guidanceDetached = false,
  actionStates,
  scope = "v2",
  titleHidden = false,
  className,
}: AgentAssistCallSheetProps) {
  const [view, setView] = useState<"assist" | "transcript">("assist");
  const [viewingResource, setViewingResource] = useState<GuidanceResource | null>(
    null
  );
  const snapshot = simulationAt(scenario, elapsedMs, guidanceItems);
  const reduced = prefersReducedMotion();
  // Generation lives here so opening the transcript doesn't restart it —
  // coming back shows whatever has already been written, or picks up mid-stream.
  const recap = usePostCallGeneration({
    summary: scenario.wrapUp.summary,
    itemCount: scenario.wrapUp.actionItems.length,
    reduced,
    active: ended,
  });
  const [preparing, setPreparing] = useState(() => !reduced && !ended && active);
  const latestCard = snapshot.suggestions[snapshot.suggestions.length - 1] ?? null;
  const lastChecked =
    snapshot.scriptIndex > 0 ? scenario.steps[snapshot.scriptIndex - 1] : null;
  const liveAnnouncement = ended
    ? recap.complete
      ? "Recap ready. Call summary and action items are ready."
      : recap.statusCopy
    : snapshot.wrapped
      ? "Script complete."
      : latestCard
        ? `${latestCard.stance}: ${latestCard.item.name}. ${latestCard.item.suggestedResponse}`
        : lastChecked
          ? `${lastChecked.title} checked.`
          : "";

  useEffect(() => {
    setViewingResource(null);
  }, [scenario.id]);

  // Panel loading — held only as long as the content needs to be ready.
  useEffect(() => {
    if (!active || ended || reduced) {
      setPreparing(false);
      return;
    }
    setPreparing(true);
    const timer = window.setTimeout(() => setPreparing(false), PREPARE_MS);
    return () => window.clearTimeout(timer);
  }, [active, ended, reduced]);

  const options = useMemo(
    () => CALL_SCENARIOS.map((item) => ({ value: item.id, label: item.scriptName })),
    []
  );

  return (
    <aside
      aria-label="Agent Assist"
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white",
        className
      )}
    >
      <header
        className={cn(
          "flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-4",
          titleHidden && "justify-end",
          !reduced && "assist-head-in"
        )}
      >
        <div className={cn("flex min-w-0 items-center gap-1.5", titleHidden && "hidden")}>
          {ended ? (
            <IconSparkles
              size={16}
              className="size-4 shrink-0 text-ai"
              aria-hidden="true"
            />
          ) : guidanceDetached ? (
            <IconScript
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <IconJcaiAgentAssist
              className="size-4 shrink-0 text-brand"
              aria-hidden="true"
            />
          )}
          <p className="text-label-md-semi text-foreground">
            {ended ? "Conversation recap" : guidanceDetached ? "Script" : "Agent Assist"}
          </p>
        </div>
        {ended ? (
          transcriptOpen ? (
            <button
              type="button"
              onClick={() => onTranscriptOpenChange?.(false)}
              className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-[4px] px-1.5 text-label-sm text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24"
            >
              <IconChevronLeft size={16} className="size-4 shrink-0" />
              Back to summary
            </button>
          ) : null
        ) : (
          <div className="flex min-w-0 items-center gap-1">
            <Dropdown
              searchable={false}
              variant="borderless"
              // The trigger sits against the panel's right edge, so the menu
              // hangs from that edge — a left-hung menu gets clipped by the
              // panel's overflow.
              align="end"
              leftIcon={guidanceDetached ? undefined : <IconScript />}
              options={options}
              value={scenario.id}
              onValueChange={(value) =>
                onScenarioChange(Array.isArray(value) ? value[0] : value)
              }
              aria-label="Call script"
              triggerClassName="h-7 min-w-0 max-w-[200px] px-1.5 text-paragraph-sm text-muted-foreground"
            />
            {transcriptDetached ? null : (
              <button
                type="button"
                aria-pressed={view === "transcript"}
                onClick={() =>
                  setView((current) =>
                    current === "transcript" ? "assist" : "transcript"
                  )
                }
                className={cn(
                  "inline-flex h-7 cursor-pointer items-center rounded-[4px] px-2 text-label-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
                  view === "transcript"
                    ? "bg-secondary-bg text-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                )}
              >
                Transcript
              </button>
            )}
          </div>
        )}
      </header>

      {ended ? (
        transcriptOpen ? (
          <>
            <TranscriptPane
              turns={snapshot.transcript}
              contactName={scenario.contactName}
              reduced={reduced}
            />
            {recap.complete ? null : (
              <p className="sr-only" aria-live="polite">
                {recap.statusCopy}
              </p>
            )}
          </>
        ) : (
          <PostCallAssist
            scenario={scenario}
            snapshot={snapshot}
            actionStates={actionStates}
            reduced={reduced}
            recap={recap}
            scope={scope}
          />
        )
      ) : preparing ? (
        <PreparingPane />
      ) : view === "transcript" ? (
        <TranscriptPane
          turns={snapshot.transcript}
          contactName={scenario.contactName}
          reduced={reduced}
          exiting={exiting}
        />
      ) : (
        <AssistStream
          key={scenario.id}
          scenario={scenario}
          snapshot={snapshot}
          reduced={reduced}
          collapsing={exiting}
          guidanceDetached={guidanceDetached}
          onViewResource={setViewingResource}
        />
      )}

      <GuidanceResourceModal
        resource={ended ? null : viewingResource}
        onClose={() => setViewingResource(null)}
      />

      {ended ? null : (
        <p className="sr-only" aria-live="polite">
          {liveAnnouncement}
        </p>
      )}
    </aside>
  );
}

/**
 * Panel loading — a short, quiet beat while the script is put together.
 * No blocking loader: a shimmer where the content is about to land.
 */
function PreparingPane() {
  return (
    <div
      className="assist-prep-in flex min-h-0 flex-1 flex-col gap-2.5 px-4 py-3"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5">
        <IconSparkles
          size={16}
          aria-hidden="true"
          className="recap-sparkle-pulse size-4 shrink-0 text-ai"
        />
        <p className="text-label-sm text-muted-foreground">
          Preparing Agent Assist...
        </p>
      </div>
      <span className="assist-prep-bar w-[62%]" aria-hidden="true" />
      <span className="assist-prep-bar w-[44%]" aria-hidden="true" />
    </div>
  );
}

function AssistStream({
  scenario,
  snapshot,
  reduced,
  collapsing,
  guidanceDetached,
  onViewResource,
}: {
  scenario: CallScenario;
  snapshot: SimulationSnapshot;
  reduced: boolean;
  collapsing: boolean;
  guidanceDetached: boolean;
  onViewResource: (resource: GuidanceResource) => void;
}) {
  const playhead = Math.min(snapshot.scriptIndex, scenario.steps.length);
  /** Guidance sits inline in the script here, so the script's scroller is the
   *  feed — the same rule applies either way: a card that lands while the agent
   *  is reading further up does not drag the column to itself (§6, §8). */
  const feedRef = useRef<HTMLDivElement | null>(null);
  const stream = useGuidanceStream({
    suggestions: guidanceDetached ? EMPTY_SUGGESTIONS : snapshot.suggestions,
    steps: scenario.steps,
    playhead,
    reduced,
    handledIds: snapshot.handledIds,
    feedRef,
  });

  return (
    <div
      ref={feedRef}
      className={cn(
        "call-pane-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3",
        !reduced && collapsing && "assist-stream-out"
      )}
      {...stream.scrollHandlers}
    >
      <FullScriptList
        scenario={scenario}
        playhead={playhead}
        reduced={reduced}
        placedCards={stream.cards}
        isExpanded={stream.isExpanded}
        arrivingIds={stream.arrivingIds}
        newLabelIds={stream.newLabelIds}
        attentionIds={stream.attentionIds}
        relevantAgainIds={stream.relevantAgainIds}
        onToggleCard={stream.toggleCard}
        onEngage={stream.engage}
        onDisengage={stream.disengage}
        registerCard={stream.registerCard}
        onViewResource={onViewResource}
      />
    </div>
  );
}

type RecapStage = "understanding" | "summarizing" | "next-steps" | "complete";

interface PostCallGeneration {
  stage: RecapStage;
  statusCopy: string;
  summaryText: string;
  summaryComplete: boolean;
  visibleItems: number;
  complete: boolean;
}

const RECAP_MOTION = {
  /** First beat — Call summary is on screen with a skeleton. */
  understandMs: 1300,
  /** Status flips to "Creating summary..." before the first phrase lands. */
  creatingMs: 640,
  /** Phrase cadence: 3–8 words every 100–200ms, not per character. */
  chunkDelaysMs: [140, 180, 120, 160, 200, 110, 170, 150] as const,
  /** Pause after the last summary phrase so Copy can enable cleanly. */
  summarySettleMs: 180,
  /** Action items heading appears, then a think beat before the first row. */
  itemsThinkMs: 720,
  itemGapMs: 380,
  completeBeatMs: 160,
  /** Slow-path copy if the first tokens haven't arrived yet. */
  stillWorkingMs: 9000,
} as const;

/**
 * Split a summary into spoken phrases. 3–8 words, snapping to punctuation
 * when it falls in range so the stream reads like sentences, not a ticker.
 */
function phraseChunks(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  const sizes = [5, 7, 4, 6, 8, 3, 5, 4];
  let i = 0;
  let s = 0;
  while (i < words.length) {
    const remaining = words.length - i;
    let n = Math.min(sizes[s++ % sizes.length], remaining);
    if (remaining <= 8) {
      n = remaining;
    } else {
      for (let look = Math.min(8, remaining); look >= 3; look -= 1) {
        if (/[.,;:!?]$/.test(words[i + look - 1] ?? "")) {
          n = look;
          break;
        }
      }
      n = Math.max(3, Math.min(n, remaining));
      if (remaining - n > 0 && remaining - n < 3) {
        n = Math.min(8, remaining);
      }
    }
    chunks.push(words.slice(i, i + n).join(" "));
    i += n;
  }
  return chunks;
}

function recapStatusCopy(
  stage: RecapStage,
  summaryText: string,
  takingLong: boolean
): string {
  const waitingOnFirstTokens =
    stage === "understanding" || (stage === "summarizing" && summaryText.length === 0);
  if (takingLong && waitingOnFirstTokens) {
    return "Still working on the call insights...";
  }
  if (stage === "understanding") return "Understanding conversation...";
  if (stage === "summarizing") return "Creating summary...";
  if (stage === "next-steps") return "Finding next steps...";
  return "Recap ready";
}

function usePostCallGeneration({
  summary,
  itemCount,
  reduced,
  active,
}: {
  summary: string;
  itemCount: number;
  reduced: boolean;
  active: boolean;
}): PostCallGeneration {
  const [stage, setStage] = useState<RecapStage>(reduced ? "complete" : "understanding");
  const [summaryText, setSummaryText] = useState(reduced ? summary : "");
  const [visibleItems, setVisibleItems] = useState(reduced ? itemCount : 0);
  const [takingLong, setTakingLong] = useState(false);

  useEffect(() => {
    if (!active) return;

    if (reduced) {
      setStage("complete");
      setSummaryText(summary);
      setVisibleItems(itemCount);
      setTakingLong(false);
      return;
    }

    setStage("understanding");
    setSummaryText("");
    setVisibleItems(0);
    setTakingLong(false);

    let cancelled = false;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(id);
    };

    later(() => setTakingLong(true), RECAP_MOTION.stillWorkingMs);

    later(() => setStage("summarizing"), RECAP_MOTION.understandMs);

    const chunks = phraseChunks(summary);
    const streamStart = RECAP_MOTION.understandMs + RECAP_MOTION.creatingMs;

    const delays = RECAP_MOTION.chunkDelaysMs;
    let elapsed = streamStart;
    chunks.forEach((chunk, index) => {
      later(() => {
        setSummaryText((current) => (current ? `${current} ${chunk}` : chunk));
      }, elapsed);
      if (index < chunks.length - 1) {
        elapsed += delays[index % delays.length] ?? 150;
      }
    });

    const summaryDoneAt = elapsed + RECAP_MOTION.summarySettleMs;
    later(() => {
      setSummaryText(summary);
      setStage(itemCount === 0 ? "complete" : "next-steps");
    }, summaryDoneAt);

    if (itemCount > 0) {
      const firstItemAt = summaryDoneAt + RECAP_MOTION.itemsThinkMs;
      for (let index = 0; index < itemCount; index += 1) {
        later(() => setVisibleItems(index + 1), firstItemAt + index * RECAP_MOTION.itemGapMs);
      }
      later(
        () => setStage("complete"),
        firstItemAt + (itemCount - 1) * RECAP_MOTION.itemGapMs + RECAP_MOTION.completeBeatMs
      );
    }

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [active, reduced, summary, itemCount]);

  const complete = stage === "complete";
  const summaryComplete = complete || stage === "next-steps";

  return {
    stage,
    statusCopy: recapStatusCopy(stage, summaryText, takingLong),
    summaryText: complete || summaryComplete ? summary : summaryText,
    summaryComplete,
    visibleItems: complete ? itemCount : visibleItems,
    complete,
  };
}

function RecapSkeleton({
  copy,
  reduced,
}: {
  copy: string;
  reduced: boolean;
}) {
  return (
    <div
      className={cn("recap-summary-body flex flex-col gap-2", !reduced && "recap-skeleton-in")}
    >
      <p
        key={copy}
        className={cn(
          "text-label-sm text-muted-foreground",
          !reduced && "recap-status-in"
        )}
      >
        {copy}
      </p>
      <span className="recap-skeleton-line w-full" aria-hidden="true" />
      <span className="recap-skeleton-line w-[90%]" aria-hidden="true" />
      <span className="recap-skeleton-line w-[72%]" aria-hidden="true" />
    </div>
  );
}

function RecapItemSkeleton({
  copy,
  reduced,
}: {
  copy: string;
  reduced: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[50px] items-center rounded-lg border border-line bg-white px-3 py-2",
        !reduced && "recap-skeleton-in"
      )}
    >
      <p
        className={cn(
          "text-label-sm text-muted-foreground",
          !reduced && "recap-status-in"
        )}
      >
        {copy}
      </p>
    </div>
  );
}

/**
 * Phrase-chunk stream. Prior text stays fully readable; only the new phrase
 * fades in. The caret marks the generation point until this section settles.
 */
function RecapSummaryStream({
  text,
  streaming,
  reduced,
}: {
  text: string;
  streaming: boolean;
  reduced: boolean;
}) {
  const committedRef = useRef(text);
  const suffix =
    !reduced && text.startsWith(committedRef.current)
      ? text.slice(committedRef.current.length)
      : "";
  const settled = suffix ? committedRef.current : text;

  useEffect(() => {
    committedRef.current = text;
  }, [text]);

  return (
    <p className="recap-summary-body text-pretty text-paragraph-md text-foreground">
      <span>{settled}</span>
      {suffix ? <span className="recap-chunk-in">{suffix}</span> : null}
      {streaming && !reduced ? <span className="recap-caret" aria-hidden="true" /> : null}
    </p>
  );
}

const ACTION_CONFIRM_MS = 750;

/**
 * Post-call — the recap the agent reads and works from: what was said, then
 * what to do about it. Summary streams first; action items land after it.
 * Disposition, notes and rating live in Wrap up beside this; this pane only
 * reports and hands off.
 *
 * On V2 a row can run its own work, so it carries the CTA. On V1 nothing runs
 * itself — a "Send message" sitting on the row would promise execution the
 * account doesn't have — so the rows are read-and-tick only and the same offer
 * appears once, as a secondary button in Wrap up, next to the work the agent
 * is already doing by hand.
 */

function PostCallAssist({
  scenario,
  snapshot,
  actionStates,
  reduced,
  recap,
  scope,
}: {
  scenario: CallScenario;
  snapshot: SimulationSnapshot;
  actionStates?: Record<string, ActionState>;
  reduced: boolean;
  recap: PostCallGeneration;
  scope: AgentAssistScope;
}) {
  const resolved = useMemo(
    () =>
      resolvePostCallActionItems(
        scenario.wrapUp.actionItems,
        snapshot,
        actionStates,
        scope
      ),
    [scenario.wrapUp.actionItems, snapshot, actionStates, scope]
  );
  const [overrides, setOverrides] = useState<
    Record<string, { status: CallActionStatus; markedManually?: boolean }>
  >({});
  const runTimers = useRef<number[]>([]);

  useEffect(() => {
    setOverrides({});
  }, [scenario.id]);

  useEffect(
    () => () => runTimers.current.forEach((timer) => window.clearTimeout(timer)),
    []
  );

  const items: RecapActionItem[] = useMemo(
    () =>
      resolved.map((item) => {
        const override = overrides[item.id];
        const markedManually = override?.markedManually === true;
        if (!override) return { ...item, markedManually };
        return {
          ...item,
          status: override.status,
          result: markedManually ? undefined : item.result,
          markedManually,
        };
      }),
    [resolved, overrides]
  );

  const patchItem = (
    id: string,
    patch: { status: CallActionStatus; markedManually?: boolean }
  ) => {
    setOverrides((current) => ({ ...current, [id]: patch }));
  };

  /** Unticking drops the override so the row falls back to what the call left. */
  const clearItem = (id: string) => {
    setOverrides((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const runItem = (item: ResolvedCallActionItem) => {
    patchItem(item.id, { status: "in_progress" });
    const timer = window.setTimeout(
      () => patchItem(item.id, { status: "completed" }),
      reduced ? 0 : ACTION_CONFIRM_MS
    );
    runTimers.current.push(timer);
  };

  const { stage, statusCopy, summaryText, summaryComplete, visibleItems, complete } =
    recap;
  const streamingSummary = stage === "summarizing" && summaryText.length > 0;
  const showItems = stage === "next-steps" || stage === "complete";
  const [itemsAtMount] = useState(visibleItems);
  const [hadSummaryOnMount] = useState(summaryText.length > 0);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        !reduced &&
          !hadSummaryOnMount &&
          "animate-[assist-wrap-in_220ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
    >
      <div
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4"
        aria-busy={!complete}
      >
        <section
          aria-labelledby="call-summary-heading"
          className={cn(
            "flex flex-col gap-2",
            !reduced && !hadSummaryOnMount && "recap-section-in"
          )}
        >
          <div className="flex min-h-7 items-center justify-between gap-2">
            <h2
              id="call-summary-heading"
              className="flex items-center text-label-md-semi text-foreground"
            >
              Call summary
            </h2>
            <CopyButton text={scenario.wrapUp.summary} disabled={!summaryComplete} />
          </div>
          {summaryText ? (
            <RecapSummaryStream
              text={summaryText}
              streaming={streamingSummary}
              reduced={reduced}
            />
          ) : (
            <RecapSkeleton copy={statusCopy} reduced={reduced} />
          )}
        </section>

        {showItems ? (
          <section
            aria-labelledby="action-items-heading"
            className={cn(
              "flex flex-col gap-2",
              !reduced && itemsAtMount === 0 && "recap-section-in"
            )}
          >
            <h2
              id="action-items-heading"
              className="flex min-h-7 items-center text-label-md-semi text-foreground"
            >
              {POST_CALL_SECTION_TITLE}
            </h2>
            {visibleItems === 0 ? (
              <RecapItemSkeleton copy={statusCopy} reduced={reduced} />
            ) : (
              <ol className="flex flex-col gap-2">
                {items.slice(0, visibleItems).map((item, index) => (
                  <ActionItemRow
                    key={item.id}
                    item={item}
                    reduced={reduced}
                    animate={index >= itemsAtMount}
                    offerCta={scope !== "v1"}
                    onRun={() => runItem(item)}
                    onRetry={() => runItem(item)}
                    onToggleDone={() =>
                      item.markedManually
                        ? clearItem(item.id)
                        : patchItem(item.id, {
                            status: "completed",
                            markedManually: true,
                          })
                    }
                  />
                ))}
              </ol>
            )}
          </section>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {complete
          ? `Recap ready. Call summary and ${POST_CALL_SECTION_TITLE.toLowerCase()} are ready.`
          : statusCopy}
      </p>
    </div>
  );
}

/** Copy to clipboard, with the confirmation on the button itself. */
function CopyButton({ text, disabled = false }: { text: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={
        disabled
          ? "Copy summary, available when generation finishes"
          : copied
            ? "Copied"
            : "Copy summary"
      }
      onClick={() => {
        if (disabled) return;
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
      }}
      className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-[4px] px-1.5 text-label-sm text-muted-foreground outline-none transition-[color,background-color,opacity] duration-200 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
    >
      {copied ? (
        <IconCheck size={16} className="size-4 shrink-0 text-success" />
      ) : (
        <IconCopy size={16} className="size-4 shrink-0" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export const CALL_ACTION_CTA: Record<
  CallActionKind,
  {
    label: string;
    /**
     * Used where the button stands away from the row that described the
     * errand — Wrap up's footer, which the agent reaches after the recap has
     * scrolled off. Beside its own action item, "Schedule" already reads as
     * scheduling that; alone under a notes field, it has to say what for.
     */
    wrapUpLabel?: string;
    icon: typeof IconScheduler;
  }
> = {
  schedule: {
    label: "Schedule",
    wrapUpLabel: "Schedule a follow-up call",
    icon: IconScheduler,
  },
  message: { label: "Send message", icon: IconMessages },
  prepare: { label: "Prepare", icon: IconFile },
  ticket: { label: "Create ticket", icon: IconCreateAction },
  update: { label: "Update", icon: IconPencil },
  create: { label: "Create", icon: IconCreateAction },
};

/**
 * The distinct things this call asks the agent to go and do, in the order the
 * recap lists them. Deduplicated by kind: two rows that both need a message
 * are still one trip to the composer, and two identical buttons side by side
 * would read as two different messages.
 */
export function callActionCtas(items: CallActionItem[]) {
  const seen = new Set<CallActionKind>();
  return items.flatMap((item) => {
    if (!item.action || seen.has(item.action)) return [];
    seen.add(item.action);
    const cta = CALL_ACTION_CTA[item.action];
    return [{ kind: item.action, ...cta, label: cta.wrapUpLabel ?? cta.label }];
  });
}

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

const ACTION_CTA_CLASS =
  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-[4px] px-2 text-label-sm font-medium text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24";

const ACTION_VIEW_CLASS =
  "text-label-sm text-brand outline-none transition-colors hover:text-brand-hover focus-visible:ring-2 focus-visible:ring-brand/24";

/**
 * A recap row remembers whether its tick came from the agent's hand or from
 * work that actually ran — only the former can be taken back.
 */
type RecapActionItem = ResolvedCallActionItem & { markedManually: boolean };

function actionResultLink(result: CallActionResult | undefined): {
  href: string;
  label: string;
} | null {
  if (!result?.href) return null;
  return { href: result.href, label: result.hrefLabel ?? "View" };
}

/**
 * Done-ness leads the row. A ticked box on the left and an empty one right
 * under it read as a list at a glance — faster than parsing "Sent" against
 * "Scheduled" on the far side of every title. When a pending item can be
 * closed by hand the box is the control itself, so the row never needs a
 * second "mark as done" button competing with its CTA. A tick the agent
 * placed is theirs to take back; a tick the call earned is a receipt and
 * stays put.
 */
function ActionItemCheck({
  done,
  onToggle,
  label,
}: {
  done: boolean;
  onToggle?: () => void;
  label?: string;
}) {
  const box = cn(
    "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
    done ? "border-success bg-success text-white" : "border-control-border bg-white"
  );
  const tick = done ? (
    <svg viewBox="0 0 16 16" width={10} height={10} fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : null;

  if (!onToggle) {
    return (
      <span className={box} role="img" aria-label={done ? "Done" : "Not done"}>
        {tick}
      </span>
    );
  }

  const intent = done ? "as not done" : "as done";

  return (
    <button
      type="button"
      onClick={onToggle}
      role="checkbox"
      aria-checked={done}
      aria-label={label ? `Mark "${label}" ${intent}` : `Mark ${intent}`}
      className={cn(
        box,
        "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
        done
          ? "hover:border-success/80 hover:bg-success/80"
          : "hover:border-success"
      )}
    >
      {tick}
    </button>
  );
}

/**
 * One item, one next step. Completed work is a receipt; pending work keeps
 * the blue CTA. The two sit in the same list so the agent never has to
 * remember what already happened on the call.
 */
function ActionItemRow({
  item,
  reduced,
  animate,
  offerCta,
  onRun,
  onRetry,
  onToggleDone,
}: {
  item: RecapActionItem;
  reduced: boolean;
  animate: boolean;
  /**
   * Whether the row itself can do the work. False on V1, where nothing runs
   * itself — the offer moves to Wrap up instead, so the row stays a thing to
   * read and tick rather than a button that promises execution.
   */
  offerCta: boolean;
  onRun: () => void;
  onRetry: () => void;
  onToggleDone: () => void;
}) {
  const pending = item.status === "pending";
  const completed = item.status === "completed";
  const failed = item.status === "failed";
  const busy = item.status === "in_progress";
  const cta = offerCta && item.action ? CALL_ACTION_CTA[item.action] : null;
  const CtaIcon = cta?.icon;
  const viewLink = completed ? actionResultLink(item.result) : null;
  const showToggle =
    item.allowMarkDone === true &&
    (pending || (completed && item.markedManually));
  const needsAttention = pending || failed || busy;
  // A row with nothing on its right edge closes up rather than reserving the
  // control column — V1's rows are all of this shape, and a held-open gutter
  // would read as a button that failed to render.
  const trailing =
    busy || failed || Boolean(viewLink) || Boolean(pending && cta);

  return (
    <li
      className={cn(
        "flex min-h-[50px] items-center gap-2.5 rounded-lg border border-line bg-white py-2 pl-3",
        trailing ? "pr-2" : "pr-3",
        !reduced && animate && "recap-item-in"
      )}
    >
      <ActionItemCheck
        done={completed}
        onToggle={showToggle ? onToggleDone : undefined}
        label={item.title}
      />
      <p
        className={cn(
          "min-w-0 flex-1 text-pretty text-label-md",
          needsAttention ? "font-medium text-foreground" : "text-muted-foreground"
        )}
      >
        {item.title}
      </p>
      <div
        className={cn(
          "shrink-0 items-center gap-2 whitespace-nowrap",
          trailing ? "flex" : "hidden"
        )}
      >
        {busy ? (
          <span
            className="inline-flex h-8 items-center gap-1.5 px-2 text-label-sm text-muted-foreground"
            role="status"
          >
            <span className="recap-action-spinner" aria-hidden="true" />
            {callActionProgressLabel(item.action)}
          </span>
        ) : null}

        {completed && viewLink ? (
          <span className="inline-flex h-8 items-center px-1.5">
            <a
              href={viewLink.href}
              target="_blank"
              rel="noreferrer"
              className={ACTION_VIEW_CLASS}
            >
              {viewLink.label}
            </a>
          </span>
        ) : null}

        {failed ? (
          <span
            className="inline-flex h-8 items-center gap-1.5 px-1.5"
            role="status"
          >
            <IconAlertTriangleFilled
              size={16}
              aria-hidden="true"
              className="size-4 shrink-0 text-warning"
            />
            <span className="text-label-sm text-muted-foreground">Not completed</span>
          </span>
        ) : null}

        {pending && cta && CtaIcon ? (
          <button type="button" onClick={onRun} className={ACTION_CTA_CLASS}>
            <CtaIcon size={16} className="size-4 shrink-0" />
            {cta.label}
            <IconChevronRight size={16} className="size-4 shrink-0 opacity-70" />
          </button>
        ) : null}

        {failed && offerCta ? (
          <button type="button" onClick={onRetry} className={ACTION_CTA_CLASS}>
            <IconRetry className="size-4 shrink-0" />
            Retry
            <IconChevronRight size={16} className="size-4 shrink-0 opacity-70" />
          </button>
        ) : null}
      </div>
    </li>
  );
}

function FullScriptList({
  scenario,
  playhead,
  reduced,
  placedCards,
  isExpanded,
  arrivingIds,
  newLabelIds,
  attentionIds,
  relevantAgainIds,
  onToggleCard,
  onEngage,
  onDisengage,
  registerCard,
  onViewResource,
}: {
  scenario: CallScenario;
  playhead: number;
  reduced: boolean;
  placedCards: GuidanceStreamCard[];
  /** Cards are open unless the agent closed them — see useGuidanceStream. */
  isExpanded: (id: string) => boolean;
  /** Card id → its place in the burst it arrived with, for the entrance stagger. */
  arrivingIds: Map<string, number>;
  newLabelIds: Set<string>;
  attentionIds: Set<string>;
  relevantAgainIds: Set<string>;
  onToggleCard: (id: string) => void;
  onEngage: () => void;
  onDisengage: () => void;
  registerCard: (id: string, node: HTMLElement | null) => void;
  onViewResource: (resource: GuidanceResource) => void;
}) {
  const { phases, glowing } = useScriptChecklistMotion({
    playhead,
    stepCount: scenario.steps.length,
    reduced,
  });

  // Script appears — the list fades upward line by line, then holds still so
  // later guidance never re-triggers the entrance.
  const [entering, setEntering] = useState(!reduced);
  const stepCount = scenario.steps.length;

  useEffect(() => {
    if (!entering) return;
    const timer = window.setTimeout(
      () =>
        setEntering(false),
      Math.min(stepCount, SCRIPT_STAGGER_CAP) * SCRIPT_STAGGER_MS +
        SCRIPT_STEP_MS +
        40
    );
    return () => window.clearTimeout(timer);
  }, [entering, stepCount]);

  const cardsByStep = new Map<number, GuidanceStreamCard[]>();
  for (const entry of placedCards) {
    const list = cardsByStep.get(entry.insertAfter) ?? [];
    list.push(entry);
    cardsByStep.set(entry.insertAfter, list);
  }

  return (
    <ol className="flex flex-col" aria-label="Call script">
      {scenario.steps.map((step, index) => {
        const stepCards = cardsByStep.get(index) ?? [];
        const phase = phases[index] ?? "idle";

        return (
          <li
            key={`${scenario.id}-${step.title}`}
            className={cn("flex flex-col", entering && "script-step-in")}
            style={
              entering
                ? ({
                    "--step-index": Math.min(index, SCRIPT_STAGGER_CAP),
                  } as CSSProperties)
                : undefined
            }
          >
            <ScriptStepRow
              title={step.title}
              // Fields resolve here rather than in the data, so the same
              // authored script reads differently per contact — and so a token
              // can never reach the agent mid-sentence.
              wording={resolveScenarioText(scenario, step.wording)}
              phase={phase}
              glow={glowing.has(index)}
              reduced={reduced}
            />
            {stepCards.map(({ suggestion: card, status }) => (
              <InCallGuidanceSlot
                key={card.id}
                item={card}
                reduced={reduced}
                expanded={isExpanded(card.id)}
                arriving={arrivingIds.has(card.id)}
                arrivalIndex={arrivingIds.get(card.id) ?? 0}
                newLabel={newLabelIds.has(card.id)}
                attention={attentionIds.has(card.id)}
                status={status}
                relevantAgain={relevantAgainIds.has(card.id)}
                onToggle={() => onToggleCard(card.id)}
                onViewResource={onViewResource}
                onEngage={onEngage}
                onDisengage={onDisengage}
                cardRef={(node) => registerCard(card.id, node)}
                className="py-1.5"
              />
            ))}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Wide in-call layout — the transcript stops being a toggle and gets its own
 * pane beside Agent Assist. Same header rhythm as the assist panel so the two
 * read as one surface split in two.
 */
export interface LiveTranscriptPanelProps {
  elapsedMs: number;
  scenario: CallScenario;
  guidanceItems?: GuidanceItem[];
  /** Hangup — the live stream lets go before the phone changes state. */
  exiting?: boolean;
  /**
   * The agent turns the transcript on from the call bar, so the panel is only
   * ever whole or gone — off, it stops streaming rather than sitting collapsed.
   */
  active?: boolean;
  onClose?: () => void;
  /** Same bargain as the assist sheet's: something outside already names the
      pane, so the header keeps only its close control. */
  titleHidden?: boolean;
  className?: string;
}

export function LiveTranscriptPanel({
  elapsedMs,
  scenario,
  guidanceItems = SEED_GUIDANCE,
  exiting = false,
  active = true,
  onClose,
  titleHidden = false,
  className,
}: LiveTranscriptPanelProps) {
  const snapshot = simulationAt(scenario, elapsedMs, guidanceItems);
  const reduced = prefersReducedMotion();
  const bodyId = useId();

  return (
    <section
      aria-label="Live transcript"
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white",
        className
      )}
    >
      <header
        className={cn(
          "flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-4",
          titleHidden && "justify-end",
          !reduced && "assist-head-in"
        )}
      >
        <div className={cn("flex min-w-0 items-center gap-1.5", titleHidden && "hidden")}>
          <IconWaveform className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-label-md-semi text-foreground">Live transcript</span>
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="Close live transcript"
            aria-controls={bodyId}
            onClick={onClose}
            className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24 active:scale-[0.97]"
          >
            <IconPanelClose className="size-4" />
          </button>
        ) : null}
      </header>

      <div
        id={bodyId}
        role="region"
        aria-label="Call transcript"
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          !reduced && "assist-card-body assist-card-body-open"
        )}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <TranscriptPane
            turns={snapshot.transcript}
            contactName={scenario.contactName}
            reduced={reduced}
            exiting={exiting}
            active={active}
          />
        </div>
      </div>
    </section>
  );
}

function IconWaveform(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2 6.5v3M5 4v8M8 2.5v11M11 4.5v7M14 6.5v3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Close — an X, the same dismissal the Notes pane next door offers. */
function IconPanelClose(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The signed-in agent — same initials the global header shows. */
const AGENT_INITIALS = "SJ";

// ---------------------------------------------------------------------------
// Progressive transcript — chunk-based reveal
// ---------------------------------------------------------------------------

interface ProgressiveTurn {
  atMs: number;
  speaker: TranscriptSpeaker;
  fullQuote: string;
  visibleText: string;
  finalized: boolean;
}

/**
 * Split a quote into cumulative reveal chunks (each chunk is the full visible
 * string up to that point). Groups 1-3 words per chunk for a natural feel.
 */
function buildChunks(quote: string): string[] {
  const words = quote.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < words.length) {
    const r = Math.random();
    const chunkSize = r < 0.35 ? 1 : r < 0.70 ? 2 : 3;
    cursor = Math.min(cursor + chunkSize, words.length);
    chunks.push(words.slice(0, cursor).join(" "));
  }
  return chunks;
}

/**
 * Takes raw simulation turns (each with a complete quote) and returns
 * ProgressiveTurn[] where each quote is revealed in word-chunks via
 * real-time intervals, finalizing ~800ms after the last chunk appears.
 */
function useProgressiveTranscript(turns: TranscriptTurn[]): ProgressiveTurn[] {
  const [state, setState] = useState<Map<number, ProgressiveTurn>>(new Map());
  const scheduled = useRef<Set<number>>(new Set());

  useEffect(() => {
    for (const turn of turns) {
      const key = turn.atMs;
      if (scheduled.current.has(key)) continue;
      scheduled.current.add(key);

      const chunks = buildChunks(turn.quote);

      // Create the row immediately with the first chunk.
      setState((prev) => {
        const next = new Map(prev);
        next.set(key, {
          atMs: turn.atMs,
          speaker: turn.speaker,
          fullQuote: turn.quote,
          visibleText: chunks[0] ?? turn.quote,
          finalized: chunks.length <= 1,
        });
        return next;
      });

      if (chunks.length <= 1) {
        setTimeout(() => {
          setState((prev) => {
            const next = new Map(prev);
            const ex = next.get(key);
            if (ex) next.set(key, { ...ex, finalized: true });
            return next;
          });
        }, 820);
        continue;
      }

      // Stream remaining chunks with 150-300ms random intervals.
      let idx = 1;
      const scheduleNext = () => {
        if (idx >= chunks.length) {
          setTimeout(() => {
            setState((prev) => {
              const next = new Map(prev);
              const ex = next.get(key);
              if (ex) next.set(key, { ...ex, finalized: true });
              return next;
            });
          }, 820);
          return;
        }
        const delay = 150 + Math.random() * 150;
        setTimeout(() => {
          const chunk = chunks[idx++];
          setState((prev) => {
            const next = new Map(prev);
            const ex = next.get(key);
            if (ex) next.set(key, { ...ex, visibleText: chunk, finalized: false });
            return next;
          });
          scheduleNext();
        }, delay);
      };

      // Small head-start so the row enter animation plays before text streams.
      setTimeout(scheduleNext, 160);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns.length]);

  return turns.map((turn) => {
    const p = state.get(turn.atMs);
    return p ?? {
      atMs: turn.atMs,
      speaker: turn.speaker,
      fullQuote: turn.quote,
      visibleText: "",
      finalized: false,
    };
  });
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

interface ProgressiveGroup {
  speaker: TranscriptSpeaker;
  atMs: number;
  quotes: ProgressiveTurn[];
}

function groupProgressiveTurns(turns: ProgressiveTurn[]): ProgressiveGroup[] {
  const groups: ProgressiveGroup[] = [];
  for (const turn of turns) {
    const last = groups[groups.length - 1];
    if (last && last.speaker === turn.speaker) {
      last.quotes.push(turn);
      continue;
    }
    groups.push({ speaker: turn.speaker, atMs: turn.atMs, quotes: [turn] });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// TranscriptPane
// ---------------------------------------------------------------------------

const SCROLL_THRESHOLD = 80;

function TranscriptPane({
  turns,
  contactName,
  reduced,
  exiting = false,
  active = true,
}: {
  turns: TranscriptTurn[];
  contactName: string;
  reduced: boolean;
  exiting?: boolean;
  /** Hidden — don't auto-scroll a pane the agent isn't looking at. */
  active?: boolean;
}) {
  const progressive = useProgressiveTranscript(turns);
  const groups = useMemo(() => groupProgressiveTurns(progressive), [progressive]);

  const scrollRef = useRef<HTMLOListElement | null>(null);
  const autoScrollActive = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const lastFingerprint = useRef("");

  // Auto-scroll when new content appears, but only when already near the bottom.
  useEffect(() => {
    if (!active) return;
    const fingerprint = progressive.map((t) => t.visibleText).join("|");
    if (fingerprint === lastFingerprint.current) return;
    lastFingerprint.current = fingerprint;
    const el = scrollRef.current;
    if (!autoScrollActive.current || !el) return;
    el.scrollTop = el.scrollHeight - el.clientHeight;
  }, [progressive, active]);

  // Detect manual upward scroll to disable auto-scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (dist > SCROLL_THRESHOLD) {
        autoScrollActive.current = false;
        setShowJump(true);
      } else {
        autoScrollActive.current = true;
        setShowJump(false);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Coming back from Notes / Live Assist: stay on live if they were following,
  // otherwise keep the scroll they left and offer Jump to live.
  useEffect(() => {
    if (!active) return;
    const el = scrollRef.current;
    if (!el) return;
    if (autoScrollActive.current) {
      el.scrollTop = el.scrollHeight - el.clientHeight;
      setShowJump(false);
      return;
    }
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJump(dist > SCROLL_THRESHOLD);
  }, [active]);

  // Notes open/close resizes this pane. Stay pinned to latest if the agent
  // already was; otherwise keep the same top anchor and reveal more below.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!autoScrollActive.current) return;
      el.scrollTop = el.scrollHeight - el.clientHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight - el.clientHeight;
    autoScrollActive.current = true;
    setShowJump(false);
  };

  if (turns.length === 0) {
    return (
      <div className="flex flex-1 items-start px-4 py-4">
        <p className="text-pretty text-paragraph-sm text-muted-foreground">
          Nothing to replay yet. Open this if you miss a sentence — it won't
          sit beside you while you're talking.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ol
        ref={scrollRef}
        className={cn(
          "call-pane-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 [overflow-anchor:none]",
          !reduced && !exiting && "animate-[assist-now-in_180ms_cubic-bezier(0.23,1,0.32,1)_both]",
          !reduced && exiting && "assist-stream-out"
        )}
        aria-label="Call transcript"
      >
        {groups.map((group, gIndex) => {
          const isCustomer = group.speaker === "customer";
          const name = isCustomer ? contactName : "You";
          return (
            <li
              key={`${group.atMs}-${group.speaker}`}
              className="flex gap-2.5"
              style={{ marginTop: gIndex === 0 ? 0 : "22px" }}
            >
              <Avatar
                size="sm"
                color={isCustomer ? "indigo" : "purple"}
                initials={isCustomer ? initialsFromName(name) : AGENT_INITIALS}
                className="mt-px shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col pt-0.5">
                <p className="mb-1 truncate text-label-xs uppercase tracking-[0.06em] text-muted-foreground">
                  {name}
                </p>
                {group.quotes.map((turn, qIndex) => (
                  <ProgressiveQuote
                    key={turn.atMs}
                    turn={turn}
                    isCustomer={isCustomer}
                    isFirst={qIndex === 0}
                    reduced={reduced}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      {showJump && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <button
            type="button"
            onClick={jumpToLatest}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-label-xs text-foreground shadow-sm transition-colors duration-100 hover:bg-surface-1"
          >
            <span aria-hidden="true">&#x2193;</span>
            <span>Jump to live</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProgressiveQuote — single utterance paragraph with chunk-fade animation
// ---------------------------------------------------------------------------

function ProgressiveQuote({
  turn,
  isCustomer,
  isFirst,
  reduced,
}: {
  turn: ProgressiveTurn;
  isCustomer: boolean;
  isFirst: boolean;
  reduced: boolean;
}) {
  const [entered, setEntered] = useState(false);
  const prevTextRef = useRef("");

  useEffect(() => {
    if (reduced) { setEntered(true); return; }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  const text = turn.visibleText;
  const prev = prevTextRef.current;
  const newSuffix = text.length > prev.length ? text.slice(prev.length) : null;
  prevTextRef.current = text;

  const opacity = turn.finalized ? 1 : 0.72;

  return (
    <p
      className={cn(
        "text-pretty text-paragraph-md",
        isCustomer ? "text-foreground" : "text-muted-foreground"
      )}
      style={{
        marginTop: isFirst ? 0 : "9px",
        opacity: entered ? opacity : 0,
        transform: entered ? "translateY(0)" : "translateY(4px)",
        transition: reduced
          ? "none"
          : `opacity ${turn.finalized ? 150 : 130}ms ease-out, transform 130ms ease-out`,
      }}
    >
      {reduced ? (
        <span>{text}</span>
      ) : (
        <>
          {prev && <span>{prev}</span>}
          {newSuffix && (
            <span
              key={text}
              style={{
                display: "inline",
                opacity: 0,
                animation: "transcript-chunk-in 120ms ease-out forwards",
              }}
            >
              {newSuffix}
            </span>
          )}
        </>
      )}
    </p>
  );
}

export type { GuidanceSuggestion };
