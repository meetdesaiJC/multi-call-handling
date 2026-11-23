import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Checkbox — synced from Figma "Design System 2.0 / Checkbox" (node 551:42409).
 *
 * Figma exposes it as:
 *   Size          → `size` (sm / md / lg = 16 / 20 / 24px)
 *   Checked       → `checked` / `defaultChecked` (controlled or uncontrolled)
 *   Indeterminate → `indeterminate` (mixed state, shows a dash instead of a check)
 *   State         → hover / focus / disabled are CSS; `disabled` is a prop
 *   Checkbox      → `controlPosition` ("start" is the control-then-label row,
 *                    "end" is the label-then-control row used in list items)
 *
 * Renders a real `<input type="checkbox">` so it's fully keyboard- and
 * screen-reader-accessible; the box, check and dash are decorative siblings
 * driven by the input's state (via `peer-*`), not by the input itself.
 */

const checkboxBoxVariants = cva(
  "pointer-events-none absolute inset-0 rounded-[4px] border-solid transition-colors " +
    "peer-focus-visible:ring-2 peer-focus-visible:ring-brand/24 " +
    "peer-disabled:border-line peer-disabled:bg-control-disabled-bg",
  {
    variants: {
      size: {
        sm: "border",
        md: "border-[1.2px]",
        lg: "border-[1.5px]",
      },
      active: {
        true: "border-brand bg-brand peer-hover:border-brand-hover peer-hover:bg-brand-hover",
        false:
          "border-control-border bg-white peer-hover:border-brand-hover peer-hover:bg-brand-subtle",
      },
    },
    defaultVariants: { size: "sm", active: false },
  }
);

const sizeClasses = { sm: "size-4", md: "size-5", lg: "size-6" } as const;
const iconSize = { sm: 10, md: 12, lg: 14 } as const;
const labelTextClasses = { sm: "text-paragraph-md", md: "text-paragraph-md", lg: "text-paragraph-lg" } as const;
const descriptionTextClasses = { sm: "text-paragraph-sm", md: "text-paragraph-md", lg: "text-paragraph-md" } as const;
const descriptionPadding = {
  start: { sm: "pl-6", md: "pl-7", lg: "pl-8" },
  end: { sm: "pl-5", md: "pl-6", lg: "pl-7" },
} as const;

function CheckGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MinusGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 8H12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export interface CheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "size" | "type" | "checked" | "defaultChecked"
  > {
  /** Box size. Default `"sm"`. */
  size?: "sm" | "md" | "lg";
  /** Controlled checked state. */
  checked?: boolean;
  /** Initial checked state when uncontrolled. */
  defaultChecked?: boolean;
  /** Mixed / "some selected" state — shows a dash instead of a check. */
  indeterminate?: boolean;
  /** Called with the next checked value on any change. */
  onCheckedChange?: (checked: boolean) => void;
  /** Label rendered next to the box. */
  label?: React.ReactNode;
  /** Helper text rendered on its own line below, indented under the label. */
  description?: React.ReactNode;
  /** Optional slot rendered after the label (e.g. an info icon with a tooltip). */
  infoIcon?: React.ReactNode;
  /** Where the box sits relative to the label. Default `"start"`. */
  controlPosition?: "start" | "end";
  /** className for the outer wrapper (only relevant when `label` or `description` is set). */
  wrapperClassName?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      wrapperClassName,
      size = "sm",
      checked,
      defaultChecked,
      indeterminate = false,
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

    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
    React.useEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalChecked(event.target.checked);
      onChange?.(event);
      onCheckedChange?.(event.target.checked);
    };

    const active = isChecked || indeterminate;
    const iconColorClass = disabled ? "text-disabled-fg" : "text-white";
    const isEnd = controlPosition === "end";

    const box = (
      <span className={cn("relative inline-flex shrink-0", sizeClasses[size])}>
        <input
          ref={inputRef}
          id={inputId}
          type="checkbox"
          checked={isChecked}
          disabled={disabled}
          onChange={handleChange}
          className="peer absolute inset-0 z-10 m-0 cursor-pointer appearance-none disabled:cursor-not-allowed disabled:pointer-events-none"
          {...props}
        />
        <span aria-hidden="true" className={cn(checkboxBoxVariants({ size, active }), className)} />
        {isChecked && !indeterminate && (
          <span
            aria-hidden="true"
            className={cn("pointer-events-none absolute inset-0 flex items-center justify-center", iconColorClass)}
          >
            <CheckGlyph size={iconSize[size]} />
          </span>
        )}
        {indeterminate && (
          <span
            aria-hidden="true"
            className={cn("pointer-events-none absolute inset-0 flex items-center justify-center", iconColorClass)}
          >
            <MinusGlyph size={iconSize[size]} />
          </span>
        )}
      </span>
    );

    if (!label && !description) {
      return box;
    }

    return (
      <div className={cn("inline-flex flex-col items-start gap-1", wrapperClassName)}>
        <div className={cn("flex items-center gap-2", isEnd && "w-full justify-between")}>
          {!isEnd && box}
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
          {isEnd && box}
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
Checkbox.displayName = "Checkbox";

export { checkboxBoxVariants };
