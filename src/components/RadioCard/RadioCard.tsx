import * as React from "react";
import { cn } from "@/lib/utils";
import { IconCircleCheckFilled } from "@/components/Icon";

/**
 * RadioCard — a radio option drawn as a card, for choices an admin should
 * weigh side by side before committing (a license, a plan, a setup path).
 * Use a plain `Radio` list when the options are read top-to-bottom instead.
 *
 * Anatomy (Figma "Tab" card, node 1:48): a 24px leading icon and a check in
 * the top row, then title and description. Unselected, the icon is greyed and
 * the check is invisible but still takes its space, so picking a card fills
 * in a mark rather than shifting anything. Selected, the card takes the brand
 * border and fill and the icon turns brand.
 *
 * Underneath it is a real `<input type="radio">` (visually hidden) inside a
 * `<label>`, so grouping by `name`, arrow keys and form semantics are the
 * native ones. Every visual state is read off the input with `has-[]`, so
 * controlled and uncontrolled use both work with no extra state here.
 */

export interface RadioCardProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "size" | "title" | "checked" | "defaultChecked"
  > {
  /** Option name. */
  title: React.ReactNode;
  /** Supporting copy under the title. */
  description?: React.ReactNode;
  /** 24px leading icon. Greyed until the card is selected. */
  icon?: React.ReactNode;
  /** Slot beside the title — a count, a Tag. */
  badge?: React.ReactNode;
  /** Controlled checked state. */
  checked?: boolean;
  /** Initial checked state when uncontrolled. */
  defaultChecked?: boolean;
  /** Called with the next checked value on any change. */
  onCheckedChange?: (checked: boolean) => void;
  /** className for the card (the `<label>`). */
  wrapperClassName?: string;
}

function SelectedMark() {
  return (
    <IconCircleCheckFilled
      size={24}
      aria-hidden="true"
      className={cn(
        "shrink-0 text-brand opacity-0 transition-opacity",
        "group-has-[:checked]:opacity-100 group-has-[:disabled]:opacity-0"
      )}
    />
  );
}

export const RadioCard = React.forwardRef<HTMLInputElement, RadioCardProps>(
  (
    {
      title,
      description,
      icon,
      badge,
      onCheckedChange,
      onChange,
      onMouseEnter,
      onMouseLeave,
      wrapperClassName,
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      // Pointer handlers go on the card, not the input: the input is visually
      // hidden, so the card is the thing being hovered. This is also what lets
      // a wrapping TooltipTrigger explain why a disabled card can't be picked.
      // rounded-sm (6px) matches the existing selectable card in Phone Number
      // Settings › Incoming Call Routing, so the two read as one component.
      <label
        htmlFor={inputId}
        onMouseEnter={onMouseEnter as React.MouseEventHandler<HTMLLabelElement> | undefined}
        onMouseLeave={onMouseLeave as React.MouseEventHandler<HTMLLabelElement> | undefined}
        className={cn(
          "group flex h-full cursor-pointer flex-col gap-2 rounded-sm border border-line bg-white p-4 transition-colors",
          "hover:border-control-border",
          "has-[:checked]:border-brand has-[:checked]:bg-brand-subtle",
          "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/24",
          "has-[:disabled]:cursor-not-allowed has-[:disabled]:border-line has-[:disabled]:bg-control-disabled-bg",
          wrapperClassName
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type="radio"
          disabled={disabled}
          onChange={(event) => {
            onChange?.(event);
            onCheckedChange?.(event.target.checked);
          }}
          className={cn("sr-only", className)}
          {...props}
        />

        {icon ? (
          <span className="flex items-start justify-between">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center text-disabled-fg transition-colors group-has-[:checked]:text-brand [&_svg]:size-6"
            >
              {icon}
            </span>
            <SelectedMark />
          </span>
        ) : null}

        <span className="flex flex-col gap-1">
          <span className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={cn("text-label-md text-foreground", disabled && "text-disabled-fg")}>
                {title}
              </span>
              {badge}
            </span>
            {/* Without an icon row the check rides on the title line instead. */}
            {icon ? null : <SelectedMark />}
          </span>
          {description ? (
            <span className="text-paragraph-sm text-muted-foreground">{description}</span>
          ) : null}
        </span>
      </label>
    );
  }
);
RadioCard.displayName = "RadioCard";
