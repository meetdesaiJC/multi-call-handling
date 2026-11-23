import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { IconCircleCheckFilled, IconCircleDashed } from "@/components/Icon";

/**
 * Stepper — the vertical progress rail beside a multi-step setup flow
 * (Add Members: Invite → Assign Roles → Assign Phone Numbers).
 *
 * Each step is one of three states, derived from `current`:
 *   complete → filled green check, label in foreground, revisitable via `onStepSelect`
 *   current  → dashed ring in brand on a brand-subtle row, so "you are here"
 *              reads as work in progress rather than done
 *   upcoming → numbered disc, muted label, not interactive — a step you can't
 *              reach yet shouldn't look like a link
 *   skipped  → set per step via `skipped`: an earlier answer made it moot, so
 *              it stays in the rail (the admin saw it was there) but struck
 *              through, rather than vanishing and renumbering the rest
 *
 * The connector between steps is tall on purpose: the rail sits beside a form
 * that is much taller than the list, and evenly spaced steps keep it reading
 * as a journey rather than a menu.
 */

export interface StepperStep {
  key: string;
  label: React.ReactNode;
  /** An earlier choice made this step unnecessary. */
  skipped?: boolean;
}

export type StepperStepState = "complete" | "current" | "upcoming" | "skipped";

export interface StepperProps extends Omit<React.HTMLAttributes<HTMLOListElement>, "onSelect"> {
  steps: StepperStep[];
  /** Key of the step the user is on. Steps before it are complete. */
  current: string;
  /** Called when a completed step is clicked. Omit to make the rail read-only. */
  onStepSelect?: (key: string) => void;
}

const stepRowVariants = cva(
  "flex h-11 w-full items-center gap-3 rounded-md px-4 text-left text-label-md transition-colors",
  {
    variants: {
      state: {
        complete: "text-foreground",
        current: "bg-brand-subtle text-brand",
        upcoming: "text-muted-foreground",
        skipped: "text-disabled-fg",
      },
      interactive: {
        true: "cursor-pointer hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
        false: "",
      },
    },
    defaultVariants: { state: "upcoming", interactive: false },
  }
);

function StepMarker({ state, index }: { state: StepperStepState; index: number }) {
  if (state === "complete") {
    return <IconCircleCheckFilled size={20} className="shrink-0 text-success" aria-hidden="true" />;
  }
  if (state === "skipped") {
    return (
      <span
        aria-hidden="true"
        className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-line text-label-xs"
      >
        –
      </span>
    );
  }
  if (state === "current") {
    return <IconCircleDashed size={20} className="shrink-0 text-brand" aria-hidden="true" />;
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-label-xs text-muted-foreground"
    >
      {index + 1}
    </span>
  );
}

export const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  ({ steps, current, onStepSelect, className, ...props }, ref) => {
    const currentIndex = Math.max(
      0,
      steps.findIndex((s) => s.key === current)
    );

    return (
      <ol ref={ref} className={cn("flex w-full flex-col", className)} {...props}>
        {steps.map((step, index) => {
          const state: StepperStepState = step.skipped
            ? "skipped"
            : index < currentIndex
              ? "complete"
              : index === currentIndex
                ? "current"
                : "upcoming";
          const interactive = state === "complete" && !!onStepSelect;
          const isLast = index === steps.length - 1;

          const content = (
            <>
              <StepMarker state={state} index={index} />
              <span className={cn("truncate", state === "skipped" && "line-through")}>
                {step.label}
              </span>
              {state === "skipped" ? (
                <span className="ml-auto shrink-0 text-paragraph-sm">Skipped</span>
              ) : null}
            </>
          );

          return (
            <li key={step.key} className="flex flex-col">
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onStepSelect?.(step.key)}
                  className={stepRowVariants({ state, interactive })}
                >
                  {content}
                </button>
              ) : (
                <div
                  aria-current={state === "current" ? "step" : undefined}
                  className={stepRowVariants({ state, interactive })}
                >
                  {content}
                </div>
              )}
              {!isLast ? (
                // Centred under the 20px marker: 16px row padding + 10px.
                <span aria-hidden="true" className="ml-[25px] h-14 w-px bg-line" />
              ) : null}
            </li>
          );
        })}
      </ol>
    );
  }
);
Stepper.displayName = "Stepper";
