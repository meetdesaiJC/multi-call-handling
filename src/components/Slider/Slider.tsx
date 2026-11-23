import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Slider — a single value picked off a continuous range.
 *
 * A native `<input type="range">` underneath, restyled. That is deliberate: a
 * div-and-pointer-events reimplementation has to redo keyboard stepping, page
 * up/down, RTL, touch, and the whole `aria-valuenow` contract, and browsers
 * already ship all of it. What it does not ship is a track that shows how far
 * along the value is, so the fill is painted with a gradient driven by
 * `--slider-progress` (see `.slider` in `styles/base.css`).
 *
 * Reach for `Toggle` for on/off and a stepped button row for three or four
 * named stops. This is for the case where the stops have no names — a volume,
 * a threshold — and the reader is aiming rather than choosing.
 */

export interface SliderProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "defaultValue" | "onChange"
  > {
  /** Controlled value. */
  value?: number;
  /** Uncontrolled initial value. */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Rendered before the track — a low-end mark. */
  startAdornment?: React.ReactNode;
  /** Rendered after the track — a high-end mark. */
  endAdornment?: React.ReactNode;
  /** className for the wrapper when an adornment is present. */
  wrapperClassName?: string;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      startAdornment,
      endAdornment,
      className,
      wrapperClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const [uncontrolled, setUncontrolled] = React.useState(
      defaultValue ?? min
    );
    const current = value ?? uncontrolled;
    // Guard against max === min, which would divide by zero and paint NaN%.
    const span = max - min || 1;
    const progress = Math.min(100, Math.max(0, ((current - min) / span) * 100));

    const input = (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (value === undefined) setUncontrolled(next);
          onValueChange?.(next);
        }}
        style={
          { "--slider-progress": `${progress}%` } as React.CSSProperties
        }
        className={cn("slider min-w-0 flex-1", className)}
        {...props}
      />
    );

    if (!startAdornment && !endAdornment) return input;

    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          disabled && "opacity-45",
          wrapperClassName
        )}
      >
        {startAdornment ? (
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center text-muted-foreground"
          >
            {startAdornment}
          </span>
        ) : null}
        {input}
        {endAdornment ? (
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center text-muted-foreground"
          >
            {endAdornment}
          </span>
        ) : null}
      </div>
    );
  }
);
Slider.displayName = "Slider";
