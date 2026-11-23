import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Radio — synced from Figma "Design System 2.0 / Radio" (node 2002:119265).
 *
 * Figma exposes it as:
 *   Size    → `size` (sm / md / lg = 16 / 20 / 24px)
 *   Checked → `checked` / `defaultChecked` (controlled or uncontrolled)
 *   State   → hover / focus / disabled are CSS; `disabled` is a prop
 *   Radio   → `controlPosition` ("start" is the control-then-label row,
 *              "end" is the label-then-control row used in list items)
 *
 * Renders a real `<input type="radio">` so it's fully keyboard- and
 * screen-reader-accessible (including native radio-group arrow-key nav when
 * multiple Radios share a `name`); the ring and dot are decorative siblings
 * driven by the input's state (via `peer-*`), not by the input itself.
 */

const radioRingVariants = cva(
  "pointer-events-none absolute inset-0 rounded-full border-solid bg-white transition-colors " +
    "peer-hover:border-brand-hover peer-hover:bg-brand-subtle " +
    "peer-focus-visible:ring-2 peer-focus-visible:ring-brand/24 " +
    "peer-disabled:border-line peer-disabled:bg-control-disabled-bg",
  {
    variants: {
      size: {
        sm: "border",
        md: "border-[1.2px]",
        lg: "border-[1.5px]",
      },
      checked: {
        true: "border-brand",
        false: "border-control-border",
      },
    },
    defaultVariants: { size: "sm", checked: false },
  }
);

const sizeClasses = { sm: "size-4", md: "size-5", lg: "size-6" } as const;
const dotSizeClasses = { sm: "size-1.5", md: "size-2", lg: "size-2.5" } as const;
const labelTextClasses = { sm: "text-paragraph-md", md: "text-paragraph-md", lg: "text-paragraph-lg" } as const;
const descriptionTextClasses = { sm: "text-paragraph-sm", md: "text-paragraph-md", lg: "text-paragraph-md" } as const;
const descriptionPadding = {
  start: { sm: "pl-6", md: "pl-7", lg: "pl-8" },
  end: { sm: "pl-5", md: "pl-6", lg: "pl-7" },
} as const;

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "checked" | "defaultChecked"> {
  /** Ring size. Default `"sm"`. */
  size?: "sm" | "md" | "lg";
  /** Controlled checked state. */
  checked?: boolean;
  /** Initial checked state when uncontrolled. */
  defaultChecked?: boolean;
  /** Called with the next checked value on any change. */
  onCheckedChange?: (checked: boolean) => void;
  /** Label rendered next to the ring. */
  label?: React.ReactNode;
  /** Helper text rendered on its own line below, indented under the label. */
  description?: React.ReactNode;
  /** Optional slot rendered after the label (e.g. an info icon with a tooltip). */
  infoIcon?: React.ReactNode;
  /** Where the ring sits relative to the label. Default `"start"`. */
  controlPosition?: "start" | "end";
  /** className for the outer wrapper (only relevant when `label` or `description` is set). */
  wrapperClassName?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      className,
      wrapperClassName,
      size = "sm",
      checked,
      defaultChecked,
      onCheckedChange,
      onChange,
      disabled,
      label,
      description,
      infoIcon,
      controlPosition = "start",
      id,
      ...props
    },
    ref
  ) => {
    const isControlled = checked !== undefined;
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false);
    const isChecked = isControlled ? checked : internalChecked;

    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalChecked(event.target.checked);
      onChange?.(event);
      onCheckedChange?.(event.target.checked);
    };

    const isEnd = controlPosition === "end";

    const ring = (
      <span className={cn("relative inline-flex shrink-0 items-center justify-center", sizeClasses[size])}>
        <input
          ref={ref}
          id={inputId}
          type="radio"
          checked={isChecked}
          disabled={disabled}
          onChange={handleChange}
          className="peer absolute inset-0 z-10 m-0 cursor-pointer appearance-none disabled:cursor-not-allowed disabled:pointer-events-none"
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(radioRingVariants({ size, checked: isChecked }), className)}
        />
        {/* Direct sibling of the input (not nested) so peer-hover/peer-disabled can target it.
            Absolutely positioned + `inset-0 m-auto` (not flex-centered) so it paints above the
            ring, which is also absolutely positioned — same-layer positioned elements stack by
            DOM order, but a static element would paint under any positioned sibling regardless
            of DOM order. */}
        {isChecked && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 m-auto rounded-full bg-brand transition-colors peer-hover:bg-brand-hover peer-disabled:bg-disabled-fg",
              dotSizeClasses[size]
            )}
          />
        )}
      </span>
    );

    if (!label && !description) {
      return ring;
    }

    return (
      <div className={cn("inline-flex flex-col items-start gap-1", wrapperClassName)}>
        <div className={cn("flex items-center gap-2", isEnd && "w-full justify-between")}>
          {!isEnd && ring}
          {label && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <label
                htmlFor={inputId}
                className={cn(
                  "cursor-pointer select-none text-foreground",
                  labelTextClasses[size],
                  disabled && "cursor-not-allowed text-disabled-fg"
                )}
              >
                {label}
              </label>
              {infoIcon}
            </span>
          )}
          {isEnd && ring}
        </div>
        {description && (
          <div className={cn("flex w-full items-center", descriptionPadding[controlPosition][size])}>
            <p className={cn("text-muted-foreground", descriptionTextClasses[size])}>{description}</p>
          </div>
        )}
      </div>
    );
  }
);
Radio.displayName = "Radio";

export { radioRingVariants };
