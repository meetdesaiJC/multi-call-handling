import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Hand-exported Figma glyphs that are not yet in the icon pipeline.
 *
 * These are fixed-20px SVGs with hardcoded strokes, unlike `icons.tsx` /
 * `icons.generated.tsx` which ship 16/20/24 and use `currentColor`. They live
 * here because both prototypes' Dashboard screens use them; keeping them out
 * of `icons.tsx` marks them as the set still owing a pipeline migration
 * (`npm run icons:pull "calendar-time" "mail-share" --size 16,20,24`).
 *
 * Dashboard toolbar glyphs — exact Figma exports (icon-library/dashboard/
 * calendar-time.svg, mail-share.svg) for the "Schedule" and "Share" toolbar
 * buttons above the KPI row.
 */

export function IconCalendarTime({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"
      className={cn("text-foreground", className)}
      {...props}
    >
      <path
        d="M9.82917 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V5.83333C2.5 5.39131 2.67559 4.96738 2.98816 4.65482C3.30072 4.34226 3.72464 4.16667 4.16667 4.16667H14.1667C14.6087 4.16667 15.0326 4.34226 15.3452 4.65482C15.6577 4.96738 15.8333 5.39131 15.8333 5.83333V9.16667H2.5M12.5 2.5V5.83333M5.83333 2.5V5.83333M15 13.7467V15.0001L15.8333 15.8334M11.6667 15C11.6667 15.8841 12.0179 16.7319 12.643 17.357C13.2681 17.9821 14.1159 18.3333 15 18.3333C15.8841 18.3333 16.7319 17.9821 17.357 17.357C17.9821 16.7319 18.3333 15.8841 18.3333 15C18.3333 14.1159 17.9821 13.2681 17.357 12.643C16.7319 12.0179 15.8841 11.6667 15 11.6667C14.1159 11.6667 13.2681 12.0179 12.643 12.643C12.0179 13.2681 11.6667 14.1159 11.6667 15Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMailShare({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"
      className={cn("text-foreground", className)}
      {...props}
    >
      <path
        d="M10.8333 15.8337H4.16667C3.72464 15.8337 3.30072 15.6581 2.98816 15.3455C2.67559 15.0329 2.5 14.609 2.5 14.167V5.83366M2.5 5.83366C2.5 5.39163 2.67559 4.96771 2.98816 4.65515C3.30072 4.34259 3.72464 4.16699 4.16667 4.16699H15.8333C16.2754 4.16699 16.6993 4.34259 17.0118 4.65515C17.3244 4.96771 17.5 5.39163 17.5 5.83366M2.5 5.83366L10 10.8337L17.5 5.83366M17.5 5.83366V10.8337M13.3333 18.3337L17.5 14.167M13.75 14.167H17.5V17.917"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
