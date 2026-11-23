import * as React from "react";

/**
 * AI Insights empty state — feature pill glyphs (Figma "AI Insights Tab",
 * node 40002572:34817). `IconTranscriptionAi` is the exact Figma export
 * (icon-library/Notifications/Transcription Ai.svg) — dark document strokes
 * plus gradient sparkles; gradient ids are namespaced per-instance via
 * `useId` so multiple pills on the same page don't collide.
 */

export function IconTranscriptionAi(props: React.SVGProps<SVGSVGElement>) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <g clipPath={`url(#${id}-clip)`}>
        <path
          d="M7.667 2H4.667a1.333 1.333 0 0 0-1.334 1.333v9.334A1.333 1.333 0 0 0 4.667 14h6.666a1.333 1.333 0 0 0 1.334-1.333V8.667"
          stroke="var(--color-foreground)"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M6 4.667h1.667" stroke="var(--color-foreground)" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 7.333h3.667" stroke="var(--color-foreground)" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 10h2.333" stroke="var(--color-foreground)" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M10.917 0 10.03 2.364l-2.363.886 2.364.886.886 2.364.887-2.364 2.363-.886-2.363-.886z"
          fill={`url(#${id}-a)`}
        />
        <path
          d="M13.833 4 13.242 5.576l-1.576.59 1.576.591.591 1.577.591-1.577 1.576-.59-1.576-.591z"
          fill={`url(#${id}-b)`}
        />
      </g>
      <defs>
        <linearGradient id={`${id}-a`} x1="5.958" y1="-5.107" x2="18.506" y2="-4.039" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-ai-gradient-from)" />
          <stop offset="1" stopColor="var(--color-ai-gradient-to)" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="10.528" y1="0.595" x2="18.893" y2="1.308" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-ai-gradient-from)" />
          <stop offset="1" stopColor="var(--color-ai-gradient-to)" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function IconSmartChapters(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8 4C8.912 3.474 9.947 3.196 11 3.196c1.053 0 2.088.278 3 .804v8.667c-.912-.527-1.947-.804-3-.804-1.053 0-2.088.277-3 .804-.912-.527-1.947-.804-3-.804-1.053 0-2.088.277-3 .804V4c.912-.527 1.947-.804 3-.804 1.053 0 2.088.278 3 .804Zm0 8.667V4"
        stroke="var(--color-purple-700)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconActionItemsCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 7.334 8 9.334l5.333-5.334M13.333 8v4a1.333 1.333 0 0 1-1.333 1.333H4A1.333 1.333 0 0 1 2.667 12V4A1.333 1.333 0 0 1 4 2.667h6"
        stroke="var(--color-success)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
