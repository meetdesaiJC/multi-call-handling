import * as React from "react";
import {
  IconChevronDown,
  IconCircleCheckFilled,
  IconMessageCircle2,
} from "@/components/Icon";
import { FeedbackThumbs } from "@/components/FeedbackThumbs";
import { Modal } from "@/components/Modal";
import { cn } from "@/lib/utils";
import {
  AIRCALL_BATTLECARD,
  type BattlecardData,
  type GuidanceItem,
  type GuidanceKind,
  type GuidanceResource,
} from "./guidanceData";

function battlecardValueClass(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes") return "text-success";
  if (normalized === "no") return "text-error";
  return "text-muted-foreground";
}

export function BattlecardVisual({
  className,
  data = AIRCALL_BATTLECARD,
  size = "sm",
}: {
  className?: string;
  data?: BattlecardData;
  size?: "sm" | "lg";
}) {
  const large = size === "lg";
  const grid = large
    ? "grid-cols-[minmax(0,1.3fr)_1fr_1fr]"
    : "grid-cols-[minmax(0,1fr)_88px_88px]";
  const cell = large ? "px-4 py-3" : "px-2 py-1.5";
  const heading = large
    ? "text-label-md-semi text-foreground"
    : "text-[10px] leading-normal font-semibold text-foreground";
  const headingInverse = large
    ? "text-label-md-semi text-white"
    : "text-[10px] leading-normal font-semibold text-white";
  const feature = large
    ? "text-pretty text-label-md text-foreground"
    : "truncate text-[10px] leading-normal text-foreground";
  const value = large
    ? "text-label-md font-medium"
    : "text-[10px] leading-normal font-medium";

  return (
    <div
      className={cn(
        "w-full overflow-hidden border border-line bg-white",
        large ? "rounded-lg" : "rounded-md",
        className
      )}
    >
      <div className={cn("grid items-stretch", grid)}>
        <div className={cn("min-w-0", cell)}>
          <p className={heading}>Features</p>
        </div>
        <div className={cn("flex items-center justify-center bg-brand", cell)}>
          <p className={headingInverse}>{data.usLabel}</p>
        </div>
        <div className={cn("flex items-center justify-center", cell)}>
          <p className={heading}>{data.competitorLabel}</p>
        </div>
      </div>
      {data.rows.map((row) => (
        <div
          key={row.feature}
          className={cn("grid items-stretch border-t border-line", grid)}
        >
          <div className={cn("min-w-0", cell)}>
            <p className={feature}>{row.feature}</p>
          </div>
          <div className={cn("flex items-center justify-center", cell)}>
            <p className={cn(value, battlecardValueClass(row.us))}>{row.us}</p>
          </div>
          <div className={cn("flex items-center justify-center", cell)}>
            <p className={cn(value, battlecardValueClass(row.competitor))}>
              {row.competitor}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Miniature of the comparison header — for 40px resource thumbs. */
export function BattlecardThumb({
  className,
  data = AIRCALL_BATTLECARD,
}: {
  className?: string;
  data?: BattlecardData;
}) {
  return (
    <div
      className={cn("flex size-full overflow-hidden bg-white", className)}
      aria-hidden="true"
      title={`${data.usLabel} vs ${data.competitorLabel}`}
    >
      <span className="min-w-0 flex-1 bg-secondary-bg" />
      <span className="w-[34%] shrink-0 bg-brand" />
      <span className="w-[34%] shrink-0 bg-white" />
    </div>
  );
}

export function GuidanceSectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-label-sm font-medium tracking-[0.04em] text-muted-foreground uppercase",
        className
      )}
    >
      {children}
    </p>
  );
}

function AiGlyphGradient({ id }: { id: string }) {
  return (
    <linearGradient
      id={id}
      x1="-0.979"
      y1="-5.715"
      x2="20.879"
      y2="-3.737"
      gradientUnits="userSpaceOnUse"
    >
      <stop stopColor="var(--color-ai-gradient-from)" />
      <stop offset="1" stopColor="var(--color-ai-gradient-to)" />
    </linearGradient>
  );
}

/** Filled AI sparkles — Design System 2.0 16px path with ai/primary gradient. */
export function GuidanceSparklesIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M10.6667 12.0003C11.0203 12.0003 11.3594 12.1408 11.6095 12.3909C11.8595 12.6409 12 12.98 12 13.3337C12 12.98 12.1405 12.6409 12.3905 12.3909C12.6406 12.1408 12.9797 12.0003 13.3333 12.0003C12.9797 12.0003 12.6406 11.8598 12.3905 11.6098C12.1405 11.3598 12 11.0206 12 10.667C12 11.0206 11.8595 11.3598 11.6095 11.6098C11.3594 11.8598 11.0203 12.0003 10.6667 12.0003ZM10.6667 4.00033C11.0203 4.00033 11.3594 4.1408 11.6095 4.39085C11.8595 4.6409 12 4.98004 12 5.33366C12 4.98004 12.1405 4.6409 12.3905 4.39085C12.6406 4.1408 12.9797 4.00033 13.3333 4.00033C12.9797 4.00033 12.6406 3.85985 12.3905 3.6098C12.1405 3.35975 12 3.02061 12 2.66699C12 3.02061 11.8595 3.35975 11.6095 3.6098C11.3594 3.85985 11.0203 4.00033 10.6667 4.00033ZM6 12.0003C6 10.9395 6.42143 9.92204 7.17157 9.1719C7.92172 8.42175 8.93913 8.00033 10 8.00033C8.93913 8.00033 7.92172 7.5789 7.17157 6.82875C6.42143 6.07861 6 5.06119 6 4.00033C6 5.06119 5.57857 6.07861 4.82843 6.82875C4.07828 7.5789 3.06087 8.00033 2 8.00033C3.06087 8.00033 4.07828 8.42175 4.82843 9.1719C5.57857 9.92204 6 10.9395 6 12.0003Z"
        fill={`url(#${id})`}
        stroke={`url(#${id})`}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <AiGlyphGradient id={id} />
      </defs>
    </svg>
  );
}

/** Outlined speech bubble — Design System `message-circle-2`, brand stroke. */
export function GuidanceSpeechBubbleIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <IconMessageCircle2
      size={size === 20 || size === 24 ? size : 16}
      className={className}
    />
  );
}

/**
 * Guidance header — the card's only control. Guidance lives in its own tab now,
 * so a card is never dismissed: the header just collapses and expands it.
 */
export function GuidanceAiHeader({
  title,
  expanded,
  onToggle,
  badge,
  action,
  className,
}: {
  title: string;
  expanded?: boolean;
  onToggle?: () => void;
  /** Card state at a glance — New, Relevant again, Earlier. */
  badge?: React.ReactNode;
  /** Card action kept separate from the disclosure button. */
  action?: React.ReactNode;
  className?: string;
}) {
  const open = expanded !== false;
  const row = cn(
    "flex w-full items-center gap-1 overflow-hidden px-4 py-1.5 text-left",
    open && "bg-info-secondary",
    className
  );
  const label = (
    <span className="min-w-0 flex-1 truncate text-label-md font-medium text-foreground">
      {title}
    </span>
  );

  if (!onToggle) {
    return (
      <div className={row}>
        <GuidanceSpeechBubbleIcon className="size-4 shrink-0 text-brand" />
        {label}
        {badge}
        {action}
      </div>
    );
  }

  return (
    <div className={cn(row, "pr-3")}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className="-my-1.5 -ml-4 flex min-w-0 flex-1 cursor-pointer items-center gap-1 px-4 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24"
      >
        <GuidanceSpeechBubbleIcon className="size-4 shrink-0 text-brand" />
        {label}
        {badge}
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
      {action}
    </div>
  );
}

function quotedResponse(text: string) {
  const trimmed = text.trim();
  if (/^[“"].*[”"]$/.test(trimmed)) return trimmed;
  return `“${trimmed}”`;
}

export function GuidanceSuggestedResponse({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <GuidanceSectionLabel>Suggested response</GuidanceSectionLabel>
      <p className="text-pretty text-label-md-semi text-foreground">
        {quotedResponse(text)}
      </p>
    </div>
  );
}

export function GuidanceTalkingPoints({
  points,
  className,
}: {
  points: string[];
  className?: string;
}) {
  if (points.length === 0) return null;

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <GuidanceSectionLabel>Talking points</GuidanceSectionLabel>
      <ul className="flex flex-col gap-2">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-1.5 overflow-hidden rounded-md p-1"
          >
            <IconCircleCheckFilled
              size={16}
              className="mt-0.5 size-4 shrink-0 text-brand"
            />
            <span className="min-w-0 flex-1 text-pretty text-label-md font-medium text-foreground">
              {point}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type GuidanceFeedback = "helpful" | "not-helpful" | null;

const THANKS_MS = 2000;

export function GuidanceFeedbackBar({
  feedback,
  onHelpful,
  onNotHelpful,
  className,
}: {
  feedback: GuidanceFeedback;
  onHelpful?: () => void;
  onNotHelpful?: () => void;
  className?: string;
}) {
  const [thanksId, setThanksId] = React.useState(0);

  React.useEffect(() => {
    if (feedback === "helpful" || feedback === "not-helpful") {
      setThanksId((current) => current + 1);
      return;
    }
    setThanksId(0);
  }, [feedback]);

  React.useEffect(() => {
    if (thanksId === 0) return;
    const timer = window.setTimeout(() => setThanksId(0), THANKS_MS);
    return () => window.clearTimeout(timer);
  }, [thanksId]);

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-t border-line bg-white px-2 py-1.5 pl-3",
        className
      )}
    >
      <FeedbackThumbs
        value={feedback === "helpful" ? "up" : feedback === "not-helpful" ? "down" : null}
        // Not clearable: a card's rating is a signal we keep, and there is no
        // "never mind" state for it — an agent who changes their mind picks
        // the other thumb.
        clearable={false}
        onChange={(vote) => {
          if (vote === "up") onHelpful?.();
          if (vote === "down") onNotHelpful?.();
        }}
      />

      {thanksId > 0 ? (
        <span
          key={thanksId}
          className="thumb-thanks whitespace-nowrap text-label-sm text-muted-foreground"
          aria-live="polite"
        >
          Thanks for the feedback
        </span>
      ) : null}
    </div>
  );
}

export interface GuidanceCardProps {
  item: GuidanceItem;
  feedback?: GuidanceFeedback;
  onHelpful?: () => void;
  onNotHelpful?: () => void;
  onViewResource?: (resource: GuidanceResource) => void;
  /** Hide agent actions — used only if a static preview is needed. */
  showActions?: boolean;
  className?: string;
}

/**
 * Shared response-card tone. The expanded border is the same pale
 * `info-border` a knowledge card carries: a full-strength brand outline reads
 * as a selected card rather than an open one, and the two card types sit in
 * one column, so they have to be the same weight of blue.
 */
export const GUIDANCE_AI_THEME = {
  card:
    "relative shrink-0 overflow-hidden rounded-lg border border-info-border bg-white",
  cardCollapsed:
    "relative shrink-0 overflow-hidden rounded-lg border border-line bg-white",
  rail: "absolute inset-y-0 left-0 w-[3px] bg-brand",
  badge: "bg-white/80 text-brand",
  tick: "bg-brand",
  say: "border-info-border bg-white",
  feedback: "border-line bg-white",
} as const;

export function GuidanceKindMark({ kind }: { kind: GuidanceKind }) {
  const common = "shrink-0";
  if (kind === "competitor") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
        <path d="M2 8.5 8.5 2M3.5 2H8.5V7M9.5 3.5 3.5 9.5M8 10H3.5V5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "objection") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
        <path d="M6 2.2 10.2 9.5H1.8L6 2.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M6 5.2v2M6 8.6h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "policy") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
        <path d="M3.5 2h3.2L8.5 3.8V10H3.5V2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M4.7 5.4h2.6M4.7 7.2h2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "fix") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
        <path d="M7.4 3.2a2.2 2.2 0 0 0-3.1 3.1L2 8.6 3.4 10l2.3-2.3a2.2 2.2 0 0 0 3.1-3.1L7.4 6 6 4.6l1.4-1.4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "compliance") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
        <path d="M6 2.2 10.2 9.5H1.8L6 2.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M6 5.2v2M6 8.6h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
      <path d="M4.2 2.5h3.6v3.6H4.2V2.5ZM2.5 6.2H6v3.3H2.5V6.2ZM6.4 6.8H9.5V9.5H6.4V6.8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function ExpandHint() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.5 2.5H13.5V6.5M13.5 2.5 9 7M6.5 13.5H2.5V9.5M2.5 13.5 7 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalLinkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.5 3H13.5V7M13.5 3 7.5 9M6.5 4.5H4.5A1.5 1.5 0 0 0 3 6v6.5A1.5 1.5 0 0 0 4.5 14H11a1.5 1.5 0 0 0 1.5-1.5V9.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GuidanceResourceLink({
  resource,
  className,
}: {
  resource: GuidanceResource;
  className?: string;
}) {
  const content = (
    <>
      <span className="min-w-0 truncate">{resource.name}</span>
      <span className="shrink-0">
        <ExternalLinkIcon size={13} />
      </span>
    </>
  );

  const linkClass = cn(
    "inline-flex min-w-0 max-w-full items-center gap-1 text-label-md text-brand",
    "hover:text-brand-hover",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24 focus-visible:ring-offset-1",
    className
  );

  if (!resource.url) {
    return <span className={linkClass}>{content}</span>;
  }

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(linkClass, "cursor-pointer")}
    >
      {content}
    </a>
  );
}

function ResourcePreviewVisual({
  resource,
  compact,
  framed,
}: {
  resource: GuidanceResource;
  compact?: boolean;
  framed?: boolean;
}) {
  const height = compact ? "max-h-28" : "max-h-44";
  const frame = framed ? undefined : "rounded-none border-0";

  if (resource.battlecard) {
    return (
      <BattlecardVisual
        data={resource.battlecard}
        className={cn("w-full", frame, compact && height)}
      />
    );
  }

  if (resource.thumbnail) {
    return (
      <img
        src={resource.thumbnail}
        alt={resource.name}
        className={cn("w-full object-contain", height)}
      />
    );
  }

  return <BattlecardVisual className={cn("w-full", frame, height)} />;
}

export function GuidanceResourcePreview({
  resource,
  compact,
  onView,
}: {
  resource: GuidanceResource;
  compact?: boolean;
  onView?: (resource: GuidanceResource) => void;
}) {
  const isBattlecard = Boolean(resource.battlecard);

  return (
    <div className="flex w-full flex-col gap-2">
      {isBattlecard ? (
        <GuidanceSectionLabel>Battle card</GuidanceSectionLabel>
      ) : (
        <p className="truncate text-label-md-semi text-foreground">
          {resource.name}
        </p>
      )}
      {onView ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onView(resource);
          }}
          aria-label={`View larger ${resource.name}`}
          className={cn(
            "group relative block w-full cursor-zoom-in overflow-hidden rounded-md border border-line bg-white text-left outline-none",
            "hover:border-control-border focus-visible:ring-2 focus-visible:ring-brand/24",
            "active:scale-[0.99] motion-safe:transition-[border-color,transform] motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]"
          )}
        >
          <ResourcePreviewVisual resource={resource} compact={compact} />
          <span
            className="pointer-events-none absolute inset-0 rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
            aria-hidden="true"
          />
          <span
            className={cn(
              "pointer-events-none absolute right-1.5 bottom-1.5 inline-flex size-7 items-center justify-center rounded-[4px] bg-white/92 text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.06)]",
              "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
              "motion-safe:transition-opacity motion-safe:duration-150"
            )}
            aria-hidden="true"
          >
            <ExpandHint />
          </span>
        </button>
      ) : (
        <ResourcePreviewVisual resource={resource} compact={compact} framed />
      )}
    </div>
  );
}

export function GuidanceResourceZoom({ resource }: { resource: GuidanceResource }) {
  if (resource.battlecard) {
    return <BattlecardVisual data={resource.battlecard} size="lg" className="w-full" />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      {resource.thumbnail ? (
        <img
          src={resource.thumbnail}
          alt={resource.name}
          className="mx-auto max-h-[70vh] w-full object-contain"
        />
      ) : (
        <BattlecardVisual size="lg" className="w-full" />
      )}
    </div>
  );
}

export function GuidanceResourceModal({
  resource,
  onClose,
}: {
  resource: GuidanceResource | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(resource)}
      onClose={onClose}
      size={resource?.battlecard ? "md" : "lg"}
      title={resource?.name}
      bodyClassName="bg-secondary-bg"
    >
      {resource ? <GuidanceResourceZoom resource={resource} /> : null}
    </Modal>
  );
}

export function GuidanceKindDot({
  className,
}: {
  /** Accepted for call-site symmetry with the other Guidance* components. */
  kind?: GuidanceKind;
  className?: string;
}) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", GUIDANCE_AI_THEME.tick, className)}
      aria-hidden="true"
    />
  );
}

export function GuidanceCard({
  item,
  feedback = null,
  onHelpful,
  onNotHelpful,
  onViewResource,
  showActions = true,
  className,
}: GuidanceCardProps) {
  const talkingPoints = item.talkingPoints.filter((point) => point.trim()).slice(0, 4);
  const response = item.suggestedResponse.trim();
  const images = item.resources.filter((resource) => resource.type === "image");
  const links = item.resources.filter((resource) => resource.type === "link");

  return (
    <article className={cn(GUIDANCE_AI_THEME.card, className)}>
      <GuidanceAiHeader title={item.name} />

      <div className="flex flex-col gap-4 bg-white px-4 pt-4 pb-4">
        {response ? <GuidanceSuggestedResponse text={response} /> : null}

        <GuidanceTalkingPoints points={talkingPoints} />

        {images.length > 0 ? (
          <div
            className={cn(
              "grid gap-2",
              images.length > 1 ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            {images.map((resource) => (
              <GuidanceResourcePreview
                key={resource.id}
                resource={resource}
                compact={images.length > 1}
                onView={onViewResource}
              />
            ))}
          </div>
        ) : null}

        {links.map((resource) => (
          <GuidanceResourceLink key={resource.id} resource={resource} />
        ))}
      </div>

      {showActions ? (
        <GuidanceFeedbackBar
          feedback={feedback}
          onHelpful={onHelpful}
          onNotHelpful={onNotHelpful}
          className={GUIDANCE_AI_THEME.feedback}
        />
      ) : null}
    </article>
  );
}
