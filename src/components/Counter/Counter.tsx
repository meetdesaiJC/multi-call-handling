import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Counter — synced from Figma "Design System 2.0 / Counter" (node 19858:55).
 *
 * A compact quantity stepper: [ − ] value [ + ]. Used for picking a count
 * such as the number of licenses at checkout.
 *
 * Figma exposes it as five states of one property:
 *   Default          → both controls active
 *   Min              → value at `min`, the − control is disabled
 *   Max              → value at `max`, the + control is disabled
 *   Direct text edit → the value is an editable field (type a number)
 *   Disabled         → whole control greyed and non-interactive
 *
 * Works controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 */

const MinusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
    <path
      d="M3.33333 8H12.6667"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
    <path
      d="M8 3.33333V12.6667M3.33333 8H12.6667"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface CounterProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "onChange" | "defaultValue"
  > {
  /** Controlled value. */
  value?: number;
  /** Initial value when uncontrolled. */
  defaultValue?: number;
  /** Called with the next clamped value on any change. */
  onChange?: (value: number) => void;
  /** Lower bound — the − control disables here. Default 0. */
  min?: number;
  /** Upper bound — the + control disables here. Default Infinity. */
  max?: number;
  /** Increment applied by the − / + controls. Default 1. */
  step?: number;
  /** Grey out and block all interaction. */
  disabled?: boolean;
  /** Allow typing a value directly into the field. Default true. */
  editable?: boolean;
}

export const Counter = React.forwardRef<HTMLDivElement, CounterProps>(
  (
    {
      className,
      value,
      defaultValue,
      onChange,
      min = 0,
      max = Infinity,
      step = 1,
      disabled = false,
      editable = true,
      ...props
    },
    ref
  ) => {
    const isControlled = value !== undefined;
    const [internal, setInternal] = React.useState(
      defaultValue ?? (Number.isFinite(min) ? min : 0)
    );
    const current = isControlled ? (value as number) : internal;

    const clamp = React.useCallback(
      (n: number) => Math.min(max, Math.max(min, n)),
      [min, max]
    );

    const commit = React.useCallback(
      (n: number) => {
        const next = clamp(n);
        if (!isControlled) setInternal(next);
        onChange?.(next);
      },
      [clamp, isControlled, onChange]
    );

    // Local draft so the field can be cleared/typed before re-clamping.
    const [draft, setDraft] = React.useState(String(current));
    React.useEffect(() => {
      setDraft(String(current));
    }, [current]);

    const atMin = current <= min;
    const atMax = current >= max;

    return (
      <div
        ref={ref}
        data-disabled={disabled || undefined}
        className={cn("inline-flex items-center gap-2", className)}
        {...props}
      >
        <button
          type="button"
          aria-label="Decrease"
          disabled={disabled || atMin}
          onClick={() => commit(current - step)}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-[4px] border border-line text-foreground outline-none transition-colors",
            disabled ? "bg-muted" : "bg-white hover:text-brand",
            "focus-visible:ring-2 focus-visible:ring-brand/24",
            "disabled:pointer-events-none disabled:text-disabled-fg"
          )}
        >
          <MinusIcon />
        </button>

        <input
          type="text"
          inputMode="numeric"
          aria-label="Count"
          value={draft}
          disabled={disabled}
          readOnly={!editable}
          onChange={(e) => {
            if (/^\d*$/.test(e.target.value)) setDraft(e.target.value);
          }}
          onBlur={() => {
            const n = parseInt(draft, 10);
            commit(Number.isNaN(n) ? min : n);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={cn(
            "h-10 w-16 shrink-0 rounded-[4px] border border-line bg-white px-3 text-center text-paragraph-md outline-none",
            disabled ? "bg-muted text-disabled-fg" : "text-foreground"
          )}
        />

        <button
          type="button"
          aria-label="Increase"
          disabled={disabled || atMax}
          onClick={() => commit(current + step)}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-[4px] border border-line text-foreground outline-none transition-colors",
            disabled ? "bg-muted" : "bg-white hover:text-brand",
            "focus-visible:ring-2 focus-visible:ring-brand/24",
            "disabled:pointer-events-none disabled:text-disabled-fg"
          )}
        >
          <PlusIcon />
        </button>
      </div>
    );
  }
);
Counter.displayName = "Counter";
