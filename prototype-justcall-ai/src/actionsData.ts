/**
 * Actions — independent, reusable work an agent can perform in a connected
 * system. They live alongside Scripts, Response Cards, and Behavioral Coaching,
 * but they are not a property of any of those. Actions fire from conversation
 * moments; Response Cards never attach or configure them.
 */

import type { DropdownListItem } from "@/components/Dropdown";
import { TEAM_MEMBERS, USER_GROUPS } from "./guidanceData";

export type IntegrationId =
  | "hubspot"
  | "salesforce"
  | "zendesk"
  | "pipedrive";

export type CapabilityGroup =
  | "Contacts"
  | "Deals"
  | "Tasks"
  | "Tickets"
  | "Notes"
  | "Companies";

/** Each operation gets its own setup fields — never one generic form. */
export type ActionOperationKind =
  | "update_record"
  | "create_task"
  | "create_note"
  | "send_email"
  | "schedule_meeting"
  | "create_ticket"
  | "create_activity";

export interface IntegrationCapability {
  id: string;
  group: CapabilityGroup;
  label: string;
  /** Verb on the agent's confirm button, e.g. "Update HubSpot". */
  actionVerb: string;
  kind: ActionOperationKind;
  /** Objects this operation can target. Empty = the operation is the object. */
  objects?: string[];
  enabled: boolean;
}

export interface Integration {
  id: IntegrationId;
  name: string;
  connected: boolean;
  connectHint: string;
  capabilities: IntegrationCapability[];
}

export const SEED_INTEGRATIONS: Integration[] = [
  {
    id: "hubspot",
    name: "HubSpot",
    connected: true,
    connectHint: "Connect HubSpot to update records from a call.",
    capabilities: [
      {
        id: "hs-update-property",
        group: "Deals",
        label: "Update a record",
        actionVerb: "Update HubSpot",
        kind: "update_record",
        objects: ["Deal", "Contact", "Company"],
        enabled: true,
      },
      {
        id: "hs-task",
        group: "Tasks",
        label: "Create task",
        actionVerb: "Create HubSpot task",
        kind: "create_task",
        enabled: true,
      },
      {
        id: "hs-contact-note",
        group: "Notes",
        label: "Create note",
        actionVerb: "Add HubSpot note",
        kind: "create_note",
        enabled: true,
      },
      {
        id: "hs-send-email",
        group: "Contacts",
        label: "Send email",
        actionVerb: "Send email",
        kind: "send_email",
        enabled: true,
      },
      {
        id: "hs-update-deal",
        group: "Deals",
        label: "Update deal",
        actionVerb: "Update HubSpot deal",
        kind: "update_record",
        objects: ["Deal"],
        enabled: false,
      },
      {
        id: "hs-update-contact",
        group: "Contacts",
        label: "Update contact",
        actionVerb: "Update HubSpot",
        kind: "update_record",
        objects: ["Contact"],
        enabled: false,
      },
      {
        id: "hs-update-company",
        group: "Companies",
        label: "Update company",
        actionVerb: "Update HubSpot company",
        kind: "update_record",
        objects: ["Company"],
        enabled: false,
      },
    ],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    connected: true,
    connectHint: "Connect Salesforce to update opportunities without leaving the call.",
    capabilities: [
      {
        id: "sf-task",
        group: "Tasks",
        label: "Create task",
        actionVerb: "Create Salesforce task",
        kind: "create_task",
        enabled: true,
      },
      {
        id: "sf-event",
        group: "Tasks",
        label: "Schedule meeting",
        actionVerb: "Schedule meeting",
        kind: "schedule_meeting",
        enabled: true,
      },
      {
        id: "sf-contact-property",
        group: "Contacts",
        label: "Update a record",
        actionVerb: "Update Salesforce",
        kind: "update_record",
        objects: ["Contact", "Opportunity", "Account"],
        enabled: true,
      },
    ],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    connected: false,
    connectHint: "Connect Zendesk to raise tickets from support calls.",
    capabilities: [
      {
        id: "zd-ticket",
        group: "Tickets",
        label: "Create ticket",
        actionVerb: "Create Zendesk ticket",
        kind: "create_ticket",
        enabled: true,
      },
    ],
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    connected: false,
    connectHint: "Connect Pipedrive to update deals from a call.",
    capabilities: [
      {
        id: "pd-update-property",
        group: "Deals",
        label: "Update a record",
        actionVerb: "Update Pipedrive",
        kind: "update_record",
        objects: ["Deal", "Person", "Organization"],
        enabled: true,
      },
      {
        id: "pd-activity",
        group: "Tasks",
        label: "Create activity",
        actionVerb: "Create Pipedrive activity",
        kind: "create_activity",
        enabled: true,
      },
    ],
  },
];

export function integrationById(
  integrations: Integration[],
  id: IntegrationId
): Integration | undefined {
  return integrations.find((item) => item.id === id);
}

export function capabilityById(
  integrations: Integration[],
  integrationId: IntegrationId,
  capabilityId: string
): IntegrationCapability | undefined {
  return integrationById(integrations, integrationId)?.capabilities.find(
    (item) => item.id === capabilityId
  );
}

export function enabledCapabilityCount(integration: Integration): number {
  return integration.capabilities.filter((item) => item.enabled).length;
}

export function operationsForIntegration(
  integration: Integration
): IntegrationCapability[] {
  if (!integration.connected) return [];
  return integration.capabilities.filter((item) => item.enabled);
}

// ---------------------------------------------------------------------------
// Values written by an Action
// ---------------------------------------------------------------------------

export type ConversationVariableId =
  | "competitor_name"
  | "customer_name"
  | "email"
  | "phone"
  | "company"
  | "product_mentioned";

export type ActionValueSource =
  | { kind: "fixed"; value: string }
  | { kind: "from_conversation"; extractPrompt: string };

export const VALUE_SOURCE_OPTIONS: DropdownListItem[] = [
  { value: "from_conversation", label: "From conversation" },
  { value: "fixed", label: "Fixed value" },
];

export type ActionAudience = "everyone" | "teams" | "users";

export type EmailRecipientKind =
  | "current_contact"
  | "contact_owner"
  | "crm_field"
  | "custom";

export const EMAIL_RECIPIENT_OPTIONS: DropdownListItem[] = [
  { value: "current_contact", label: "Current contact's email" },
  { value: "contact_owner", label: "Contact owner" },
  { value: "crm_field", label: "CRM email field" },
  { value: "custom", label: "Custom email address" },
];

export const EMAIL_CRM_FIELD_OPTIONS: DropdownListItem[] = [
  { value: "email", label: "Email" },
  { value: "work_email", label: "Work email" },
  { value: "additional_email", label: "Additional email" },
];

export const EMAIL_TEMPLATE_VARIABLES = [
  "first_name",
  "company",
  "competitor_name",
] as const;

export type EmailAttachmentKind = "pdf" | "document" | "article" | "url";

export interface EmailAttachment {
  id: string;
  name: string;
  kind: EmailAttachmentKind;
  href?: string;
  /** File weight for the in-call attachment row. Files only. */
  sizeLabel?: string;
}

export const EMAIL_ATTACHMENT_PRESETS: EmailAttachment[] = [
  {
    id: "att-aircall-pdf",
    name: "JustCall vs Aircall",
    kind: "pdf",
    sizeLabel: "1.1 MB",
    href: "https://help.justcall.io/attachments/justcall-vs-aircall.pdf",
  },
  {
    id: "att-dialpad-pdf",
    name: "JustCall vs Dialpad",
    kind: "pdf",
    sizeLabel: "1.2 MB",
    href: "https://help.justcall.io/attachments/justcall-vs-dialpad.pdf",
  },
  {
    id: "att-workflow",
    name: "Missed-call workflow one-pager",
    kind: "document",
    sizeLabel: "320 KB",
    href: "https://help.justcall.io/attachments/missed-call-workflow.docx",
  },
  {
    id: "att-help-compare",
    name: "How JustCall compares",
    kind: "article",
    href: "https://help.justcall.io/comparisons",
  },
];

/** Attachments configured on an action reference the preset, never a copy. */
export function emailAttachmentPreset(id: string): EmailAttachment {
  const found = EMAIL_ATTACHMENT_PRESETS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown email attachment preset: ${id}`);
  return found;
}

const ATTACHMENT_EXTENSION: Partial<Record<EmailAttachmentKind, string>> = {
  pdf: ".pdf",
  document: ".docx",
};

const ATTACHMENT_TYPE_LABEL: Record<EmailAttachmentKind, string> = {
  pdf: "PDF",
  document: "DOC",
  article: "Article",
  url: "Link",
};

function hostFrom(href?: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href).host.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/**
 * Filename and "PDF · 1.2 MB" meta for an attachment row, so the agent can see
 * what file is going out before they send.
 */
export function emailAttachmentDisplay(attachment: EmailAttachment): {
  fileName: string;
  meta: string;
  href?: string;
} {
  const extension = ATTACHMENT_EXTENSION[attachment.kind] ?? "";
  const hasExtension =
    Boolean(extension) &&
    attachment.name.toLowerCase().endsWith(extension.toLowerCase());
  const detail = attachment.sizeLabel ?? hostFrom(attachment.href);
  return {
    fileName: hasExtension ? attachment.name : `${attachment.name}${extension}`,
    meta: [ATTACHMENT_TYPE_LABEL[attachment.kind], detail]
      .filter(Boolean)
      .join(" · "),
    href: attachment.href,
  };
}

/** Loose enough for a prototype, strict enough to catch a half-typed address. */
export function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export interface EmailActionConfig {
  recipient: EmailRecipientKind;
  customEmail: string;
  crmField: string;
  subject: string;
  message: string;
  personalize: boolean;
  includeInstructions: string;
  attachments: EmailAttachment[];
}

export const DEFAULT_EMAIL_SUBJECT = "JustCall vs {{competitor_name}}";

export const DEFAULT_EMAIL_MESSAGE = `Hi {{first_name}},

Based on what we discussed, here’s a quick comparison between JustCall and {{competitor_name}} for {{company}}.

Happy to walk through any of this if it’s useful.

Best,`;

export const DEFAULT_EMAIL_INCLUDE =
  "Include the competitor discussed, relevant JustCall differentiators, and any follow-up items promised during the call.";

export function createDefaultEmailConfig(): EmailActionConfig {
  return {
    recipient: "current_contact",
    customEmail: "",
    crmField: "email",
    subject: DEFAULT_EMAIL_SUBJECT,
    message: DEFAULT_EMAIL_MESSAGE,
    personalize: true,
    includeInstructions: DEFAULT_EMAIL_INCLUDE,
    attachments: [],
  };
}

export function isSendEmailCapability(
  capability?: IntegrationCapability
): boolean {
  return capability?.kind === "send_email";
}

export const EMAIL_PREVIEW_CONTEXT = {
  first_name: "Elena",
  last_name: "Vasquez",
  full_name: "Elena Vasquez",
  company: "Acme Corp",
  competitor_name: "Dialpad",
  contact_email: "elena@acmecorp.com",
  owner_name: "Sarah Johnson",
  owner_email: "sarah.johnson@justcall.io",
};

export function interpolateTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (match, key: string) => {
    const found = vars[key] ?? vars[key.toLowerCase()];
    return found ?? match;
  });
}

export function firstNameFrom(fullName: string | undefined): string {
  if (!fullName?.trim()) return EMAIL_PREVIEW_CONTEXT.first_name;
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export interface EmailPreview {
  title: string;
  to: string;
  toEmail: string;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
  cta: string;
}

function recipientPreview(
  email: EmailActionConfig,
  context: typeof EMAIL_PREVIEW_CONTEXT
): { to: string; toEmail: string } {
  if (email.recipient === "contact_owner") {
    return { to: context.owner_name, toEmail: context.owner_email };
  }
  if (email.recipient === "custom" && email.customEmail.trim()) {
    return { to: email.customEmail.trim(), toEmail: email.customEmail.trim() };
  }
  if (email.recipient === "crm_field") {
    const field =
      EMAIL_CRM_FIELD_OPTIONS.find((item) => item.value === email.crmField)
        ?.label ?? "Email";
    return {
      to: `${context.full_name} · ${field}`,
      toEmail: context.contact_email,
    };
  }
  return { to: context.full_name, toEmail: context.contact_email };
}

function conversationPersonalization(
  instructions: string,
  competitor: string
): string {
  const hay = instructions.toLowerCase();
  const bits: string[] = [];
  if (hay.includes("competitor") || hay.includes("differentiat")) {
    bits.push(
      `You mentioned evaluating ${competitor}. JustCall bundles calling, messaging, and CRM sync so those don’t have to live in separate tools.`
    );
  }
  if (hay.includes("follow-up") || hay.includes("promised")) {
    bits.push("I’ve included the follow-up we talked about on the call.");
  }
  if (bits.length === 0) {
    bits.push(
      `Based on what we discussed, here’s a quick comparison between JustCall and ${competitor}.`
    );
  }
  return bits.join(" ");
}

function personalizeEmailBody(
  interpolated: string,
  instructions: string,
  competitor: string
): string {
  const extra = conversationPersonalization(instructions, competitor);
  if (interpolated.includes(extra)) return interpolated;
  const parts = interpolated.split(/\n\n/);
  if (parts.length >= 2) {
    return [parts[0], extra, ...parts.slice(1)].join("\n\n");
  }
  return `${interpolated}\n\n${extra}`;
}

export function previewEmailContext(
  action: Pick<AgentAction, "detectExamples" | "property">,
  overrides: Partial<typeof EMAIL_PREVIEW_CONTEXT> = {}
): typeof EMAIL_PREVIEW_CONTEXT {
  const sample = previewSampleUtterance(action);
  const competitor =
    extractVariableValue("competitor_name", sample) ??
    EMAIL_PREVIEW_CONTEXT.competitor_name;
  return { ...EMAIL_PREVIEW_CONTEXT, competitor_name: competitor, ...overrides };
}

export function previewEmail(
  action: Pick<
    AgentAction,
    | "agentLabel"
    | "name"
    | "requiresConfirmation"
    | "detectExamples"
    | "property"
    | "email"
  >,
  context: typeof EMAIL_PREVIEW_CONTEXT = previewEmailContext(action)
): EmailPreview {
  const email = action.email ?? createDefaultEmailConfig();
  const vars = {
    first_name: context.first_name,
    company: context.company,
    competitor_name: context.competitor_name,
  };
  const subject =
    interpolateTemplate(email.subject, vars).trim() || "Untitled email";
  let body = interpolateTemplate(email.message, vars).trim();
  if (email.personalize && email.includeInstructions.trim()) {
    body = personalizeEmailBody(
      body,
      email.includeInstructions,
      context.competitor_name
    );
  }
  const recipient = recipientPreview(email, context);
  return {
    title: action.agentLabel || action.name || "Send email",
    to: recipient.to,
    toEmail: recipient.toEmail,
    subject,
    body,
    attachments: email.attachments,
    cta: action.requiresConfirmation ? "Review email" : "Send email",
  };
}

export function emailConfigReady(email?: EmailActionConfig): boolean {
  if (!email) return false;
  if (!email.subject.trim() || !email.message.trim()) return false;
  if (email.recipient === "custom" && !email.customEmail.trim()) return false;
  if (email.recipient === "crm_field" && !email.crmField.trim()) return false;
  return true;
}

export function defaultExtractPrompt(property: string): string {
  const key = property.trim().toLowerCase();
  if (key === "competitor") {
    return "The competitor the customer is currently using or evaluating.";
  }
  if (key === "subject") {
    return "A short subject that captures what the customer needs next.";
  }
  if (key === "note") {
    return "A concise note summarizing what was discussed.";
  }
  if (key) return `The ${key} mentioned in the conversation.`;
  return "";
}

export function suggestedAgentLabel(
  action: {
    property: string;
    capabilityId: string;
    detectWhen?: string;
    email?: EmailActionConfig;
  },
  capability?: IntegrationCapability
): string {
  if (capability?.kind === "send_email") {
    const hay = `${action.detectWhen ?? ""} ${action.email?.subject ?? ""}`.toLowerCase();
    if (
      hay.includes("competitor") ||
      hay.includes("comparison") ||
      hay.includes(" vs ")
    ) {
      return "Send comparison email";
    }
    return "Send email";
  }
  const property = action.property.trim();
  if (capability?.label.toLowerCase().startsWith("create")) {
    return capability.label;
  }
  if (property) return `Update ${property.toLowerCase()}`;
  if (capability?.label.toLowerCase().startsWith("update")) {
    return "Update record";
  }
  return capability?.label ?? "";
}

export function suggestedInternalName(
  integrationName: string,
  agentLabel: string
): string {
  if (!agentLabel.trim()) return "";
  return `${integrationName} · ${agentLabel.trim()}`;
}

export function capabilityNeedsRecord(
  capability?: IntegrationCapability
): boolean {
  if (capability?.kind === "send_email") return false;
  return Boolean(capability?.objects && capability.objects.length > 0);
}

export function defaultPropertyForCapability(
  capability?: IntegrationCapability
): string {
  if (!capability) return "";
  const label = capability.label.toLowerCase();
  if (label.includes("task") || label.includes("ticket") || label.includes("activity")) {
    return "Subject";
  }
  if (label.includes("note")) return "Note";
  return "";
}

export function previewSampleUtterance(action: {
  detectExamples: string[];
  property: string;
}): string {
  const fromExamples = action.detectExamples.find((item) => item.trim());
  if (fromExamples) return fromExamples;
  if (action.property.toLowerCase() === "competitor") {
    return "We're also evaluating Dialpad.";
  }
  return "We're also evaluating Dialpad.";
}

export function extractFromConversation(
  extractPrompt: string,
  utterance: string,
  fallbacks: { customerName?: string; company?: string } = {}
): string | undefined {
  if (!extractPrompt.trim()) return undefined;
  const hay = extractPrompt.toLowerCase();
  if (/\bcompetitor/.test(hay)) {
    return extractVariableValue("competitor_name", utterance, fallbacks);
  }
  if (/\bemail/.test(hay)) {
    return extractVariableValue("email", utterance, fallbacks);
  }
  if (/\bphone/.test(hay)) {
    return extractVariableValue("phone", utterance, fallbacks);
  }
  if (/\bcompany/.test(hay)) {
    return extractVariableValue("company", utterance, fallbacks);
  }
  if (/\bproduct/.test(hay)) {
    return extractVariableValue("product_mentioned", utterance, fallbacks);
  }
  if (/\bname|customer/.test(hay)) {
    return extractVariableValue("customer_name", utterance, fallbacks);
  }
  return (
    extractVariableValue("competitor_name", utterance, fallbacks) ??
    extractVariableValue("email", utterance, fallbacks)
  );
}

export function previewExtractedValue(action: {
  property: string;
  detectExamples: string[];
  value: ActionValueSource;
}): string {
  if (action.value.kind === "fixed") return action.value.value.trim();
  const sample = previewSampleUtterance(action);
  return (
    extractFromConversation(action.value.extractPrompt, sample) ??
    (action.property.toLowerCase() === "competitor" ? "Dialpad" : "")
  );
}

// ---------------------------------------------------------------------------
// Admin-configured Action
// ---------------------------------------------------------------------------

export type ActionTriggerKind = "ai_recommended";

export type ActionPublishStatus = "active" | "inactive";

export interface AgentAction {
  id: string;
  name: string;
  /** What the agent sees during a live conversation. */
  agentLabel: string;
  description: string;
  integrationId: IntegrationId;
  capabilityId: string;
  object: string;
  property: string;
  value: ActionValueSource;
  /** Present when the selected operation is Send email. */
  email?: EmailActionConfig;
  trigger: ActionTriggerKind;
  detectWhen: string;
  detectExamples: string[];
  audience: ActionAudience;
  teamMembers: string[];
  userGroups: string[];
  /** External writes require agent confirmation by default. */
  requiresConfirmation: boolean;
  status: ActionPublishStatus;
  updated: string;
}

export function createEmptyAction(): AgentAction {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    agentLabel: "",
    description: "",
    integrationId: "hubspot",
    capabilityId: "",
    object: "",
    property: "",
    value: { kind: "from_conversation", extractPrompt: "" },
    trigger: "ai_recommended",
    detectWhen: "",
    detectExamples: [],
    audience: "everyone",
    teamMembers: [],
    userGroups: [],
    requiresConfirmation: true,
    status: "active",
    updated: "Just now",
  };
}

export function cloneAction(action: AgentAction): AgentAction {
  return {
    ...action,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${action.name} (copy)`,
    status: "inactive",
    updated: "Just now",
  };
}

/**
 * The same catalog of apps, none of them hooked up yet — what a brand-new
 * account sees. Used by the empty-state walkthrough of the setup flow, where
 * In-call Actions has nothing to run against until an app is connected.
 */
export const UNCONNECTED_INTEGRATIONS: Integration[] = SEED_INTEGRATIONS.map(
  (integration) => ({ ...integration, connected: false })
);

export const SEED_ACTIONS: AgentAction[] = [
  {
    id: "act-update-competitor",
    name: "HubSpot · Update competitor",
    agentLabel: "Update competitor",
    description:
      "Update the competitor being evaluated on the associated HubSpot deal.",
    integrationId: "hubspot",
    capabilityId: "hs-update-property",
    object: "Deal",
    property: "Competitor",
    value: {
      kind: "from_conversation",
      extractPrompt:
        "The competitor the customer is currently using or evaluating.",
    },
    trigger: "ai_recommended",
    detectWhen: "Customer mentions a competitor they use or are evaluating",
    detectExamples: [
      "We currently use Aircall.",
      "We're also evaluating Dialpad.",
    ],
    audience: "teams",
    teamMembers: [],
    userGroups: ["sales"],
    requiresConfirmation: true,
    status: "active",
    updated: "2 days ago",
  },
  {
    id: "act-followup-task",
    name: "Salesforce · Create follow-up task",
    agentLabel: "Create follow-up task",
    description: "Log a follow-up task on the Salesforce contact after the call.",
    integrationId: "salesforce",
    capabilityId: "sf-task",
    object: "Task",
    property: "Subject",
    value: { kind: "fixed", value: "Working session with ops lead" },
    trigger: "ai_recommended",
    detectWhen:
      "The customer agrees to a follow-up, next step, or working session.",
    detectExamples: [
      "Let's set up a working session.",
      "Can we follow up next week?",
    ],
    audience: "teams",
    teamMembers: [],
    userGroups: ["sales"],
    requiresConfirmation: true,
    status: "active",
    updated: "Yesterday",
  },
  {
    id: "act-send-comparison",
    name: "HubSpot · Send comparison email",
    agentLabel: "Send comparison email",
    description:
      "Email a JustCall comparison to the contact when they mention a competitor.",
    integrationId: "hubspot",
    capabilityId: "hs-send-email",
    object: "Contact",
    property: "",
    value: { kind: "from_conversation", extractPrompt: "" },
    email: {
      recipient: "current_contact",
      customEmail: "",
      crmField: "email",
      subject: "JustCall vs {{competitor_name}}",
      message: DEFAULT_EMAIL_MESSAGE,
      personalize: true,
      includeInstructions: DEFAULT_EMAIL_INCLUDE,
      attachments: [emailAttachmentPreset("att-dialpad-pdf")],
    },
    trigger: "ai_recommended",
    detectWhen: "Customer mentions a competitor they use or are evaluating",
    detectExamples: [
      "We currently use Aircall.",
      "We're also evaluating Dialpad.",
    ],
    audience: "teams",
    teamMembers: [],
    userGroups: ["sales"],
    requiresConfirmation: true,
    status: "active",
    updated: "Today",
  },
  {
    id: "act-schedule-meeting",
    name: "Salesforce · Schedule meeting",
    agentLabel: "Schedule working session",
    description: "Book a working session on the Salesforce contact when a time is agreed.",
    integrationId: "salesforce",
    capabilityId: "sf-event",
    object: "Event",
    property: "Subject",
    value: { kind: "fixed", value: "Working session with ops lead" },
    trigger: "ai_recommended",
    detectWhen: "The customer agrees to a working session or names a time to meet.",
    detectExamples: ["Thursday afternoon is open.", "Let's lock a time this week."],
    audience: "teams",
    teamMembers: [],
    userGroups: ["sales"],
    requiresConfirmation: true,
    status: "active",
    updated: "Today",
  },
  {
    id: "act-support-ticket",
    name: "Zendesk · Create support ticket",
    agentLabel: "Create support ticket",
    description: "Open a Zendesk ticket when a billing or access issue needs follow-up.",
    integrationId: "zendesk",
    capabilityId: "zd-ticket",
    object: "Ticket",
    property: "Subject",
    value: {
      kind: "from_conversation",
      extractPrompt: "The issue the customer needs a ticket for.",
    },
    trigger: "ai_recommended",
    detectWhen:
      "The customer reports a billing issue, duplicate charge, or needs a support ticket.",
    detectExamples: ["I was charged twice.", "Can I get a refund?"],
    audience: "teams",
    teamMembers: [],
    userGroups: ["support"],
    requiresConfirmation: true,
    status: "active",
    updated: "5 days ago",
  },
];

export function liveActions(actions: AgentAction[]): AgentAction[] {
  return actions.filter((item) => item.status === "active");
}

export function actionLibraryStatus(
  action: AgentAction,
  integrations: Integration[]
): "active" | "inactive" | "needs_attention" {
  if (action.status === "inactive") return "inactive";
  const integration = integrationById(integrations, action.integrationId);
  if (!integration?.connected) return "needs_attention";
  const capability = capabilityById(
    integrations,
    action.integrationId,
    action.capabilityId
  );
  if (!capability?.enabled) return "needs_attention";
  return "active";
}

export function actionAssignees(action: AgentAction): {
  id: string;
  name: string;
  kind: "member" | "group";
}[] {
  const groups = USER_GROUPS.filter(
    (option) =>
      (!option.type || option.type === "option") &&
      action.userGroups.includes(option.value)
  ).map((option) => ({
    id: option.value,
    name: option.label,
    kind: "group" as const,
  }));
  const members = TEAM_MEMBERS.filter(
    (option) =>
      (!option.type || option.type === "option") &&
      action.teamMembers.includes(option.value)
  ).map((option) => ({
    id: option.value,
    name: option.label,
    kind: "member" as const,
  }));
  return [...groups, ...members];
}

export function actionIsAssigned(action: AgentAction): boolean {
  return action.teamMembers.length > 0 || action.userGroups.length > 0;
}

export function actionAssignmentLabel(action: AgentAction): string {
  const people = actionAssignees(action);
  if (people.length === 0) return "Unassigned";
  return people.map((person) => person.name).join(", ");
}

export const ACTION_OBJECT_OPTIONS: DropdownListItem[] = [
  { value: "Deal", label: "Deal" },
  { value: "Contact", label: "Contact" },
  { value: "Company", label: "Company" },
  { value: "Opportunity", label: "Opportunity" },
  { value: "Account", label: "Account" },
  { value: "Person", label: "Person" },
  { value: "Organization", label: "Organization" },
  { value: "Task", label: "Task" },
  { value: "Event", label: "Event" },
  { value: "Ticket", label: "Ticket" },
];

export const ACTION_PROPERTY_OPTIONS: DropdownListItem[] = [
  { value: "Competitor", label: "Competitor" },
  { value: "Lead status", label: "Lead status" },
  { value: "Stage", label: "Stage" },
  { value: "Subject", label: "Subject" },
  { value: "Priority", label: "Priority" },
  { value: "Note", label: "Note" },
];

// ---------------------------------------------------------------------------
// Suggested actions (live agent runtime)
// ---------------------------------------------------------------------------

export interface ActionField {
  label: string;
  value: string;
  /** No value was found in the conversation; the agent must fill it in. */
  missing?: boolean;
}

export type ActionOrigin = "ai" | "guidance" | "always" | "conversation";

export interface SuggestedEmail {
  to: string;
  toEmail: string;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
}

export interface SuggestedAction {
  id: string;
  actionId: string;
  integrationId: IntegrationId;
  capabilityId: string;
  title: string;
  summary: string;
  recordLabel: string;
  recordValue: string;
  fields: ActionField[];
  origin: ActionOrigin;
  guidanceId?: string;
  requiresConfirmation: boolean;
  simulateFailure?: boolean;
  simulatePermissionDenied?: boolean;
  viewUrl?: string;
  email?: SuggestedEmail;
}

export type ActionState =
  | "suggested"
  | "reviewing"
  | "executing"
  | "done"
  | "failed"
  | "permission_denied"
  | "dismissed";

export function actionHasMissingFields(action: SuggestedAction): boolean {
  return action.fields.some((field) => field.missing);
}

const COMPETITOR_NAMES = [
  "Aircall",
  "Dialpad",
  "RingCentral",
  "Talkdesk",
  "Zoom Phone",
  "8x8",
];

export function extractVariableValue(
  variableId: ConversationVariableId,
  utterance: string,
  fallbacks: { customerName?: string; company?: string } = {}
): string | undefined {
  const hay = utterance.toLowerCase();
  switch (variableId) {
    case "competitor_name": {
      const hit = COMPETITOR_NAMES.find((name) =>
        hay.includes(name.toLowerCase())
      );
      return hit;
    }
    case "customer_name":
      return fallbacks.customerName;
    case "company":
      return fallbacks.company;
    case "email": {
      const match = utterance.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      return match?.[0];
    }
    case "phone": {
      const match = utterance.match(
        /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/
      );
      return match?.[0];
    }
    case "product_mentioned":
      return undefined;
    default:
      return undefined;
  }
}

export function suggestedActionFromLibrary(
  action: AgentAction,
  integrations: Integration[],
  context: {
    recordLabel: string;
    recordValue: string;
    utterance?: string;
    customerName?: string;
    company?: string;
    origin?: ActionOrigin;
    guidanceId?: string;
  }
): SuggestedAction | null {
  const integration = integrationById(integrations, action.integrationId);
  const capability = capabilityById(
    integrations,
    action.integrationId,
    action.capabilityId
  );
  if (!integration?.connected || !capability?.enabled) return null;
  if (action.status !== "active") return null;

  const shared = {
    id: action.id,
    actionId: action.id,
    integrationId: action.integrationId,
    capabilityId: action.capabilityId,
    title: action.agentLabel || action.name,
    origin: context.origin ?? ("ai" as ActionOrigin),
    guidanceId: context.guidanceId,
    requiresConfirmation: action.requiresConfirmation,
    viewUrl: integrationDeepLink(action.integrationId),
  };

  if (capability.kind === "send_email" && action.email) {
    const competitor =
      extractVariableValue("competitor_name", context.utterance ?? "") ??
      extractVariableValue(
        "competitor_name",
        action.detectExamples.join(" ")
      ) ??
      "Dialpad";
    const preview = previewEmail(action, {
      ...EMAIL_PREVIEW_CONTEXT,
      first_name: firstNameFrom(context.customerName),
      full_name: context.customerName ?? EMAIL_PREVIEW_CONTEXT.full_name,
      company: context.company ?? EMAIL_PREVIEW_CONTEXT.company,
      competitor_name: competitor,
    });
    return {
      ...shared,
      summary: `${preview.subject} · ${preview.to}`,
      recordLabel: "Contact",
      recordValue: context.customerName ?? preview.to,
      fields: [
        { label: "To", value: preview.to },
        { label: "Subject", value: preview.subject },
        { label: "Message", value: preview.body },
      ],
      email: {
        to: preview.to,
        toEmail: preview.toEmail,
        subject: preview.subject,
        body: preview.body,
        attachments: preview.attachments,
      },
    };
  }

  let proposed = "";
  let missing = false;
  if (action.value.kind === "fixed") {
    proposed = action.value.value;
  } else {
    proposed =
      extractFromConversation(action.value.extractPrompt, context.utterance ?? "", {
        customerName: context.customerName,
        company: context.company,
      }) ?? "";
    missing = !proposed.trim();
  }

  const objectLabel = action.object || integration.name;
  const property = action.property || capability.label;
  const summary = missing
    ? property
    : `${property} · ${proposed}`;

  return {
    ...shared,
    summary,
    recordLabel: context.recordLabel || objectLabel,
    recordValue: context.recordValue,
    fields: [
      { label: "Property", value: property },
      {
        label: "New value",
        value: proposed,
        missing,
      },
    ],
  };
}

export function integrationDeepLink(id: IntegrationId): string | undefined {
  if (id === "hubspot") return "https://app.hubspot.com";
  if (id === "salesforce") return "https://login.salesforce.com";
  if (id === "zendesk") return "https://www.zendesk.com";
  if (id === "pipedrive") return "https://app.pipedrive.com";
  return undefined;
}

export function integrationWriteLabel(
  action: Pick<SuggestedAction, "integrationId" | "capabilityId">,
  integrations: Integration[]
): string {
  const name =
    integrationById(integrations, action.integrationId)?.name ??
    action.integrationId;
  const capability = capabilityById(
    integrations,
    action.integrationId,
    action.capabilityId
  );
  if (capability?.label.toLowerCase().startsWith("create")) {
    return `Create ${name} ${capability.label.replace(/^Create /i, "").toLowerCase()}`;
  }
  if (capability?.label.toLowerCase().startsWith("send")) {
    return capability.actionVerb;
  }
  if (/schedule|meeting/i.test(capability?.label ?? "")) {
    return capability?.actionVerb ?? `Schedule in ${name}`;
  }
  return `Update ${name}`;
}

export function integrationDoneLabel(
  action: Pick<SuggestedAction, "integrationId" | "capabilityId">,
  integrations: Integration[]
): string {
  const name =
    integrationById(integrations, action.integrationId)?.name ??
    action.integrationId;
  const capability = capabilityById(
    integrations,
    action.integrationId,
    action.capabilityId
  );
  if (capability?.label.toLowerCase().startsWith("create")) {
    return `${name} ${capability.label.replace(/^Create /i, "").toLowerCase()} created`;
  }
  if (capability?.label.toLowerCase().startsWith("send")) {
    return "Email sent";
  }
  if (/schedule|meeting/i.test(capability?.label ?? "")) {
    return "Meeting scheduled";
  }
  return `${name} updated`;
}

export function integrationFailedLabel(
  action: SuggestedAction,
  integrations: Integration[]
): string {
  const name =
    integrationById(integrations, action.integrationId)?.name ??
    action.integrationId;
  if (action.email) return `Couldn’t send email`;
  return `Couldn’t update ${name}`;
}

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
  "customer",
  "mentions",
  "currently",
  "using",
  "evaluating",
  "they",
  "are",
  "the",
  "that",
  "also",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function distinctiveTokens(text: string): string[] {
  return tokens(text).filter(
    (word) => !STOP_WORDS.has(word) && (word.length >= 4 || word === "sms")
  );
}

export function actionMatchScore(action: AgentAction, utterance: string): number {
  const hay = new Set(distinctiveTokens(utterance));
  if (hay.size === 0) return 0;
  const source = [action.detectWhen, action.name, ...action.detectExamples].join(
    " "
  );
  return distinctiveTokens(source).reduce(
    (score, token) => score + (hay.has(token) ? 1 : 0),
    0
  );
}

export function actionMatchesUtterance(
  action: AgentAction,
  utterance: string
): boolean {
  if (action.trigger !== "ai_recommended") return false;
  if (actionMatchScore(action, utterance) >= 1) return true;
  return COMPETITOR_NAMES.some(
    (name) =>
      utterance.toLowerCase().includes(name.toLowerCase()) &&
      (action.property.toLowerCase() === "competitor" ||
        action.name.toLowerCase().includes("competitor") ||
        Boolean(action.email))
  );
}

export function patchSuggestedValue(
  current: SuggestedAction,
  next: SuggestedAction
): SuggestedAction {
  if (current.email && next.email) {
    if (
      current.email.subject === next.email.subject &&
      current.email.body === next.email.body &&
      current.email.to === next.email.to
    ) {
      return current;
    }
    return {
      ...current,
      summary: next.summary,
      fields: next.fields,
      email: next.email,
    };
  }
  const nextValue = next.fields.find((field) => field.label === "New value");
  if (!nextValue || nextValue.missing) return current;
  const currentValue = current.fields.find((field) => field.label === "New value");
  if (currentValue?.value === nextValue.value) return current;
  return {
    ...current,
    summary: next.summary,
    fields: current.fields.map((field) =>
      field.label === "New value" ? nextValue : field
    ),
  };
}
