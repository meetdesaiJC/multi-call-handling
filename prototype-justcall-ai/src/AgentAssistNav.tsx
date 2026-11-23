import * as React from "react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { type AgentAssistScope } from "./agentAssistScope";
import {
  IconAaActions,
  IconAaCoaching,
  IconAaKnowledge,
  IconAaResponseCards,
  IconAaScripts,
} from "./icons/AgentAssistNavIcons";

/**
 * Agent Assist section nav — the four things an admin authors here, each a
 * different way of helping during the same call: a Script says what to follow,
 * a Response Card says what to say, Behavioral Coaching says how to adjust, and
 * an In-call Action says what to do in a connected app.
 *
 * These were two levels deep before (Scripts / Response Cards / Live Coaching
 * were tabs under a "Conversation Guidance" parent). The parent named a category
 * rather than a destination, so it cost a click and taught nothing; the tabs are
 * now the nav.
 *
 * Knowledge Base is deliberately *not* one of them. It is a shared JustCall AI
 * capability — Voice Agent reads the same knowledge bases — so it lives in the
 * JustCall AI nav. Agent Assist does not gate it either: once the account has a
 * Knowledge Base, agents receive its answers on live calls, and the switch for
 * that lives with the rest of the Knowledge settings. All this column carries is
 * the card pinned below the nav, and only while there is no Knowledge Base to
 * draw on.
 *
 * Selection is one pill that slides between the rows rather than a background
 * each row paints on itself. Switching sections is the most repeated move in
 * here, and a background that vanishes in one row and reappears in another
 * reads as two events; one surface travelling reads as the same selection
 * moving, which is what actually happened. Same reason the DS `Tabs` underline
 * slides — this is that idea turned vertical.
 */

export type AgentAssistArea =
  | "scripts"
  | "response-cards"
  | "coaching"
  | "actions";

export interface AgentAssistNavItem {
  key: AgentAssistArea;
  label: string;
  icon: React.ReactNode;
}

export const AGENT_ASSIST_NAV_ITEMS: AgentAssistNavItem[] = [
  { key: "scripts", label: "Scripts", icon: <IconAaScripts /> },
  { key: "response-cards", label: "Response Cards", icon: <IconAaResponseCards /> },
  { key: "coaching", label: "Behavioral Coaching", icon: <IconAaCoaching /> },
  { key: "actions", label: "In-call Actions", icon: <IconAaActions /> },
];

/** Authoring surfaces V1 does not ship — see `agentAssistScope`. */
const V2_ONLY_AREAS: ReadonlySet<AgentAssistArea> = new Set(["coaching", "actions"]);

export function navItemsForScope(scope: AgentAssistScope): AgentAssistNavItem[] {
  if (scope === "v2") return AGENT_ASSIST_NAV_ITEMS;
  return AGENT_ASSIST_NAV_ITEMS.filter((item) => !V2_ONLY_AREAS.has(item.key));
}

export function AgentAssistNav({
  activeKey,
  onSelect,
  hasKnowledgeBase,
  onLearnAboutKnowledgeSuggestions,
  onCreateKnowledgeBase,
  scope = "v2",
  className,
}: {
  activeKey: AgentAssistArea;
  onSelect: (key: AgentAssistArea) => void;
  hasKnowledgeBase: boolean;
  onLearnAboutKnowledgeSuggestions: () => void;
  onCreateKnowledgeBase: () => void;
  scope?: AgentAssistScope;
  className?: string;
}) {
  const items = navItemsForScope(scope);
  const listRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef(new Map<AgentAssistArea, HTMLButtonElement>());
  const [pill, setPill] = React.useState<{ top: number; height: number } | null>(
    null
  );
  // Nothing to slide from on first paint, so the pill lands on the opening
  // section instead of travelling to it from the top of the column.
  const [canAnimate, setCanAnimate] = React.useState(false);

  const measurePill = React.useCallback(() => {
    const list = listRef.current;
    const item = itemRefs.current.get(activeKey);
    if (!list || !item) return;
    // Rect maths rather than offsetTop: the column scrolls, and both rects are
    // in the same viewport space either way.
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    setPill({ top: itemRect.top - listRect.top, height: itemRect.height });
  }, [activeKey]);

  React.useLayoutEffect(() => {
    measurePill();
    // `items.length` is in here because V1 renders two rows and V2 four; the
    // pill has to re-measure when the list itself is a different length.
  }, [measurePill, items.length]);

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setCanAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measurePill());
    observer.observe(list);
    return () => observer.disconnect();
  }, [measurePill]);

  return (
    <nav
      aria-label="Agent Assist"
      className={cn(
        "flex h-full w-[288px] shrink-0 flex-col gap-8 overflow-y-auto border-r border-line bg-white px-6 pb-6 pt-5",
        className
      )}
    >
      <div ref={listRef} className="relative">
        {/* One selection surface for the whole list. It sits under the rows,
            so a row's own hover wash can never stack on top of it. */}
        {pill ? (
          <span
            aria-hidden="true"
            className={cn("aa-nav-pill", canAnimate && "is-animated")}
            style={{ height: pill.height, transform: `translateY(${pill.top}px)` }}
          />
        ) : null}

        <ul className="flex w-full flex-col">
          {items.map((item) => {
            const active = item.key === activeKey;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  ref={(node) => {
                    if (node) itemRefs.current.set(item.key, node);
                    else itemRefs.current.delete(item.key);
                  }}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onSelect(item.key)}
                  className={cn(
                    // `relative` keeps the row above the pill: an absolutely
                    // positioned sibling paints over static ones whatever the
                    // DOM order.
                    "aa-nav-item relative flex w-full items-center gap-2 rounded-[4px] px-4 py-2.5 text-left text-label-md",
                    "outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
                    active
                      ? "text-brand"
                      : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {hasKnowledgeBase ? null : (
        <KnowledgeBaseNudge
          onLearnMore={onLearnAboutKnowledgeSuggestions}
          onCreateKnowledgeBase={onCreateKnowledgeBase}
        />
      )}
    </nav>
  );
}

/**
 * The one thing Agent Assist has to say about Knowledge: that the capability
 * exists, and that the account cannot use it yet.
 *
 * Knowledge Base suggestions are not a decision this column asks for. An
 * account that maintains a Knowledge Base wants its agents answering from it,
 * so the capability is simply on, and the switch that turns it back off lives
 * with the rest of the Knowledge settings rather than beside four navigation
 * rows. What is left is the case where there is nothing to draw on — no
 * Knowledge Base in the account — and there the card is a prompt, not a
 * setting: it names the capability, says what it does, and hands off to
 * Knowledge to author the first one. Once that exists the card has nothing to
 * ask and disappears.
 *
 * It is a feature-promo card rather than the grey panel it used to be, because
 * while there is no Knowledge Base there is nothing else on screen telling an
 * admin the capability exists. The brand-tinted wash and the icon tile give it
 * enough weight to read as an offer; `mt-auto` and the absence of a nav-style
 * row keep it from reading as a fifth destination.
 */
function KnowledgeBaseNudge({
  onLearnMore,
  onCreateKnowledgeBase,
}: {
  onLearnMore: () => void;
  onCreateKnowledgeBase: () => void;
}) {
  return (
    <div
      className={cn(
        "mt-auto rounded-[10px] border p-4",
        "border-brand/15 bg-[linear-gradient(205deg,var(--color-brand-subtle)_0%,#f6f9fd_58%,#ffffff_100%)]"
      )}
    >
      <div className="flex flex-col gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-brand/10 ring-1 ring-inset ring-brand/10">
          <IconAaKnowledge className="size-4 shrink-0 text-brand" />
        </span>

        <div className="flex flex-col gap-1">
          {/* Titled with the step rather than the capability: the capability
              needs no decision, the step does. */}
          <h2 className="text-label-md-semi text-foreground">
            Create a Knowledge Base
          </h2>
          <p className="text-pretty text-paragraph-sm text-muted-foreground">
            Surface relevant answers from your Knowledge Base during calls.
          </p>
        </div>

        {/* The nav column is narrow enough that "Create Knowledge Base" and
            "Learn more" cannot sit on one line without the link spilling past
            the card, so the two stack. */}
        <div className="flex flex-col items-start gap-2">
          <Button size="xs" onClick={onCreateKnowledgeBase}>
            Create Knowledge Base
          </Button>
          {/* One line cannot show what an answer arriving mid-call looks like,
              so "Learn more" opens the picture of it rather than sending the
              admin off to the Knowledge Base page to guess. */}
          <Button variant="link" size="xs" onClick={onLearnMore}>
            Learn more
          </Button>
        </div>
      </div>
    </div>
  );
}
