import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Dots loader — Figma "Dots loader" (node 703:176653).
 *
 * Three dots with one travelling through them: the dot in front stretches
 * into a pill at full strength while the ones behind it fade back. It marks
 * a slot that is *waiting to be filled* — a call still in the IVR has no team
 * member yet — so it sits where the value will land rather than replacing
 * the row with a spinner.
 *
 * The loop lives in CSS (`.dots-loader-dot` in `styles/base.css`), on the
 * ambient-loop tokens, for the same reason as `WaveformLoader`: a
 * `requestAnimationFrame` pulse stops dead whenever the page is hidden.
 *
 * Dots are `bg-current`, so the loader takes the colour of its container
 * (default `text-border`, the Figma grey).
 */

export interface DotsLoaderProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Announced to screen readers. Omit when neighbouring copy already says
   * what is being waited on.
   */
  label?: string;
}

export const DotsLoader = React.forwardRef<HTMLSpanElement, DotsLoaderProps>(
  ({ label, className, ...props }, ref) => (
    <span
      ref={ref}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-flex h-4 items-center gap-[5px] text-border", className)}
      {...props}
    >
      {/* The resting classes are the Figma frame — what reduced motion shows. */}
      <span className="dots-loader-dot size-[7px] scale-y-[1.7] rounded-full bg-current" />
      <span className="dots-loader-dot size-[7px] rounded-full bg-current opacity-70" />
      <span className="dots-loader-dot size-[7px] rounded-full bg-current opacity-30" />
    </span>
  )
);
DotsLoader.displayName = "DotsLoader";
