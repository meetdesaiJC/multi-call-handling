/**
 * JS-side mirror of the duration scale in `src/styles/tokens/motion.css`.
 *
 * Presence logic (keep an overlay mounted until its exit transition ends)
 * needs the duration as a number, and CSS custom properties are only
 * readable at runtime off a live element. Rather than have each component
 * re-type its own literal — which is how the panel and its unmount timer
 * drift apart — they all import from here.
 *
 * Change a value in motion.css, change it here. The two are checked
 * against each other by the Tokens/Motion story, which renders both.
 */
export const DURATION = {
  instant: 0,
  micro: 80,
  fast: 120,
  base: 150,
  moderate: 200,
  slow: 240,
  emphasis: 600,
  settle: 1600,
} as const;

export type DurationName = keyof typeof DURATION;
