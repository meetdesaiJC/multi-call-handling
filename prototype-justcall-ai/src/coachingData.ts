import type { DropdownListItem } from "@/components/Dropdown";

/**
 * Coaching — how the conversation is going, not what it's about.
 *
 * The template picker shows human coaching concepts. Detection variants
 * (too fast vs too slow, agent talking too much vs customer too little)
 * are trigger settings on the rule, not separate templates.
 *
 * The in-call card never shows operator language. It always reads as:
 *   Title  — what the agent should do
 *   Message — what the system noticed
 *   Action — Got it
 */

export type CoachingTemplateId =
  | "talk-listen"
  | "monologue"
  | "interruptions"
  | "silence"
  | "pace"
  | "filler-words"
  | "frustration"
  | "confusion"
  | "escalation";

/**
 * What kind of signal this template is. Color + icon on the in-call card
 * follow the signal, not the individual template, so agents can categorise
 * at a glance: heart/orange, chat/purple, speak/blue, speedometer/teal,
 * timer/blue.
 */
export type CoachingSignal =
  | "sentiment"
  | "interrupt"
  | "talk"
  | "pace"
  | "monologue";

/** The wash on the card. Talk and monologue share blue; the icon splits them. */
export type CoachingAccent = "orange" | "purple" | "blue" | "teal";

const SIGNAL_ACCENT: Record<CoachingSignal, CoachingAccent> = {
  sentiment: "orange",
  interrupt: "purple",
  talk: "blue",
  pace: "teal",
  monologue: "blue",
};

const TEMPLATE_SIGNAL: Record<CoachingTemplateId, CoachingSignal> = {
  frustration: "sentiment",
  confusion: "sentiment",
  escalation: "sentiment",
  interruptions: "interrupt",
  "talk-listen": "talk",
  pace: "pace",
  "filler-words": "pace",
  monologue: "monologue",
  silence: "monologue",
};

export function coachingSignal(id: CoachingTemplateId): CoachingSignal {
  return TEMPLATE_SIGNAL[id];
}

export function coachingAccent(id: CoachingTemplateId): CoachingAccent {
  return SIGNAL_ACCENT[coachingSignal(id)];
}

export type CoachingFrequency = "once" | "on-return" | "cooldown";

export type CoachingTemplateGroup =
  | "conversation-balance"
  | "communication"
  | "customer-signals";

export const COACHING_TEMPLATE_GROUPS: {
  id: CoachingTemplateGroup;
  label: string;
}[] = [
  { id: "conversation-balance", label: "Conversation balance" },
  { id: "communication", label: "Communication" },
  { id: "customer-signals", label: "Customer signals" },
];

/** A detection variant the admin picks after choosing the coaching concept. */
export interface CoachingTriggerOption {
  id: string;
  /** Human label, e.g. "Too fast", "Agent talking too much". */
  label: string;
  metricLabel: string;
  comparator: string;
  thresholdOptions: string[];
  defaultThreshold: string;
  /** In-call title — a short coaching instruction. */
  message: string;
  windowOptions?: string[];
  defaultWindow?: string;
}

export interface CoachingTemplate {
  id: CoachingTemplateId;
  group: CoachingTemplateGroup;
  name: string;
  /** One-line explanation for the picker — no thresholds. */
  description: string;
  /** Field label for the trigger dropdown when there is more than one. */
  triggerLabel: string;
  triggers: CoachingTriggerOption[];
  defaultTriggerId: string;
  /** Field label for the threshold dropdown. */
  thresholdLabel: string;
  /** Field label for the evaluation window — "Duration" or "Evaluation window". */
  windowLabel: string;
  windowOptions: string[];
  defaultWindow: string;
  startAfterOptions: string[];
  defaultStartAfter: string;
  defaultFrequency: CoachingFrequency;
}

const WINDOW_OPTIONS = ["Last 1 minute", "Last 2 minutes", "Last 5 minutes", "Whole call"];
const START_AFTER_OPTIONS = [
  "Immediately",
  "1 minute into call",
  "2 minutes into call",
  "3 minutes into call",
  "5 minutes into call",
];
const ANY_POINT = ["At any point"];
const DURATION_OPTIONS = ["8 seconds", "12 seconds", "20 seconds", "30 seconds", "60 seconds"];
const COUNT_OPTIONS = ["2", "3", "4", "5"];
const PRESENT_OPTIONS = ["Raised"];
const SENTIMENT_OPTIONS = ["Slightly negative", "Negative", "Very negative"];

export const COACHING_TEMPLATES: CoachingTemplate[] = [
  {
    id: "talk-listen",
    group: "conversation-balance",
    name: "Talk-listen balance",
    description: "The conversation is leaning too far toward one speaker.",
    triggerLabel: "Direction",
    thresholdLabel: "Ratio threshold",
    windowLabel: "Evaluation window",
    triggers: [
      {
        id: "agent-too-much",
        label: "Agent talking too much",
        metricLabel: "Agent talk ratio",
        comparator: "Greater than",
        thresholdOptions: ["60%", "65%", "70%", "75%", "80%", "85%"],
        defaultThreshold: "75%",
        message: "Give the customer more room to speak",
      },
      {
        id: "customer-too-little",
        label: "Customer talking too little",
        metricLabel: "Customer talk time",
        comparator: "Below",
        thresholdOptions: ["20%", "25%", "30%", "40%"],
        defaultThreshold: "30%",
        message: "Spend a little more time listening",
      },
    ],
    defaultTriggerId: "agent-too-much",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 2 minutes",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "3 minutes into call",
    defaultFrequency: "on-return",
  },
  {
    id: "monologue",
    group: "conversation-balance",
    name: "Long monologue",
    description: "Agent has been speaking continuously for too long.",
    triggerLabel: "Direction",
    thresholdLabel: "Duration",
    windowLabel: "Evaluation window",
    triggers: [
      {
        id: "default",
        label: "Continuous speaking",
        metricLabel: "Agent monologue",
        comparator: "Longer than",
        thresholdOptions: DURATION_OPTIONS,
        defaultThreshold: "60 seconds",
        message: "Pause and bring the customer in",
      },
    ],
    defaultTriggerId: "default",
    windowOptions: ANY_POINT,
    defaultWindow: "At any point",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    defaultFrequency: "on-return",
  },
  {
    id: "interruptions",
    group: "conversation-balance",
    name: "Interruptions",
    description: "The agent is talking over the customer.",
    triggerLabel: "Direction",
    thresholdLabel: "Count",
    windowLabel: "Evaluation window",
    triggers: [
      {
        id: "interrupting",
        label: "Agent interrupting",
        metricLabel: "Interruptions",
        comparator: "More than",
        thresholdOptions: COUNT_OPTIONS,
        defaultThreshold: "3",
        message: "Let the customer finish",
      },
      {
        id: "overlapping",
        label: "Speaking over each other",
        metricLabel: "Overlapping speech",
        comparator: "More than",
        thresholdOptions: COUNT_OPTIONS,
        defaultThreshold: "3",
        message: "Give the customer a moment to respond",
      },
    ],
    defaultTriggerId: "interrupting",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 2 minutes",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    defaultFrequency: "on-return",
  },
  {
    id: "silence",
    group: "conversation-balance",
    name: "Long silence",
    description: "The conversation has gone quiet for too long.",
    triggerLabel: "Direction",
    thresholdLabel: "Duration",
    windowLabel: "Evaluation window",
    triggers: [
      {
        id: "default",
        label: "Silence",
        metricLabel: "Silence",
        comparator: "Longer than",
        thresholdOptions: ["5 seconds", "8 seconds", "12 seconds", "20 seconds"],
        defaultThreshold: "12 seconds",
        message: "Keep the conversation moving",
      },
    ],
    defaultTriggerId: "default",
    windowOptions: ANY_POINT,
    defaultWindow: "At any point",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    defaultFrequency: "cooldown",
  },
  {
    id: "pace",
    group: "communication",
    name: "Speaking pace",
    description: "The agent is speaking faster or slower than they should.",
    triggerLabel: "Direction",
    thresholdLabel: "Threshold",
    windowLabel: "Duration",
    triggers: [
      {
        id: "too-fast",
        label: "Too fast",
        metricLabel: "Speaking pace",
        comparator: "Greater than",
        thresholdOptions: ["150 WPM", "165 WPM", "180 WPM", "200 WPM"],
        defaultThreshold: "180 WPM",
        message: "Slow down a little",
      },
      {
        id: "too-slow",
        label: "Too slow",
        metricLabel: "Speaking pace",
        comparator: "Below",
        thresholdOptions: ["110 WPM", "120 WPM", "130 WPM", "140 WPM"],
        defaultThreshold: "120 WPM",
        message: "Pick up the pace a little",
      },
    ],
    defaultTriggerId: "too-fast",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    defaultFrequency: "on-return",
  },
  {
    id: "filler-words",
    group: "communication",
    name: "Filler words",
    description: "The agent is using filler words more often than usual.",
    triggerLabel: "Direction",
    thresholdLabel: "Threshold",
    windowLabel: "Duration",
    triggers: [
      {
        id: "default",
        label: "Too many fillers",
        metricLabel: "Filler words",
        comparator: "Greater than",
        thresholdOptions: ["More than usual", "Much more than usual"],
        defaultThreshold: "More than usual",
        message: "Keep your delivery clear",
      },
    ],
    defaultTriggerId: "default",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    defaultFrequency: "on-return",
  },
  {
    id: "frustration",
    group: "customer-signals",
    name: "Customer frustration",
    description: "The customer is showing frustration or negative emotion.",
    triggerLabel: "Trigger",
    thresholdLabel: "Severity",
    windowLabel: "Evaluation window",
    triggers: [
      {
        id: "frustrated",
        label: "Showing frustration",
        metricLabel: "Customer sentiment",
        comparator: "Below",
        thresholdOptions: SENTIMENT_OPTIONS,
        defaultThreshold: "Negative",
        message: "Acknowledge the customer's concern",
      },
      {
        id: "negative",
        label: "Tone turning negative",
        metricLabel: "Customer sentiment",
        comparator: "Below",
        thresholdOptions: SENTIMENT_OPTIONS,
        defaultThreshold: "Slightly negative",
        message: "Take a moment to reconnect",
      },
      {
        id: "concern",
        label: "Expressed a concern",
        metricLabel: "Customer concern",
        comparator: "Is",
        thresholdOptions: ["Expressed"],
        defaultThreshold: "Expressed",
        message: "Acknowledge what the customer shared",
        windowOptions: ANY_POINT,
        defaultWindow: "At any point",
      },
    ],
    defaultTriggerId: "frustrated",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    defaultFrequency: "cooldown",
  },
  {
    id: "confusion",
    group: "customer-signals",
    name: "Customer confusion",
    description: "The customer is having trouble following, or asking again.",
    triggerLabel: "Trigger",
    thresholdLabel: "Threshold",
    windowLabel: "Evaluation window",
    triggers: [
      {
        id: "trouble-following",
        label: "Having trouble following",
        metricLabel: "Customer confusion",
        comparator: "Is",
        thresholdOptions: PRESENT_OPTIONS,
        defaultThreshold: "Raised",
        message: "Clarify before moving ahead",
        windowOptions: ANY_POINT,
        defaultWindow: "At any point",
      },
      {
        id: "asked-again",
        label: "Asking the same question again",
        metricLabel: "Repeated questions",
        comparator: "More than",
        thresholdOptions: ["1", "2"],
        defaultThreshold: "1",
        message: "Try explaining it differently",
        windowOptions: WINDOW_OPTIONS,
        defaultWindow: "Last 5 minutes",
      },
    ],
    defaultTriggerId: "trouble-following",
    windowOptions: ANY_POINT,
    defaultWindow: "At any point",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    defaultFrequency: "on-return",
  },
  {
    id: "escalation",
    group: "customer-signals",
    name: "Escalation risk",
    description: "The conversation is showing signs of escalating.",
    triggerLabel: "Direction",
    thresholdLabel: "Threshold",
    windowLabel: "Evaluation window",
    triggers: [
      {
        id: "default",
        label: "Escalation signals",
        metricLabel: "Escalation signals",
        comparator: "Is",
        thresholdOptions: PRESENT_OPTIONS,
        defaultThreshold: "Raised",
        message: "Focus on resolving the concern",
      },
    ],
    defaultTriggerId: "default",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    defaultFrequency: "cooldown",
  },
];

export function coachingTemplate(id: CoachingTemplateId): CoachingTemplate {
  return COACHING_TEMPLATES.find((item) => item.id === id) ?? COACHING_TEMPLATES[0]!;
}

export function coachingTemplatesInGroup(
  group: CoachingTemplateGroup
): CoachingTemplate[] {
  return COACHING_TEMPLATES.filter((template) => template.group === group);
}

export function coachingTriggerOption(
  template: CoachingTemplate,
  triggerId: string
): CoachingTriggerOption {
  return (
    template.triggers.find((trigger) => trigger.id === triggerId) ??
    template.triggers.find((trigger) => trigger.id === template.defaultTriggerId) ??
    template.triggers[0]!
  );
}

export function coachingWindowOptions(
  template: CoachingTemplate,
  triggerId: string
): string[] {
  return coachingTriggerOption(template, triggerId).windowOptions ?? template.windowOptions;
}

export function coachingDefaultWindow(
  template: CoachingTemplate,
  triggerId: string
): string {
  const trigger = coachingTriggerOption(template, triggerId);
  return trigger.defaultWindow ?? template.defaultWindow;
}

export interface CoachingRule {
  id: string;
  /** Which template's detection logic this rule measures with. */
  templateId: CoachingTemplateId;
  /** Which trigger variant is active — e.g. too-fast vs too-slow. */
  triggerId: string;
  name: string;
  metricLabel: string;
  comparator: string;
  threshold: string;
  window: string;
  startAfter: string;
  /** In-call title — a short coaching instruction. */
  message: string;
  frequency: CoachingFrequency;
  /** Minutes — only meaningful when frequency is "cooldown". */
  cooldownMinutes: number;
  teamMembers: string[];
  userGroups: string[];
  status: "live" | "draft";
  updated: string;
}

/** Phrased as an answer to "Repeat coaching…", so the row reads as a sentence. */
export const COACHING_REPEAT_OPTIONS: DropdownListItem[] = [
  { value: "on-return", label: "If the behaviour happens again" },
  { value: "once", label: "Never — only once per call" },
  { value: "cooldown", label: "After a cooldown" },
];

/** How often a rule may interrupt, in the one line the list column shows. */
export function coachingFrequencyLabel(rule: CoachingRule): string {
  if (rule.frequency === "once") return "Once per call";
  if (rule.frequency === "on-return") return "Again if it returns";
  return `Every ${rule.cooldownMinutes} min at most`;
}

let coachingIdCounter = 0;

export function newCoachingRuleId(): string {
  coachingIdCounter += 1;
  return `cr-${Date.now().toString(36)}-${coachingIdCounter.toString(36)}`;
}

function fieldsFromTrigger(
  template: CoachingTemplate,
  triggerId: string
): Pick<CoachingRule, "triggerId" | "metricLabel" | "comparator" | "threshold" | "window"> {
  const trigger = coachingTriggerOption(template, triggerId);
  return {
    triggerId: trigger.id,
    metricLabel: trigger.metricLabel,
    comparator: trigger.comparator,
    threshold: trigger.defaultThreshold,
    window: coachingDefaultWindow(template, trigger.id),
  };
}

export function createCoachingRuleFromTemplate(
  templateId: CoachingTemplateId
): CoachingRule {
  const template = coachingTemplate(templateId);
  const trigger = coachingTriggerOption(template, template.defaultTriggerId);
  return {
    id: newCoachingRuleId(),
    templateId,
    name: template.name,
    startAfter: template.defaultStartAfter,
    message: trigger.message,
    frequency: template.defaultFrequency,
    cooldownMinutes: 5,
    teamMembers: [],
    userGroups: [],
    status: "draft",
    updated: "Just now",
    ...fieldsFromTrigger(template, trigger.id),
  };
}

/** Switch the trigger variant, carrying over values that still apply. */
export function applyCoachingTrigger(
  rule: CoachingRule,
  triggerId: string
): CoachingRule {
  const template = coachingTemplate(rule.templateId);
  const previous = coachingTriggerOption(template, rule.triggerId);
  const next = coachingTriggerOption(template, triggerId);
  const nextWindows = coachingWindowOptions(template, next.id);
  const keepThreshold = next.thresholdOptions.includes(rule.threshold);
  const keepWindow = nextWindows.includes(rule.window);
  const keepMessage = rule.message === previous.message;

  return {
    ...rule,
    triggerId: next.id,
    metricLabel: next.metricLabel,
    comparator: next.comparator,
    threshold: keepThreshold ? rule.threshold : next.defaultThreshold,
    window: keepWindow ? rule.window : coachingDefaultWindow(template, next.id),
    message: keepMessage ? next.message : rule.message,
  };
}

/**
 * Put a rule back on its template's recommended thresholds. Scoped to
 * detection only — how often the nudge repeats is edited elsewhere, so
 * restoring detection must not quietly reset it.
 */
export function restoreCoachingDetection(rule: CoachingRule): CoachingRule {
  const template = coachingTemplate(rule.templateId);
  const previous = coachingTriggerOption(template, rule.triggerId);
  const trigger = coachingTriggerOption(template, template.defaultTriggerId);
  return {
    ...rule,
    startAfter: template.defaultStartAfter,
    message: rule.message === previous.message ? trigger.message : rule.message,
    ...fieldsFromTrigger(template, trigger.id),
  };
}

export function coachingOnRecommendedDetection(rule: CoachingRule): boolean {
  const template = coachingTemplate(rule.templateId);
  const trigger = coachingTriggerOption(template, template.defaultTriggerId);
  return (
    rule.triggerId === trigger.id &&
    rule.threshold === trigger.defaultThreshold &&
    rule.window === coachingDefaultWindow(template, trigger.id) &&
    rule.startAfter === template.defaultStartAfter
  );
}

export function coachingDetectLabel(rule: CoachingRule): string {
  const template = coachingTemplate(rule.templateId);
  const trigger = coachingTriggerOption(template, rule.triggerId);
  if (template.triggers.length > 1) {
    return `${trigger.label} · ${rule.threshold}`;
  }
  return `${rule.metricLabel} ${rule.comparator.toLowerCase()} ${rule.threshold}`;
}

/**
 * Detection, read back as a sentence rather than a set of fields. Segments so
 * the page can weight the values the admin actually chose against the
 * connective words around them.
 */
export interface CoachingSentenceSegment {
  text: string;
  strong?: boolean;
}

/** Comparators are stored as field labels; sentences need the verb form. */
const COMPARATOR_PHRASES: Record<string, string> = {
  "Greater than": "is above",
  "More than": "goes over",
  Below: "drops below",
  "Longer than": "runs longer than",
  Is: "is",
};

function thresholdText(threshold: string): string {
  // "75%" and "180 WPM" stay as typed; "Negative" reads better mid-sentence.
  return /\d/.test(threshold) ? threshold : threshold.toLowerCase();
}

function windowSegments(window: string): CoachingSentenceSegment[] {
  const lower = window.toLowerCase();
  if (lower.startsWith("last ")) {
    return [{ text: " for the " }, { text: lower, strong: true }];
  }
  if (lower === "whole call") {
    return [{ text: " across the " }, { text: lower, strong: true }];
  }
  if (lower === "at any point") return [{ text: " at any point in the call" }];
  return [{ text: " over " }, { text: lower, strong: true }];
}

export function coachingTriggerSentence(rule: CoachingRule): CoachingSentenceSegment[] {
  const template = coachingTemplate(rule.templateId);
  const trigger = coachingTriggerOption(template, rule.triggerId);
  const comparator =
    COMPARATOR_PHRASES[rule.comparator] ?? rule.comparator.toLowerCase();

  if (template.triggers.length > 1) {
    return [
      { text: "Trigger when " },
      { text: trigger.label.toLowerCase(), strong: true },
      { text: ` — ${rule.metricLabel.toLowerCase()} ${comparator} ` },
      { text: thresholdText(rule.threshold), strong: true },
      ...windowSegments(rule.window),
      { text: "." },
    ];
  }

  return [
    { text: "Trigger when " },
    { text: rule.metricLabel.toLowerCase(), strong: true },
    { text: ` ${comparator} ` },
    { text: thresholdText(rule.threshold), strong: true },
    ...windowSegments(rule.window),
    { text: "." },
  ];
}

export function coachingStartSentence(rule: CoachingRule): CoachingSentenceSegment[] {
  if (rule.startAfter === "Immediately") {
    return [
      { text: "Start checking " },
      { text: "as soon as the call connects", strong: true },
      { text: "." },
    ];
  }
  return [
    { text: "Start checking " },
    { text: rule.startAfter.replace(/ into call$/, ""), strong: true },
    { text: " into the call." },
  ];
}

function windowAsSpoken(window: string): string {
  const lower = window.toLowerCase();
  if (lower === "last 1 minute") return "the last minute";
  if (lower.startsWith("last ")) return `the ${lower}`;
  if (lower === "whole call") return "the whole call";
  return lower;
}

function countFromThreshold(threshold: string): string {
  return threshold.match(/\d+/)?.[0] ?? threshold;
}

/**
 * The one-sentence observation on the in-call card. Built from the live
 * threshold and window so the agent sees what happened — never the operator,
 * metric label, or trigger phrasing the admin configured.
 */
export function coachingCardMessage(
  rule: Pick<CoachingRule, "templateId" | "triggerId" | "threshold" | "window">
): string {
  const { templateId, triggerId, threshold, window } = rule;
  const spokenWindow = windowAsSpoken(window);
  const count = countFromThreshold(threshold);

  switch (templateId) {
    case "talk-listen":
      return triggerId === "customer-too-little"
        ? "The customer has had limited time to speak recently."
        : `You've spoken for ${threshold} of ${spokenWindow}.`;
    case "monologue":
      return `You've been speaking continuously for over ${threshold}.`;
    case "silence":
      return `It's been quiet for ${threshold}.`;
    case "interruptions":
      return triggerId === "overlapping"
        ? "You've both been speaking at the same time frequently."
        : `You've interrupted the customer ${count} times recently.`;
    case "pace":
      return triggerId === "too-slow"
        ? "Your speaking pace has been slower than usual."
        : "You're speaking faster than your usual pace.";
    case "filler-words":
      return "You've been using filler words more frequently.";
    case "frustration":
      if (triggerId === "negative") {
        return "The customer's sentiment has become more negative.";
      }
      if (triggerId === "concern") {
        return "The customer just expressed a concern.";
      }
      return "The customer is showing signs of frustration.";
    case "confusion":
      return triggerId === "asked-again"
        ? "The customer has asked about this more than once."
        : "The customer may be having trouble following the explanation.";
    case "escalation":
      return "The conversation is showing signs of escalating.";
  }
}

export const SEED_COACHING_RULES: CoachingRule[] = [
  {
    ...createCoachingRuleFromTemplate("talk-listen"),
    id: "cr-overtalking",
    userGroups: ["sales"],
    status: "live",
    updated: "2 days ago",
  },
  {
    ...createCoachingRuleFromTemplate("frustration"),
    id: "cr-frustration",
    userGroups: ["support", "billing"],
    status: "live",
    updated: "Yesterday",
  },
  {
    ...createCoachingRuleFromTemplate("interruptions"),
    id: "cr-interruptions",
    userGroups: ["sales", "support"],
    status: "live",
    updated: "1 week ago",
  },
  {
    ...createCoachingRuleFromTemplate("pace"),
    id: "cr-pace",
    userGroups: ["sales"],
    status: "live",
    updated: "4 days ago",
  },
  {
    ...createCoachingRuleFromTemplate("silence"),
    id: "cr-silence",
    userGroups: ["support"],
    status: "draft",
    updated: "5 days ago",
  },
];

export function liveCoachingRules(rules: CoachingRule[]): CoachingRule[] {
  return rules.filter((rule) => rule.status === "live");
}
