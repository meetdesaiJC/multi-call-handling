import type { AvatarColor } from "./Avatar";

/**
 * Deriving an avatar from a name, for the very common case where there is no
 * photo and nobody has assigned a colour by hand.
 *
 * It lives beside `Avatar` rather than in a prototype because every list of
 * people wants the same two answers, and a second copy of them is how the
 * same teammate ends up pink in one panel and orange in the next.
 */

/**
 * The fill cycle. Grey is deliberately out: it is the placeholder colour, so a
 * real person landing on it reads as a row that failed to load.
 */
export const AVATAR_COLOR_CYCLE: AvatarColor[] = [
  "indigo",
  "purple",
  "pink",
  "orange",
  "bluegrey",
];

/**
 * First and last initial — "Saurabh Bhardwaj" → "SB", "Onboarding line" → "OL".
 *
 * Middle names are dropped rather than included, because two letters is what
 * the 24 and 32px avatars can hold legibly and the first and last are the
 * pair a reader matches against the name printed beside them.
 */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * A stable colour for an id.
 *
 * Keyed on the id and not on the name so that a contact who gets renamed —
 * or whose name the agent typed slightly differently — keeps the colour the
 * agent has already learned to recognise them by.
 */
export function avatarColorFromId(id: string): AvatarColor {
  // FNV-1a. A plainer `hash * 31 + code` clumps badly on ids that share a
  // prefix — a directory of `ext-*` contacts came out three-fifths one colour
  // — and the whole job of the fill is telling neighbouring rows apart.
  //
  // Seeded with 1 rather than FNV's usual offset basis, which is arbitrary
  // for a five-way bucket anyway. Seven people over five fills must collide,
  // so what a seed can buy is *where* — this one puts no two matching discs
  // next to each other in the transfer directory. Re-pick it freely if a
  // list you care about lands badly; nothing depends on the value.
  let hash = 1;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return AVATAR_COLOR_CYCLE[hash % AVATAR_COLOR_CYCLE.length];
}
