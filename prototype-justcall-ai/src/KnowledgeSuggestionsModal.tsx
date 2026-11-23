import type { CSSProperties, ReactNode, SVGProps } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { IconChevronUp, IconClose, IconSparkles } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/Modal";
import { GuidanceResourceLink } from "./GuidanceCard";
import { IconAaKnowledge } from "./icons/AgentAssistNavIcons";
import { SEED_KNOWLEDGE_SOURCES, knowledgeFacts } from "./knowledgeData";

/**
 * "Learn more" for Knowledge Base suggestions.
 *
 * The nav card can only afford one line about the capability, and one line is
 * not enough to decide with: an admin who has never seen a live call cannot
 * picture what "surface relevant answers" puts in front of an agent. So the
 * explanation is a picture of the thing, not a paragraph about it — the right
 * half sketches the moment as the agent sees it (a live call, then a Knowledge
 * card arriving) using the same card, colours, and entrance the live panel
 * uses. Surrounding transcript stays schematic; the words that retrieve the
 * card are highlighted and the card's own title, lead line, and source stay
 * readable, so the picture is a cause and an effect rather than a collage. The
 * left half answers only what the picture cannot: what triggers it, what the
 * answer looks like, and where the content comes from.
 *
 * It ends on the step the card opened with — authoring the first Knowledge
 * Base — so the modal is a way to get on with it rather than a detour on the
 * way back to the card. There is no "enable" here: with a Knowledge Base in the
 * account the capability is already on, and this modal is only ever reached
 * from the card that says there is not one yet.
 */

const PRODUCT_KB = SEED_KNOWLEDGE_SOURCES.find(
  (source) => source.id === "ks-product-kb"
)!;
const RETENTION_ENTRY = PRODUCT_KB.entries.find(
  (entry) => entry.id === "ke-recording-retention"
)!;

/** Same cue the live demo uses to surface this entry. */
const RETENTION_QUESTION =
  "And how long do you keep call recordings? Compliance will ask.";

/**
 * The words that retrieved the card, highlighted inside the question so the
 * picture reads as one cause and one effect rather than "a question happened,
 * then a card appeared".
 */
const RETENTION_CUE = "keep call recordings?";

export interface KnowledgeSuggestionsModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Leaves for the Knowledge page to author the first Knowledge Base. The
   * modal closes itself first.
   */
  onCreateKnowledgeBase: () => void;
}

const POINTS: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: <IconSparkles size={16} />,
    title: "Answers surface automatically",
    body: "Relevant knowledge appears when the conversation calls for it.",
  },
  {
    icon: <IconAaKnowledge className="size-4" />,
    title: "Ready to say",
    body: "Clear, concise answers agents can use immediately.",
  },
  {
    icon: <IconLayers />,
    title: "Uses your existing Knowledge Base",
    body: "Works with the Knowledge Bases your team already maintains.",
  },
];

export function KnowledgeSuggestionsModal({
  open,
  onClose,
  onCreateKnowledgeBase,
}: KnowledgeSuggestionsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      showCloseButton={false}
      bodyClassName="p-0"
    >
      {/* 46/54 only once there is room for it. Between md and lg the modal
          is narrow enough that a 46% column makes the heading wrap badly, so
          the split stays even there and the illustration gives the width
          back. */}
      <div className="relative grid md:grid-cols-2 lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 z-10 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconClose size={20} />
        </button>

        {/* One left edge for all four blocks, and the CTA spaced off the
            benefits rather than pinned to the bottom — it is the last step of
            the argument, not a footer. */}
        <div className="flex flex-col px-10 pb-8 pt-9">
          {/* Balanced rather than pretty: the shortest width that still fits
              two lines breaks after the comma, which is the break the copy
              wants. A max-width would hardcode the same number and drift the
              first time the type scale moves. */}
          <h2 className="text-balance text-heading-xxl text-foreground">
            Your Knowledge Base, right when agents need it
          </h2>
          <p className="mt-4 text-pretty text-paragraph-md text-gray-600">
            Surface relevant answers from your Knowledge Base automatically
            during live calls, so agents can respond without searching or
            switching tabs.
          </p>

          <ul className="mt-8 flex flex-col gap-6">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand">
                  {point.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-label-md-semi text-foreground">
                    {point.title}
                  </span>
                  <span className="mt-0.5 block text-pretty text-paragraph-md text-gray-600">
                    {point.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-9">
            <Button
              onClick={() => {
                onClose();
                onCreateKnowledgeBase();
              }}
            >
              Create Knowledge Base
            </Button>
          </div>
        </div>

        <KnowledgeSurfacingIllustration />
      </div>
    </Modal>
  );
}

/**
 * The capability, drawn as the agent sees it. Decorative — `aria-hidden`, and
 * nothing in here is focusable — because the left column already carries every
 * fact it depicts.
 *
 * The rest of the transcript is pill bars so the picture stays a sketch, and
 * the card's facts are bars too — three of them, at three lengths, says "a
 * scannable list of facts" without asking the admin to read a retention
 * policy. What stays readable is the chain: the asked words, the card's title
 * and lead line, and the page it came from. The 200ms `assist-card-enter` is
 * staggered so the question still lands before the answer does.
 *
 * Everything that is setting rather than chain — the call chrome, the agent's
 * reply — is dimmed as a group rather than dropped, because the mock has to
 * still read as a call for the moment to mean anything. Dimming leaves the
 * frame and takes the competition.
 */
function KnowledgeSurfacingIllustration() {
  const { summary, points } = knowledgeFacts(RETENTION_ENTRY);
  const cueStart = RETENTION_QUESTION.indexOf(RETENTION_CUE);
  const cueBefore =
    cueStart < 0 ? null : RETENTION_QUESTION.slice(0, cueStart);
  const cueAfter = RETENTION_QUESTION.slice(cueStart + RETENTION_CUE.length);

  return (
    <div
      aria-hidden="true"
      className="relative isolate hidden min-h-[520px] select-none items-center justify-center overflow-hidden border-l border-line bg-[linear-gradient(202deg,var(--color-promo-canvas-from)_0%,var(--color-promo-canvas-mid)_44%,var(--color-promo-canvas-to)_100%)] md:flex"
    >
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--color-promo-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-promo-grid)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute -right-16 top-8 size-64 rounded-full bg-brand/10 blur-3xl" />

      {/* Framed rather than bled off the right edge. Running the mock past the
          modal made it read as a screenshot that had been cropped by accident;
          sitting it in the middle of its own canvas with air on both sides
          says the framing was chosen. The air costs ~11% of the mock's width,
          which the card content absorbs without dropping below readable.

          Top padding is the deeper one because the close button lives in that
          corner: with even padding the mock's top edge lands a few pixels
          under it and the two read as touching. Reserving the button's row
          moves the centre down by ~12px, which on this canvas is invisible —
          crowding the button is not. */}
      <div className="relative w-full px-8 pb-8 pt-14 lg:px-14 lg:pb-10 lg:pt-16">
        <div className="assist-card-enter overflow-hidden rounded-lg border border-line bg-white shadow-400">
          {/* Call chrome — the setting, not the story. Dimmed as a group so
              the eye starts at the question. */}
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5 opacity-60">
            <span className="size-1.5 rounded-full bg-error" />
            <span className="text-label-xs uppercase tracking-[0.06em] text-muted-foreground">
              Live call
            </span>
            <span className="ml-auto text-label-xs tabular-nums text-muted-foreground">
              02:41
            </span>
          </div>

          <div className="flex flex-col gap-3.5 p-3.5">
            <div className="flex gap-2.5">
              <Avatar
                size="sm"
                color="indigo"
                initials="PS"
                className="mt-px shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col pt-0.5">
                <p className="mb-1 truncate text-label-xs uppercase tracking-[0.06em] text-muted-foreground">
                  Priya Sharma
                </p>
                <p className="text-pretty text-paragraph-md text-foreground">
                  {cueBefore}
                  {cueBefore === null ? (
                    RETENTION_QUESTION
                  ) : (
                    <>
                      <mark className="rounded-[3px] bg-brand/15 text-foreground">
                        {RETENTION_CUE}
                      </mark>
                      {cueAfter}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div
              className="assist-card-enter flex items-center gap-1.5 text-label-xs uppercase tracking-[0.06em] text-brand"
              style={{ animationDelay: "180ms" }}
            >
              <IconSparkles size={16} className="size-3.5 shrink-0" />
              Surfaced from your Knowledge Base
            </div>

            <article
              className="assist-card-enter overflow-hidden rounded-lg border border-info-border bg-white shadow-200"
              style={{ animationDelay: "260ms" }}
            >
              <div className="flex items-center gap-2 bg-info-secondary px-3 py-2">
                <IconAaKnowledge className="size-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate text-label-md font-medium text-foreground">
                  {RETENTION_ENTRY.title}
                </span>
                <IconChevronUp
                  size={16}
                  className="-mr-1 shrink-0 text-muted-foreground"
                />
              </div>
              <div className="flex flex-col gap-3 px-4 py-3">
                {summary ? (
                  <p className="text-pretty text-label-md text-foreground">
                    {summary}
                  </p>
                ) : null}
                {points.length > 0 ? (
                  <ul className="flex flex-col gap-2.5 pl-1">
                    {points.map((point) => (
                      <li key={point.heading} className="flex items-center gap-2.5">
                        <span className="size-1 shrink-0 rounded-full bg-gray-400/60" />
                        <TextBar style={{ width: barWidth(point.heading) }} />
                      </li>
                    ))}
                  </ul>
                ) : null}
                {/* Named the way the real card names it: the page the answer
                    came from, not the Knowledge Base it lives in. */}
                <GuidanceResourceLink
                  resource={{
                    id: RETENTION_ENTRY.id,
                    type: "link",
                    name: RETENTION_ENTRY.sourceTitle ?? PRODUCT_KB.name,
                  }}
                />
              </div>
            </article>

            {/* The payoff, and the reason the mock keeps going past the card:
                the agent answers from it without leaving the call. */}
            <div
              className="assist-card-enter flex gap-2.5 opacity-55"
              style={{ animationDelay: "460ms" }}
            >
              <Avatar
                size="sm"
                color="purple"
                initials="SJ"
                className="mt-px shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                <TextBar className="h-1.5 w-10" />
                <TextBar className="w-[84%]" />
                <TextBar className="w-[52%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Static pill used in place of copy — not an animated skeleton. */
function TextBar({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn("block h-2 rounded-full bg-gray-300/60", className)}
      style={style}
    />
  );
}

/**
 * A bar as long as the fact it stands in for, so the three facts read as three
 * different lengths rather than a stack of identical rules.
 */
function barWidth(heading: string) {
  return `${Math.min(88, Math.round(34 + heading.length * 1.6))}%`;
}

/** Stacked sheets — "the Knowledge Base you already have". */
function IconLayers(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M8 1.833 1.833 5 8 8.167 14.167 5 8 1.833ZM1.833 11 8 14.167 14.167 11M1.833 8 8 11.167 14.167 8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
