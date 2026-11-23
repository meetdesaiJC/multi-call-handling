export type FaqStatus = "published" | "draft" | "needs_review";
export type RepositoryStatus = "live" | "draft";
export type KnowledgeCreateMethod = "import" | "manual" | "generate";

export interface FaqItem {
  id: string;
  title: string;
  question: string;
  answer: string;
  category: string;
  additionalGuidance: string;
  exampleQuestions: string[];
  status: FaqStatus;
  source: string;
  updated: string;
}

export interface KnowledgeRepository {
  id: string;
  name: string;
  description: string;
  faqs: FaqItem[];
  status: RepositoryStatus;
  assignedTeams: string[];
  assignedPlaybooks: string[];
  updated: string;
}

export const TEAM_OPTIONS = [
  "Inbound Support",
  "Billing Team",
  "Sales Team",
] as const;

export const PLAYBOOK_OPTIONS = [
  "Support triage",
  "Billing recovery",
  "Account access",
] as const;

export const FAQ_CATEGORIES = [
  "Billing",
  "Payments",
  "Refund",
  "Subscription",
  "Account",
  "Product",
  "Security",
] as const;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "your",
  "was",
  "were",
  "this",
  "that",
  "with",
  "from",
  "have",
  "has",
  "had",
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
  "their",
  "what",
  "when",
  "where",
  "why",
  "how",
  "did",
  "does",
  "get",
  "got",
]);

let idCounter = 0;

export function newKnowledgeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function deriveFaqTitle(question: string): string {
  const cleaned = question.replace(/[?!.]+$/g, "").trim();
  if (!cleaned) return "Untitled FAQ";
  const withoutLead = cleaned
    .replace(/^(can|could|do|does|did|how|what|why|is|are|will)\s+(i|we|you|my|the|a|an)\s+/i, "")
    .replace(/^(can|could|do|does|how|what|why|is|are)\s+/i, "");
  const title = withoutLead || cleaned;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function createEmptyFaq(overrides: Partial<FaqItem> = {}): FaqItem {
  return {
    id: newKnowledgeId("faq"),
    title: "",
    question: "",
    answer: "",
    category: "",
    additionalGuidance: "",
    exampleQuestions: [],
    status: "draft",
    source: "Manual",
    updated: "Just now",
    ...overrides,
  };
}

export function createEmptyRepository(
  overrides: Partial<KnowledgeRepository> = {}
): KnowledgeRepository {
  return {
    id: newKnowledgeId("repo"),
    name: "Untitled repository",
    description: "Trusted answers Agent Assist can surface during live calls.",
    faqs: [],
    status: "draft",
    assignedTeams: ["Inbound Support"],
    assignedPlaybooks: [],
    updated: "Just now",
    ...overrides,
  };
}

export function cloneRepository(repo: KnowledgeRepository): KnowledgeRepository {
  return {
    ...repo,
    id: newKnowledgeId("repo"),
    name: `Copy of ${repo.name}`,
    status: "draft",
    updated: "Just now",
    faqs: repo.faqs.map((faq) => ({
      ...faq,
      id: newKnowledgeId("faq"),
      status: faq.status === "published" ? "draft" : faq.status,
      updated: "Just now",
    })),
  };
}

export function faqCategories(repo: KnowledgeRepository): string[] {
  return [...new Set(repo.faqs.map((faq) => faq.category).filter(Boolean))];
}

export function repositoryHealth(repo: KnowledgeRepository) {
  const ready = repo.faqs.filter((faq) => faq.question.trim() && faq.answer.trim()).length;
  const needsReview = repo.faqs.filter((faq) => faq.status === "needs_review" || !faq.answer.trim()).length;
  const duplicates = findDuplicateGroups(repo.faqs).length;
  return { ready, needsReview, duplicates, total: repo.faqs.length };
}

export function isAnswerLong(answer: string): boolean {
  return answer.trim().length > 320;
}

export function shortenAnswer(answer: string): string {
  const trimmed = answer.trim();
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2 && trimmed.length <= 320) return trimmed;
  return sentences.slice(0, 2).join(" ");
}

export function generateSimilarQuestions(question: string): string[] {
  const q = question.trim();
  if (q.length < 8) return [];

  const known = KNOWN_PARAPHRASES.find((entry) =>
    tokensOverlap(q, entry.seed) >= 0.55
  );
  if (known) return known.paraphrases;

  const stem = q.replace(/[?!.]+$/g, "");
  const paraphrases = new Set<string>();
  paraphrases.add(stem.replace(/^Can I /i, "Can I get ").replace(/\?$/, "") + "?");
  if (/refund/i.test(stem)) {
    paraphrases.add("Can I get my money back?");
    paraphrases.add("Is this refundable?");
    paraphrases.add("Can you reverse this payment?");
  }
  if (/cancel/i.test(stem)) {
    paraphrases.add("How do I stop my subscription?");
    paraphrases.add("I want to cancel.");
  }
  if (/charge|payment|card/i.test(stem)) {
    paraphrases.add("Why did you charge my card?");
    paraphrases.add("There's a charge I don't recognize.");
  }
  if (/hours|open|opening/i.test(stem)) {
    paraphrases.add("What time do you close?");
    paraphrases.add("Are you open today?");
  }
  const fallback = [
    stem.replace(/^How do I /i, "What's the process to ").replace(/\?$/, "") + "?",
    `I have a question about ${stem.replace(/^(can i|how do i|what is|why was|why did)\s+/i, "").toLowerCase()}.`,
  ];
  fallback.forEach((item) => paraphrases.add(item));
  return [...paraphrases]
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.toLowerCase() !== q.toLowerCase())
    .slice(0, 4);
}

export interface RetrievalMatch {
  faq: FaqItem;
  score: number;
  strength: "strong" | "possible";
}

export function retrieveKnowledge(query: string, faqs: FaqItem[]): RetrievalMatch[] {
  const usable = faqs.filter((faq) => faq.question.trim() && faq.answer.trim());
  const scored = usable
    .map((faq) => {
      const haystack = [faq.title, faq.question, faq.answer, ...faq.exampleQuestions].join(" ");
      const score = Math.max(
        tokensOverlap(query, faq.question) * 1.15,
        tokensOverlap(query, haystack),
        tokensOverlap(query, faq.exampleQuestions.join(" ")) * 1.05
      );
      return { faq, score };
    })
    .filter((item) => item.score >= 0.22)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 4).map((item, index) => ({
    faq: item.faq,
    score: item.score,
    strength: index === 0 && item.score >= 0.48 ? "strong" : "possible",
  }));
}

export interface ConversationTurnMatch {
  text: string;
  matches: RetrievalMatch[];
}

export function retrieveFromTranscript(
  transcript: string,
  faqs: FaqItem[]
): ConversationTurnMatch[] {
  const turns = transcript
    .split(/\n+/)
    .map((line) => line.replace(/^(customer|agent|caller)\s*[:\-]\s*/i, "").trim())
    .filter(Boolean);
  return turns.map((text) => ({
    text,
    matches: retrieveKnowledge(text, faqs).slice(0, 2),
  }));
}

export type JustCallField = "question" | "answer" | "category" | "ignore";

export interface ImportedRow {
  id: string;
  values: Record<string, string>;
  question: string;
  answer: string;
  category: string;
  issue?: "missing_answer" | "duplicate";
  duplicateOf?: string;
}

export interface ParsedImport {
  fileName: string;
  columns: string[];
  mapping: Record<string, JustCallField>;
  rows: ImportedRow[];
}

const FIELD_ALIASES: Record<JustCallField, string[]> = {
  question: ["question", "faq", "title", "prompt", "q"],
  answer: ["answer", "response", "reply", "solution", "a"],
  category: ["category", "type", "topic", "group"],
  ignore: [],
};

export function detectField(column: string): JustCallField {
  const normalized = column.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<[JustCallField, string[]]>) {
    if (aliases.includes(normalized)) return field;
  }
  return "ignore";
}

export function parseCsvText(text: string, fileName = "faqs.csv"): ParsedImport {
  const table = parseCsv(text);
  const header = table[0] ?? [];
  const columns = header.map((col, index) => col.trim() || `Column ${index + 1}`);
  const mapping: Record<string, JustCallField> = {};
  columns.forEach((col) => {
    mapping[col] = detectField(col);
  });

  const rows: ImportedRow[] = table.slice(1).map((cells, index) => {
    const values: Record<string, string> = {};
    columns.forEach((col, colIndex) => {
      values[col] = (cells[colIndex] ?? "").trim();
    });
    return {
      id: `row-${index + 1}`,
      values,
      question: "",
      answer: "",
      category: "",
    };
  });

  return applyMapping({ fileName, columns, mapping, rows });
}

export function applyMapping(parsed: ParsedImport): ParsedImport {
  const questionCol = parsed.columns.find((col) => parsed.mapping[col] === "question");
  const answerCol = parsed.columns.find((col) => parsed.mapping[col] === "answer");
  const categoryCol = parsed.columns.find((col) => parsed.mapping[col] === "category");

  const mapped = parsed.rows.map((row) => ({
    ...row,
    question: questionCol ? row.values[questionCol] ?? "" : "",
    answer: answerCol ? row.values[answerCol] ?? "" : "",
    category: categoryCol ? row.values[categoryCol] ?? "" : "",
    issue: undefined,
    duplicateOf: undefined,
  }));

  const seen: ImportedRow[] = [];
  mapped.forEach((row) => {
    if (!row.question.trim()) return;
    if (!row.answer.trim()) {
      row.issue = "missing_answer";
      seen.push(row);
      return;
    }
    const existing = seen.find((other) => tokensOverlap(row.question, other.question) >= 0.5);
    if (existing) {
      row.issue = "duplicate";
      row.duplicateOf = existing.question;
    }
    seen.push(row);
  });

  return { ...parsed, rows: mapped };
}

export function importSummary(parsed: ParsedImport) {
  const usable = parsed.rows.filter((row) => row.question.trim());
  const ready = usable.filter((row) => !row.issue);
  const missing = usable.filter((row) => row.issue === "missing_answer");
  const duplicates = usable.filter((row) => row.issue === "duplicate");
  return {
    found: usable.length,
    ready: ready.length,
    missing: missing.length,
    duplicates: duplicates.length,
  };
}

export function rowsToFaqs(rows: ImportedRow[], includeIssues = false): FaqItem[] {
  return rows
    .filter((row) => row.question.trim() && (includeIssues || row.answer.trim()))
    .map((row) =>
      createEmptyFaq({
        title: deriveFaqTitle(row.question),
        question: row.question,
        answer: row.answer,
        category: row.category,
        exampleQuestions: generateSimilarQuestions(row.question),
        status: row.answer.trim() ? "draft" : "needs_review",
        source: "CSV import",
      })
    );
}

export const SAMPLE_CSV = `FAQ,Response,Type
Can I get a refund?,"Refunds are available within 30 days of purchase for eligible subscriptions. Refunds are returned to the original payment method.",Refund
Are subscriptions refundable?,"Refunds are available within 30 days of purchase for eligible subscriptions. Refunds are returned to the original payment method.",Refund
How do I cancel my subscription?,,Subscription
Why was I charged twice?,"If two charges appear on the customer's statement, first verify whether both transactions have completed. Pending transactions may disappear automatically within 3–5 business days.",Billing
Why did my payment fail?,"Failed payments are usually caused by an expired card, insufficient funds, or a bank decline. Ask the customer to update the card on file and retry.",Payments
How do I change my payment method?,"Customers can update the card on file from Billing → Payment methods. The new card is used for the next renewal.",Payments
When am I billed?,"Subscriptions renew on the same date each month. The charge appears as JUSTCALL on the statement.",Billing
Can I get an invoice?,"Yes. Monthly invoices are emailed to the billing contact and can be resent from the account.",Billing
Do you offer annual plans?,"Annual plans are available at a discounted rate. Switching mid-cycle credits unused monthly time toward the annual invoice.",Subscription
How do I update my billing address?,,Account
Is there a setup fee?,"There is no setup fee for standard plans. Usage-based numbers and add-ons are billed separately.",Billing
Can I pause my subscription?,"Subscriptions cannot be paused. Customers can cancel and resubscribe later; data is retained for 90 days.",Subscription
`;

export const CSV_TEMPLATE = `Question,Answer,Category
Can I get a refund?,"Refunds are available within 30 days of purchase for eligible subscriptions. Refunds are returned to the original payment method.",Refund
`;

export function sampleImport(): ParsedImport {
  return parseCsvText(SAMPLE_CSV, "billing-faqs.csv");
}

export interface GeneratedSuggestion extends FaqItem {
  selected: boolean;
}

export type KnowledgeSourceKind = "file" | "url";

export interface KnowledgeSource {
  id: string;
  kind: KnowledgeSourceKind;
  name: string;
  href?: string;
  typeLabel: string;
  sizeLabel?: string;
  text?: string;
}

export const ACCEPTED_KNOWLEDGE_FILES =
  ".pdf,.doc,.docx,.txt,.md,.html,.rtf,application/pdf,text/plain,text/markdown,text/html";

export function knowledgeFileTypeLabel(fileName: string): string {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "Word";
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".rtf")) return "Text";
  if (name.endsWith(".html") || name.endsWith(".htm")) return "HTML";
  if (name.endsWith(".csv")) return "CSV";
  return "Document";
}

export function isSupportedKnowledgeFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    /\.(pdf|docx?|txt|md|html?|rtf|csv)$/.test(name) ||
    file.type === "application/pdf" ||
    file.type.startsWith("text/")
  );
}

export function isBinaryKnowledgeFile(fileName: string): boolean {
  return /\.(pdf|docx?)$/i.test(fileName);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function parseWebpageUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

export function displayNameForUrl(url: URL): string {
  const path = url.pathname.replace(/\/+$/, "");
  if (!path || path === "/") return url.hostname.replace(/^www\./, "");
  return `${url.hostname.replace(/^www\./, "")}${path}`;
}

export function sampleDocumentForName(value: string): string {
  const text = value.toLowerCase();
  if (/cafe|restaurant|reserv|menu|cater|opening hours/.test(text)) return SAMPLE_CAFE_DOCUMENT;
  if (/login|password|access|account/.test(text)) return SAMPLE_ACCOUNT_DOCUMENT;
  return SAMPLE_HELP_DOCUMENT;
}

export function extractFaqsFromDocument(text: string): Array<Partial<FaqItem>> {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .replace(/^#+\s*/, "")
        .replace(/^Q:\s*/i, "")
        .replace(/^A:\s*/i, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  const faqs: Array<Partial<FaqItem>> = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const question = blocks[index];
    const answer = blocks[index + 1];
    if (!/\?\s*$/.test(question) || !answer || /\?\s*$/.test(answer)) continue;
    faqs.push({
      question: question.replace(/\s+/g, " ").trim(),
      answer: answer.replace(/\s+/g, " ").trim(),
      category: inferCategory(question + " " + answer),
    });
    index += 1;
  }
  return faqs;
}

export function generateFaqsFromSources(sources: KnowledgeSource[]): GeneratedSuggestion[] {
  const extracted: GeneratedSuggestion[] = [];
  sources.forEach((source) => {
    const text = source.text?.trim() || sampleDocumentForName(`${source.name} ${source.href ?? ""}`);
    extractFaqsFromDocument(text).forEach((seed) => {
      extracted.push(suggestionFromSeed(seed, sourceLabel(source)));
    });
  });

  const unique = dedupeSuggestions(extracted);
  if (unique.length >= 3) return unique.slice(0, 8);

  const corpus = sources
    .map((source) => [source.name, source.href, source.text].filter(Boolean).join(" "))
    .join(" ");
  const fallback = generateFaqsFromIntent(corpus).map((faq) => ({
    ...faq,
    source: sources[0] ? `AI generated · ${sourceLabel(sources[0])}` : faq.source,
  }));

  return dedupeSuggestions([...unique, ...fallback]).slice(0, 8);
}

export function generateFaqsFromIntent(intent: string): GeneratedSuggestion[] {
  const text = intent.toLowerCase();
  let seeds = DEFAULT_GENERATED_FAQS;
  if (/cafe|restaurant|reserv|menu|cater|opening hours/.test(text)) seeds = CAFE_GENERATED_FAQS;
  else if (/refund|billing|payment|charge|subscription|invoice/.test(text)) seeds = BILLING_GENERATED_FAQS;
  else if (/login|password|access|account/.test(text)) seeds = ACCOUNT_GENERATED_FAQS;

  return seeds.map((seed) => suggestionFromSeed(seed, "AI generated"));
}

export function nameFromSources(sources: KnowledgeSource[]): string {
  if (sources.length === 1) {
    const source = sources[0];
    if (source.kind === "url") return nameFromIntent(`${source.name} ${source.href ?? ""}`);
    const stem = source.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
    if (stem) return stem.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return nameFromIntent(sources.map((source) => `${source.name} ${source.href ?? ""}`).join(" "));
}

export function nameFromIntent(intent: string): string {
  const text = intent.toLowerCase();
  if (/cafe|restaurant|reserv|menu/.test(text)) return "Cafe & guest support";
  if (/refund|billing|payment|charge|subscription/.test(text)) return "Billing & Pricing";
  if (/login|password|access|account/.test(text)) return "Account & Login";
  if (/security|privacy|data/.test(text)) return "Security";
  return "Support knowledge";
}

export function sampleKnowledgeSources(): KnowledgeSource[] {
  return [
    {
      id: newKnowledgeId("src"),
      kind: "url",
      name: "help.justcall.io/billing",
      href: "https://help.justcall.io/billing",
      typeLabel: "Webpage",
      text: SAMPLE_HELP_DOCUMENT,
    },
    {
      id: newKnowledgeId("src"),
      kind: "file",
      name: "refund-policy.pdf",
      typeLabel: "PDF",
      sizeLabel: "240 KB",
      text: SAMPLE_HELP_DOCUMENT,
    },
  ];
}

function suggestionFromSeed(seed: Partial<FaqItem>, source: string): GeneratedSuggestion {
  const question = seed.question ?? "";
  return {
    ...createEmptyFaq({
      ...seed,
      title: seed.title || deriveFaqTitle(question),
      exampleQuestions: generateSimilarQuestions(question),
      source,
      status: "draft",
    }),
    selected: true,
  };
}

function sourceLabel(source: KnowledgeSource): string {
  return source.kind === "url" ? source.name : source.name;
}

function dedupeSuggestions(items: GeneratedSuggestion[]): GeneratedSuggestion[] {
  const unique: GeneratedSuggestion[] = [];
  items.forEach((item) => {
    const exists = unique.some((other) => tokensOverlap(item.question, other.question) >= 0.5);
    if (!exists) unique.push(item);
  });
  return unique;
}

function inferCategory(text: string): string {
  const value = text.toLowerCase();
  if (/refund|money back/.test(value)) return "Refund";
  if (/payment|card|charge|invoice|billed/.test(value)) return "Billing";
  if (/subscription|cancel|renew/.test(value)) return "Subscription";
  if (/password|login|account|email/.test(value)) return "Account";
  if (/hours|reserv|menu|cater|deliver/.test(value)) return "Product";
  return "Product";
}

export function publishRepository(repo: KnowledgeRepository): KnowledgeRepository {
  return {
    ...repo,
    status: "live",
    updated: "Just now",
    faqs: repo.faqs.map((faq) => ({
      ...faq,
      status: faq.question.trim() && faq.answer.trim() ? "published" : "needs_review",
      updated: "Just now",
    })),
  };
}

function findDuplicateGroups(faqs: FaqItem[]): FaqItem[][] {
  const groups: FaqItem[][] = [];
  const used = new Set<string>();
  faqs.forEach((faq) => {
    if (used.has(faq.id) || !faq.question.trim()) return;
    const matches = faqs.filter(
      (other) => other.id !== faq.id && tokensOverlap(faq.question, other.question) >= 0.5
    );
    if (matches.length) {
      const group = [faq, ...matches];
      group.forEach((item) => used.add(item.id));
      groups.push(group);
    }
  });
  return groups;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .map((token) =>
      token
        .replace(/able$/, "")
        .replace(/ing$/, "")
        .replace(/ies$/, "y")
        .replace(/s$/, "")
    );
}

function tokensOverlap(a: string, b: string): number {
  const left = tokenize(a);
  const right = new Set(tokenize(b));
  if (!left.length || !right.size) return 0;
  const hits = left.filter((token) => right.has(token)).length;
  return hits / left.length;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

const KNOWN_PARAPHRASES = [
  {
    seed: "Can I get a refund?",
    paraphrases: [
      "Can I get my money back?",
      "Can you reverse this payment?",
      "I was charged accidentally.",
      "Is my subscription refundable?",
    ],
  },
  {
    seed: "Why was I charged twice?",
    paraphrases: [
      "Why did you charge my card twice?",
      "There's a duplicate charge on my statement.",
      "I think I was billed two times.",
    ],
  },
  {
    seed: "How do I cancel my subscription?",
    paraphrases: [
      "I want to cancel.",
      "How do I stop being billed?",
      "Can you turn off auto-renew?",
    ],
  },
];

const BILLING_GENERATED_FAQS: Array<Partial<FaqItem>> = [
  {
    title: "Failed payment",
    question: "Why did my payment fail?",
    answer:
      "Failed payments are usually caused by an expired card, insufficient funds, or a bank decline. Ask the customer to update the card on file and retry the charge.",
    category: "Payments",
  },
  {
    title: "Duplicate charge",
    question: "Why was I charged twice?",
    answer:
      "If two charges appear on the customer's statement, first verify whether both transactions have completed. Pending transactions may disappear automatically within 3–5 business days.",
    category: "Billing",
  },
  {
    title: "Refund eligibility",
    question: "How can I request a refund?",
    answer:
      "Refunds are available within 30 days of purchase for eligible subscriptions. Refunds are returned to the original payment method.",
    category: "Refund",
    additionalGuidance: "Refunds do not apply to usage-based charges.",
  },
  {
    title: "Payment method",
    question: "How do I change my payment method?",
    answer:
      "Customers can update the card on file from Billing → Payment methods. The new card is charged on the next renewal.",
    category: "Payments",
  },
  {
    title: "Cancel subscription",
    question: "How do I cancel my subscription?",
    answer:
      "Cancellations take effect at the end of the current billing period. Access continues until that date, and no further renewals are charged.",
    category: "Subscription",
  },
];

const CAFE_GENERATED_FAQS: Array<Partial<FaqItem>> = [
  {
    title: "Opening hours",
    question: "What are your opening hours?",
    answer:
      "Most cafes are open 7:00am–7:00pm weekdays and 8:00am–6:00pm weekends. Hours can vary by location — confirm the store the customer is calling about.",
    category: "Product",
  },
  {
    title: "Table reservations",
    question: "Can I reserve a table?",
    answer:
      "Reservations are available for parties of 4 or more. Walk-ins are welcome when tables are free. Bookings can be made up to 14 days in advance.",
    category: "Product",
  },
  {
    title: "Menu availability",
    question: "Do you have oat milk / gluten-free options?",
    answer:
      "All locations carry oat, almond, and dairy milk. Gluten-free pastries are available until they sell out, usually by early afternoon.",
    category: "Product",
  },
  {
    title: "Refunds",
    question: "Can I get a refund on an order?",
    answer:
      "Incorrect or damaged orders can be refunded or remade the same day. Refunds go back to the original payment method.",
    category: "Refund",
  },
  {
    title: "Catering",
    question: "Do you offer catering?",
    answer:
      "Catering is available with 48 hours' notice for 10 or more people. A 50% deposit is required when the order is placed.",
    category: "Product",
  },
  {
    title: "Delivery",
    question: "Do you deliver?",
    answer:
      "Delivery is available within 3 miles of each cafe through our app and major delivery partners. Delivery hours match cafe opening hours.",
    category: "Product",
  },
];

const ACCOUNT_GENERATED_FAQS: Array<Partial<FaqItem>> = [
  {
    title: "Reset password",
    question: "How do I reset my password?",
    answer:
      "Send a reset link to the email on the account. The link expires in 30 minutes. If the email doesn't arrive, check spam and confirm the address on file.",
    category: "Account",
  },
  {
    title: "Locked account",
    question: "Why is my account locked?",
    answer:
      "Accounts lock after 5 failed sign-in attempts. They unlock automatically after 15 minutes, or an agent can unlock them after verifying the customer.",
    category: "Account",
  },
  {
    title: "Change email",
    question: "How do I change the email on my account?",
    answer:
      "The customer must verify the current email before a new one can be saved. Changes take effect immediately for sign-in.",
    category: "Account",
  },
];

const DEFAULT_GENERATED_FAQS = BILLING_GENERATED_FAQS;

const SAMPLE_HELP_DOCUMENT = `Can I get a refund?
Refunds are available within 30 days of purchase for eligible subscriptions. Refunds are returned to the original payment method.

Why was I charged twice?
If two charges appear on the customer's statement, first verify whether both transactions have completed. Pending transactions may disappear automatically within 3–5 business days.

How do I cancel my subscription?
Cancellations take effect at the end of the current billing period. Access continues until that date, and no further renewals are charged.

How do I change my payment method?
Customers can update the card on file from Billing → Payment methods. The new card is charged on the next renewal.

Why did my payment fail?
Failed payments are usually caused by an expired card, insufficient funds, or a bank decline. Ask the customer to update the card on file and retry the charge.
`;

const SAMPLE_CAFE_DOCUMENT = `What are your opening hours?
Most cafes are open 7:00am–7:00pm weekdays and 8:00am–6:00pm weekends. Hours can vary by location — confirm the store the customer is calling about.

Can I reserve a table?
Reservations are available for parties of 4 or more. Walk-ins are welcome when tables are free. Bookings can be made up to 14 days in advance.

Do you have oat milk / gluten-free options?
All locations carry oat, almond, and dairy milk. Gluten-free pastries are available until they sell out, usually by early afternoon.

Can I get a refund on an order?
Incorrect or damaged orders can be refunded or remade the same day. Refunds go back to the original payment method.

Do you offer catering?
Catering is available with 48 hours' notice for 10 or more people. A 50% deposit is required when the order is placed.

Do you deliver?
Delivery is available within 3 miles of each cafe through our app and major delivery partners. Delivery hours match cafe opening hours.
`;

const SAMPLE_ACCOUNT_DOCUMENT = `How do I reset my password?
Send a reset link to the email on the account. The link expires in 30 minutes. If the email doesn't arrive, check spam and confirm the address on file.

Why is my account locked?
Accounts lock after 5 failed sign-in attempts. They unlock automatically after 15 minutes, or an agent can unlock them after verifying the customer.

How do I change the email on my account?
The customer must verify the current email before a new one can be saved. Changes take effect immediately for sign-in.
`;
