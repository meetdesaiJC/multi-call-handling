/**
 * Icon library — framed SVGs synced from Figma Design System 2.0 / Icons.
 * Each icon ships size 16 / 20 / 24 (exact Figma frames + stroke weights).
 *
 * Pull missing icons:  pnpm icons:pull "<Figma name>" --size 16,20,24
 * Regenerate:          pnpm icons:generate
 *
 * Pair CSS box with variant: size-4↔16, size-5↔20, size-6↔24.
 */
export type { IconProps, IconSize } from "./icons.generated";
export * from "./icons.generated";

/* ── Hand-made icons ─────────────────────────────────────────────────────
   Not in the Figma set. `npm run icons:generate` keeps everything from this
   marker down; anything above it is regenerated. */
import type { IconProps } from "./icons.generated";

/**
 * Outlined circular speech bubble — Design System `message-circle-2`.
 * Same geometry as the filled variant, stroked instead of filled. The 1.5
 * weight on a 24px viewBox scales to the DS weights (1 at 16, 1.25 at 20).
 */
export function IconMessageCircle2({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2c5.523 0 10 4.477 10 10a10 10 0 0 1-10 10 9.96 9.96 0 0 1-4.708-1.178 1 1 0 0 0-.607-.092l-4.307.91a1.01 1.01 0 0 1-1.218-1.218l.91-4.307a1 1 0 0 0-.093-.608A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Filled circular speech bubble — Design System `message-circle-2-filled`.
 * Uses a 24px viewBox so the filled glyph can CSS-scale (stroke icons cannot).
 */
export function IconMessageCircle2Filled({
  size = 24,
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2c5.523 0 10 4.477 10 10a10 10 0 0 1-10 10 9.96 9.96 0 0 1-4.708-1.178 1 1 0 0 0-.607-.092l-4.307.91a1.01 1.01 0 0 1-1.218-1.218l.91-4.307a1 1 0 0 0-.093-.608A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}
