import type { GuidanceItem } from "./guidanceData";
import type { KnowledgeEntry, KnowledgeSourceRecord } from "./knowledgeData";

/**
 * In-call search — what the agent can look up themselves when the automatic
 * guidance hasn't answered their question.
 *
 * The corpus is deliberately narrower than "everything the company has
 * written": published response cards and published knowledge, assigned to this
 * agent. That is the admin's guarantee — a draft is not a half-visible draft
 * during a live call, it is invisible — and it is why an empty result set has
 * to explain itself rather than shrug (§4 of the brief).
 */

/**
 * The agent taking the call. One object rather than a prop threaded through
 * four components: every surface that filters by assignment has to filter by
 * the same person, and a second copy of "who is on this call" is how the
 * search results and the live stream start disagreeing.
 */
export const CALL_AGENT = {
  id: "sarah",
  name: "Sarah Johnson",
  /** Groups the admin has put this agent in. */
  userGroups: ["sales", "support"],
} as const;

export type SearchHitKind = "card" | "knowledge";

export interface SearchHit {
  /** Stable across queries, so a pin survives the agent retyping. */
  id: string;
  kind: SearchHitKind;
  title: string;
  /** One line under the title in a result row. */
  snippet: string;
  /** Where it came from — the reassurance that this is approved content. */
  sourceLabel: string;
  card?: GuidanceItem;
  knowledge?: {
    entry: KnowledgeEntry;
    sourceName: string;
    sourceOrigin?: string;
  };
}

/** A hit plus the text search runs against. Built once per call. */
interface CorpusEntry {
  hit: SearchHit;
  /** Weighted haystacks: name and cues beat body copy. */
  strong: string;
  weak: string;
}

function assignedToAgent(teamMembers: string[], userGroups: string[]): boolean {
  // Nobody named means everybody — the same rule the Knowledge audience uses.
  if (teamMembers.length === 0 && userGroups.length === 0) return true;
  if (teamMembers.includes(CALL_AGENT.id)) return true;
  return userGroups.some((group) =>
    (CALL_AGENT.userGroups as readonly string[]).includes(group)
  );
}

function firstSentence(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max)}…`;
}

/**
 * Everything this agent is allowed to find, in one list. Cards first so a
 * published response card outranks a knowledge paragraph on an equal match —
 * a card is what someone decided the agent should *say*.
 */
export function buildSearchCorpus(
  cards: GuidanceItem[],
  sources: KnowledgeSourceRecord[]
): CorpusEntry[] {
  const corpus: CorpusEntry[] = [];

  for (const card of cards) {
    if (card.status !== "live") continue;
    if (!assignedToAgent(card.teamMembers, card.userGroups)) continue;
    corpus.push({
      hit: {
        id: `card:${card.id}`,
        kind: "card",
        title: card.name,
        snippet: firstSentence(card.suggestedResponse || card.trigger),
        sourceLabel: "Response card",
        card,
      },
      strong: [card.name, ...card.examplePhrases].join(" "),
      weak: [card.trigger, card.suggestedResponse, ...card.talkingPoints].join(" "),
    });
  }

  for (const source of sources) {
    // `failed` is a source that could not be read at all, so it holds nothing
    // trustworthy; `draft` is one nobody has approved yet.
    if (source.status !== "live") continue;
    if (!assignedToAgent(source.audienceUsers, source.audienceTeams)) continue;
    for (const entry of source.entries) {
      corpus.push({
        hit: {
          id: `kb:${source.id}:${entry.id}`,
          kind: "knowledge",
          title: entry.title,
          snippet: firstSentence(entry.summary || entry.answer),
          sourceLabel: source.name,
          knowledge: {
            entry,
            sourceName: source.name,
            sourceOrigin: source.origin || undefined,
          },
        },
        strong: [entry.title, ...entry.cues].join(" "),
        weak: [entry.summary ?? "", entry.answer].join(" "),
      });
    }
  }

  return corpus;
}

/** Shortest query worth running. One letter matches half the library. */
export const SEARCH_MIN_CHARS = 2;

function tokenise(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

/**
 * Token overlap, weighted by where the token landed. Not fuzzy: an agent
 * mid-call types the word they just heard, and a search that guesses at
 * near-misses costs more trust than it buys.
 */
export function searchCorpus(
  corpus: CorpusEntry[],
  query: string,
  limit = 12
): SearchHit[] {
  const tokens = tokenise(query);
  if (tokens.length === 0) return [];

  const scored: { hit: SearchHit; score: number }[] = [];
  for (const entry of corpus) {
    const strong = entry.strong.toLowerCase();
    const weak = entry.weak.toLowerCase();
    let score = 0;
    let matched = 0;
    for (const token of tokens) {
      if (strong.includes(token)) {
        score += 3;
        matched += 1;
        // Leading the title is the strongest signal a human can give.
        if (entry.hit.title.toLowerCase().startsWith(token)) score += 2;
      } else if (weak.includes(token)) {
        score += 1;
        matched += 1;
      }
    }
    // Every word has to land somewhere. "refund policy" should not return
    // every card that mentions a policy.
    if (matched < tokens.length) continue;
    if (entry.hit.kind === "card") score += 0.5;
    scored.push({ hit: entry.hit, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.hit);
}

/** How many cards may be pinned at once. */
export const PIN_LIMIT = 3;
