import * as React from "react";
import { cn } from "@/lib/utils";
import {
  IconChevronDown,
  IconChevronUp,
  IconClose,
  IconSearch,
} from "@/components/Icon";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { IconCallPin, IconCallPinFilled } from "./icons/CallControlIcons";
import {
  GuidanceResourceLink,
  GuidanceResourcePreview,
  GuidanceSuggestedResponse,
  GuidanceTalkingPoints,
} from "./GuidanceCard";
import { knowledgeFacts, type KnowledgeSourceRecord } from "./knowledgeData";
import type { GuidanceItem, GuidanceResource } from "./guidanceData";
import {
  buildSearchCorpus,
  searchCorpus,
  PIN_LIMIT,
  SEARCH_MIN_CHARS,
  type SearchHit,
} from "./callSearch";

/**
 * Search and pin, inside the Conversation guidance column.
 *
 * It lives here rather than in its own panel because searching is what the
 * agent does when the automatic stream *hasn't* answered them — putting the
 * two in one column means the answer arrives in the same place whether the
 * product found it or the agent did. Pins sit above both for the same reason:
 * whatever the agent decided to keep is the top of the column, and the live
 * stream flows under it.
 */

/* -------------------------------------------------------------------- state */

export function useCallSearch({
  cards,
  sources,
  resetKey,
}: {
  cards: GuidanceItem[];
  sources: KnowledgeSourceRecord[];
  /** A new call is a new search session — query and pins both let go. */
  resetKey: string;
}) {
  const [query, setQuery] = React.useState("");
  const [pinned, setPinned] = React.useState<SearchHit[]>([]);
  /**
   * One pin open at a time. Three open cards is not "kept visible", it is the
   * column full of cards the agent read a minute ago — so the newest pin
   * opens, the rest hold their titles, and any of them is one click away.
   */
  const [openPinId, setOpenPinId] = React.useState<string | null>(null);

  const corpus = React.useMemo(
    () => buildSearchCorpus(cards, sources),
    [cards, sources]
  );

  React.useEffect(() => {
    setQuery("");
    setPinned([]);
    setOpenPinId(null);
  }, [resetKey]);

  const trimmed = query.trim();
  const searching = trimmed.length > 0;
  const tooShort = searching && trimmed.length < SEARCH_MIN_CHARS;
  const results = React.useMemo(
    () => (tooShort || !searching ? [] : searchCorpus(corpus, trimmed)),
    [corpus, searching, tooShort, trimmed]
  );

  const pinnedIds = new Set(pinned.map((hit) => hit.id));
  const full = pinned.length >= PIN_LIMIT;

  const togglePin = (hit: SearchHit) => {
    setPinned((current) => {
      if (current.some((item) => item.id === hit.id)) {
        setOpenPinId((open) => (open === hit.id ? null : open));
        return current.filter((item) => item.id !== hit.id);
      }
      if (current.length >= PIN_LIMIT) return current;
      setOpenPinId(hit.id);
      // Newest on top: the agent pinned it because it is what they need next.
      return [hit, ...current];
    });
  };

  return {
    query,
    setQuery,
    clear: () => setQuery(""),
    searching,
    tooShort,
    results,
    pinned,
    pinnedIds,
    full,
    togglePin,
    openPinId,
    togglePinOpen: (id: string) =>
      setOpenPinId((current) => (current === id ? null : id)),
    /** True when the library itself is empty, not just this query. */
    corpusEmpty: corpus.length === 0,
  };
}

export type CallSearchModel = ReturnType<typeof useCallSearch>;

/* ---------------------------------------------------------------------- bar */

export function CallSearchBar({
  model,
  reduced,
}: {
  model: CallSearchModel;
  reduced: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2">
      <div
        className={cn(
          "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[6px] border border-line bg-white px-2.5",
          "transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/16",
          reduced && "transition-none"
        )}
      >
        <IconSearch size={16} className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={model.query}
          onChange={(event) => model.setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !model.query) return;
            event.preventDefault();
            model.clear();
          }}
          placeholder="Search response cards and knowledge"
          aria-label="Search response cards and knowledge"
          className="m-0 min-w-0 flex-1 border-0 bg-transparent p-0 text-paragraph-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {model.query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              model.clear();
              inputRef.current?.focus();
            }}
            className="-mr-1 flex size-5 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- pinned */

export function PinnedStack({
  model,
  reduced,
  onViewResource,
}: {
  model: CallSearchModel;
  reduced: boolean;
  onViewResource?: (resource: GuidanceResource) => void;
}) {
  if (model.pinned.length === 0) return null;

  return (
    <section
      aria-label="Pinned"
      className="flex shrink-0 flex-col gap-2 rounded-lg bg-secondary-bg p-2"
    >
      <div className="flex items-center gap-1.5 px-1">
        <IconCallPinFilled size={16} className="size-4 shrink-0 text-brand" />
        <p className="text-label-sm text-foreground">Pinned</p>
        <p className="text-label-sm text-muted-foreground tabular-nums">
          {model.pinned.length} of {PIN_LIMIT}
        </p>
      </div>
      {model.pinned.map((hit) => (
        <HitCard
          key={hit.id}
          hit={hit}
          pinned
          reduced={reduced}
          onTogglePin={() => model.togglePin(hit)}
          onViewResource={onViewResource}
          /* Controlled by the stack, not by the card — see `openPinId`. */
          open={model.openPinId === hit.id}
          onToggleOpen={() => model.togglePinOpen(hit.id)}
        />
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ results */

export function CallSearchResults({
  model,
  reduced,
  onViewResource,
}: {
  model: CallSearchModel;
  reduced: boolean;
  onViewResource?: (resource: GuidanceResource) => void;
}) {
  if (!model.searching) return null;

  if (model.tooShort) {
    return (
      <SearchNote>Keep typing — search starts at two letters.</SearchNote>
    );
  }

  if (model.results.length === 0) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1.5 px-6 py-8 text-center">
        <p className="text-label-md-semi text-foreground">Nothing matches that</p>
        {/* The admin promise, said where it matters: an agent who cannot find
            the answer needs to know the difference between "we have nothing"
            and "it exists but isn't published to you". */}
        <p className="text-pretty text-paragraph-sm text-muted-foreground">
          {model.corpusEmpty
            ? "No response cards or knowledge have been published to you yet."
            : "Only published cards and knowledge assigned to you can be searched. Try a word the customer used."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <p className="px-1 text-label-sm text-muted-foreground tabular-nums">
        {model.results.length}{" "}
        {model.results.length === 1 ? "result" : "results"}
      </p>
      {model.results.map((hit) => {
        const isPinned = model.pinnedIds.has(hit.id);
        return (
          <HitCard
            key={hit.id}
            hit={hit}
            pinned={isPinned}
            /* The limit is a state of the control, not an error after the
               fact — a full board says so before the agent clicks. */
            pinBlocked={!isPinned && model.full}
            reduced={reduced}
            onTogglePin={() => model.togglePin(hit)}
            onViewResource={onViewResource}
          />
        );
      })}
    </div>
  );
}

function SearchNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="shrink-0 px-1 py-6 text-center text-paragraph-sm text-muted-foreground">
      {children}
    </p>
  );
}

/* --------------------------------------------------------------------- card */

function HitCard({
  hit,
  pinned,
  pinBlocked = false,
  reduced,
  open: controlledOpen,
  onToggleOpen,
  onTogglePin,
  onViewResource,
}: {
  hit: SearchHit;
  pinned: boolean;
  pinBlocked?: boolean;
  reduced: boolean;
  /** Pass both to let the parent own which card is open (the pinned stack). */
  open?: boolean;
  onToggleOpen?: () => void;
  onTogglePin: () => void;
  onViewResource?: (resource: GuidanceResource) => void;
}) {
  // A result row owns its own disclosure; a pinned card's is owned by the
  // stack, because only one of them may be open at a time.
  const [localOpen, setLocalOpen] = React.useState(false);
  const open = controlledOpen ?? localOpen;
  const toggleOpen =
    onToggleOpen ?? (() => setLocalOpen((current) => !current));

  return (
    <article
      className={cn(
        // shrink-0 for the same reason the stream cards carry it: the column
        // is a flex parent and overflow-hidden zeroes the automatic minimum.
        "shrink-0 overflow-hidden rounded-lg border bg-white",
        pinned ? "border-brand" : "border-line",
        !reduced && "assist-card-enter"
      )}
    >
      {/* Pin leads, disclosure closes. The two used to sit together on the
          right, where the pin read as the card's main action; leading with it
          makes it the row's mark — the thing you set on the card — and leaves
          the chevron as the last thing on the line, which is where a
          disclosure is looked for. */}
      <div className="group flex items-start gap-2 px-3 py-2">
        <PinControl
          pinned={pinned}
          blocked={pinBlocked}
          title={hit.title}
          onClick={onTogglePin}
        />

        <button
          type="button"
          aria-expanded={open}
          onClick={toggleOpen}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-label-md font-medium text-foreground">
              {hit.title}
            </span>
            {/* Collapsed, the snippet is the answer preview; open, the source
                is the more useful line, so they swap rather than stack. */}
            <span className="mt-0.5 block truncate text-label-sm text-muted-foreground">
              {open ? hit.sourceLabel : hit.snippet}
            </span>
          </span>
          <span
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground"
            aria-hidden="true"
          >
            {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </span>
        </button>
      </div>

      <div
        className={cn(
          "assist-card-body",
          open ? "assist-card-body-open" : "assist-card-body-closed"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-t border-line px-4 pt-3 pb-3">
            <HitBody hit={hit} onViewResource={onViewResource} />
          </div>
        </div>
      </div>
    </article>
  );
}

function PinControl({
  pinned,
  blocked,
  title,
  onClick,
}: {
  pinned: boolean;
  blocked: boolean;
  title: string;
  onClick: () => void;
}) {
  const label = pinned ? `Unpin ${title}` : `Pin ${title}`;
  const control = (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pinned}
      disabled={blocked}
      onClick={onClick}
      className={cn(
        // -mt-0.5 centres the 28px target on the 20px title line rather than
        // on the block, so the icon reads as sitting *on* the title.
        "-mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[4px] outline-none",
        // One property list, because two `transition-*` utilities would leave
        // only the last one standing. Opacity and colour move together here.
        "transition-[opacity,color,background-color]",
        "focus-visible:ring-2 focus-visible:ring-brand/24",
        pinned
          ? "text-brand hover:bg-brand-subtle"
          : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        // An unset pin is an offer, not a state — it stays out of the reading
        // until the agent is on the card. A set one is the state, so it never
        // hides. `group-focus-within` keeps it reachable without a mouse.
        !pinned &&
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        blocked && "cursor-not-allowed text-disabled-fg hover:bg-transparent"
      )}
    >
      {pinned ? <IconCallPinFilled size={16} /> : <IconCallPin size={16} />}
    </button>
  );

  if (!blocked) return control;

  // `disabled` swallows pointer events, so the explanation hangs off a wrapper
  // — the same trick the admin's disabled toggles use.
  return (
    <TooltipTrigger
      placement="top"
      content={
        <Tooltip
          theme="dark"
          arrow="bottom-center"
          title={`Unpin one of your ${PIN_LIMIT} cards to pin another`}
        />
      }
    >
      <span className="inline-flex shrink-0" tabIndex={0}>
        {control}
      </span>
    </TooltipTrigger>
  );
}

function HitBody({
  hit,
  onViewResource,
}: {
  hit: SearchHit;
  onViewResource?: (resource: GuidanceResource) => void;
}) {
  if (hit.kind === "card" && hit.card) {
    const card = hit.card;
    const response = card.suggestedResponse.trim();
    const points = card.talkingPoints.filter((point) => point.trim()).slice(0, 4);
    const links = card.resources.filter((resource) => resource.type === "link");
    const images = card.resources.filter((resource) => resource.type === "image");
    return (
      <>
        {response ? <GuidanceSuggestedResponse text={response} /> : null}
        <GuidanceTalkingPoints points={points} />
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
      </>
    );
  }

  if (!hit.knowledge) return null;
  const { entry, sourceName } = hit.knowledge;
  const { summary, points } = knowledgeFacts(entry);

  return (
    <>
      {summary ? (
        <p className="text-pretty text-label-md text-foreground">{summary}</p>
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
          {entry.answer}
        </p>
      )}
      <GuidanceResourceLink
        resource={{
          id: entry.id,
          type: "link",
          name: entry.sourceTitle ?? sourceName,
          url: entry.sourceUrl,
        }}
      />
    </>
  );
}
