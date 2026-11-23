import type { DropdownListItem } from "@/components/Dropdown";

/**
 * Knowledge — what AI is allowed to read. There is one JustCall knowledge
 * base, shared: a published KB serves whoever is assigned to it, human agent
 * or voice agent, so admins keep one place to maintain answers rather than a
 * copy per product.
 *
 * Nobody writes a trigger. Retrieval happens against whatever is published and
 * assigned, so a routine question like "does this work with Salesforce?" never
 * needs a Guidance rule behind it.
 */

export type KnowledgeSourceKind =
  | "justcall-kb"
  | "pdf"
  | "doc"
  | "csv"
  | "faq"
  | "help-center"
  | "website"
  | "internal";

export interface KnowledgeSourceKindMeta {
  id: KnowledgeSourceKind;
  label: string;
  description: string;
  /** What the admin supplies — a file, a URL, or nothing at all. */
  input: "file" | "url" | "none";
  originPlaceholder?: string;
}

export const KNOWLEDGE_SOURCE_KINDS: KnowledgeSourceKindMeta[] = [
  {
    id: "justcall-kb",
    label: "JustCall FAQs",
    description: "Start from the FAQs your team already publishes in JustCall.",
    input: "none",
  },
  {
    id: "help-center",
    label: "Help center URL",
    description: "Crawl a public help center and keep it in sync.",
    input: "url",
    originPlaceholder: "https://help.yourcompany.com",
  },
  {
    id: "website",
    label: "Website",
    description: "Pull product, pricing, and policy pages from your site.",
    input: "url",
    originPlaceholder: "https://yourcompany.com/pricing",
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Battlecards, policy documents, one-pagers.",
    input: "file",
    originPlaceholder: "Competitive Battlecards.pdf",
  },
  {
    id: "doc",
    label: "DOC / DOCX",
    description: "Word documents your team already maintains.",
    input: "file",
    originPlaceholder: "Onboarding runbook.docx",
  },
  {
    id: "csv",
    label: "CSV",
    description: "A spreadsheet of questions and approved answers.",
    input: "file",
    originPlaceholder: "support-faqs.csv",
  },
  {
    id: "faq",
    label: "Manual Q&A",
    description: "Type or paste question and answer pairs.",
    input: "none",
  },
  {
    id: "internal",
    label: "Internal documentation",
    description: "Notion, Confluence, or a shared drive folder.",
    input: "url",
    originPlaceholder: "https://notion.so/team/support-wiki",
  },
];

export function knowledgeKindMeta(kind: KnowledgeSourceKind): KnowledgeSourceKindMeta {
  return (
    KNOWLEDGE_SOURCE_KINDS.find((item) => item.id === kind) ??
    KNOWLEDGE_SOURCE_KINDS[0]!
  );
}

/** Glyph on a scannable fact — mapped in the in-call card. */
export type KnowledgePointKind =
  | "calendar"
  | "clock"
  | "link"
  | "trash"
  | "check"
  | "phone"
  | "message"
  | "file"
  | "integrations"
  | "hours"
  | "logs";

/** One fact the agent can scan as a single line during a call. */
export interface KnowledgePoint {
  heading: string;
  kind?: KnowledgePointKind;
}

/** One retrievable answer inside a source. */
export interface KnowledgeEntry {
  id: string;
  title: string;
  /** Two sentences at most — this is what lands in the in-call card. */
  answer: string;
  /** Phrases a customer might actually say. Feeds retrieval, not triggers. */
  cues: string[];
  /** Deep link the agent can open when they want the original. */
  sourceUrl?: string;
  /**
   * What that link is called. The card names the page the answer came from —
   * not the knowledge base it sits in, which the agent already knows, and not
   * the raw URL, which reads as debug output.
   */
  sourceTitle?: string;
  /** Lead line above the facts. Optional — the title already orients. */
  summary?: string;
  /** Scannable facts. When omitted, the card shows `answer` as a paragraph. */
  points?: KnowledgePoint[];
}

/** Facts the in-call card should render — authored points win. */
export function knowledgeFacts(entry: KnowledgeEntry): {
  summary: string | null;
  points: KnowledgePoint[];
} {
  const summary = entry.summary?.trim() || null;
  if (entry.points && entry.points.length > 0) {
    return { summary, points: entry.points };
  }
  return { summary, points: [] };
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

/**
 * What a knowledge base is made of. One KB is a bucket, not a single import:
 * an admin can point it at web pages, paste text, type Q&A pairs, and upload
 * files, and AI reads all of it. Connected apps live at the account, not
 * inside a knowledge base. Each kind carries its own ceiling.
 */
export type KnowledgeContentTab = "web" | "text" | "qa" | "files";

export interface KnowledgeWebPage {
  id: string;
  url: string;
}

/** A question the team wants answered a particular way. */
export interface KnowledgeQaPair {
  id: string;
  question: string;
  answer: string;
}

export interface KnowledgeFileRef {
  id: string;
  name: string;
  typeLabel: string;
  sizeLabel: string;
}

/**
 * A connected source. The app is connected once for the account. Knowledge
 * from it can feed every knowledge base; customer context is shared, and
 * Agent Assist resolves it for the person currently on the call.
 */
export interface KnowledgeIntegrationRef {
  id: string;
  /** Catalog id of the connected app. */
  provider: string;
  /** Short summary of what this KB is using, e.g. "Knowledge articles". */
  scope: string;
  usesKnowledge: boolean;
  usesCustomerContext: boolean;
  customerObjects: CustomerContextObjectId[];
  customerFields: string[];
}

/** What a connected app can power — not what kind of product it is. */
export type SourceCapability = "knowledge" | "customerContext";

export type CustomerContextObjectId =
  | "contacts"
  | "companies"
  | "deals"
  | "tickets"
  | "customProperties";

export interface CustomerContextObjectMeta {
  id: CustomerContextObjectId;
  label: string;
  description: string;
}

export const CUSTOMER_CONTEXT_OBJECTS: CustomerContextObjectMeta[] = [
  {
    id: "contacts",
    label: "Contacts",
    description: "The person on the call — name, email, and contact properties.",
  },
  {
    id: "companies",
    label: "Companies",
    description: "The account they belong to, including plan and owner.",
  },
  {
    id: "deals",
    label: "Deals",
    description: "Open opportunities, stage, amount, and renewal.",
  },
  {
    id: "tickets",
    label: "Tickets",
    description: "Open and recent support tickets tied to this customer.",
  },
  {
    id: "customProperties",
    label: "Custom properties",
    description: "Extra CRM fields you choose for Agent Assist to read.",
  },
];

export const ALL_CUSTOMER_CONTEXT_OBJECT_IDS: CustomerContextObjectId[] =
  CUSTOMER_CONTEXT_OBJECTS.map((item) => item.id);

export interface CustomerContextFieldMeta {
  id: string;
  label: string;
  group: "Contact" | "Company" | "Deal";
}

/** Fields an admin can allow Agent Assist to read from customer context. */
export const CUSTOMER_CONTEXT_FIELDS: CustomerContextFieldMeta[] = [
  { id: "customer-since", label: "Customer since", group: "Contact" },
  { id: "plan", label: "Plan", group: "Contact" },
  { id: "lifecycle-stage", label: "Lifecycle stage", group: "Contact" },
  { id: "account-owner", label: "Account owner", group: "Company" },
  { id: "deal-stage", label: "Deal stage", group: "Deal" },
  { id: "deal-amount", label: "Deal amount", group: "Deal" },
  { id: "renewal-date", label: "Renewal date", group: "Deal" },
  { id: "existing-discount", label: "Existing discount", group: "Deal" },
];

export const ALL_CUSTOMER_CONTEXT_FIELD_IDS: string[] =
  CUSTOMER_CONTEXT_FIELDS.map((item) => item.id);

export const SOURCE_CAPABILITY_LABEL: Record<SourceCapability, string> = {
  knowledge: "Knowledge",
  customerContext: "Customer context",
};

export interface KnowledgeIntegrationMeta {
  id: string;
  label: string;
  capabilities: SourceCapability[];
  /** Knowledge/help-center content this source can sync. */
  knowledgeLabel: string;
  /** One line on what connecting this gives AI. */
  detail: string;
}

const CRM_CAPABILITIES: SourceCapability[] = ["knowledge", "customerContext"];
const KNOWLEDGE_ONLY: SourceCapability[] = ["knowledge"];

/** Apps that can feed knowledge and, for CRMs, live customer context. */
export const KNOWLEDGE_INTEGRATIONS: KnowledgeIntegrationMeta[] = [
  {
    id: "hubspot",
    label: "HubSpot",
    capabilities: CRM_CAPABILITIES,
    knowledgeLabel: "Knowledge articles",
    detail:
      "Use knowledge articles, contacts, companies, deals, tickets, and CRM properties.",
  },
  {
    id: "salesforce",
    label: "Salesforce",
    capabilities: CRM_CAPABILITIES,
    knowledgeLabel: "Salesforce knowledge",
    detail:
      "Use Salesforce knowledge and CRM records to personalize AI assistance.",
  },
  {
    id: "zendesk",
    label: "Zendesk",
    capabilities: CRM_CAPABILITIES,
    knowledgeLabel: "Help center",
    detail: "Use help center content, customer details, and support tickets.",
  },
  {
    id: "notion",
    label: "Notion",
    capabilities: KNOWLEDGE_ONLY,
    knowledgeLabel: "Selected pages",
    detail: "Use selected pages and databases as company knowledge.",
  },
  {
    id: "google-drive",
    label: "Google Drive",
    capabilities: KNOWLEDGE_ONLY,
    knowledgeLabel: "Documents and sheets",
    detail: "Use selected documents and sheets as company knowledge.",
  },
  {
    id: "zoho",
    label: "Zoho CRM",
    capabilities: CRM_CAPABILITIES,
    knowledgeLabel: "Solutions",
    detail: "Use Zoho knowledge and CRM records to personalize AI assistance.",
  },
  {
    id: "intercom",
    label: "Intercom",
    capabilities: CRM_CAPABILITIES,
    knowledgeLabel: "Articles",
    detail: "Use articles, customer details, and conversations.",
  },
  {
    id: "freshdesk",
    label: "Freshdesk",
    capabilities: CRM_CAPABILITIES,
    knowledgeLabel: "Solution articles",
    detail: "Use solution articles, customer details, and support tickets.",
  },
  {
    id: "confluence",
    label: "Confluence",
    capabilities: KNOWLEDGE_ONLY,
    knowledgeLabel: "Spaces",
    detail: "Use selected spaces and pages as company knowledge.",
  },
  {
    id: "sharepoint",
    label: "SharePoint",
    capabilities: KNOWLEDGE_ONLY,
    knowledgeLabel: "Document library",
    detail: "Use selected document libraries as company knowledge.",
  },
];

/**
 * Connected once for the account. Knowledge bases can answer from these
 * without each one connecting them again.
 */
export const SEED_CONNECTED_SOURCES: KnowledgeIntegrationRef[] = [
  {
    id: "ki-support-zendesk",
    provider: "zendesk",
    scope: "Help center · Contacts, Tickets",
    usesKnowledge: true,
    usesCustomerContext: true,
    customerObjects: ["contacts", "tickets", "customProperties"],
    customerFields: ALL_CUSTOMER_CONTEXT_FIELD_IDS,
  },
  {
    id: "ki-support-salesforce",
    provider: "salesforce",
    scope: "Salesforce knowledge · Contacts, Companies, Deals",
    usesKnowledge: true,
    usesCustomerContext: true,
    customerObjects: ALL_CUSTOMER_CONTEXT_OBJECT_IDS,
    customerFields: ALL_CUSTOMER_CONTEXT_FIELD_IDS,
  },
];

export function knowledgeIntegrationMeta(
  provider: string
): KnowledgeIntegrationMeta | undefined {
  return KNOWLEDGE_INTEGRATIONS.find((item) => item.id === provider);
}

export function knowledgeIntegrationLabel(ref: KnowledgeIntegrationRef): string {
  return knowledgeIntegrationMeta(ref.provider)?.label ?? ref.provider;
}

export function sourceHasCustomerContext(app: KnowledgeIntegrationMeta): boolean {
  return app.capabilities.includes("customerContext");
}

export function knowledgeIntegrationScope(input: {
  app: KnowledgeIntegrationMeta;
  usesKnowledge: boolean;
  usesCustomerContext: boolean;
  customerObjects: CustomerContextObjectId[];
}): string {
  const parts: string[] = [];
  if (input.usesKnowledge) parts.push(input.app.knowledgeLabel);
  if (input.usesCustomerContext) {
    const labels = input.customerObjects
      .map(
        (id) => CUSTOMER_CONTEXT_OBJECTS.find((item) => item.id === id)?.label
      )
      .filter(Boolean);
    parts.push(labels.length ? labels.join(", ") : "Customer context");
  }
  return parts.join(" · ");
}

export function knowledgeConnectionCapabilityLabel(
  item: KnowledgeIntegrationRef
): string {
  const app = knowledgeIntegrationMeta(item.provider);
  const parts: string[] = [];
  if (item.usesKnowledge) parts.push(app?.knowledgeLabel ?? "Knowledge");
  if (item.usesCustomerContext) parts.push("Customer context");
  return parts.join(" · ") || item.scope;
}

export const KNOWLEDGE_CONTENT_LIMITS = {
  webPages: 500,
  /** Text is budgeted in characters, not sources. */
  textChars: 40000,
  qaPairs: 500,
  files: 10,
} as const;

/** Account-wide connected apps, not a per-knowledge-base ceiling. */
export const CONNECTED_SOURCE_LIMIT = 10;

/** How many things AI has to read here — pasted text counts as one. */
export function knowledgeContentItemCount(source: KnowledgeSourceRecord): number {
  return (
    source.webPages.length +
    source.qaPairs.length +
    source.files.length +
    (source.text.trim() ? 1 : 0)
  );
}

/** Derived entries carry this prefix so re-saving replaces them in place. */
const QA_ENTRY_PREFIX = "ke-qa-";

/** Typed Q&A pairs are answers already — they need no extraction step. */
export function entriesFromQaPairs(pairs: KnowledgeQaPair[]): KnowledgeEntry[] {
  return pairs
    .filter((pair) => pair.question.trim() && pair.answer.trim())
    .map((pair) => {
      const question = pair.question.trim();
      return {
        id: `${QA_ENTRY_PREFIX}${pair.id}`,
        title: question.replace(/\?+$/, ""),
        answer: pair.answer.trim(),
        cues: [question.toLowerCase()],
      };
    });
}

/**
 * Everything AI can answer from here: the Q&A the team typed, plus whatever
 * ingestion pulled out of the web pages, text, and files. Authored answers come
 * first — when both cover a subject, the wording the team chose should win.
 */
export function knowledgeRetrievableEntries(
  source: KnowledgeSourceRecord
): KnowledgeEntry[] {
  return [...entriesFromQaPairs(source.qaPairs), ...source.entries];
}

/** What the table shows under the knowledge base name. */
export function knowledgeOriginFromContent(source: KnowledgeSourceRecord): string {
  if (source.webPages.length > 0) return source.webPages[0]!.url;
  if (source.files.length > 0) return source.files[0]!.name;
  if (source.qaPairs.length > 0) return "Typed Q&A";
  if (source.text.trim()) return "Pasted text";
  return "";
}

/**
 * A KB holds mixed content, so its `kind` is a description of what dominates
 * rather than a choice the admin makes up front.
 */
export function knowledgeKindFromContent(
  source: KnowledgeSourceRecord
): KnowledgeSourceKind {
  const file = source.files[0]?.name.toLowerCase() ?? "";
  if (/\.pdf$/.test(file)) return "pdf";
  if (/\.docx?$/.test(file)) return "doc";
  if (/\.csv$/.test(file)) return "csv";
  if (source.webPages.length > 0) {
    return /help|support|docs/.test(source.webPages[0]!.url.toLowerCase())
      ? "help-center"
      : "website";
  }
  if (source.qaPairs.length > 0 || source.text.trim()) return "faq";
  return source.kind;
}

export interface KnowledgeSourceRecord {
  id: string;
  name: string;
  kind: KnowledgeSourceKind;
  /** Filename or URL, depending on the kind. */
  origin: string;
  /** Admin-facing scratch note. Never read by AI. */
  note: string;
  /** Pages ingestion crawls. */
  webPages: KnowledgeWebPage[];
  /** Pasted knowledge, budgeted in characters. */
  text: string;
  /** Answers the team wrote themselves. */
  qaPairs: KnowledgeQaPair[];
  files: KnowledgeFileRef[];
  /**
   * Who this KB serves. The three lists are additive rather than exclusive —
   * a KB can be assigned to a couple of user groups, one extra person, and a
   * voice agent at once. No people picked at all means every agent.
   */
  audienceTeams: string[];
  audienceUsers: string[];
  audienceVoiceAgents: string[];
  /** `failed` means ingestion could not read the source — retrain to retry. */
  status: "live" | "draft" | "failed";
  updated: string;
  entries: KnowledgeEntry[];
}

export const KNOWLEDGE_TEAMS: DropdownListItem[] = [
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "success", label: "Customer Success" },
  { value: "billing", label: "Billing" },
  { value: "ops", label: "Operations" },
];

/** Voice agents configured on the account — assignable, same as people. */
export const KNOWLEDGE_VOICE_AGENTS: DropdownListItem[] = [
  { value: "va-inbound-support", label: "Inbound Support Agent" },
  { value: "va-after-hours", label: "After-hours Agent" },
  { value: "va-lead-qualifier", label: "Lead Qualifier" },
  { value: "va-billing", label: "Billing Concierge" },
];

export const KNOWLEDGE_USERS: DropdownListItem[] = [
  { value: "olivia", label: "Olivia Rhye" },
  { value: "phoenix", label: "Phoenix Baker" },
  { value: "lana", label: "Lana Steiner" },
  { value: "demi", label: "Demi Wilkinson" },
  { value: "candice", label: "Candice Wu" },
  { value: "natali", label: "Natali Craig" },
  { value: "drew", label: "Drew Cano" },
];

export const SEED_KNOWLEDGE_SOURCES: KnowledgeSourceRecord[] = [
  {
    id: "ks-product-kb",
    name: "JustCall product knowledge base",
    kind: "justcall-kb",
    origin: "help.justcall.io",
    note: "Public help centre. Anything customer-facing lives here first.",
    webPages: [
      { id: "kw-jc-integrations", url: "https://help.justcall.io/integrations" },
      { id: "kw-jc-recordings", url: "https://help.justcall.io/recording-retention" },
      { id: "kw-jc-porting", url: "https://help.justcall.io/porting" },
      { id: "kw-jc-after-hours", url: "https://help.justcall.io/after-hours" },
    ],
    text: "",
    qaPairs: [],
    files: [],
    audienceTeams: [],
    audienceUsers: [],
    audienceVoiceAgents: ["va-inbound-support", "va-after-hours"],
    status: "live",
    updated: "Yesterday",
    entries: [
      {
        id: "ke-salesforce",
        title: "Salesforce integration",
        answer:
          "JustCall supports Salesforce for call logging, activity syncing, and click-to-call from the record. Calls, SMS, and voicemails attach to the contact automatically.",
        summary:
          "JustCall supports Salesforce for call logging, activity syncing, and click-to-call from the record.",
        points: [
          {
            kind: "integrations",
            heading: "Call, SMS, and voicemail logging",
          },
          {
            kind: "phone",
            heading: "Click-to-call from the record",
          },
        ],
        cues: [
          "does justcall integrate with salesforce",
          "will calls log in salesforce",
          "do you have a salesforce app",
          "salesforce sync",
        ],
        sourceUrl: "https://help.justcall.io/salesforce",
        sourceTitle: "Salesforce integration setup",
      },
      {
        id: "ke-recording-retention",
        title: "Call recording retention",
        answer:
          "Recordings are retained for 12 months on standard plans and can be extended to 24 months on request. Individual recordings can be deleted at any time from the call log.",
        summary:
          "Recordings are retained to help your team stay compliant, review conversations, and improve customer outcomes.",
        points: [
          {
            kind: "calendar",
            heading: "12 months on standard plans",
          },
          {
            kind: "link",
            heading: "Extend to 24 months on request",
          },
          {
            kind: "trash",
            heading: "Delete individual recordings anytime",
          },
        ],
        cues: [
          "how long are recordings retained",
          "how long do you keep recordings",
          "recording retention",
          "storage of call recordings",
        ],
        sourceUrl: "https://help.justcall.io/recording-retention",
        sourceTitle: "Recording storage and retention",
      },
      {
        id: "ke-porting",
        title: "Number porting",
        answer:
          "JustCall supports porting existing numbers in most regions. Local numbers usually take 5–10 business days and toll-free numbers 10–15, with no downtime during the switch.",
        summary: "JustCall supports porting existing numbers in most regions.",
        points: [
          {
            kind: "phone",
            heading: "Local numbers: 5–10 business days",
          },
          {
            kind: "clock",
            heading: "Toll-free: 10–15 business days",
          },
        ],
        cues: [
          "does justcall support number porting",
          "can we keep our numbers",
          "port our existing numbers",
          "how long does porting take",
        ],
        sourceUrl: "https://help.justcall.io/porting",
        sourceTitle: "Porting your existing numbers",
      },
      {
        id: "ke-zoho-recruit",
        title: "Zoho Recruit support",
        answer:
          "Zoho Recruit is supported through the JustCall Zoho integration for click-to-call and activity logging against candidate records.",
        summary:
          "Zoho Recruit is supported through the JustCall Zoho integration.",
        points: [
          {
            kind: "phone",
            heading: "Click-to-call from candidate records",
          },
          {
            kind: "check",
            heading: "Activity logging",
          },
        ],
        cues: [
          "is zoho recruit supported",
          "does it work with zoho",
          "zoho recruit integration",
        ],
        sourceUrl: "https://help.justcall.io/zoho",
        sourceTitle: "Zoho integration setup",
      },
      {
        id: "ke-after-hours-routing",
        title: "After-hours call routing",
        answer:
          "Incoming calls outside business hours can route to an on-call user, a shared queue, or trigger a missed-call SMS so the lead hears back the same night.",
        summary:
          "Incoming calls outside business hours can still reach someone — or trigger a follow-up.",
        points: [
          {
            kind: "hours",
            heading: "Route to on-call or a shared queue",
          },
          {
            kind: "message",
            heading: "Missed-call SMS the same night",
          },
        ],
        cues: [
          "after hours calls go to voicemail",
          "what happens outside business hours",
          "missed call text",
          "on call routing",
        ],
        sourceUrl: "https://help.justcall.io/after-hours",
        sourceTitle: "After-hours routing rules",
      },
      {
        id: "ke-sms-compliance",
        title: "SMS consent and opt-out",
        answer:
          "Outbound SMS campaigns require prior consent, and opt-out keywords are honoured automatically across every number on the account.",
        summary:
          "Outbound SMS campaigns require prior consent. Opt-outs are honoured automatically.",
        points: [
          {
            kind: "check",
            heading: "Prior consent is required",
          },
          {
            kind: "message",
            heading: "Opt-out keywords are automatic",
          },
        ],
        cues: [
          "sms compliance",
          "do we need consent for texts",
          "opt out handling",
          "10dlc registration",
        ],
        sourceUrl: "https://help.justcall.io/sms-compliance",
        sourceTitle: "SMS consent and opt-out rules",
      },
    ],
  },
  {
    id: "ks-battlecards",
    name: "Sales competitive knowledge",
    kind: "pdf",
    origin: "Competitive Battlecards.pdf",
    note: "Reviewed with Sales each quarter — check pricing lines before a demo.",
    webPages: [],
    text:
      "Positioning: JustCall wins on bundled calling, messaging, and in-call AI on one plan. " +
      "Lead with workflow depth (dialer, SMS campaigns, CRM-native logging) rather than seat price. " +
      "Never quote a discount on the first call — route pricing pushback to the AE.",
    qaPairs: [],
    files: [
      {
        id: "kf-battlecards",
        name: "Competitive Battlecards.pdf",
        typeLabel: "PDF",
        sizeLabel: "1.8 MB",
      },
    ],
    audienceTeams: ["sales"],
    audienceUsers: [],
    audienceVoiceAgents: [],
    status: "live",
    updated: "3 days ago",
    entries: [
      {
        id: "ke-aircall-overview",
        title: "JustCall vs Aircall",
        answer:
          "Aircall covers voice well but charges separately for SMS and has no in-call AI assistance. JustCall bundles calling, messaging, CRM sync, and agent assist on one plan.",
        summary:
          "Aircall covers voice well; JustCall bundles calling, messaging, CRM sync, and agent assist.",
        points: [
          {
            kind: "message",
            heading: "SMS is included, not an add-on",
          },
          {
            kind: "check",
            heading: "In-call AI assistance",
          },
        ],
        cues: [
          "how are you different from aircall",
          "we currently use aircall",
          "aircall comparison",
          "why switch from aircall",
        ],
      },
      {
        id: "ke-dialpad-overview",
        title: "JustCall vs Dialpad",
        answer:
          "Dialpad leads with meetings; JustCall leads with outbound and support workflows — dialer, SMS campaigns, and CRM-native logging.",
        summary:
          "Dialpad leads with meetings; JustCall leads with outbound and support workflows.",
        points: [
          {
            kind: "phone",
            heading: "Dialer and SMS campaigns",
          },
          {
            kind: "integrations",
            heading: "CRM-native logging",
          },
        ],
        cues: ["how do you compare to dialpad", "we looked at dialpad", "dialpad"],
      },
      {
        id: "ke-seat-pricing",
        title: "Seat-based pricing model",
        answer:
          "Plans are priced per seat with calling and messaging included. Annual billing carries a discount, and usage-based numbers are billed separately.",
        summary: "Plans are priced per seat with calling and messaging included.",
        points: [
          {
            kind: "check",
            heading: "Calling and messaging included",
          },
          {
            kind: "calendar",
            heading: "Annual billing discount",
          },
        ],
        cues: [
          "how does pricing work",
          "what does a seat cost",
          "annual discount",
          "is there a setup fee",
        ],
      },
    ],
  },
  {
    id: "ks-support-macros",
    name: "Support macros and policies",
    kind: "csv",
    origin: "support-macros.csv",
    note: "",
    webPages: [],
    text: "",
    // Typed by the team, so the wording is theirs — these sit alongside what
    // ingestion pulled out of the CSV rather than repeating it.
    qaPairs: [
      {
        id: "kq-update-card",
        question: "How do I update the card on file?",
        answer:
          "Billing owners can change the card under Settings → Billing. The new card is charged from the next cycle, and any failed charge retries within 24 hours.",
      },
      {
        id: "kq-invoice-copy",
        question: "Can you send me a copy of my invoice?",
        answer:
          "Every invoice is downloadable under Settings → Billing → Invoices, and an agent can email a copy to the billing contact on the account.",
      },
    ],
    files: [
      {
        id: "kf-support-macros",
        name: "support-macros.csv",
        typeLabel: "CSV",
        sizeLabel: "112 KB",
      },
    ],
    audienceTeams: ["support", "billing"],
    audienceUsers: [],
    audienceVoiceAgents: ["va-billing"],
    status: "live",
    updated: "1 week ago",
    entries: [
      {
        id: "ke-refund-window",
        title: "Refund window",
        answer:
          "Refunds are available within 14 days of the charge for unused subscription time, and process back to the original payment method in 5–7 business days.",
        summary:
          "Refunds are available within 14 days of the charge for unused subscription time.",
        points: [
          {
            kind: "calendar",
            heading: "14-day window",
          },
          {
            kind: "clock",
            heading: "5–7 business days to process",
          },
        ],
        cues: [
          "can i get a refund",
          "i was charged twice",
          "how do refunds work",
          "duplicate charge",
        ],
      },
      {
        id: "ke-account-lockout",
        title: "Account lockout",
        answer:
          "Accounts lock after five failed sign-in attempts and unlock automatically after 15 minutes. An agent can also unlock after verifying the email on file.",
        summary:
          "Accounts lock after five failed sign-in attempts and unlock automatically after 15 minutes.",
        points: [
          {
            kind: "clock",
            heading: "Unlocks after 15 minutes",
          },
          {
            kind: "check",
            heading: "Agent can unlock sooner",
          },
        ],
        cues: [
          "my account is locked",
          "i cant log in",
          "too many attempts",
          "reset my password",
        ],
      },
    ],
  },
  {
    id: "ks-security-review",
    name: "Security and compliance pack",
    kind: "doc",
    origin: "Security overview.docx",
    note: "Draft — legal still has the data residency wording.",
    webPages: [],
    text: "",
    qaPairs: [],
    files: [
      {
        id: "kf-security-overview",
        name: "Security overview.docx",
        typeLabel: "DOCX",
        sizeLabel: "640 KB",
      },
    ],
    audienceTeams: ["sales", "success"],
    audienceUsers: [],
    audienceVoiceAgents: ["va-lead-qualifier"],
    status: "draft",
    updated: "Just now",
    entries: [
      {
        id: "ke-soc2",
        title: "SOC 2 and data residency",
        answer:
          "JustCall is SOC 2 Type II audited annually, with EU data residency available on enterprise plans.",
        summary:
          "JustCall is SOC 2 Type II audited annually, with EU data residency on enterprise plans.",
        points: [
          {
            kind: "check",
            heading: "SOC 2 Type II, audited annually",
          },
          {
            kind: "file",
            heading: "EU data residency on enterprise",
          },
        ],
        cues: ["are you soc 2", "where is our data stored", "data residency"],
      },
    ],
  },
  {
    id: "ks-partner-portal",
    name: "Partner portal help center",
    kind: "help-center",
    origin: "https://partners.justcall.io/help",
    note: "",
    webPages: [
      { id: "kw-partner-help", url: "https://partners.justcall.io/help" },
      { id: "kw-partner-payouts", url: "https://partners.justcall.io/help/payouts" },
    ],
    text: "",
    qaPairs: [],
    files: [],
    audienceTeams: ["success"],
    audienceUsers: [],
    audienceVoiceAgents: [],
    // Ingestion could not reach the pages behind the partner login.
    status: "failed",
    updated: "2 days ago",
    entries: [],
  },
];

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "you",
  "your",
  "our",
  "this",
  "that",
  "with",
  "from",
  "have",
  "has",
  "can",
  "could",
  "would",
  "should",
  "will",
  "just",
  "about",
  "into",
  "them",
  "they",
  "what",
  "when",
  "where",
  "why",
  "how",
  "does",
  "did",
  "get",
  "got",
  "was",
  "were",
  "not",
  "but",
  "any",
  "there",
  "here",
  "its",
  "his",
  "her",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .map((token) => token.replace(/ies$/, "y").replace(/s$/, ""));
}

function overlap(query: string, candidate: string): number {
  const left = tokenize(query);
  const right = new Set(tokenize(candidate));
  if (!left.length || !right.size) return 0;
  const hits = left.filter((token) => right.has(token)).length;
  return hits / left.length;
}

export type KnowledgeConfidence = "high" | "low";

export interface KnowledgeHit {
  entry: KnowledgeEntry;
  source: KnowledgeSourceRecord;
  score: number;
  confidence: KnowledgeConfidence;
}

/** Only published knowledge bases are searchable on a live call. */
export function liveKnowledgeSources(
  sources: KnowledgeSourceRecord[]
): KnowledgeSourceRecord[] {
  return sources.filter((source) => source.status === "live");
}

/**
 * Question detection. Knowledge answers factual asks; it should stay quiet
 * when the customer is describing a situation rather than asking something.
 */
export function looksLikeQuestion(utterance: string): boolean {
  const text = utterance.trim().toLowerCase();
  if (!text) return false;
  if (text.includes("?")) return true;
  return /^(do|does|did|is|are|can|could|will|would|how|what|when|where|why|who|any)\b/.test(
    text
  );
}

export function retrieveKnowledge(
  utterance: string,
  sources: KnowledgeSourceRecord[],
  limit = 2
): KnowledgeHit[] {
  const searchable = liveKnowledgeSources(sources);
  const scored: KnowledgeHit[] = [];

  for (const source of searchable) {
    for (const entry of knowledgeRetrievableEntries(source)) {
      const cueScore = entry.cues.reduce(
        (best, cue) => Math.max(best, overlap(utterance, cue) * 1.15),
        0
      );
      const bodyScore = Math.max(
        overlap(utterance, entry.title) * 1.05,
        overlap(utterance, `${entry.title} ${entry.answer}`)
      );
      const score = Math.max(cueScore, bodyScore);
      if (score < 0.3) continue;
      scored.push({
        entry,
        source,
        score,
        confidence: score >= 0.55 ? "high" : "low",
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function knowledgeEntryCount(source: KnowledgeSourceRecord): number {
  return knowledgeRetrievableEntries(source).length;
}

// ---------------------------------------------------------------------------
// Overlap with Guidance
// ---------------------------------------------------------------------------

/** Trigger phrasing that reads like a request for a fact. */
const INFORMATIONAL_MARKERS =
  /\b(asks?|asking|wants? to know|question about|enquir|inquir|checks?|confirm(s|ing)?)\b.*\b(about|whether|if|how|what|when|where|why|which|works? with|support)/i;

/**
 * Phrasing that says the business wants control over the wording, even when a
 * fact is involved — those stay Guidance without a nudge.
 */
const STRATEGIC_MARKERS =
  /\b(objection|competitor|compare[sd]?|comparison|discount|negotiat|cancel|churn|retention|upsell|cross-sell|escalat|complain|compliance|pci|card number|legal|angry|frustrat|threaten)\b/i;

export function looksInformational(trigger: string): boolean {
  const text = trigger.trim();
  if (text.length < 12) return false;
  if (STRATEGIC_MARKERS.test(text)) return false;
  return INFORMATIONAL_MARKERS.test(text) || looksLikeQuestion(text);
}

/**
 * Coverage runs the overlap the other way round from retrieval: retrieval asks
 * "how much of what the customer said do I recognise", but a trigger is a
 * paragraph, so here we ask "is this answer's subject fully present in the
 * trigger". Otherwise long, well-written triggers would always score low.
 */
function coverageScore(trigger: string, entry: KnowledgeEntry): number {
  const triggerTokens = new Set(tokenize(trigger));
  if (triggerTokens.size === 0) return 0;
  const contained = (candidate: string) => {
    const tokens = tokenize(candidate);
    // One-word subjects match too easily to be evidence of coverage.
    if (tokens.length < 2) return 0;
    return tokens.filter((token) => triggerTokens.has(token)).length / tokens.length;
  };
  return entry.cues.reduce(
    (best, cue) => Math.max(best, contained(cue)),
    contained(entry.title)
  );
}

/**
 * The recommendation behind "this may already be handled by Knowledge" (§2).
 * Admins can still build whatever Guidance they want — this only fires when the
 * trigger reads informational *and* a published KB already answers that exact
 * subject, so the nudge is a shortcut rather than a restriction.
 */
export function knowledgeCoverageForTrigger(
  trigger: string,
  sources: KnowledgeSourceRecord[]
): KnowledgeHit | null {
  if (!looksInformational(trigger)) return null;

  let best: KnowledgeHit | null = null;
  for (const source of liveKnowledgeSources(sources)) {
    for (const entry of knowledgeRetrievableEntries(source)) {
      const score = coverageScore(trigger, entry);
      if (score < 0.7 || (best && score <= best.score)) continue;
      best = { entry, source, score, confidence: "high" };
    }
  }
  return best;
}

/** Headings and separators can share a dropdown list; only options are people. */
function selectableOptions(
  items: DropdownListItem[]
): { value: string; label: string }[] {
  return items.filter(
    (item): item is { type?: "option"; value: string; label: string } =>
      !("type" in item) || item.type === "option"
  );
}

/** Voice agent faces for the avatar stack, in list order. */
export function knowledgeVoiceAgentAssignees(source: KnowledgeSourceRecord): {
  id: string;
  name: string;
  kind: "agent";
}[] {
  return selectableOptions(KNOWLEDGE_VOICE_AGENTS)
    .filter((option) => source.audienceVoiceAgents.includes(option.value))
    .map((option) => ({
      id: option.value,
      name: option.label,
      kind: "agent" as const,
    }));
}

/** Groups then members, in list order — the people this KB is assigned to. */
function knowledgePeopleAssignees(source: KnowledgeSourceRecord): {
  id: string;
  name: string;
  kind: "member" | "group";
}[] {
  return [
    ...selectableOptions(KNOWLEDGE_TEAMS)
      .filter((option) => source.audienceTeams.includes(option.value))
      .map((option) => ({
        id: option.value,
        name: option.label,
        kind: "group" as const,
      })),
    ...selectableOptions(KNOWLEDGE_USERS)
      .filter((option) => source.audienceUsers.includes(option.value))
      .map((option) => ({
        id: option.value,
        name: option.label,
        kind: "member" as const,
      })),
  ];
}

/**
 * Assignees for the Knowledge table avatar stack. Groups, members, and voice
 * agents stack up rather than replacing each other. No people picked means
 * every agent, which shows as one "Everyone" face — that is the whole
 * audience, not a list of people.
 */
export function knowledgeAssignees(source: KnowledgeSourceRecord): {
  id: string;
  name: string;
  kind: "member" | "group" | "agent";
}[] {
  const voiceAgents = knowledgeVoiceAgentAssignees(source);
  const people = knowledgePeopleAssignees(source);
  if (people.length === 0) {
    return [
      { id: "everyone", name: "Everyone", kind: "group" as const },
      ...voiceAgents,
    ];
  }
  return [...people, ...voiceAgents];
}

export function knowledgeAssigneeLabels(source: KnowledgeSourceRecord): string[] {
  return knowledgeAssignees(source).map((person) => person.name);
}

function truncatedLabel(labels: string[], empty: string): string {
  if (labels.length === 0) return empty;
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

/** Who among your people this KB serves — voice agents are counted separately. */
export function knowledgeAudienceLabel(source: KnowledgeSourceRecord): string {
  const people = knowledgePeopleAssignees(source);
  if (people.length === 0) return "Everyone";
  return truncatedLabel(
    people.map((person) => person.name),
    "Everyone"
  );
}

export function knowledgeVoiceAgentLabel(source: KnowledgeSourceRecord): string {
  return truncatedLabel(
    knowledgeVoiceAgentAssignees(source).map((agent) => agent.name),
    "None"
  );
}

let knowledgeIdCounter = 0;

export function newKnowledgeSourceId(): string {
  knowledgeIdCounter += 1;
  return `ks-${Date.now().toString(36)}-${knowledgeIdCounter.toString(36)}`;
}

/** Ids for the things inside a knowledge base — pages, pairs, files. */
export function newKnowledgeContentId(prefix: string): string {
  knowledgeIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${knowledgeIdCounter.toString(36)}`;
}

export function knowledgeFileTypeLabel(name: string): string {
  const extension = name.split(".").pop()?.toUpperCase() ?? "";
  return extension && extension !== name.toUpperCase() ? extension : "File";
}

export function formatKnowledgeFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A full webpage link, or `null` when the admin typed something else. */
export function normalizeKnowledgeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function createEmptyKnowledgeSource(
  kind: KnowledgeSourceKind = "faq"
): KnowledgeSourceRecord {
  return {
    id: newKnowledgeSourceId(),
    name: "",
    kind,
    origin: "",
    note: "",
    webPages: [],
    text: "",
    qaPairs: [],
    files: [],
    audienceTeams: [],
    audienceUsers: [],
    audienceVoiceAgents: [],
    status: "draft",
    updated: "Just now",
    entries: [],
  };
}

/**
 * Standing in for ingestion. A real source is parsed and chunked; here the
 * kind and name decide which sample answers the admin sees after publishing,
 * so the retrieval demo has something to find.
 */
export function sampleEntriesForSource(
  name: string,
  kind: KnowledgeSourceKind
): KnowledgeEntry[] {
  const hay = `${name} ${kind}`.toLowerCase();
  if (/competit|battlecard|aircall|dialpad|vs\b/.test(hay)) {
    return SEED_KNOWLEDGE_SOURCES[1]!.entries;
  }
  if (/support|macro|refund|billing|policy/.test(hay)) {
    return SEED_KNOWLEDGE_SOURCES[2]!.entries;
  }
  return SEED_KNOWLEDGE_SOURCES[0]!.entries.slice(0, 4);
}
