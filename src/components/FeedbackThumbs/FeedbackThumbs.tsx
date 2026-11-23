import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * FeedbackThumbs — a two-button up/down vote.
 *
 * The whole point of this control is that it costs one tap and no thought.
 * Anywhere we want to know whether something landed — an AI suggestion, the
 * audio on a call — the question has to be answerable without opening a form,
 * or nobody answers it. So: no comment box, no submit, no confirmation dialog.
 * The filled thumb is the receipt.
 *
 * It is fully controlled. The parent owns the vote because the vote is the
 * parent's data — it gets logged, it survives a re-render, and in most places
 * it arrives from the server already set.
 *
 * Two weights, chosen by how long the question is on screen. Inside a card the
 * reader is already there, so a bare glyph that surfaces on hover is enough.
 * On a bar that appears for a few seconds after a call, nobody hovers to find
 * out what is offered — `emphasis="filled"` plus `upText`/`downText` makes the
 * pair read as two things you can press before it is gone.
 *
 * ── Motion ─────────────────────────────────────────────────────────────
 * Casting a vote pops the glyph (scale + a nod in the thumb's direction)
 * and throws a short burst off the icon — a one-shot at `emphasis`, gone
 * before the next sentence. Clearing a vote is the exit of that move: a
 * quicker reverse nod, no burst, fill dropping back to a stroke. The glyph
 * is never remounted to replay those — a keyed remount next to the burst
 * used to leave the previous SVG in the tree, so a second click stacked
 * another thumb. Replay is a reflow restart instead. Reduced motion drops
 * the travel and keeps the fill change.
 */

export type FeedbackVote = "up" | "down" | null;

const thumbButton = cva(
  "inline-flex cursor-pointer items-center justify-center overflow-visible outline-none " +
    "transition-colors duration-base",
  {
    variants: {
      tone: {
        // On a card or a white pane.
        light:
          "text-muted-foreground hover:bg-surface-hover hover:text-foreground " +
          "focus-visible:ring-2 focus-visible:ring-brand/24",
        // On the dialer's dark chrome, where the semantic greys have no
        // contrast — the surface tints itself instead of taking a fill.
        dark:
          "text-white/70 hover:bg-white/10 hover:text-white " +
          "focus-visible:ring-2 focus-visible:ring-white/40",
      },
      // A bare thumb is a glyph that only appears when hovered; a filled one
      // carries its own resting surface. Reach for `filled` where the question
      // has to be *found* rather than merely answered — a bar that slides in
      // after a call has no dwell time in which a bare glyph gets noticed.
      emphasis: { bare: "", filled: "" },
      size: { sm: "", md: "" },
      shape: {
        pill: "rounded-full",
        rounded: "rounded-md",
      },
      labeled: { true: "gap-1.5", false: "" },
      selected: { true: "", false: "" },
    },
    compoundVariants: [
      // A labelled thumb can't be square, so both dimensions are decided
      // here rather than by `size` alone — `size-8` and `h-8 px-3` are the
      // same class group, and tw-merge resolves that pair the wrong way.
      { size: "sm", labeled: false, class: "size-7" },
      { size: "md", labeled: false, class: "size-8" },
      { size: "sm", labeled: true, class: "h-7 px-2 text-label-sm" },
      { size: "md", labeled: true, class: "h-8 px-2.5 text-label-md" },

      { tone: "light", emphasis: "filled", class: "bg-secondary-bg text-foreground hover:bg-muted" },
      { tone: "dark", emphasis: "filled", class: "bg-white/10 text-white hover:bg-white/16" },

      {
        tone: "light",
        selected: true,
        // Hover is pinned to the selected fill so re-hovering the answer you
        // already gave doesn't read as un-selecting it.
        class: "bg-brand-subtle text-brand hover:bg-brand-subtle hover:text-brand",
      },
      {
        tone: "dark",
        selected: true,
        class: "bg-white/15 text-white hover:bg-white/15 hover:text-white",
      },
      {
        // A selected fill only reads as selected if it clears the resting one.
        // White/15 over a bare surface is unmistakable; over the filled
        // white/10 it is a rounding error, so the filled variant answers a
        // step brighter.
        tone: "dark",
        emphasis: "filled",
        selected: true,
        class: "bg-white/28 text-white hover:bg-white/28 hover:text-white",
      },
    ],
    defaultVariants: {
      tone: "light",
      emphasis: "bare",
      size: "sm",
      shape: "pill",
      labeled: false,
    },
  }
);

/*
 * The cva output is run through `cn()` at the call sites below rather than
 * used raw. The selected compound variant re-states `text-*` and `bg-*` that
 * the tone base already set, and two utilities in the same group are decided
 * by stylesheet order, not by the order they appear in `class`. Without the
 * merge the selected state silently loses to the resting one.
 */

/** Glyph box sizes, one step down from the button so the fill has a margin. */
const GLYPH: Record<FeedbackThumbsSize, number> = { sm: 14, md: 16 };

export type FeedbackThumbsTone = "light" | "dark";
export type FeedbackThumbsSize = "sm" | "md";
export type FeedbackThumbsShape = "pill" | "rounded";
export type FeedbackThumbsEmphasis = "bare" | "filled";

/**
 * The variant props are spelled out rather than lifted off `VariantProps`:
 * cva types every variant as possibly-null, and `size` indexes GLYPH.
 */
export interface FeedbackThumbsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  tone?: FeedbackThumbsTone;
  size?: FeedbackThumbsSize;
  shape?: FeedbackThumbsShape;
  /** `filled` gives each thumb a resting surface instead of a bare glyph. */
  emphasis?: FeedbackThumbsEmphasis;
  /** The vote on record. `null` means unanswered. */
  value: FeedbackVote;
  /**
   * Fires with the new vote. Clicking the selected thumb clears it to `null`
   * unless `clearable` is off — a mis-tap should be undoable in the same
   * gesture that caused it.
   */
  onChange: (vote: FeedbackVote) => void;
  clearable?: boolean;
  upLabel?: string;
  downLabel?: string;
  /**
   * Visible text beside each glyph. Short — "Good" / "Bad" — because the full
   * sentence stays on `upLabel`/`downLabel` for screen readers, which is where
   * "Call quality was good" belongs and where it costs no width. Supplying one
   * without the other is fine; the unlabelled thumb stays square.
   */
  upText?: string;
  downText?: string;
}

export function FeedbackThumbs({
  value,
  onChange,
  tone = "light",
  size = "sm",
  shape = "pill",
  emphasis = "bare",
  clearable = true,
  upLabel = "Helpful",
  downLabel = "Not helpful",
  upText,
  downText,
  className,
  ...props
}: FeedbackThumbsProps) {
  // One pulse per thumb rather than one shared: pressing up and then down
  // has to animate the thumb that was actually clicked, not both.
  const [upPulse, setUpPulse] = React.useState<ThumbPulse>(IDLE_PULSE);
  const [downPulse, setDownPulse] = React.useState<ThumbPulse>(IDLE_PULSE);

  const vote = (next: Exclude<FeedbackVote, null>) => {
    const clearing = clearable && value === next;
    const bump = (current: ThumbPulse): ThumbPulse => ({
      count: current.count + 1,
      pop: !clearing,
    });
    if (next === "up") setUpPulse(bump);
    else setDownPulse(bump);
    onChange(clearing ? null : next);
  };

  return (
    <div className={cn("flex items-center gap-1", className)} {...props}>
      <button
        type="button"
        aria-label={upLabel}
        aria-pressed={value === "up"}
        onClick={() => vote("up")}
        className={cn(
          thumbButton({
            tone,
            size,
            shape,
            emphasis,
            labeled: Boolean(upText),
            selected: value === "up",
          }),
          upPulse.pop && "relative z-10"
        )}
      >
        <ThumbGlyph
          direction="up"
          pulse={upPulse}
          size={GLYPH[size]}
          filled={value === "up"}
        />
        {upText ? <span>{upText}</span> : null}
      </button>

      <button
        type="button"
        aria-label={downLabel}
        aria-pressed={value === "down"}
        onClick={() => vote("down")}
        className={cn(
          thumbButton({
            tone,
            size,
            shape,
            emphasis,
            labeled: Boolean(downText),
            selected: value === "down",
          }),
          downPulse.pop && "relative z-10"
        )}
      >
        <ThumbGlyph
          direction="down"
          pulse={downPulse}
          size={GLYPH[size]}
          filled={value === "down"}
        />
        {downText ? <span>{downText}</span> : null}
      </button>
    </div>
  );
}

type ThumbPulse = { count: number; pop: boolean };

const IDLE_PULSE: ThumbPulse = { count: 0, pop: false };

function ThumbGlyph({
  direction,
  pulse,
  size,
  filled,
}: {
  direction: Exclude<FeedbackVote, null>;
  pulse: ThumbPulse;
  size: number;
  filled: boolean;
}) {
  const Icon = direction === "up" ? ThumbUpIcon : ThumbDownIcon;
  const popClass = direction === "up" ? "thumb-like" : "thumb-dislike";
  const unlikeClass = direction === "up" ? "thumb-unlike" : "thumb-unlike-down";
  const animClass =
    pulse.count > 0 ? (pulse.pop ? popClass : unlikeClass) : undefined;
  const iconWrapRef = React.useRef<HTMLSpanElement>(null);

  // Replay the pop/unlike without remounting the SVG. A keyed remount as a
  // sibling of the burst left the previous glyph in the tree — each click
  // stacked another thumb in the button.
  React.useLayoutEffect(() => {
    const el = iconWrapRef.current;
    if (!el || pulse.count === 0) return;
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  }, [pulse.count]);

  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        ref={iconWrapRef}
        className={cn(
          "absolute inset-0 inline-flex items-center justify-center",
          animClass
        )}
      >
        <Icon size={size} filled={filled} />
      </span>
      {pulse.count > 0 && pulse.pop ? (
        <ThumbBurst key={pulse.count} direction={direction} />
      ) : null}
    </span>
  );
}

/*
 * Positions are the travel of each speck, not layout — they have to live
 * as custom properties so the keyframe can interpolate to them. Irregular
 * on purpose: a perfect hexagon reads as a loading spinner, not a burst.
 */
const BURST: { x: number; y: number; size: number; spark?: boolean }[] = [
  { x: 1, y: -14, size: 3 },
  { x: 11, y: -8, size: 5, spark: true },
  { x: -9, y: -11, size: 2 },
  { x: 14, y: 3, size: 2.5 },
  { x: -13, y: 1, size: 5, spark: true },
  { x: 5, y: 12, size: 2 },
  { x: -6, y: 10, size: 2.5 },
];

function ThumbBurst({ direction }: { direction: Exclude<FeedbackVote, null> }) {
  const flip = direction === "down" ? -1 : 1;
  return (
    <span className="thumb-burst" aria-hidden="true">
      <span className="thumb-burst-ring" />
      {BURST.map((dot, i) => (
        <span
          key={i}
          className={cn("thumb-burst-dot", dot.spark && "thumb-burst-spark")}
          style={
            {
              "--burst-x": `${dot.x}px`,
              "--burst-y": `${dot.y * flip}px`,
              "--burst-size": `${dot.size}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

/**
 * The thumbs are drawn here rather than imported from `@/components/Icon`
 * because the Figma icon library carries no thumb yet, and because these need
 * a filled state — the generated set is stroke-only, so a selected vote would
 * have nothing to change into. Same 16-unit grid and `currentColor` stroke as
 * the library, so they sit correctly beside generated icons. Replace both with
 * generated icons once the library ships them.
 */
function ThumbUpIcon({ size, filled }: { size: number; filled: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.5 7.5v6H3.25A1.25 1.25 0 0 1 2 12.25v-3.5A1.25 1.25 0 0 1 3.25 7.5H4.5Zm0 0 2.1-4.4A1.6 1.6 0 0 1 8.05 2.2c.7 0 1.2.6 1.07 1.28L8.75 5.5H12.2a1.8 1.8 0 0 1 1.76 2.18l-.7 3.2A2 2 0 0 1 11.3 12.5H4.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbDownIcon({ size, filled }: { size: number; filled: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.5 8.5v-6H3.25A1.25 1.25 0 0 0 2 3.75v3.5A1.25 1.25 0 0 0 3.25 8.5H4.5Zm0 0 2.1 4.4a1.6 1.6 0 0 0 1.45.9c.7 0 1.2-.6 1.07-1.28L8.75 10.5H12.2a1.8 1.8 0 0 0 1.76-2.18l-.7-3.2A2 2 0 0 0 11.3 3.5H4.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
