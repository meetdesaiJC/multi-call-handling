import type { DropdownListItem } from "@/components/Dropdown";

export type PublishStatus = "live" | "draft";

export type GuidanceResourceType = "link" | "image";

export interface BattlecardRow {
  feature: string;
  us: string;
  competitor: string;
}

export interface BattlecardData {
  usLabel: string;
  competitorLabel: string;
  rows: BattlecardRow[];
}

export interface GuidanceResource {
  id: string;
  type: GuidanceResourceType;
  name: string;
  url?: string;
  /** Object URL or data URL for uploaded images. */
  thumbnail?: string;
  /** Structured comparison table — used instead of a screenshot. */
  battlecard?: BattlecardData;
}

export const AIRCALL_BATTLECARD: BattlecardData = {
  usLabel: "JustCall",
  competitorLabel: "Aircall",
  rows: [
    { feature: "Unlimited calling", us: "Yes", competitor: "Yes" },
    { feature: "SMS campaigns", us: "Yes", competitor: "Add-on" },
    { feature: "AI agent assist", us: "Yes", competitor: "No" },
  ],
};

/** Who has to say it before this guidance fires. New cards default to anyone. */
export type GuidanceTriggeredBy = "customer" | "agent" | "either";

export interface GuidanceItem {
  id: string;
  name: string;
  /** Natural-language trigger — migrated from FAQ question. */
  trigger: string;
  examplePhrases: string[];
  /** Who has to say it before this fires. Left unset, only the customer's side is watched. */
  triggeredBy?: GuidanceTriggeredBy;
  /** Migrated from FAQ answer. */
  suggestedResponse: string;
  talkingPoints: string[];
  resources: GuidanceResource[];
  teamMembers: string[];
  userGroups: string[];
  status: PublishStatus;
  updated: string;
}

export function guidanceTriggeredBy(item: GuidanceItem): GuidanceTriggeredBy {
  return item.triggeredBy ?? "customer";
}

export const GUIDANCE_TRIGGERED_BY_OPTIONS: DropdownListItem[] = [
  { value: "customer", label: "Customer" },
  { value: "agent", label: "Agent" },
  { value: "either", label: "Anyone" },
];

export const TEAM_MEMBERS: DropdownListItem[] = [
  { value: "olivia", label: "Olivia Rhye" },
  { value: "phoenix", label: "Phoenix Baker" },
  { value: "lana", label: "Lana Steiner" },
  { value: "demi", label: "Demi Wilkinson" },
  { value: "candice", label: "Candice Wu" },
  { value: "natali", label: "Natali Craig" },
  { value: "drew", label: "Drew Cano" },
];

export const USER_GROUPS: DropdownListItem[] = [
  { value: "support", label: "Support" },
  { value: "sales", label: "Sales" },
  { value: "success", label: "Customer Success" },
  { value: "billing", label: "Billing" },
  { value: "ops", label: "Operations" },
];

const AIRCALL_PHRASES = [
  "How are you different from Aircall?",
  "We currently use Aircall.",
  "Why should we switch from Aircall?",
  "Does JustCall have anything Aircall doesn't?",
];

export const SEED_GUIDANCE: GuidanceItem[] = [
  {
    id: "g-aircall",
    name: "Competitor comparison — Aircall",
    trigger:
      "When a customer asks how JustCall compares with Aircall or mentions that they currently use Aircall.",
    examplePhrases: AIRCALL_PHRASES,
    suggestedResponse:
      "JustCall brings calling, messaging, CRM integrations, and AI-powered conversation tools together in one platform, helping teams manage more of the customer conversation from one place.",
    talkingPoints: [
      "Calling, SMS, and email",
      "Native CRM integrations",
      "AI-powered agent assistance",
      "Conversation intelligence",
    ],
    resources: [
      {
        id: "r-aircall-battlecard",
        type: "image",
        name: "Aircall comparison battlecard",
        battlecard: AIRCALL_BATTLECARD,
      },
    ],
    teamMembers: [],
    userGroups: ["sales"],
    status: "live",
    updated: "2 days ago",
  },
  {
    id: "g-after-hours",
    name: "After-hours missed calls",
    trigger:
      "When a prospect mentions missed after-hours calls, voicemail overflow, or leads that go unanswered outside business hours.",
    examplePhrases: [
      "After-hours calls go to voicemail.",
      "We miss a lot of calls at night.",
      "Nobody's covering the phone after 6.",
      "Leads just hit voicemail overnight.",
    ],
    suggestedResponse:
      "After-hours coverage is usually the first workflow we show. Incoming calls can route to an on-call person, or a missed-call SMS so the lead isn't sitting until morning.",
    talkingPoints: [
      "Route after-hours to on-call or a shared queue",
      "Missed-call SMS so the lead hears back the same night",
      "Show this workflow in the working session",
    ],
    resources: [
      {
        id: "r-after-hours",
        type: "link",
        name: "After-hours coverage playbook",
        url: "https://help.justcall.io/after-hours",
      },
    ],
    teamMembers: [],
    userGroups: ["sales"],
    status: "live",
    updated: "Yesterday",
  },
  {
    id: "g-status-quo",
    name: "Status-quo objection",
    trigger:
      "When a prospect says they are happy with their current tool, not looking to switch, or asks why they would change.",
    examplePhrases: [
      "We're pretty happy with what we have.",
      "Not sure why we'd switch.",
      "We're not really looking to change tools.",
      "Aircall is working fine for us.",
    ],
    suggestedResponse:
      "Totally fair — if calling is working, switching isn't interesting. The teams who move usually have a gap the current setup doesn't cover: after-hours, SMS, or CRM logging. Worth checking whether that's you before we go further.",
    talkingPoints: [
      "Don't pitch — find the gap first",
      "Name after-hours, SMS, or CRM as the usual reasons",
      "Give them an easy out if nothing's broken",
    ],
    resources: [],
    teamMembers: [],
    userGroups: ["sales"],
    status: "live",
    updated: "Today",
  },
  {
    id: "g-discovery",
    name: "Discovery — quantify the pain",
    trigger:
      "When a prospect describes missed calls, voicemail overflow, or leads with no owner — before they have named the cost.",
    examplePhrases: [
      "After-hours calls go to voicemail.",
      "Nobody owns the missed leads.",
      "Follow-up is whoever picks it up.",
      "We miss a lot of calls at night.",
    ],
    suggestedResponse:
      "Before I show a workflow — what does that cost you in a typical week? Missed leads, slow follow-up, or time the team spends chasing the same call?",
    talkingPoints: [
      "Quantify before you pitch",
      "Ask for a number — leads, hours, or revenue",
      "Get who else feels it on the record",
    ],
    resources: [],
    teamMembers: ["phoenix"],
    userGroups: ["sales"],
    status: "live",
    updated: "Today",
  },
  {
    id: "g-refund",
    name: "Refund policy",
    trigger:
      "When a customer asks about a refund, a duplicate charge, or whether a payment can be reversed.",
    examplePhrases: [
      "Can I get a refund?",
      "I was charged twice.",
      "How do refunds work?",
      "I want my money back.",
    ],
    suggestedResponse:
      "Refunds are available within 14 days of the charge for unused subscription time. I can review the account and start that for you if it qualifies.",
    talkingPoints: [
      "14-day window for unused time",
      "Confirm the charge and invoice first",
      "Processing typically takes 5–7 business days",
    ],
    resources: [
      {
        id: "r-refund-help",
        type: "link",
        name: "Refund policy help article",
        url: "https://help.justcall.io/refunds",
      },
    ],
    teamMembers: [],
    userGroups: ["billing", "support"],
    status: "live",
    updated: "5 days ago",
  },
  {
    id: "g-pricing",
    name: "Pricing objection",
    trigger:
      "When a prospect says JustCall is expensive, asks for a discount, or compares plan pricing with another vendor.",
    examplePhrases: [
      "That's more than we budgeted.",
      "Can you do anything on price?",
      "Aircall is cheaper.",
      "Why is this plan so expensive?",
    ],
    suggestedResponse:
      "Pricing includes calling, messaging, CRM sync, and AI assistance in one place — so teams aren't stacking extra tools. I can walk through the plan that matches how you actually use the phone.",
    talkingPoints: [
      "One platform vs. add-on costs",
      "Match plan to seat count and usage",
      "Annual billing discount if asked",
    ],
    resources: [],
    teamMembers: ["phoenix"],
    userGroups: ["sales"],
    status: "live",
    updated: "1 week ago",
  },
  {
    id: "g-salesforce",
    name: "Salesforce integration",
    trigger:
      "When a customer asks if JustCall works with Salesforce, how logging works, or whether calls sync to Salesforce.",
    examplePhrases: [
      "Does this integrate with Salesforce?",
      "Will calls log in Salesforce?",
      "Do you have a Salesforce app?",
      "Can we click-to-call from Salesforce?",
    ],
    suggestedResponse:
      "Yes — JustCall has a native Salesforce integration. Calls, SMS, and voicemails log to the contact automatically, and agents can click-to-call from the record.",
    talkingPoints: [
      "Native Salesforce app",
      "Automatic call and SMS logging",
      "Click-to-call from Salesforce",
    ],
    resources: [
      {
        id: "r-salesforce-docs",
        type: "link",
        name: "Salesforce integration article",
        url: "https://help.justcall.io/salesforce",
      },
    ],
    teamMembers: [],
    userGroups: ["sales", "success"],
    status: "live",
    updated: "Yesterday",
  },
  {
    id: "g-pci",
    name: "Don't take card details on this call",
    trigger:
      "When a customer offers a card number, CVV, full password, or other sensitive payment data on the call.",
    examplePhrases: [
      "I'll read you my card number.",
      "Let me give you the CVV.",
      "I can tell you my password.",
      "Take the card over the phone.",
    ],
    suggestedResponse:
      "Please don't share card details on this call. I'll send a secure payment link instead — that's the safest way to complete this.",
    talkingPoints: [
      "Never accept PAN, CVV, or full passwords on a call",
      "Send a secure payment or reset link",
      "If details were already spoken, don't repeat them back",
    ],
    resources: [],
    teamMembers: [],
    userGroups: ["billing", "support"],
    status: "live",
    updated: "Yesterday",
  },
  {
    id: "g-hubspot",
    name: "HubSpot integration",
    trigger:
      "When a customer asks if JustCall works with HubSpot, how logging works, or whether calls and SMS sync to the CRM.",
    examplePhrases: [
      "Do you integrate with HubSpot?",
      "Will calls log in HubSpot automatically?",
      "Can SMS show up on the contact?",
      "How does the HubSpot sync work?",
    ],
    suggestedResponse:
      "JustCall has a native HubSpot integration. Calls, SMS, and voicemails log to the contact or company record automatically, and agents can click-to-call from HubSpot.",
    talkingPoints: [
      "Native HubSpot app",
      "Automatic call and SMS logging",
      "Click-to-call from HubSpot",
    ],
    resources: [
      {
        id: "r-hubspot-docs",
        type: "link",
        name: "HubSpot integration docs",
        url: "https://help.justcall.io/hubspot",
      },
    ],
    teamMembers: [],
    userGroups: ["sales", "success"],
    status: "live",
    updated: "3 days ago",
  },
  {
    id: "g-login",
    name: "Login troubleshooting",
    trigger:
      "When a customer cannot sign in, mentions a locked account, or asks to reset their password.",
    examplePhrases: [
      "I can't log in.",
      "My account is locked.",
      "I forgot my password.",
      "The login page isn't working.",
    ],
    suggestedResponse:
      "I can help you get back in. I'll verify the email on the account and send a password reset — if it's locked after too many attempts, that usually clears after the reset.",
    talkingPoints: [
      "Confirm the email on the account",
      "Send a password reset",
      "Locked accounts unlock after reset",
    ],
    resources: [],
    teamMembers: ["olivia", "lana"],
    userGroups: ["support"],
    status: "live",
    updated: "Yesterday",
  },
  {
    id: "g-cancel",
    name: "Cancellation policy",
    trigger:
      "When a customer wants to cancel, downgrade, or asks what happens to their number if they leave.",
    examplePhrases: [
      "I want to cancel my account.",
      "How do I cancel?",
      "What happens to our numbers if we cancel?",
      "Can we pause instead of cancelling?",
    ],
    suggestedResponse:
      "You can cancel anytime from billing. Numbers stay active through the paid period; after that they can be released. If it's a timing issue, pausing or downgrading is often a better fit.",
    talkingPoints: [
      "Cancel anytime — no long-term lock-in",
      "Numbers remain active through the paid period",
      "Offer pause or downgrade before cancelling",
    ],
    resources: [],
    teamMembers: [],
    userGroups: ["billing"],
    status: "draft",
    updated: "4 days ago",
  },
];

const STOP_WORDS = new Set([
  "this",
  "that",
  "with",
  "from",
  "your",
  "what",
  "when",
  "does",
  "have",
  "about",
  "should",
  "would",
  "could",
  "justcall",
  "customer",
  "asks",
  "mentions",
  "currently",
  "using",
  "already",
  "something",
  "please",
  "help",
  "want",
  "need",
  "just",
  "like",
  "them",
  "they",
  "we",
  "you",
  "our",
  "the",
]);

/** Too common to fire a card on their own — "phone" must not match PCI. */
const WEAK_TOKENS = new Set([
  ...STOP_WORDS,
  "phone",
  "call",
  "calls",
  "card",
  "number",
  "data",
  "other",
  "full",
  "take",
  "give",
  "tell",
  "over",
  "read",
  "details",
  "offers",
  "offer",
  "manage",
  "today",
  "team",
  "tool",
  "tools",
  "work",
  "works",
  "same",
  "also",
  "think",
  "make",
  "lead",
  "leads",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const SHORT_KEEP = new Set(["cvv", "pci", "pan", "sms", "mfa", "crm"]);

function distinctiveTokens(text: string): string[] {
  return tokens(text).filter(
    (word) => !WEAK_TOKENS.has(word) && (word.length >= 4 || SHORT_KEEP.has(word))
  );
}

function contentBigrams(text: string): string[] {
  const words = tokens(text);
  const grams: string[] = [];
  for (let i = 0; i < words.length - 1; i += 1) {
    const left = words[i]!;
    const right = words[i + 1]!;
    if (left.length < 3 || right.length < 3) continue;
    if (STOP_WORDS.has(left) || STOP_WORDS.has(right)) continue;
    grams.push(`${left} ${right}`);
  }
  return grams;
}

export function guidanceMatchScore(item: GuidanceItem, utterance: string): number {
  const hay = new Set(distinctiveTokens(utterance));
  const utteredGrams = new Set(contentBigrams(utterance));
  if (hay.size === 0 && utteredGrams.size === 0) return 0;

  const source = [item.name, ...item.examplePhrases].join(" ");
  const needles = distinctiveTokens(source);
  const phraseHits = contentBigrams(source).reduce(
    (score, gram) => score + (utteredGrams.has(gram) ? 2 : 0),
    0
  );
  return needles.reduce((score, token) => score + (hay.has(token) ? 1 : 0), phraseHits);
}

export function guidanceMatchesUtterance(
  item: GuidanceItem,
  utterance: string
): boolean {
  return guidanceMatchScore(item, utterance) >= 2;
}

export function rankGuidanceMatches(
  items: GuidanceItem[],
  utterance: string
): GuidanceItem[] {
  return items
    .map((item) => ({ item, score: guidanceMatchScore(item, utterance) }))
    .filter((entry) => entry.score >= 2)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

export function liveGuidance(items: GuidanceItem[]): GuidanceItem[] {
  return items.filter((item) => item.status === "live");
}

/** What kind of cue this is — used for labels and priority, not card color. */
export type GuidanceKind =
  | "competitor"
  | "objection"
  | "policy"
  | "fix"
  | "product"
  | "compliance";

export type GuidancePriority = "critical" | "high" | "normal";

/** How binding this cue is — shown to the agent, never as a fake fact. */
export type GuidanceStance = "required" | "recommended" | "optional";

export const GUIDANCE_KIND_META: Record<
  GuidanceKind,
  { label: string; hint: string }
> = {
  competitor: { label: "Competitor", hint: "Battlecard" },
  objection: { label: "Objection", hint: "Handle the pushback" },
  policy: { label: "Policy", hint: "Follow the rule" },
  fix: { label: "Fix", hint: "Restore access" },
  product: { label: "Product", hint: "How it works" },
  compliance: { label: "Required", hint: "Must cover this" },
};

export function inferGuidanceKind(item: GuidanceItem): GuidanceKind {
  const hay = `${item.name} ${item.trigger} ${item.examplePhrases.join(" ")}`.toLowerCase();
  if (/card number|cvv|\bpci\b|disclosure|legal|compliance|don't take|do not take|sensitive payment|required question|required step/.test(hay)) {
    return "compliance";
  }
  if (/status-quo|discovery|quantify the pain/.test(hay)) return "objection";
  if (/aircall|competitor|versus|\bvs\.?\b|compar/.test(hay)) return "competitor";
  if (/expensive|discount|budget|pric|objection/.test(hay)) return "objection";
  if (/refund|cancel|policy|invoice|charged|duplicate charge/.test(hay)) return "policy";
  if (/login|lock|troubleshoot|reset|can't log/.test(hay)) return "fix";
  if (/integrat|hubspot|salesforce|crm|feature|after-hours|missed call/.test(hay)) {
    return "product";
  }
  if (item.userGroups.includes("billing")) return "policy";
  if (item.userGroups.includes("support")) return "fix";
  if (item.userGroups.includes("sales")) return "objection";
  return "product";
}

export function priorityForGuidance(item: GuidanceItem): GuidancePriority {
  const kind = inferGuidanceKind(item);
  if (kind === "compliance") return "critical";
  if (kind === "objection" || kind === "competitor" || kind === "fix" || kind === "policy") {
    return "high";
  }
  return "normal";
}

export function stanceForGuidance(item: GuidanceItem): GuidanceStance {
  const priority = priorityForGuidance(item);
  if (priority === "critical") return "required";
  if (priority === "high") return "recommended";
  return "optional";
}

export function guidanceContext(item: GuidanceItem): string {
  const kind = inferGuidanceKind(item);
  switch (kind) {
    case "compliance":
      return "Required before you continue";
    case "competitor":
      return "Customer mentioned a competitor";
    case "objection":
      return "Customer mentioned pricing concerns";
    case "policy":
      return "Customer raised a billing issue";
    case "fix":
      return "Customer can't sign in";
    case "product":
      if (/after-hours|missed call/i.test(item.name)) {
        return "Customer described missed after-hours calls";
      }
      if (/salesforce/i.test(item.name)) return "Customer asked about Salesforce";
      if (/hubspot/i.test(item.name)) return "Customer asked about HubSpot";
      return "Customer asked a product question";
    default:
      return "Relevant to what was just said";
  }
}

/** One-line cue for why this card appeared — never a transcript quote. */
export function guidanceTriggerLabel(item: GuidanceItem): string {
  const name = item.name.toLowerCase();
  if (/refund/.test(name)) return "Customer mentioned duplicate charge";
  if (/card details|pci/.test(name)) return "Customer offered card details";
  if (/after-hours|missed call/.test(name)) return "After-hours missed calls";
  if (/pricing/.test(name)) return "Pricing concern";
  if (/salesforce/.test(name)) return "Salesforce question";
  if (/hubspot/.test(name)) return "HubSpot question";
  if (/aircall/.test(name)) return "Competitor mentioned";
  if (/login|lock|password/.test(name)) return "Login issue";
  return guidanceContext(item);
}

export function guidanceHandledLabel(item: GuidanceItem): string {
  const name = item.name.toLowerCase();
  if (/card details|pci/.test(name)) return "Card details warning covered";
  if (/refund/.test(name)) return "Refund eligibility explained";
  if (/after-hours|missed call/.test(name)) return "After-hours coverage explained";
  if (/pricing/.test(name)) return "Pricing concern handled";
  return `${item.name} covered`;
}

export function stanceLabel(stance: GuidanceStance): string {
  if (stance === "required") return "Required";
  if (stance === "recommended") return "Recommended";
  return "Optional";
}

export type GuidanceTemplateGroup = "when-it-comes-up" | "call-coverage";

export const GUIDANCE_TEMPLATE_GROUPS: {
  id: GuidanceTemplateGroup;
  label: string;
}[] = [
  { id: "when-it-comes-up", label: "When something comes up" },
  { id: "call-coverage", label: "Call coverage" },
];

export type GuidanceTemplateId =
  | "answer-question"
  | "handle-objection"
  | "competitor-comparison"
  | "troubleshoot"
  | "process-policy"
  | "discovery-missing"
  | "compliance-missing"
  | "required-question-missing"
  | "required-step-missing";

export interface GuidanceFieldPlaceholders {
  name: string;
  trigger: string;
  suggestedResponse: string;
  talkingPoint: string;
  testInput: string;
}

export interface GuidanceTemplateCatalogItem {
  id: GuidanceTemplateId;
  group: GuidanceTemplateGroup;
  name: string;
  description: string;
  placeholders: GuidanceFieldPlaceholders;
}

const DEFAULT_PLACEHOLDERS: GuidanceFieldPlaceholders = {
  name: "e.g. Competitor comparison — Aircall",
  trigger:
    "e.g. When a customer asks how JustCall compares with Aircall or mentions that they currently use Aircall.",
  suggestedResponse:
    "JustCall brings calling, messaging, CRM integrations, and AI-powered conversation tools together in one platform, helping teams manage more of the customer conversation from one place.",
  talkingPoint: "e.g. Native CRM integrations",
  testInput: "We're already using Aircall. Why should we move to JustCall?",
};

export const GUIDANCE_TEMPLATES: GuidanceTemplateCatalogItem[] = [
  {
    id: "answer-question",
    group: "when-it-comes-up",
    name: "Answer a question",
    description: "Give agents approved answers to common customer questions",
    placeholders: {
      name: "e.g. Do you integrate with HubSpot?",
      trigger:
        "e.g. When a customer asks whether JustCall works with HubSpot, or how calls and SMS sync to the CRM.",
      suggestedResponse:
        "Yes — JustCall has a native HubSpot integration. Calls, SMS, and voicemails log to the contact automatically.",
      talkingPoint: "e.g. Native HubSpot app",
      testInput: "Do you integrate with HubSpot? Will calls log automatically?",
    },
  },
  {
    id: "handle-objection",
    group: "when-it-comes-up",
    name: "Handle an objection",
    description: "Help agents respond when a customer raises an objection",
    placeholders: {
      name: "e.g. Pricing objection",
      trigger:
        "e.g. When a prospect says JustCall is expensive, asks for a discount, or compares plan pricing with another vendor.",
      suggestedResponse:
        "Pricing includes calling, messaging, CRM sync, and AI assistance in one place — so teams aren't stacking extra tools.",
      talkingPoint: "e.g. One platform vs. add-on costs",
      testInput: "That's more than we budgeted. Can you do anything on price?",
    },
  },
  {
    id: "competitor-comparison",
    group: "when-it-comes-up",
    name: "Competitor comparison",
    description: "Surface talking points when another product is mentioned",
    placeholders: {
      name: "e.g. Competitor comparison — Aircall",
      trigger:
        "e.g. When a customer asks how JustCall compares with Aircall or mentions that they currently use Aircall.",
      suggestedResponse:
        "JustCall brings calling, messaging, CRM integrations, and AI-powered conversation tools together in one platform.",
      talkingPoint: "e.g. Stay factual — don't disparage the other product",
      testInput: "We're already using Aircall. Why should we move to JustCall?",
    },
  },
  {
    id: "troubleshoot",
    group: "when-it-comes-up",
    name: "Troubleshoot an issue",
    description: "Guide agents through common customer problems",
    placeholders: {
      name: "e.g. Login troubleshooting",
      trigger:
        "e.g. When a customer cannot sign in, mentions a locked account, or asks to reset their password.",
      suggestedResponse:
        "I can help you get back in. I'll verify the email on the account and send a password reset.",
      talkingPoint: "e.g. Confirm the email on the account",
      testInput: "I can't log in — I think my account is locked.",
    },
  },
  {
    id: "process-policy",
    group: "when-it-comes-up",
    name: "Process or policy",
    description: "Remind agents about important steps or requirements",
    placeholders: {
      name: "e.g. Refund policy",
      trigger:
        "e.g. When a customer asks about a refund, a duplicate charge, or whether a payment can be reversed.",
      suggestedResponse:
        "Refunds are available within 14 days of the charge for unused subscription time. I can review the account and start that if it qualifies.",
      talkingPoint: "e.g. 14-day window for unused time",
      testInput: "I was charged twice last month. Can I get a refund?",
    },
  },
  {
    id: "discovery-missing",
    group: "call-coverage",
    name: "Discovery missing",
    description: "Prompt the agent to explore the customer's needs before moving on",
    placeholders: {
      name: "e.g. Qualify the current setup",
      trigger:
        "e.g. When the agent starts pitching or proposing next steps before learning the customer's current setup and needs.",
      suggestedResponse:
        "Before I show a workflow — what does that cost you in a typical week? Missed leads, slow follow-up, or time the team spends chasing the same call?",
      talkingPoint: "e.g. Quantify before you pitch",
      testInput: "Let me walk you through how the product works.",
    },
  },
  {
    id: "compliance-missing",
    group: "call-coverage",
    name: "Compliance statement missing",
    description: "Remind the agent to cover a required disclosure",
    placeholders: {
      name: "e.g. Recording disclosure",
      trigger:
        "e.g. When a required disclosure hasn't been mentioned yet, such as that the call is being recorded.",
      suggestedResponse:
        "Before we continue — this call may be recorded for quality and training. Is it alright if we keep going?",
      talkingPoint: "e.g. State the disclosure before collecting details",
      testInput: "Can I get your account number to look this up?",
    },
  },
  {
    id: "required-question-missing",
    group: "call-coverage",
    name: "Required question missing",
    description: "Remind the agent to ask a question that must be covered",
    placeholders: {
      name: "e.g. Confirm account owner",
      trigger:
        "e.g. When a required qualifying question hasn't been asked yet.",
      suggestedResponse:
        "Before I make any changes — can you confirm you're the account owner, and the email on the account?",
      talkingPoint: "e.g. Verify identity before account changes",
      testInput: "I can update that for you right now.",
    },
  },
  {
    id: "required-step-missing",
    group: "call-coverage",
    name: "Required step missing",
    description: "Remind the agent to complete a required step in the workflow",
    placeholders: {
      name: "e.g. Confirm next step before wrap",
      trigger:
        "e.g. When a required workflow step hasn't been covered yet, such as confirming the follow-up before ending the call.",
      suggestedResponse:
        "Before we wrap — let's lock the next step so nothing sits. I'll send the summary and we'll confirm a time with ops.",
      talkingPoint: "e.g. Don't end without an agreed next step",
      testInput: "Alright, I think that's everything.",
    },
  },
];

export function guidanceTemplatesInGroup(
  group: GuidanceTemplateGroup
): GuidanceTemplateCatalogItem[] {
  return GUIDANCE_TEMPLATES.filter((template) => template.group === group);
}

const GUIDANCE_TEMPLATE_STARTERS: Record<
  GuidanceTemplateId,
  Pick<
    GuidanceItem,
    "name" | "trigger" | "examplePhrases" | "suggestedResponse" | "talkingPoints" | "triggeredBy"
  >
> = {
  "answer-question": {
    name: "",
    trigger:
      "When a customer asks a recurring question that should get the same approved answer every time.",
    examplePhrases: [
      "How does this work?",
      "Do you support this?",
      "Can you tell me if this is possible?",
    ],
    suggestedResponse:
      "Yes — we support that. Here's the approved wording, and I can walk you through how it works for your team.",
    talkingPoints: [
      "Lead with the approved answer",
      "Add one relevant example",
      "Offer to send a help article",
    ],
  },
  "handle-objection": {
    name: "",
    trigger:
      "When a prospect raises a concern about price, value, or whether the product is a good fit.",
    examplePhrases: [
      "That's more than we budgeted.",
      "Can you do anything on price?",
      "I'm not sure this is the right fit.",
    ],
    suggestedResponse:
      "I hear you. Pricing includes calling, messaging, and AI assistance in one place — so teams aren't stacking extra tools. I can walk through the plan that matches how you actually use the phone.",
    talkingPoints: [
      "Acknowledge the concern first",
      "Reframe around value, not discount",
      "Match the plan to their usage",
    ],
  },
  "competitor-comparison": {
    name: "",
    trigger:
      "When a customer mentions another product or asks how JustCall compares.",
    examplePhrases: [
      "How are you different from Aircall?",
      "We currently use another provider.",
      "Why should we switch?",
    ],
    suggestedResponse:
      "JustCall brings calling, messaging, CRM integrations, and AI-powered conversation tools together in one platform, helping teams manage more of the customer conversation from one place.",
    talkingPoints: [
      "Stay factual — don't disparage the other product",
      "Lead with the difference that matters to this customer",
      "Offer a battlecard or comparison page",
    ],
  },
  troubleshoot: {
    name: "",
    trigger:
      "When a customer reports a problem, can't complete a task, or asks how to fix something that's broken.",
    examplePhrases: [
      "This isn't working.",
      "I can't get this to complete.",
      "Something broke this morning.",
    ],
    suggestedResponse:
      "I can help you get this working. I'll confirm a couple of details first so we fix the right thing.",
    talkingPoints: [
      "Confirm the symptom and when it started",
      "Check the most common cause first",
      "Fix, workaround, or escalate",
    ],
  },
  "process-policy": {
    name: "",
    trigger:
      "When a customer asks about a policy, a required step, or how a process works.",
    examplePhrases: [
      "What's the policy on this?",
      "What do you need from me to proceed?",
      "How long does this usually take?",
    ],
    suggestedResponse:
      "Here's how this works, and what I need from you to complete it.",
    talkingPoints: [
      "State the rule clearly",
      "List required information or steps",
      "Set expectations for timing",
    ],
  },
  "discovery-missing": {
    name: "Discovery missing",
    trigger:
      "When the agent starts pitching or proposing next steps before learning the customer's current setup and needs.",
    examplePhrases: [
      "Let me walk you through how the product works.",
      "I can show you the plans we have.",
      "The next step is a demo.",
    ],
    suggestedResponse:
      "Before I show a workflow — what does that cost you in a typical week? Missed leads, slow follow-up, or time the team spends chasing the same call?",
    talkingPoints: [
      "Quantify before you pitch",
      "Ask for a number — leads, hours, or revenue",
      "Get who else feels it on the record",
    ],
    triggeredBy: "agent",
  },
  "compliance-missing": {
    name: "Compliance statement missing",
    trigger:
      "When a required disclosure hasn't been mentioned yet — for example, that the call is being recorded, or that card details shouldn't be spoken aloud.",
    examplePhrases: [
      "Can I get your account number?",
      "I'll take payment on this call.",
      "Let me pull up the account.",
    ],
    suggestedResponse:
      "Before we continue — this call may be recorded for quality and training. Is it alright if we keep going?",
    talkingPoints: [
      "State the disclosure before collecting details",
      "Don't skip it even on a follow-up call",
      "If details were already spoken, don't repeat them back",
    ],
    triggeredBy: "agent",
  },
  "required-question-missing": {
    name: "Required question missing",
    trigger:
      "When a required qualifying question hasn't been asked yet — for example, confirming the caller is the account owner before making changes.",
    examplePhrases: [
      "I can update that for you right now.",
      "Let me change the number on the account.",
      "I'll go ahead and process that.",
    ],
    suggestedResponse:
      "Before I make any changes — can you confirm you're the account owner, and the email on the account?",
    talkingPoints: [
      "Verify identity before account changes",
      "Ask the required question in your own words",
      "Don't proceed until you have the answer",
    ],
    triggeredBy: "agent",
  },
  "required-step-missing": {
    name: "Required step missing",
    trigger:
      "When a required workflow step hasn't been covered yet — for example, confirming the follow-up before ending the call.",
    examplePhrases: [
      "Alright, I think that's everything.",
      "I'll let you get back to it.",
      "Sounds like we're all set.",
    ],
    suggestedResponse:
      "Before we wrap — let's lock the next step so nothing sits. I'll send the summary and we'll confirm a time with ops.",
    talkingPoints: [
      "Don't end without an agreed next step",
      "Confirm owner, time, and what success looks like",
      "Send the recap while the conversation is fresh",
    ],
    triggeredBy: "agent",
  },
};

export function createEmptyGuidance(): GuidanceItem {
  return {
    id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    trigger: "",
    examplePhrases: [],
    triggeredBy: "either",
    suggestedResponse: "",
    talkingPoints: [],
    resources: [],
    teamMembers: [],
    userGroups: [],
    status: "draft",
    updated: "Just now",
  };
}

export function createGuidanceFromTemplate(
  templateId: GuidanceTemplateId
): GuidanceItem {
  return {
    ...createEmptyGuidance(),
    ...GUIDANCE_TEMPLATE_STARTERS[templateId],
  };
}

/**
 * Generate from Knowledge Base — the admin picks a source they already
 * uploaded and AI proposes the strategic pieces: a trigger, wording, and
 * points. Nothing publishes until the admin reviews it.
 */
export function proposeGuidanceFromKnowledge(
  entries: { title: string; answer: string; cues: string[] }[],
  sourceName: string
): GuidanceItem[] {
  return entries.slice(0, 4).map((entry) => {
    const subject = entry.title.replace(/^JustCall (vs|and) /i, "").trim();
    return {
      ...createEmptyGuidance(),
      name: entry.title,
      // Subject is kept verbatim — lowercasing would mangle product names.
      trigger: `When the customer asks about ${subject}, or raises it as a concern during the call.`,
      examplePhrases: entry.cues.slice(0, 4).map(sentenceCase),
      suggestedResponse: entry.answer,
      talkingPoints: talkingPointsFromAnswer(entry.answer),
      resources: [
        {
          id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "link" as const,
          name: `${sourceName} — ${entry.title}`,
        },
      ],
      status: "draft" as const,
    };
  });
}

function sentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const cased = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.?!]$/.test(cased) ? cased : `${cased}?`;
}

/** Split an approved answer into scannable points without inventing facts. */
function talkingPointsFromAnswer(answer: string): string[] {
  return answer
    .split(/(?<=[.!?])\s+/)
    .flatMap((sentence) => sentence.split(/,\s+(?=and\b|with\b)/))
    .map((part) => part.replace(/^and\s+/i, "").replace(/[.]$/, "").trim())
    .filter((part) => part.length > 12)
    .slice(0, 3);
}

export function placeholdersForGuidance(
  templateId?: GuidanceTemplateId | null
): GuidanceFieldPlaceholders {
  if (!templateId) return DEFAULT_PLACEHOLDERS;
  return (
    GUIDANCE_TEMPLATES.find((item) => item.id === templateId)?.placeholders ??
    DEFAULT_PLACEHOLDERS
  );
}

export function labelForOption(
  options: DropdownListItem[],
  value: string
): string {
  const match = options.find(
    (item) => (!item.type || item.type === "option") && item.value === value
  );
  return match && (!match.type || match.type === "option") ? match.label : value;
}

export function guidanceAssignees(item: GuidanceItem): {
  id: string;
  name: string;
  kind: "member" | "group";
}[] {
  const groups = USER_GROUPS.filter(
    (option) =>
      (!option.type || option.type === "option") &&
      item.userGroups.includes(option.value)
  ).map((option) => ({
    id: option.value,
    name: option.label,
    kind: "group" as const,
  }));
  const members = TEAM_MEMBERS.filter(
    (option) =>
      (!option.type || option.type === "option") &&
      item.teamMembers.includes(option.value)
  ).map((option) => ({
    id: option.value,
    name: option.label,
    kind: "member" as const,
  }));
  return [...groups, ...members];
}

export function formatAssignment(item: GuidanceItem): string {
  const people = guidanceAssignees(item);
  if (people.length === 0) return "Unassigned";
  return people.map((person) => person.name).join(", ");
}

export function customerLineForGuidance(item: GuidanceItem): string {
  if (item.examplePhrases[0]) return item.examplePhrases[0];
  switch (item.id) {
    case "g-aircall":
      return "We're already using Aircall. What's actually different about you?";
    case "g-after-hours":
      return "After-hours calls go to voicemail. Follow-up is whoever happens to pick it up.";
    case "g-status-quo":
      return "We're pretty happy with Aircall. Not sure why we'd switch.";
    case "g-discovery":
      return "After-hours calls go to voicemail. Nobody owns the lead.";
    case "g-refund":
      return "I was charged twice last month. Can I get a refund?";
    case "g-pricing":
      return "That's more than we budgeted. Can you do anything on price?";
    case "g-salesforce":
      return "Does this integrate with Salesforce?";
    case "g-pci":
      return "I'll read you my card number so you can refund it.";
    case "g-hubspot":
      return "Do you integrate with HubSpot? Will calls log automatically?";
    case "g-login":
      return "I can't log in — I think my account is locked.";
    case "g-cancel":
      return "I want to cancel my account. What happens to our numbers?";
    default:
      return item.trigger || "Can you help me with this?";
  }
}
