/**
 * Contact fields in scripts — one script, written once, that reads back
 * differently on every call.
 *
 * An admin drops `{{first_name}}` into a step's wording; the agent never sees
 * that. On a live call the token is replaced by whatever the CRM record holds,
 * and when the record holds nothing it is replaced by an admin-defined
 * fallback. The one thing that must never reach a live call is the raw token,
 * so every path out of `resolveFieldText` ends in real words or in nothing at
 * all — never in braces.
 *
 * The common contact fields plus the CRM platform used by discovery scripts.
 */

export type ContactFieldId =
  | "first_name"
  | "last_name"
  | "company"
  | "crm_name"
  | "email"
  | "phone";

export interface ContactFieldMeta {
  id: ContactFieldId;
  label: string;
  /** What the admin inserts and what the editor matches on. */
  token: string;
  /**
   * The words used when the record is empty and the admin has not written
   * their own fallback. Chosen so the sentence still scans: "Hi there", not
   * "Hi first name". `last_name` has no graceful stand-in, so it resolves to
   * nothing and the sentence closes over the gap.
   */
  defaultFallback: string;
  /** Filled in on the builder's preview line, so the admin reads a sentence. */
  sample: string;
}

export const CONTACT_FIELDS: ContactFieldMeta[] = [
  {
    id: "first_name",
    label: "First name",
    token: "{{first_name}}",
    defaultFallback: "there",
    sample: "Elena",
  },
  {
    id: "last_name",
    label: "Last name",
    token: "{{last_name}}",
    defaultFallback: "",
    sample: "Vasquez",
  },
  {
    id: "company",
    label: "Company",
    token: "{{company}}",
    defaultFallback: "your team",
    sample: "Acme Corp",
  },
  {
    id: "crm_name",
    label: "CRM name",
    token: "{{crm_name}}",
    defaultFallback: "[CRM name not available]",
    sample: "Salesforce",
  },
  {
    id: "email",
    label: "Email",
    token: "{{email}}",
    defaultFallback: "the email on file",
    sample: "elena@acmecorp.com",
  },
  {
    id: "phone",
    label: "Phone",
    token: "{{phone}}",
    defaultFallback: "the number on file",
    sample: "+1 415 555 0132",
  },
];

const FIELD_BY_ID = new Map<string, ContactFieldMeta>(
  CONTACT_FIELDS.map((field) => [field.id, field])
);

export function contactFieldMeta(id: ContactFieldId): ContactFieldMeta {
  return FIELD_BY_ID.get(id) ?? CONTACT_FIELDS[0];
}

/** What the CRM knows about this contact. Every field may be missing. */
export type ContactRecord = Partial<Record<ContactFieldId, string>>;

/** What each field falls back to on this script when the record is empty. */
export type FieldFallbacks = Partial<Record<ContactFieldId, string>>;

export const DEFAULT_FIELD_FALLBACKS: FieldFallbacks = Object.fromEntries(
  CONTACT_FIELDS.map((field) => [field.id, field.defaultFallback])
) as FieldFallbacks;

/** A contact with everything filled in — the builder's preview reads off this. */
export const SAMPLE_CONTACT: ContactRecord = Object.fromEntries(
  CONTACT_FIELDS.map((field) => [field.id, field.sample])
) as ContactRecord;

/**
 * The other half of the preview: a real record that happens to be thin. Not an
 * empty object — a contact who called in from a number with a first name and
 * nothing else is the common case, and it is the one the fallbacks are for.
 */
export const SPARSE_SAMPLE_CONTACT: ContactRecord = {
  phone: "+1 415 555 0132",
};

/** `{{ first_name }}` — spaces tolerated, case ignored, letters and _ only. */
const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export type FieldSegment =
  | { kind: "text"; text: string }
  | {
      kind: "field";
      field: ContactFieldMeta;
      /** The token exactly as authored — what the editor mirrors as a chip. */
      raw: string;
      /** What this resolves to — may be "" when the fallback is blank. */
      value: string;
      /** True when the value came from the record rather than the fallback. */
      filled: boolean;
    }
  /** A token naming something that is not a contact field. */
  | { kind: "unknown"; raw: string; name: string };

/**
 * Break authored text into the pieces the editor draws as chips and the call
 * flattens into a sentence. Both surfaces read the same segments, so what the
 * admin previews is what the agent gets.
 */
export function segmentFieldText(
  text: string,
  contact: ContactRecord = {},
  fallbacks: FieldFallbacks = DEFAULT_FIELD_FALLBACKS
): FieldSegment[] {
  const segments: FieldSegment[] = [];
  let cursor = 0;

  TOKEN_RE.lastIndex = 0;
  let match = TOKEN_RE.exec(text);
  while (match !== null) {
    if (match.index > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, match.index) });
    }

    const name = match[1].toLowerCase();
    const field = FIELD_BY_ID.get(name);
    if (field) {
      const recorded = contact[field.id]?.trim() ?? "";
      // Three tiers, first non-empty wins: the record, the admin's fallback,
      // then the field's own. A fallback the admin cleared is a deliberate
      // "say nothing", so it only drops through to the default when the whole
      // key is absent.
      const authored = fallbacks[field.id];
      const fallback = (authored ?? field.defaultFallback).trim();
      segments.push({
        kind: "field",
        field,
        raw: match[0],
        value: recorded || fallback,
        filled: recorded.length > 0,
      });
    } else {
      segments.push({ kind: "unknown", raw: match[0], name });
    }

    cursor = match.index + match[0].length;
    match = TOKEN_RE.exec(text);
  }

  if (cursor < text.length) {
    segments.push({ kind: "text", text: text.slice(cursor) });
  }
  return segments;
}

/**
 * Close the gap a blank replacement leaves behind. "Hi , how are you" is worse
 * than the missing name it came from, so the space before punctuation goes
 * with it and doubled spaces collapse to one.
 */
function tidy(text: string): string {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([([])\s+/g, "$1")
    .trim();
}

/** Authored text as the agent hears it. Never contains a token. */
export function resolveFieldText(
  text: string,
  contact: ContactRecord = {},
  fallbacks: FieldFallbacks = DEFAULT_FIELD_FALLBACKS
): string {
  return tidy(
    segmentFieldText(text, contact, fallbacks)
      .map((segment) =>
        segment.kind === "text"
          ? segment.text
          : segment.kind === "field"
            ? segment.value
            : // An unknown token is a typo or a field that was removed. It
              // resolves to nothing rather than to braces — the agent is
              // mid-sentence and cannot act on either.
              ""
      )
      .join("")
  );
}

export function hasFields(text: string): boolean {
  TOKEN_RE.lastIndex = 0;
  return TOKEN_RE.test(text);
}

/** Which contact fields this text uses, in first-appearance order. */
export function usedFields(text: string): ContactFieldId[] {
  const seen: ContactFieldId[] = [];
  for (const segment of segmentFieldText(text)) {
    if (segment.kind !== "field") continue;
    if (seen.includes(segment.field.id)) continue;
    seen.push(segment.field.id);
  }
  return seen;
}

/** Tokens that name nothing — surfaced in the builder, dropped on the call. */
export function unknownFieldNames(text: string): string[] {
  const seen: string[] = [];
  for (const segment of segmentFieldText(text)) {
    if (segment.kind !== "unknown") continue;
    if (seen.includes(segment.name)) continue;
    seen.push(segment.name);
  }
  return seen;
}

/**
 * Insert a token at the caret, adding the space either side that the admin
 * would otherwise have to remember. Returns the new text and where the caret
 * lands, so the editor can put it after the token rather than at the end.
 */
export function insertFieldToken(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  field: ContactFieldMeta
): { text: string; caret: number } {
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead = before.length > 0 && !/\s$/.test(before) ? " " : "";
  const trail = after.length > 0 && !/^[\s,.!?;:]/.test(after) ? " " : "";
  const inserted = `${lead}${field.token}${trail}`;
  return {
    text: `${before}${inserted}${after}`,
    caret: before.length + inserted.length,
  };
}
