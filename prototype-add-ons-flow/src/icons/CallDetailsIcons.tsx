import * as React from "react";

/**
 * Call details sidesheet — glyphs not yet in the shared Icon set
 * (Figma "Sidesheet/Info", node 40002568:19554): a generic person glyph
 * for "Agent Name" and the star-rating control. `IconUser` reuses the same
 * path as the DS `Avatar` placeholder so the person glyph stays consistent
 * across the library.
 *
 * `IconArrowUp` / `IconArrowDown` and `IconMessageSquare` are page-local too
 * — exported from `icon-library/call logs table/Sidesheet/` but not yet run
 * through the shared icon pipeline. The arrows are a fixed 12px keycap glyph
 * (outside the DS's 16/20/24 size system), and the message glyph is
 * deliberately kept separate from the shared `IconMessages` so it doesn't
 * change that icon everywhere else it's used (e.g. `GlobalHeader`).
 */

export function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 14 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M0.75 18.75V16.75C0.75 15.6891 1.17143 14.6717 1.92157 13.9216C2.67172 13.1714 3.68913 12.75 4.75 12.75H8.75C9.81087 12.75 10.8283 13.1714 11.5784 13.9216C12.3286 14.6717 12.75 15.6891 12.75 16.75V18.75M2.75 4.75C2.75 5.81087 3.17143 6.82828 3.92157 7.57843C4.67172 8.32857 5.68913 8.75 6.75 8.75C7.81087 8.75 8.82828 8.32857 9.57843 7.57843C10.3286 6.82828 10.75 5.81087 10.75 4.75C10.75 3.68913 10.3286 2.67172 9.57843 1.92157C8.82828 1.17143 7.81087 0.75 6.75 0.75C5.68913 0.75 4.67172 1.17143 3.92157 1.92157C3.17143 2.67172 2.75 3.68913 2.75 4.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconArrowUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 2.5V9.5M3 5.5L6 2.5L9 5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconArrowDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 2.5V9.5M3 6.5L6 9.5L9 6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMessageSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6.66667 7.50016H13.3333M6.66667 10.8335H11.6667M15 3.3335C15.663 3.3335 16.2989 3.59689 16.7678 4.06573C17.2366 4.53457 17.5 5.17045 17.5 5.8335V12.5002C17.5 13.1632 17.2366 13.7991 16.7678 14.2679C16.2989 14.7368 15.663 15.0002 15 15.0002H10.8333L6.66667 17.5002V15.0002H5C4.33696 15.0002 3.70107 14.7368 3.23223 14.2679C2.76339 13.7991 2.5 13.1632 2.5 12.5002V5.8335C2.5 5.17045 2.76339 4.53457 3.23223 4.06573C3.70107 3.59689 4.33696 3.3335 5 3.3335H15Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconStar({
  filled,
  ...props
}: React.SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path
        d="M8.243 2.34a.25.25 0 0 1 .452 0l1.412 2.86a.25.25 0 0 0 .188.137l3.157.459a.25.25 0 0 1 .139.427l-2.285 2.226a.25.25 0 0 0-.072.222l.539 3.144a.25.25 0 0 1-.362.263L8.582 10.5a.25.25 0 0 0-.233 0l-2.822 1.484a.25.25 0 0 1-.362-.263l.539-3.144a.25.25 0 0 0-.072-.222L3.358 6.13a.25.25 0 0 1 .139-.427l3.157-.46a.25.25 0 0 0 .188-.136z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
