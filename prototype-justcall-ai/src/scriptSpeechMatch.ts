import { spokenLineFor, type PlaybookStep } from "./scriptPlaybook";

export const SCRIPT_MATCH_THRESHOLD = 0.5;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "for",
  "from",
  "had",
  "has",
  "have",
  "how",
  "i",
  "id",
  "if",
  "im",
  "in",
  "is",
  "it",
  "its",
  "just",
  "me",
  "my",
  "no",
  "not",
  "of",
  "ok",
  "okay",
  "on",
  "or",
  "our",
  "so",
  "than",
  "that",
  "the",
  "then",
  "this",
  "to",
  "us",
  "was",
  "we",
  "were",
  "weve",
  "will",
  "with",
  "would",
  "you",
  "your",
  "youre",
]);

function normalizeToken(word: string): string {
  let next = word.toLowerCase().replace(/['’]/g, "");
  if (next.length <= 3) return next;
  if (next.endsWith("ing") && next.length > 5) next = next.slice(0, -3);
  else if (next.endsWith("ed") && next.length > 4) next = next.slice(0, -2);
  else if (next.endsWith("ies") && next.length > 5) next = `${next.slice(0, -3)}y`;
  else if (next.endsWith("es") && next.length > 4) next = next.slice(0, -2);
  else if (next.endsWith("s") && !next.endsWith("ss")) next = next.slice(0, -1);
  return next;
}

function scriptTokens(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word))
    .map(normalizeToken)
    .filter(Boolean);

  return [...new Set(words)];
}

function tokensAlign(spoken: string, script: string): boolean {
  if (spoken === script) return true;
  return spoken.length >= 4 && script.length >= 4 && (spoken.startsWith(script) || script.startsWith(spoken));
}

export function scriptMatchRatio(spoken: string, script: string): number {
  const needles = scriptTokens(script);
  if (needles.length === 0) return scriptTokens(spoken).length > 0 ? 1 : 0;

  const hay = scriptTokens(spoken);
  const hits = needles.filter((token) => hay.some((word) => tokensAlign(word, token))).length;
  return hits / needles.length;
}

function firstClause(text: string): string {
  const sentence = text.match(/[\s\S]+?[.!?]/)?.[0]?.trim();
  const clause = text.split(/[,;—–]/)[0]?.trim();
  const lead = [sentence, clause]
    .filter((part): part is string => Boolean(part) && part !== text)
    .sort((a, b) => b.length - a.length)[0];
  return lead ?? text;
}

export function scriptStepScore(spoken: string, step: PlaybookStep): number {
  if (!spoken.trim()) return 0;
  const line = spokenLineFor(step);
  let score = scriptMatchRatio(spoken, line);
  const lead = firstClause(line);
  if (lead !== line) score = Math.max(score, scriptMatchRatio(spoken, lead));
  const title = step.title.trim();
  if (title && title !== line) score = Math.max(score, scriptMatchRatio(spoken, title));
  return score;
}

export function matchesScriptStep(spoken: string, step: PlaybookStep, threshold = SCRIPT_MATCH_THRESHOLD): boolean {
  return scriptStepScore(spoken, step) >= threshold;
}

/** Incomplete steps whose wording matches the utterance, best score first. */
export function matchingOpenStepIndexes(
  spoken: string,
  steps: readonly PlaybookStep[],
  completed: ReadonlySet<number>,
  threshold = SCRIPT_MATCH_THRESHOLD
): number[] {
  if (!spoken.trim()) return [];
  return steps
    .map((step, index) => ({ index, score: completed.has(index) ? 0 : scriptStepScore(spoken, step) }))
    .filter((hit) => hit.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map((hit) => hit.index);
}
