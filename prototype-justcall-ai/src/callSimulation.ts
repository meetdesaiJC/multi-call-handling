/**
 * Choreographed during-call demo for stakeholders. One discovery call walks
 * the in-call surface through its full vocabulary, in this rhythm:
 *
 *   Script → Knowledge → Guidance → Coaching → Guidance → Coaching →
 *   Guidance → Action → Coaching → Action → Knowledge → Coaching → wrap
 *
 * Coaching is a live nudge, so each cue fires on its own beat — never as a
 * stack of behavioural cards sitting on top of each other.
 */

import {
  guidanceMatchesUtterance,
  liveGuidance,
  priorityForGuidance,
  rankGuidanceMatches,
  stanceForGuidance,
  type GuidanceItem,
  type GuidancePriority,
  type GuidanceStance,
} from "./guidanceData";
import {
  SEED_KNOWLEDGE_SOURCES,
  looksLikeQuestion,
  retrieveKnowledge,
  type KnowledgeConfidence,
  type KnowledgeEntry,
  type KnowledgeSourceRecord,
} from "./knowledgeData";
import {
  SEED_COACHING_RULES,
  coachingCardMessage,
  liveCoachingRules,
  type CoachingRule,
} from "./coachingData";
import {
  SEED_ACTIONS,
  SEED_INTEGRATIONS,
  actionMatchesUtterance,
  emailAttachmentPreset,
  liveActions,
  patchSuggestedValue,
  suggestedActionFromLibrary,
  type ActionState,
  type AgentAction,
  type Integration,
  type SuggestedAction,
} from "./actionsData";
import type { AgentAssistScope } from "./agentAssistScope";
import {
  DEFAULT_FIELD_FALLBACKS,
  resolveFieldText,
  type ContactRecord,
  type FieldFallbacks,
} from "./contactFields";

/**
 * Demo pacing. The scenarios below are authored on a natural conversation
 * clock, which leaves dead air between cards when someone is presenting over
 * it. Every authored timestamp runs through `paced()` before playback, so this
 * is the one knob for the whole walkthrough: 1 plays the authored call,
 * lower tightens the gap between one card and the next.
 */
export const TIMELINE_PACE = 0.6;

const paced = (atMs: number) => Math.round(atMs * TIMELINE_PACE);

/** After the script wraps, keep default cards this long before resolved / sent. */
const POST_WRAP_COMPLETED_DELAY_AUTHORED_MS = 5000;

export const POST_WRAP_COMPLETED_DELAY_MS = paced(
  POST_WRAP_COMPLETED_DELAY_AUTHORED_MS
);

export interface ScriptStep {
  title: string;
  wording?: string;
  required?: boolean;
  /** Guidance that belongs under this step when the customer hits that topic. */
  relatedGuidanceIds?: string[];
}

export interface GuidanceSuggestion {
  id: string;
  atMs: number;
  quote: string;
  item: GuidanceItem;
  priority: GuidancePriority;
  stance: GuidanceStance;
  /**
   * When the conversation last came back to this topic. The panel re-activates
   * the card that already covers it instead of stacking a duplicate (§9).
   */
  repeatAtMs?: number;
}

/**
 * Knowledge surfaced from an approved source. No admin wrote a trigger for
 * this — it was retrieved because the customer asked something factual.
 */
export interface KnowledgeSurface {
  id: string;
  atMs: number;
  entry: KnowledgeEntry;
  sourceName: string;
  /** Filename or hostname, shown under the source name when available. */
  sourceOrigin?: string;
  confidence: KnowledgeConfidence;
  /** Retrieval question — used to tell when the topic has moved on. */
  query: string;
}

  /** A behaviour nudge. Temporary — title, what happened, Got it. */
export interface CoachingCue {
  id: string;
  atMs: number;
  rule: CoachingRule;
  /** Natural observation under the title, e.g. "You've spoken for 75% of the last 2 minutes." */
  detail: string;
  /** The behaviour improved — the cue stays as history, not as an interrupt. */
  resolved?: boolean;
}

export interface ActionSurface {
  id: string;
  atMs: number;
  action: SuggestedAction;
  /** Demo-driven review / completion. Agents can still take over from here. */
  state?: ActionState;
}

export type TranscriptSpeaker = "customer" | "agent";

export interface TranscriptTurn {
  atMs: number;
  speaker: TranscriptSpeaker;
  quote: string;
}

export interface SimulationEvent {
  atMs: number;
  /** Active script step after this beat. Equal to steps.length when the call is wrapped. */
  scriptIndex?: number;
  quote?: string;
  speaker?: TranscriptSpeaker;
  /** Force-match these library items (used for multi-trigger utterances). */
  guidanceIds?: string[];
  /** AI detected the agent already covered this guidance. */
  handledGuidanceId?: string;
  /**
   * Retrieve knowledge for this line even though no Guidance was configured.
   * Left unset, a customer question still retrieves on its own — this is only
   * for choreographing which line the demo answers.
   */
  knowledgeQuery?: string;
  /** Keep retrieval out of this beat, even if the line reads as a question. */
  skipKnowledge?: boolean;
  /**
   * Don't surface conversation-detected actions on this beat. Used so the
   * stakeholder demo can introduce Actions on their own, not the moment a
   * competitor is named.
   */
  skipActions?: boolean;
  /** Fire a coaching banner from a live rule. */
  coachingRuleId?: string;
  /** Natural observation under the title. Falls back to the rule's generated copy. */
  coachingDetail?: string;
  /** Mark these live cues as resolved — the behaviour has improved. */
  resolveCoachingIds?: string[];
  /** Surface one of the scenario's conversation-detected actions. */
  actionId?: string;
  /** Drive review / completion / collapse for the action on this beat. */
  actionState?: ActionState;
}

export interface CallMoment {
  id: string;
  label: string;
  atMs: number;
}

/**
 * The one thing an agent can do about an item without leaving the recap.
 * Only what the product actually has — anything else stays a plain item the
 * agent ticks off themselves.
 */
export type CallActionKind =
  | "schedule"
  | "message"
  | "prepare"
  | "ticket"
  | "update"
  | "create";

export type CallActionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

/** Where a completed action lives — the recap links out instead of previewing. */
export interface CallActionResult {
  title: string;
  detail?: string;
  href?: string;
  hrefLabel?: string;
}

export interface CallActionItem {
  id: string;
  title: string;
  action?: CallActionKind;
  /** Maps this recap row to a live SuggestedAction from the call. */
  linkedActionId?: string;
  /**
   * Authored fallback when the recap is generated. Live completion and
   * failure override this so the agent never sees a CTA they already ran.
   */
  status?: CallActionStatus;
  /** Outcome-specific label — never a generic "Done". */
  outcome?: string;
  result?: CallActionResult;
  /** Secondary escape when JustCall cannot verify the work itself. */
  allowMarkDone?: boolean;
}

export interface ResolvedCallActionItem extends CallActionItem {
  status: CallActionStatus;
  outcome: string;
}

/**
 * The dispositions wrap-up offers. Kept here rather than in the panel because
 * the call itself is what picks one: Agent Assist reads the conversation and
 * fills the field in, and the agent only has to disagree.
 */
export type CallOutcomeValue =
  | "interested"
  | "follow-up"
  | "meeting"
  | "not-interested"
  | "no-answer"
  | "voicemail"
  | "wrong-number";

export interface CallWrapUp {
  summary: string;
  /** What the call sounded like — pre-filled in wrap-up, agent can change it. */
  suggestedOutcome: CallOutcomeValue;
  actionItems: CallActionItem[];
}

export interface CallScenario {
  id: string;
  scriptName: string;
  contactName: string;
  /**
   * The number on the line, as digits. Rendered through
   * `formatPhoneNumber` — a scenario should never carry a formatted string,
   * or the bar and the recap end up disagreeing about the spacing.
   */
  contactNumber: string;
  contactMeta: string;
  /** CRM values used to personalise authored script fields on this call. */
  contact?: ContactRecord;
  /** Admin-authored words used whenever a requested CRM value is empty. */
  fieldFallbacks?: FieldFallbacks;
  /** The CRM record actions on this call write to. */
  crmRecordLabel?: string;
  steps: ScriptStep[];
  events: SimulationEvent[];
  moments: CallMoment[];
  /** Actions the conversation itself suggests, referenced by event actionId. */
  conversationActions?: SuggestedAction[];
  wrapUp: CallWrapUp;
}

export interface SimulationSnapshot {
  scriptIndex: number;
  suggestions: GuidanceSuggestion[];
  handledIds: string[];
  latestQuote: { atMs: number; quote: string } | null;
  transcript: TranscriptTurn[];
  wrapped: boolean;
  /** Auto-retrieved answers, newest last. */
  knowledge: KnowledgeSurface[];
  /** Every cue fired so far — the panel shows the live one, not the pile. */
  coaching: CoachingCue[];
  actions: ActionSurface[];
}

/** Script wording as the agent sees it—resolved values or safe fallbacks only. */
export function resolveScenarioText(
  scenario: CallScenario,
  text: string | undefined
): string | undefined {
  if (!text) return text;
  return resolveFieldText(
    text,
    scenario.contact ?? {},
    scenario.fieldFallbacks ?? DEFAULT_FIELD_FALLBACKS
  );
}

const ACTION_OUTCOMES: Record<CallActionKind, string> = {
  schedule: "Scheduled",
  message: "Sent",
  prepare: "Prepared",
  ticket: "Ticket created",
  update: "Updated",
  create: "Created",
};

const ACTION_PROGRESS: Record<CallActionKind, string> = {
  schedule: "Scheduling…",
  message: "Sending…",
  prepare: "Preparing…",
  ticket: "Creating ticket…",
  update: "Updating…",
  create: "Creating…",
};

export function callActionOutcome(kind?: CallActionKind, fallback = "Updated"): string {
  if (!kind) return fallback;
  return ACTION_OUTCOMES[kind];
}

export function callActionProgressLabel(kind?: CallActionKind): string {
  if (!kind) return "Working…";
  return ACTION_PROGRESS[kind];
}

function outcomeFromLiveAction(action: SuggestedAction): string {
  if (action.email || /send/i.test(action.title)) return "Sent";
  if (/schedule|meeting|event/i.test(`${action.title} ${action.capabilityId}`)) {
    return "Scheduled";
  }
  if (/ticket/i.test(`${action.title} ${action.capabilityId}`)) {
    return "Ticket created";
  }
  if (/note/i.test(action.title)) return "Added";
  if (/task|creat/i.test(`${action.title} ${action.capabilityId}`)) return "Created";
  if (/update|competitor/i.test(action.title)) return "Updated";
  return "Updated";
}

function resultFromLiveAction(action: SuggestedAction): CallActionResult | undefined {
  const href = action.viewUrl;
  const hrefLabel =
    action.integrationId === "hubspot"
      ? "View in HubSpot"
      : action.integrationId === "salesforce"
        ? "View in Salesforce"
        : action.integrationId === "zendesk"
          ? "View in Zendesk"
          : href
            ? "View result"
            : undefined;
  if (action.email) {
    return {
      title: action.email.subject,
      detail: `To ${action.email.to}`,
      href,
      hrefLabel,
    };
  }
  const detail = action.fields
    .map((field) => field.value)
    .filter((value) => value.trim())
    .join(" · ");
  if (!detail && !href) return undefined;
  return {
    title: action.title,
    detail: detail || action.summary,
    href,
    hrefLabel,
  };
}

function liveActionState(
  item: CallActionItem,
  snapshot: SimulationSnapshot,
  liveStates: Record<string, ActionState>
): ActionState | undefined {
  const id = item.linkedActionId;
  if (!id) return undefined;
  const runtime = liveStates[id];
  if (
    runtime === "done" ||
    runtime === "failed" ||
    runtime === "permission_denied" ||
    runtime === "executing"
  ) {
    return runtime;
  }
  const fromSnapshot = snapshot.actions.find(
    (entry) => entry.id === id || entry.action.actionId === id
  )?.state;
  if (
    fromSnapshot === "done" ||
    fromSnapshot === "failed" ||
    fromSnapshot === "permission_denied" ||
    fromSnapshot === "executing"
  ) {
    return fromSnapshot;
  }
  return undefined;
}

function statusFromLiveState(
  state: ActionState | undefined
): CallActionStatus | undefined {
  if (state === "done") return "completed";
  if (state === "failed" || state === "permission_denied") return "failed";
  if (state === "executing") return "in_progress";
  return undefined;
}

/**
 * Recap rows reflect the call: a completed live action never gets its CTA
 * again, and a failed one stays retryable instead of looking finished.
 * Authored wrap-up statuses apply on the recap, so hanging up still shows
 * what the call already did even if the live cards hadn't flipped.
 *
 * V1 has no in-call actions, so nothing can have run yet — every row arrives
 * as work still to do. The authored statuses, the live action states and the
 * "View in Salesforce" receipts they carry all describe a V2 call, so V1
 * drops them and keeps only the offer: the CTA, and a box the agent can tick
 * once they have done it themselves.
 */
export function resolvePostCallActionItems(
  items: CallActionItem[],
  snapshot: SimulationSnapshot,
  liveStates: Record<string, ActionState> = {},
  scope: AgentAssistScope = "v2"
): ResolvedCallActionItem[] {
  return items.map((item) => {
    if (scope === "v1") {
      return {
        ...item,
        status: "pending",
        outcome: item.action ? callActionOutcome(item.action) : "",
        result: undefined,
        allowMarkDone: true,
      };
    }
    const linkedId = item.linkedActionId;
    const live = linkedId
      ? snapshot.actions.find(
          (entry) => entry.id === linkedId || entry.action.actionId === linkedId
        )?.action
      : undefined;
    const liveStatus = statusFromLiveState(
      liveActionState(item, snapshot, liveStates)
    );
    const status =
      liveStatus ?? item.status ?? "pending";
    const outcome =
      item.outcome ??
      (item.action
        ? callActionOutcome(item.action)
        : live
          ? outcomeFromLiveAction(live)
          : "");
    return {
      ...item,
      status,
      outcome,
      result: item.result ?? (live ? resultFromLiveAction(live) : undefined),
    };
  });
}

/** The recap heading stays put regardless of how many rows are ticked off. */
export const POST_CALL_SECTION_TITLE = "Action items";

/** Live libraries the runtime reads. Defaults to the seeded admin setup. */
export interface SimulationLibraries {
  knowledge?: KnowledgeSourceRecord[];
  coaching?: CoachingRule[];
  integrations?: Integration[];
  actions?: AgentAction[];
}

function step(
  title: string,
  wording?: string,
  required = true,
  relatedGuidanceIds?: string[]
): ScriptStep {
  return { title, wording, required, relatedGuidanceIds };
}

const AUTHORED_SCENARIOS: CallScenario[] = [
  {
    id: "discovery",
    scriptName: "Discovery call",
    contactName: "Elena Vasquez",
    contactNumber: "14155550142",
    contactMeta: "Outbound · Sales",
    contact: {
      first_name: "Elena",
      last_name: "Vasquez",
      company: "Acme Corp",
      email: "elena@acmecorp.com",
      phone: "+1 415 555 0142",
    },
    // Story follows the script: Aircall → after-hours pain → cost of
    // missed leads → Salesforce for the ops lead → price → book session.
    steps: [
      step(
        "Set the purpose of the call",
        "Hi {{first_name}} — I'd love to spend this time understanding how you're handling calls at {{company}} today, then see if it's worth a closer look."
      ),
      step(
        "Confirm time and attendees",
        "We've got about 30 minutes. Is anyone else joining, or is it just us?",
        false
      ),
      step(
        "Ask how they handle this today",
        "I understand your team currently uses {{crm_name}}. How are calls being managed there today?",
        true,
        ["g-status-quo", "g-aircall"]
      ),
      step(
        "Uncover the pain behind the process",
        "Where does that break down — missed calls, slow follow-up, or the team using different tools for the same job?",
        true,
        ["g-discovery"]
      ),
      step(
        "Quantify the cost of the status quo",
        "What does that cost you in time, missed revenue, or customer experience?"
      ),
      step(
        "Identify who else cares about this",
        "Who else feels this day to day — ops, support leads, or whoever owns the number?",
        false,
        ["g-salesforce"]
      ),
      step(
        "Propose a concrete follow-up",
        "If this still looks relevant, the useful next step is a 30-minute working session with your ops lead.",
        true,
        ["g-pricing"]
      ),
      step(
        "Confirm date, attendees, and success criteria",
        "Let's lock a time this week. If we can show the missed-call workflow in their language, we'll know whether a trial is worth it."
      ),
    ],
    crmRecordLabel: "Acme Corp",
    moments: [
      { id: "connect", label: "Call connects", atMs: 800 },
      { id: "script", label: "Script progression", atMs: 5500 },
      { id: "product-knowledge", label: "Product knowledge", atMs: 15000 },
      { id: "policy-knowledge", label: "Policy knowledge", atMs: 22000 },
      { id: "objection", label: "Aircall comparison", atMs: 32500 },
      { id: "talk-ratio", label: "Talk-ratio coaching", atMs: 39500 },
      { id: "discovery", label: "Discovery guidance", atMs: 46500 },
      { id: "interrupt", label: "Interruption coaching", atMs: 51000 },
      { id: "pricing", label: "Pricing guidance", atMs: 61000 },
      { id: "send", label: "Send action", atMs: 66500 },
      { id: "crm", label: "CRM update", atMs: 73500 },
      { id: "sentiment", label: "Sentiment coaching", atMs: 77000 },
      { id: "task", label: "Follow-up task", atMs: 80500 },
      { id: "schedule", label: "Schedule meeting", atMs: 87500 },
      { id: "combined", label: "Knowledge Base + guidance", atMs: 95500 },
      { id: "queue", label: "Aircall again", atMs: 102000 },
      { id: "pace", label: "Pace coaching", atMs: 114000 },
      { id: "end", label: "End of call", atMs: 122000 },
      {
        id: "resolved",
        label: "Resolved suggestions",
        atMs: 122000 + POST_WRAP_COMPLETED_DELAY_AUTHORED_MS,
      },
    ],
    conversationActions: [
      {
        id: "act-send-comparison",
        actionId: "act-send-comparison",
        integrationId: "hubspot",
        capabilityId: "hs-send-email",
        title: "Send comparison email",
        summary: "JustCall vs Dialpad · Elena Vasquez",
        recordLabel: "Contact",
        recordValue: "Elena Vasquez",
        fields: [
          { label: "To", value: "Elena Vasquez" },
          { label: "Subject", value: "JustCall vs Dialpad" },
          {
            label: "Message",
            value:
              "Hi Elena,\n\nBased on what we discussed, here’s a quick comparison between JustCall and Dialpad...",
          },
        ],
        origin: "conversation",
        requiresConfirmation: true,
        viewUrl: "https://app.hubspot.com",
        email: {
          to: "Elena Vasquez",
          toEmail: "elena@acmecorp.com",
          subject: "JustCall vs Dialpad",
          body: `Hi Elena,

Based on what we discussed, here’s a quick comparison between JustCall and Dialpad.

You mentioned evaluating Dialpad. JustCall bundles calling, messaging, and CRM sync so those don’t have to live in separate tools. I’ve included the follow-up we talked about on the call.

Happy to walk through any of this if it’s useful.

Best,`,
          attachments: [emailAttachmentPreset("att-dialpad-pdf")],
        },
      },
      {
        id: "act-update-competitor",
        actionId: "act-update-competitor",
        integrationId: "hubspot",
        capabilityId: "hs-update-property",
        title: "Update competitor",
        summary: "Competitor · Aircall",
        recordLabel: "Deal",
        recordValue: "Acme Corp",
        fields: [
          { label: "Property", value: "Competitor" },
          { label: "New value", value: "Aircall" },
        ],
        origin: "conversation",
        requiresConfirmation: true,
        viewUrl: "https://app.hubspot.com",
      },
      {
        id: "act-followup-task",
        actionId: "act-followup-task",
        integrationId: "salesforce",
        capabilityId: "sf-task",
        title: "Create follow-up task",
        summary: "Working session · due Thursday",
        recordLabel: "Contact",
        recordValue: "Elena Vasquez",
        fields: [
          { label: "Task", value: "Working session with Elena and her ops lead" },
          { label: "Due", value: "Thursday" },
          { label: "Owner", value: "Sarah Johnson" },
        ],
        origin: "conversation",
        requiresConfirmation: true,
        viewUrl: "https://login.salesforce.com",
      },
      {
        id: "act-schedule-meeting",
        actionId: "act-schedule-meeting",
        integrationId: "salesforce",
        capabilityId: "sf-event",
        title: "Schedule working session",
        summary: "Thursday afternoon · 30 min",
        recordLabel: "Contact",
        recordValue: "Elena Vasquez",
        fields: [
          { label: "When", value: "Thursday afternoon" },
          { label: "Attendees", value: "Elena Vasquez + ops lead" },
          { label: "Duration", value: "30 minutes" },
        ],
        origin: "conversation",
        requiresConfirmation: true,
        viewUrl: "https://login.salesforce.com",
      },
    ],
    events: [
      // 1. Call connects — bar, script, live transcript
      { atMs: 0, scriptIndex: 0 },
      {
        atMs: 1800,
        speaker: "agent",
        quote:
          "I'd love to spend this time understanding how you're handling calls today, then see if it's worth a closer look.",
      },
      {
        atMs: 4200,
        speaker: "customer",
        quote: "Sure — I've got about 30 minutes.",
        skipKnowledge: true,
        skipActions: true,
      },
      // 2. First script item completes, next step becomes active
      { atMs: 5500, scriptIndex: 1 },
      {
        atMs: 6800,
        speaker: "agent",
        quote: "We've got about 30 minutes. Is anyone else joining, or is it just us?",
      },
      {
        atMs: 9200,
        speaker: "customer",
        quote: "Just me — our ops lead couldn't make this one.",
        skipKnowledge: true,
        skipActions: true,
      },
      { atMs: 10200, scriptIndex: 2 },
      {
        atMs: 11800,
        speaker: "agent",
        quote: "Walk me through how this works on your team today.",
      },
      // 3. Product knowledge
      {
        atMs: 15000,
        speaker: "customer",
        quote: "If we switch, can we keep our existing numbers?",
        knowledgeQuery: "can we keep our numbers",
        skipActions: true,
      },
      {
        atMs: 18500,
        speaker: "agent",
        quote:
          "Yes — local numbers typically take 5–10 business days, with no downtime during the switch.",
      },
      // 4. Policy/process knowledge — previous knowledge stays accessible
      {
        atMs: 22000,
        speaker: "customer",
        quote: "And how long do you keep call recordings? Compliance will ask.",
        knowledgeQuery: "how long do you keep recordings",
        skipActions: true,
      },
      {
        atMs: 25500,
        speaker: "agent",
        quote:
          "Twelve months on standard plans, and we can extend that to twenty-four if your policy needs it.",
      },
      {
        atMs: 29000,
        speaker: "agent",
        quote: "Got it. What's the tool stack on the team today?",
      },
      // 5. Competitor named — Aircall battlecard is the card the agent reads.
      // Status-quo queues underneath so two matching cards don't fight for the
      // same expanded slot. Later "how are you different" re-activates this one.
      {
        atMs: 32500,
        speaker: "customer",
        quote: "We're pretty happy with Aircall actually. Not sure why we'd switch.",
        guidanceIds: ["g-aircall", "g-status-quo"],
        skipActions: true,
      },
      {
        atMs: 36500,
        speaker: "agent",
        quote:
          "Totally fair if calling is working. The teams who look at us usually have a gap — after-hours coverage, SMS sitting in another tool, or nothing logging to the CRM. I'd rather find out whether that's you than pitch you on a switch you don't need. JustCall puts calling, messaging, and CRM in one place, which is usually the reason, but I want the workflow first so we're not comparing feature lists.",
      },
      // 6. Talk-ratio coaching
      {
        atMs: 39500,
        coachingRuleId: "cr-overtalking",
        coachingDetail: "You've spoken for 75% of the last 2 minutes.",
      },
      // 7. Script progresses from the conversation
      { atMs: 41500, scriptIndex: 3 },
      {
        atMs: 43000,
        speaker: "agent",
        quote:
          "Where does that break down — missed calls, slow follow-up, or the team using different tools for the same job?",
      },
      // 8. Discovery guidance
      {
        atMs: 46500,
        speaker: "customer",
        quote:
          "After-hours calls go to voicemail. Follow-up is whoever happens to pick it up.",
        guidanceIds: ["g-discovery"],
        skipActions: true,
      },
      {
        atMs: 49500,
        speaker: "agent",
        quote: "Right, so the—",
      },
      // 9. Interruption / overtalk coaching
      {
        atMs: 51000,
        coachingRuleId: "cr-interruptions",
        coachingDetail: "You've interrupted the customer 3 times recently.",
      },
      // 10. Customer names the pain — discovery already covers this beat.
      // Empathy coaching waits until later so two behavioural cards don't land
      // on the same stretch of conversation.
      {
        atMs: 53500,
        speaker: "customer",
        quote:
          "That's twenty missed leads a week. The team is exhausted chasing them the next morning.",
        skipKnowledge: true,
        skipActions: true,
      },
      { atMs: 56000, scriptIndex: 4 },
      {
        atMs: 57500,
        speaker: "agent",
        quote:
          "That's a real cost. If this still looks relevant, the useful next step is a 30-minute working session with your ops lead.",
      },
      // 11. Pricing / competitor / positioning guidance
      {
        atMs: 61000,
        speaker: "customer",
        quote:
          "A working session could work, but Aircall is cheaper. Not sure I can sell a more expensive tool internally.",
        guidanceIds: ["g-pricing"],
        skipActions: true,
      },
      {
        atMs: 64500,
        speaker: "agent",
        quote:
          "I'll send you a one-page comparison you can forward internally — calling, messaging, and CRM on one plan versus stacking add-ons.",
      },
      // 12. Send/share action — stay on the suggestion card until the agent
      // reviews it. Auto-opening the form is noisy in a live demo.
      { atMs: 66500, actionId: "act-send-comparison" },
      // 13. CRM update — same: suggestion only, until wrap.
      { atMs: 73500, actionId: "act-update-competitor" },
      // Sentiment sits between actions, after the agent skipped the pain and
      // the internal-sell concern. One coaching card, its own beat.
      {
        atMs: 77000,
        coachingRuleId: "cr-frustration",
        coachingDetail: "The customer is showing signs of frustration.",
      },
      {
        atMs: 79500,
        speaker: "customer",
        quote: "Thursday afternoon could work if we bring ops.",
        skipKnowledge: true,
        skipActions: true,
      },
      // 14. Create task — suggestion only, until wrap.
      { atMs: 80500, actionId: "act-followup-task" },
      // 15. Schedule meeting — suggested here, completed at wrap so hangup
      //     at end-of-call already has a mixed recap (booked + sent + prepare).
      { atMs: 87500, actionId: "act-schedule-meeting" },
      { atMs: 94000, scriptIndex: 5 },
      // 16. Knowledge + guidance together
      {
        atMs: 95500,
        speaker: "customer",
        quote: "Our ops lead lives in Salesforce. Will calls actually log there?",
        guidanceIds: ["g-salesforce"],
        knowledgeQuery: "does justcall integrate with salesforce",
        skipActions: true,
      },
      // 17. Same competitor again — re-activates the Aircall card (Relevant again)
      {
        atMs: 102000,
        speaker: "customer",
        quote: "And how are you different from Aircall on the SMS side?",
        guidanceIds: ["g-aircall"],
        skipActions: true,
      },
      // 19. Multiple suggestions sit together — New / current / Earlier
      { atMs: 105000, handledGuidanceId: "g-status-quo" },
      { atMs: 106000, handledGuidanceId: "g-discovery" },
      // 20. Guidance covered — the live coaching cue stays until the next one.
      { atMs: 108000, handledGuidanceId: "g-pricing" },
      // 21. Remaining script steps complete
      { atMs: 112000, scriptIndex: 6 },
      {
        atMs: 114000,
        speaker: "agent",
        quote:
          "Let's lock a time this week. If we can show the missed-call workflow in their language, we'll know whether a trial is worth it.",
        coachingRuleId: "cr-pace",
        coachingDetail: "You're speaking faster than your usual pace.",
      },
      {
        atMs: 117000,
        speaker: "customer",
        quote: "Thursday afternoon is open. I'll bring the ops lead.",
        skipKnowledge: true,
        skipActions: true,
      },
      { atMs: 118500, scriptIndex: 7 },
      {
        atMs: 120000,
        speaker: "agent",
        quote:
          "Perfect. Success looks like after-hours coverage and Salesforce logging in a workflow your ops lead recognizes.",
      },
      { atMs: 122000, scriptIndex: 8 },
      // Recap-linked actions settle at wrap so hangup at end-of-call already
      // shows Scheduled / Sent instead of offering those CTAs again.
      {
        atMs: 122000,
        actionId: "act-send-comparison",
        actionState: "done",
      },
      {
        atMs: 122000,
        actionId: "act-schedule-meeting",
        actionState: "done",
      },
      // 22. Five seconds after wrap: resolved coaching and remaining CRM work.
      {
        atMs: 122000 + POST_WRAP_COMPLETED_DELAY_AUTHORED_MS,
        resolveCoachingIds: [
          "cr-overtalking",
          "cr-interruptions",
          "cr-frustration",
          "cr-pace",
        ],
      },
      {
        atMs: 122000 + POST_WRAP_COMPLETED_DELAY_AUTHORED_MS + 400,
        actionId: "act-update-competitor",
        actionState: "done",
      },
      {
        atMs: 122000 + POST_WRAP_COMPLETED_DELAY_AUTHORED_MS + 600,
        actionId: "act-followup-task",
        actionState: "done",
      },
    ],
    wrapUp: {
      summary:
        "Elena is on Aircall today and evaluating JustCall so calling, SMS, and CRM live in one place. After-hours calls go to voicemail with no owner, which costs her about twenty missed leads a week, and nothing logs to Salesforce unless someone remembers. She wants a Thursday afternoon working session with her ops lead, and needs a one-pager to sell a higher price internally versus Aircall.",
      suggestedOutcome: "meeting",
      actionItems: [
        {
          id: "session",
          title: "Book Thursday afternoon with Elena and her ops lead",
          action: "schedule",
          linkedActionId: "act-schedule-meeting",
          status: "completed",
          outcome: "Scheduled",
          result: {
            title: "Working session with Elena",
            detail: "Thursday afternoon · 30 min · Elena Vasquez + ops lead",
            href: "https://login.salesforce.com",
            hrefLabel: "View in Salesforce",
          },
        },
        {
          id: "recap",
          title: "Send a recap of Salesforce logging and after-hours coverage",
          action: "message",
          linkedActionId: "act-send-comparison",
          status: "completed",
          outcome: "Sent",
          result: {
            title: "Salesforce logging and after-hours coverage",
            detail: "Sent to Elena Vasquez · elena@acmecorp.com",
            href: "https://app.hubspot.com",
            hrefLabel: "View in HubSpot",
          },
        },
        {
          id: "pricing",
          title: "Build the Aircall price-difference one-pager before Thursday",
          allowMarkDone: true,
        },
      ],
    },
  },
  {
    id: "account-issue",
    scriptName: "Account access support",
    contactName: "Priya Sharma",
    contactNumber: "14155550177",
    contactMeta: "Inbound · Support",
    contact: {
      first_name: "Priya",
      phone: "+1 415 555 0177",
    },
    fieldFallbacks: {
      ...DEFAULT_FIELD_FALLBACKS,
      email: "the email on file",
    },
    steps: [
      step(
        "Greet the customer",
        "Hi {{first_name}}, thanks for calling JustCall support. How can I help you today?"
      ),
      step(
        "Confirm which account they're accessing",
        "Is {{email}} still the right address for the account you're trying to open?"
      ),
      step(
        "Diagnose account access issue",
        "What happens when you try to log in?",
        true,
        ["g-refund"]
      ),
      step(
        "Check account lock status",
        "It looks like the account may be locked after a few failed sign-in attempts. I can unlock it from here."
      ),
      step(
        "Restore access",
        "I'll unlock the account and resend the reset link. Can you check that inbox?"
      ),
      step(
        "Confirm they can sign in",
        "Were you able to sign in with the new password?"
      ),
    ],
    crmRecordLabel: "Priya Sharma",
    moments: [
      { id: "default", label: "Script only", atMs: 800 },
      { id: "refund", label: "Refund guidance", atMs: 5600 },
      { id: "pci", label: "Card details warning", atMs: 17200 },
      { id: "frustration", label: "Sentiment nudge", atMs: 20000 },
      { id: "handled", label: "Compliance covered", atMs: 30000 },
      { id: "porting", label: "Number porting question", atMs: 39000 },
      { id: "end", label: "End of call", atMs: 49200 },
    ],
    conversationActions: [
      {
        id: "act-billing-ticket",
        actionId: "act-billing-ticket",
        integrationId: "hubspot",
        capabilityId: "hs-ticket",
        title: "Create HubSpot ticket",
        summary: "Duplicate charge review",
        recordLabel: "Contact",
        recordValue: "Priya Sharma",
        fields: [
          { label: "Subject", value: "Review duplicate charge" },
          { label: "Priority", value: "Medium" },
          // Nothing in the conversation says which company this contact
          // belongs to, and HubSpot needs it — so the agent fills it in.
          { label: "Company", value: "", missing: true },
        ],
        origin: "conversation",
        requiresConfirmation: true,
      },
    ],
    events: [
      { atMs: 0, scriptIndex: 0 },
      {
        atMs: 2400,
        speaker: "agent",
        quote: "Hi, thanks for calling JustCall support. How can I help you today?",
      },
      {
        atMs: 5600,
        speaker: "customer",
        quote: "I can't log in, and I also think I was charged twice.",
        guidanceIds: ["g-refund"],
      },
      { atMs: 8200, scriptIndex: 1 },
      {
        atMs: 10000,
        speaker: "agent",
        quote: "Which email or phone number is on the account you're trying to open?",
      },
      { atMs: 11800, speaker: "customer", quote: "It's priya.sharma@email.com." },
      { atMs: 12800, scriptIndex: 2 },
      {
        atMs: 14800,
        speaker: "customer",
        quote: "It says invalid password. I tried resetting but I never got the email.",
      },
      {
        atMs: 17200,
        speaker: "customer",
        quote: "I'll read you my card number so you can refund it.",
        guidanceIds: ["g-pci"],
      },
      {
        atMs: 22600,
        speaker: "agent",
        quote:
          "Please don't share card details on this call. I'll send a secure payment link instead.",
      },
      // Two failed resets and a blocked refund — the customer is losing patience.
      {
        atMs: 20000,
        coachingRuleId: "cr-frustration",
        coachingDetail: "The customer is showing signs of frustration.",
      },
      {
        atMs: 30000,
        handledGuidanceId: "g-pci",
      },
      { atMs: 32800, scriptIndex: 3 },
      { atMs: 35600, speaker: "customer", quote: "Okay — I won't read the card." },
      // Guidance exists for lockouts, so it answers this rather than Knowledge.
      {
        atMs: 37000,
        speaker: "customer",
        quote: "Is the account locked, then?",
      },
      // Nothing was ever configured for porting — retrieved from the KB.
      {
        atMs: 39000,
        speaker: "customer",
        quote: "One more thing — do you support number porting?",
      },
      { atMs: 41500, scriptIndex: 4 },
      { atMs: 43500, speaker: "customer", quote: "I see the reset email now." },
      { atMs: 45500, scriptIndex: 5 },
      {
        atMs: 47000,
        speaker: "customer",
        quote: "I'm in. Thank you.",
        skipKnowledge: true,
        actionId: "act-billing-ticket",
      },
      { atMs: 49200, scriptIndex: 6 },
    ],
    wrapUp: {
      summary:
        "Priya couldn't sign in after several failed attempts and also thought she was charged twice. The account was unlocked and a reset email was sent; she confirmed she was back in. Card details were not collected on the call, so a secure payment link is the path if a refund is still needed.",
      suggestedOutcome: "follow-up",
      actionItems: [
        {
          id: "access",
          title: "Confirm the reset email resolved access",
          action: "message",
        },
        {
          id: "billing",
          title: "Review priya.sharma@email.com for a duplicate charge",
          allowMarkDone: true,
        },
        {
          id: "follow-up",
          title: "Follow up in 24 hours if she reports another lockout",
          action: "schedule",
        },
        {
          id: "ticket",
          title: "Create a ticket for the duplicate-charge review",
          action: "ticket",
          linkedActionId: "act-billing-ticket",
          result: {
            title: "Duplicate-charge review",
            detail: "Zendesk ticket · priya.sharma@email.com",
            href: "https://www.zendesk.com",
            hrefLabel: "View in Zendesk",
          },
        },
      ],
    },
  },
  {
    id: "billing",
    scriptName: "Billing support",
    contactName: "Marcus Chen",
    contactNumber: "14155550163",
    contactMeta: "Inbound · Billing",
    steps: [
      step(
        "Greet the customer",
        "Hi, thanks for calling JustCall billing. How can I help you today?"
      ),
      step(
        "Confirm the account on the invoice",
        "I can look that up — can I confirm the email on the billing account?"
      ),
      step(
        "Identify the charge in question",
        "What amount and date are you seeing on the statement?"
      ),
      step(
        "Explain the charge",
        "The first $49 is your monthly plan on the 12th. The second is still pending — it often drops off in a few days."
      ),
      step(
        "Offer a resolution",
        "If that pending charge posts, I can reverse it from here. I can also send a confirmation once it's cleared."
      ),
      step(
        "Confirm next steps",
        "I'll watch that pending charge and email you when it's gone. Is there anything else on billing?"
      ),
    ],
    crmRecordLabel: "Marcus Chen",
    moments: [
      { id: "default", label: "Script only", atMs: 800 },
      { id: "question", label: "Billing question", atMs: 6500 },
      { id: "uncertain", label: "Low-confidence answer", atMs: 18600 },
      { id: "end", label: "End of call", atMs: 30000 },
    ],
    conversationActions: [
      {
        id: "act-billing-note",
        actionId: "act-billing-note",
        integrationId: "hubspot",
        capabilityId: "hs-contact-note",
        title: "Add HubSpot note",
        summary: "Pending $49 charge to watch",
        recordLabel: "Contact",
        recordValue: "Marcus Chen",
        fields: [
          {
            label: "Note",
            value:
              "Second $49 charge still pending. Reverse it if it posts, then email confirmation.",
          },
        ],
        origin: "conversation",
        requiresConfirmation: true,
        // Shows the agent what happens when the CRM is unreachable mid-call.
        simulateFailure: true,
      },
    ],
    events: [
      { atMs: 0, scriptIndex: 0 },
      {
        atMs: 2400,
        speaker: "agent",
        quote: "Hi, thanks for calling JustCall billing. How can I help you today?",
      },
      {
        atMs: 5600,
        speaker: "customer",
        quote: "Hi — I was charged twice this month. Can I get a refund?",
        guidanceIds: ["g-refund"],
      },
      { atMs: 8200, scriptIndex: 1 },
      { atMs: 10800, speaker: "customer", quote: "It's marcus.chen@email.com." },
      { atMs: 12800, scriptIndex: 2 },
      {
        atMs: 15400,
        speaker: "customer",
        quote: "It's $49 on the 12th, and another $49 yesterday.",
      },
      { atMs: 17600, scriptIndex: 3 },
      // Close enough to the refund policy to be worth showing, not close
      // enough to state as the answer — the card says so instead of guessing.
      {
        atMs: 18600,
        speaker: "customer",
        quote: "Can you walk me through the refund process?",
      },
      {
        atMs: 20400,
        speaker: "customer",
        quote: "Oh — so I might not actually be billed twice?",
        skipKnowledge: true,
      },
      { atMs: 22600, scriptIndex: 4 },
      { atMs: 24000, actionId: "act-billing-note" },
      {
        atMs: 25400,
        handledGuidanceId: "g-refund",
      },
      {
        atMs: 27200,
        speaker: "customer",
        quote: "That's all, thank you.",
        skipKnowledge: true,
      },
      { atMs: 29400, scriptIndex: 6 },
    ],
    wrapUp: {
      summary:
        "Marcus saw two $49 charges: one posted on the 12th for the monthly plan, and a second still pending from yesterday. Pending charges often drop off in a few days. He was offered a reversal if the second charge posts, plus an email once it clears.",
      suggestedOutcome: "follow-up",
      actionItems: [
        {
          id: "note",
          title: "Log the pending $49 charge on Marcus's HubSpot record",
          action: "update",
          linkedActionId: "act-billing-note",
          status: "failed",
          result: {
            title: "Pending $49 charge",
            detail: "Logged on Marcus Chen · HubSpot",
            href: "https://app.hubspot.com",
            hrefLabel: "View in HubSpot",
          },
        },
        {
          id: "watch",
          title: "Watch the pending $49 charge and reverse it if it posts",
          allowMarkDone: true,
        },
        {
          id: "email",
          title: "Email Marcus when the pending charge clears",
          action: "message",
        },
      ],
    },
  },
];

/**
 * The played timeline. Events and moments move together, so jumping to a
 * moment still lands on the beat it names.
 */
export const CALL_SCENARIOS: CallScenario[] = AUTHORED_SCENARIOS.map(
  (scenario) => ({
    ...scenario,
    events: scenario.events.map((event) => ({ ...event, atMs: paced(event.atMs) })),
    moments: scenario.moments.map((moment) => ({
      ...moment,
      atMs: paced(moment.atMs),
    })),
  })
);

export function scenarioById(id: string): CallScenario {
  return CALL_SCENARIOS.find((item) => item.id === id) ?? CALL_SCENARIOS[0]!;
}

function toSuggestion(
  item: GuidanceItem,
  atMs: number,
  quote: string
): GuidanceSuggestion {
  return {
    id: item.id,
    atMs,
    quote,
    item,
    priority: priorityForGuidance(item),
    stance: stanceForGuidance(item),
  };
}

const PRIORITY_RANK: Record<GuidancePriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
};

export function sortSuggestions(items: GuidanceSuggestion[]): GuidanceSuggestion[] {
  return [...items].sort((a, b) => {
    const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rank !== 0) return rank;
    return a.atMs - b.atMs;
  });
}

export function simulationAt(
  scenario: CallScenario,
  elapsedMs: number,
  library: GuidanceItem[] = [],
  libraries: SimulationLibraries = {}
): SimulationSnapshot {
  let scriptIndex = 0;
  const suggestions: GuidanceSuggestion[] = [];
  const handledIds: string[] = [];
  const transcript: TranscriptTurn[] = [];
  const knowledge: KnowledgeSurface[] = [];
  const coaching: CoachingCue[] = [];
  const actions: ActionSurface[] = [];
  let latestQuote: SimulationSnapshot["latestQuote"] = null;
  const shown = new Set<string>();
  const knownEntryIds = new Set<string>();
  const firedActionIds = new Set<string>();
  const live = liveGuidance(library);

  const knowledgeSources = libraries.knowledge ?? SEED_KNOWLEDGE_SOURCES;
  const coachingRules = liveCoachingRules(libraries.coaching ?? SEED_COACHING_RULES);
  const integrations = libraries.integrations ?? SEED_INTEGRATIONS;
  const actionLibrary = liveActions(libraries.actions ?? SEED_ACTIONS);
  const recordValue = scenario.crmRecordLabel ?? scenario.contactName;

  const recordFor = (action: AgentAction) => ({
    recordLabel: action.object || "Record",
    recordValue,
    customerName: scenario.contactName,
    company: scenario.crmRecordLabel,
  });

  const upsertAction = (
    libraryAction: AgentAction,
    atMs: number,
    quote: string,
    origin: SuggestedAction["origin"]
  ) => {
    const next = suggestedActionFromLibrary(libraryAction, integrations, {
      ...recordFor(libraryAction),
      utterance: quote,
      origin,
    });
    if (!next) return;

    const existingIndex = actions.findIndex((item) => item.action.actionId === libraryAction.id);
    if (existingIndex >= 0) {
      const existing = actions[existingIndex]!;
      actions[existingIndex] = {
        ...existing,
        action: patchSuggestedValue(existing.action, next),
      };
      return;
    }
    firedActionIds.add(libraryAction.id);
    actions.push({ id: libraryAction.id, atMs, action: next });
  };

  const surfaceAiActions = (quote: string, atMs: number) => {
    for (const libraryAction of actionLibrary) {
      if (libraryAction.trigger !== "ai_recommended") continue;
      if (!actionMatchesUtterance(libraryAction, quote)) continue;
      upsertAction(libraryAction, atMs, quote, "ai");
    }
  };

  const surfaceGuidance = (ids: string[], atMs: number, quote: string) => {
    for (const id of ids) {
      if (shown.has(id)) continue;
      const match = live.find((item) => item.id === id);
      if (!match) continue;
      shown.add(id);
      suggestions.push(toSuggestion(match, atMs, quote));
    }
  };

  /**
   * Knowledge only answers what Guidance didn't. Strategic wording wins when
   * the two would speak to the same moment (§36).
   */
  const surfaceKnowledge = (query: string, atMs: number) => {
    for (const hit of retrieveKnowledge(query, knowledgeSources)) {
      if (knownEntryIds.has(hit.entry.id)) continue;
      knownEntryIds.add(hit.entry.id);
      knowledge.push({
        id: hit.entry.id,
        atMs,
        entry: hit.entry,
        sourceName: hit.source.name,
        sourceOrigin: hit.source.origin,
        confidence: hit.confidence,
        query,
      });
    }
  };

  for (const event of scenario.events) {
    if (elapsedMs < event.atMs) break;
    if (event.scriptIndex !== undefined) {
      scriptIndex = event.scriptIndex;
    }
    if (event.handledGuidanceId && !handledIds.includes(event.handledGuidanceId)) {
      handledIds.push(event.handledGuidanceId);
    }
    if (event.quote) {
      const speaker = event.speaker ?? "customer";
      transcript.push({ atMs: event.atMs, speaker, quote: event.quote });
      if (speaker === "customer") {
        latestQuote = { atMs: event.atMs, quote: event.quote };
      }
    }

    const quote = event.quote ?? latestQuote?.quote ?? "";
    const withActions = !event.skipActions;
    let matchedGuidance = false;
    if (event.guidanceIds?.length) {
      const before = suggestions.length;
      surfaceGuidance(event.guidanceIds, event.atMs, quote);
      matchedGuidance = suggestions.length > before;
    } else if (event.quote && (event.speaker ?? "customer") === "customer") {
      const unused = live.filter((item) => !shown.has(item.id));
      const match = rankGuidanceMatches(unused, event.quote)[0];
      if (match) {
        shown.add(match.id);
        suggestions.push(toSuggestion(match, event.atMs, event.quote));
        matchedGuidance = true;
      }
    }

    if (event.quote && (event.speaker ?? "customer") === "customer") {
      if (withActions) surfaceAiActions(event.quote, event.atMs);
      /**
       * A topic can come back — "Aircall is cheaper" is the customer returning
       * to the competitor they already named. That re-activates the card that
       * already covers it rather than adding a second one (§9).
       */
      for (const existing of suggestions) {
        if (existing.atMs === event.atMs) continue;
        const again =
          event.guidanceIds?.includes(existing.id) === true ||
          guidanceMatchesUtterance(existing.item, event.quote);
        if (!again) continue;
        existing.repeatAtMs = event.atMs;
      }
    }

    if (event.knowledgeQuery) {
      surfaceKnowledge(event.knowledgeQuery, event.atMs);
    } else if (
      !event.skipKnowledge &&
      !matchedGuidance &&
      event.quote &&
      (event.speaker ?? "customer") === "customer" &&
      looksLikeQuestion(event.quote)
    ) {
      surfaceKnowledge(event.quote, event.atMs);
    }

    if (event.coachingRuleId) {
      const rule = coachingRules.find((item) => item.id === event.coachingRuleId);
      if (rule) {
        coaching.push({
          id: `${rule.id}-${event.atMs}`,
          atMs: event.atMs,
          rule,
          detail: event.coachingDetail ?? coachingCardMessage(rule),
        });
      }
    }

    if (event.resolveCoachingIds?.length) {
      for (const cue of coaching) {
        if (event.resolveCoachingIds.includes(cue.rule.id)) {
          cue.resolved = true;
        }
      }
    }

    if (event.actionId) {
      const already = actions.find(
        (item) => item.id === event.actionId || item.action.actionId === event.actionId
      );
      if (!already) {
        const candidate = scenario.conversationActions?.find(
          (item) => item.id === event.actionId
        );
        if (candidate && !firedActionIds.has(candidate.id)) {
          firedActionIds.add(candidate.id);
          actions.push({
            id: candidate.id,
            atMs: event.atMs,
            action: {
              ...candidate,
              actionId: candidate.actionId || candidate.id,
              recordValue,
            },
          });
        } else {
          const libraryAction = actionLibrary.find((item) => item.id === event.actionId);
          if (libraryAction) {
            upsertAction(libraryAction, event.atMs, quote, "conversation");
          }
        }
      }
    }

    if (event.actionState) {
      const targetId = event.actionId;
      const existing = targetId
        ? actions.find(
            (item) => item.id === targetId || item.action.actionId === targetId
          )
        : actions[actions.length - 1];
      if (existing) existing.state = event.actionState;
    }
  }

  return {
    scriptIndex,
    suggestions,
    handledIds,
    latestQuote,
    transcript,
    wrapped: scriptIndex >= scenario.steps.length,
    knowledge,
    coaching,
    actions,
  };
}

export function nearestMoment(scenario: CallScenario, elapsedMs: number): CallMoment {
  const moments = scenario.moments;
  let current = moments[0] ?? { id: "default", label: "Script only", atMs: 0 };
  for (const moment of moments) {
    if (elapsedMs >= moment.atMs) current = moment;
  }
  return current;
}
