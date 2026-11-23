import * as React from "react";
import { Button } from "@/components/Button";
import { IconChevronLeft } from "@/components/Icon";
import { Toggle } from "@/components/Toggle";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import { AgentAssistPlaybooksPage } from "./AgentAssistPage";
import { ActionsPage } from "./ActionsPage";
import { AgentAssistNav, type AgentAssistArea } from "./AgentAssistNav";
import { type AgentAssistScope } from "./agentAssistScope";
import { KnowledgeSuggestionsModal } from "./KnowledgeSuggestionsModal";
import {
  AgentAssistTakeoverContext,
  useAgentAssistTakeoverHost,
} from "./agentAssistTakeover";
import { type KnowledgeSourceRecord } from "./knowledgeData";
import {
  SEED_INTEGRATIONS,
  SEED_ACTIONS,
  UNCONNECTED_INTEGRATIONS,
  type AgentAction,
  type Integration,
} from "./actionsData";
import { SEED_GUIDANCE, type GuidanceItem } from "./guidanceData";
import { SEED_COACHING_RULES, type CoachingRule } from "./coachingData";

/**
 * Agent Assist admin — four things to set up, each a different kind of help
 * during the same call:
 *
 *   Scripts              what to follow
 *   Response Cards       what to say
 *   Behavioral Coaching  how to adjust
 *   In-call Actions      what to do in a connected app
 *
 * Knowledge used to be a fifth item here, and Scripts / Response Cards /
 * Behavioral Coaching sat one level down as tabs under "Conversation Guidance".
 * Both are gone: the tabs became destinations, and Knowledge moved up to the
 * JustCall AI nav because it is shared — Voice Agent reads the same knowledge
 * bases, and duplicating knowledge base, source, and assignment controls inside
 * Agent Assist would mean two places to look and two to keep in sync.
 *
 * What stays here is the one Knowledge decision that belongs to Agent Assist:
 * whether agents may receive knowledge answers on a live call. Agent Assist owns
 * *whether* Knowledge is used during calls; the global Knowledge experience owns
 * *what* Knowledge exists and who has access to it.
 *
 * Full-page editors are the one exception to the nav: they take over the whole
 * content area, nav included (see agentAssistTakeover).
 *
 * Switching sections animates two things and nothing else. The nav's selection
 * pill slides (see AgentAssistNav) and the content area crossfades with a 4px
 * lift; the header, the nav column, the divider, and the content frame all hold
 * still. Sliding the whole pane would say "you left for another page", and these
 * four are one workspace — so only what actually changed moves, and it is over
 * in 220ms.
 */

/**
 * Content exit, then the swap, then the entrance — 80 + 140ms, the whole
 * interaction inside the 220ms it has to feel instant. They run back to back
 * rather than overlapping because both halves share one container: overlapping
 * would mean mounting both sections at once, and both own scroll, selection,
 * and open dropdowns.
 */
const CONTENT_EXIT_MS = 80;
const CONTENT_ENTER_MS = 140;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface AgentAssistAdminProps {
  /**
   * Whether the admin opens on a worked-in account or a brand-new one. Off
   * puts every list into its empty state and leaves all apps unconnected.
   */
  seeded?: boolean;
  /** V1 drops two nav sections — see `agentAssistScope`. */
  scope?: AgentAssistScope;
  /** Read by response-card coverage hints; owned by JustCallAiShell. */
  knowledgeSources: KnowledgeSourceRecord[];
  /** Leaves Agent Assist for the global Knowledge page. */
  onOpenKnowledge: () => void;
}

export function AgentAssistAdmin({
  seeded = true,
  scope = "v2",
  knowledgeSources,
  onOpenKnowledge,
}: AgentAssistAdminProps) {
  const planAvailable =
    new URLSearchParams(window.location.search).get("assist") !== "locked";
  const [area, setArea] = React.useState<AgentAssistArea>("scripts");
  /**
   * The section the admin picked, held while the one on screen fades out. The
   * nav reads this rather than `area` so the pill leaves at the click and the
   * content follows — selection is the feedback that the click landed, and
   * making it wait on the fade would cost the interaction its 80ms.
   */
  const [pendingArea, setPendingArea] = React.useState<AgentAssistArea | null>(
    null
  );
  const [contentMotion, setContentMotion] = React.useState<
    "idle" | "exiting" | "entering"
  >("idle");
  // "Learn more" on the nav card — the explanation of what agents see on a
  // live call, for an account that has no Knowledge Base to see it with yet.
  const [knowledgeSuggestionsLearnMore, setKnowledgeSuggestionsLearnMore] =
    React.useState(false);
  const { active: takeover, register: registerTakeover } =
    useAgentAssistTakeoverHost();

  // One source of truth for the whole product: what the admin publishes here
  // is what a live call reads.
  const [integrations, setIntegrations] = React.useState<Integration[]>(
    seeded ? SEED_INTEGRATIONS : UNCONNECTED_INTEGRATIONS
  );
  const [actions, setActions] = React.useState<AgentAction[]>(
    seeded ? SEED_ACTIONS : []
  );
  const [guidanceItems, setGuidanceItems] = React.useState<GuidanceItem[]>(
    seeded ? SEED_GUIDANCE : []
  );
  const [coachingRules, setCoachingRules] = React.useState<CoachingRule[]>(
    seeded ? SEED_COACHING_RULES : []
  );

  const selectedArea = pendingArea ?? area;

  const selectArea = (next: AgentAssistArea) => {
    if (next === selectedArea) return;
    // Reduced motion still gets the moving pill's endpoints and the new
    // section — it just gets them without the travel or the fade.
    if (prefersReducedMotion()) {
      setPendingArea(null);
      setContentMotion("idle");
      setArea(next);
      return;
    }
    setPendingArea(next);
    setContentMotion("exiting");
  };

  // Swap under cover of the faded-out state, then let it back in. Splitting the
  // two timers keeps `entering` on the element only while its animation runs,
  // so the next switch starts from a clean transition.
  React.useEffect(() => {
    if (contentMotion !== "exiting" || !pendingArea) return;
    const timer = window.setTimeout(() => {
      setArea(pendingArea);
      setPendingArea(null);
      setContentMotion("entering");
    }, CONTENT_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [contentMotion, pendingArea]);

  React.useEffect(() => {
    if (contentMotion !== "entering") return;
    const timer = window.setTimeout(
      () => setContentMotion("idle"),
      CONTENT_ENTER_MS
    );
    return () => window.clearTimeout(timer);
  }, [contentMotion]);

  return (
    <AgentAssistTakeoverContext.Provider value={registerTakeover}>
      <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-white">
        {takeover ? null : (
          <AgentAssistNav
            activeKey={selectedArea}
            onSelect={selectArea}
            hasKnowledgeBase={knowledgeSources.length > 0}
            onLearnAboutKnowledgeSuggestions={() =>
              setKnowledgeSuggestionsLearnMore(true)
            }
            onCreateKnowledgeBase={onOpenKnowledge}
            scope={scope}
          />
        )}

        <KnowledgeSuggestionsModal
          open={knowledgeSuggestionsLearnMore}
          onClose={() => setKnowledgeSuggestionsLearnMore(false)}
          onCreateKnowledgeBase={onOpenKnowledge}
        />

        {/* One container for the whole section — title, description, search,
            list, and pagination move together, because they are one thing that
            changed rather than five that each need announcing. No key here on
            purpose: remounting would animate identically and throw away the
            drafts and rows the lists hold. */}
        <div
          className="aa-section-content flex min-h-0 min-w-0 flex-1 flex-col"
          data-motion={contentMotion}
        >
          {!planAvailable ? (
            <AgentAssistPlanLocked />
          ) : area === "actions" ? (
            <ActionsPage
              actions={actions}
              onActionsChange={setActions}
              integrations={integrations}
              onIntegrationsChange={setIntegrations}
            />
          ) : (
            <AgentAssistPlaybooksPage
              view={area === "response-cards" ? "guidance" : area}
              seeded={seeded}
              guidanceItems={guidanceItems}
              onGuidanceItemsChange={setGuidanceItems}
              coachingRules={coachingRules}
              onCoachingRulesChange={setCoachingRules}
              knowledgeSources={knowledgeSources}
              onOpenKnowledge={onOpenKnowledge}
              scope={scope}
            />
          )}
        </div>
      </div>
    </AgentAssistTakeoverContext.Provider>
  );
}

function AgentAssistPlanLocked() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-8">
      <section className="flex w-full max-w-[520px] flex-col items-start gap-4 rounded-xl border border-line bg-white p-6 shadow-100">
        <div className="flex size-10 items-center justify-center rounded-lg bg-brand-subtle text-brand">
          <span className="text-heading-lg">✦</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-heading-xl text-foreground">Agent Assist isn’t included in your plan</h1>
          <p className="text-paragraph-md text-muted-foreground">
            Upgrade to give agents live scripts, response cards, and answers from your knowledge base during calls.
          </p>
        </div>
        <Button size="sm">View plans and upgrade</Button>
        <p className="text-label-sm text-muted-foreground">
          Your calling features and existing data are unchanged.
        </p>
      </section>
    </div>
  );
}

/**
 * Live/draft switch used by every Agent Assist list. Disabled rows explain why
 * in a tooltip rather than failing silently on click. When the block has a
 * recovery action (connect an app), that CTA lives in the tooltip.
 */
export function StatusToggle({
  name,
  checked,
  onCheckedChange,
  disabled,
  disabledReason,
  disabledAction,
}: {
  name: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
  disabledAction?: React.ReactNode;
}) {
  const toggle = (
    <Toggle
      size="sm"
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-label={
        disabled && disabledReason
          ? `${name} off. ${disabledReason}`
          : `${name} ${checked ? "live" : "draft"}`
      }
    />
  );
  if (!disabled || !disabledReason) return toggle;
  return (
    <TooltipTrigger
      interactive={Boolean(disabledAction)}
      placement="top"
      content={
        <Tooltip
          theme="dark"
          arrow="bottom-center"
          title={disabledReason}
          action={disabledAction}
        />
      }
    >
      <span className="inline-flex" tabIndex={0}>
        {toggle}
      </span>
    </TooltipTrigger>
  );
}

export function IconTrash({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.333 5.833h13.334M8.333 9.167v5M11.667 9.167v5M4.167 5.833l.833 10a1.667 1.667 0 0 0 1.667 1.667h6.666a1.667 1.667 0 0 0 1.667-1.667l.833-10M7.5 5.833V3.333A.833.833 0 0 1 8.333 2.5h3.334a.833.833 0 0 1 .833.833v2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Shared chrome for every Agent Assist section: one title, an optional
 * description, and the page's own primary action on the right. Navigation
 * belongs to the side nav, so there is no back link unless a caller opts into
 * one (`onBack`) — sub-pages that take over the column still need a way out.
 *
 * Typography follows the account-settings section header in Figma
 * (JC — Account Settings Revamp, node 3312:107030): Headline xxl 20/28 semi
 * on text/primary, Paragraph 16/24 on text/secondary, 4px apart. A section
 * header carries no rule under it — the type hierarchy does that work — so
 * this header never draws a bottom border.
 */
export function AdminPageHeader({
  title,
  description,
  onBack,
  backLabel = "Agent Assist",
  actions,
  className,
}: {
  title: string;
  description?: string;
  /** Renders a back link above the title. Omit inside the side-nav layout. */
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-5",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 inline-flex h-6 w-fit cursor-pointer items-center gap-0.5 rounded-[4px] pr-1.5 pl-0.5 text-label-sm text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconChevronLeft size={16} className="size-4 shrink-0" />
            {backLabel}
          </button>
        ) : null}
        <h1 className="truncate text-heading-xxl text-foreground">{title}</h1>
        {description ? (
          <p className="max-w-[720px] text-pretty text-paragraph-lg text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2",
            onBack ? "pt-6" : "pt-0"
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
