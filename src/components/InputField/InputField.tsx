import * as React from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/Button";
import {
  IconCalendar,
  IconChevronDown,
  IconClear,
  IconClock,
  IconEye,
  IconEyeOff,
  IconInfoCircle,
} from "@/components/Icon";

/**
 * InputField — synced from Figma "Design System 2.0 / Input Field" (node 552:54616).
 *
 * Figma exposes it as:
 *   Type   → `variant` (default / prefix / suffix / date / time / password)
 *   State  → hover / focus / disabled are CSS; `error` + `disabled` are props
 *   Filled → driven by the real value (placeholder colour when empty)
 *   Label / Label icon / Help text → optional chrome around the field
 *   Forgot password → password variant only (`forgotPassword`)
 *
 * Height is fixed at 40px (Figma); width is fluid.
 */

export type InputFieldVariant =
  | "default"
  | "prefix"
  | "suffix"
  | "date"
  | "time"
  | "password";

export interface InputFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix" | "size" | "type"> {
  /** Figma Type. Default `"default"`. */
  variant?: InputFieldVariant;
  /** Native input type. Ignored when `variant` is `"password"` / `"date"` / `"time"`. */
  type?: React.HTMLInputTypeAttribute;
  /** Label above the field. */
  label?: React.ReactNode;
  /** Show a required asterisk after the label. */
  required?: boolean;
  /**
   * Icon after the label. Pass `true` for the default 20px info-circle,
   * or a custom node. Default `false`.
   */
  labelIcon?: boolean | React.ReactNode;
  /** Helper / error message below the field. */
  helpText?: React.ReactNode;
  /**
   * Help-icon control. `true` (default when `helpText` is set) shows the 16px
   * info-circle; `false` hides it; pass a node for a custom icon
   * (e.g. a spinner for a "checking…" state).
   */
  helpIcon?: boolean | React.ReactNode;
  /**
   * Tone of the help text + icon. `"info"` renders brand-blue (e.g. an inline
   * "Checking availability" hint). The `error` prop always forces the error tone.
   */
  helpTone?: "default" | "error" | "info";
  /** Error state — red border + red help text. */
  error?: boolean;
  /** Prefix addon text/content (variant `"prefix"`, or any variant). */
  prefix?: React.ReactNode;
  /** Show chevron in the prefix addon. Default `true` when `prefix` is set. */
  prefixChevron?: boolean;
  /** Suffix addon text/content (variant `"suffix"`, or any variant). */
  suffix?: React.ReactNode;
  /** Show chevron in the suffix addon. Default `true` when `suffix` is set. */
  suffixChevron?: boolean;
  /** Optional leading icon inside the text area (16px). */
  leadingIcon?: React.ReactNode;
  /** Optional trailing icon inside the text area (16px). Overrides date/time defaults. */
  trailingIcon?: React.ReactNode;
  /** Show clear (×) when focused and the field has a value. Default `true`. */
  clearable?: boolean;
  /** Called when the clear button is pressed. */
  onClear?: () => void;
  /**
   * Password-only: “Forgot password?” link on the label row.
   * Pass `true` for the default label, a string for custom copy, or a node.
   */
  forgotPassword?: boolean | React.ReactNode;
  /** Href for the forgot-password link. */
  forgotPasswordHref?: string;
  /** Click handler for the forgot-password control (button when no href). */
  onForgotPassword?: () => void;
  /** className for the outer wrapper. */
  wrapperClassName?: string;
  /** className for the bordered field shell. */
  className?: string;
}

const fieldShellBase =
  "group/field relative flex h-10 w-full items-center overflow-clip rounded-[4px] border border-solid " +
  "border-line bg-white transition-colors " +
  "hover:border-control-border " +
  "focus-within:border-brand focus-within:hover:border-brand " +
  "has-[:disabled]:pointer-events-none has-[:disabled]:border-line " +
  "has-[:disabled]:bg-control-disabled-bg has-[:disabled]:hover:border-line";

const fieldShellError =
  "border-error hover:border-error focus-within:border-error focus-within:hover:border-error";

const inputBase =
  "m-0 min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 " +
  "text-paragraph-md text-foreground outline-none " +
  "placeholder:text-disabled-fg " +
  "disabled:cursor-not-allowed disabled:text-disabled-fg disabled:placeholder:text-disabled-fg";

function Addon({
  children,
  chevron,
  side,
  disabled,
}: {
  children: React.ReactNode;
  chevron?: boolean;
  side: "start" | "end";
  disabled?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-full shrink-0 items-center gap-1 bg-secondary-bg text-paragraph-md text-foreground",
        side === "start" ? "border-r border-line pl-3 pr-2.5" : "border-l border-line pl-3 pr-2.5",
        disabled && "text-disabled-fg"
      )}
    >
      <span className="whitespace-nowrap">{children}</span>
      {chevron && (
        <IconChevronDown
          size={16}
          className={cn("size-4 shrink-0", disabled ? "text-disabled-fg" : "text-foreground")}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

const HELP_TONE: Record<"default" | "error" | "info", string> = {
  default: "text-muted-foreground",
  error: "text-error",
  info: "text-brand",
};

function HelpRow({
  children,
  tone = "default",
  icon,
  id,
}: {
  children: React.ReactNode;
  tone?: "default" | "error" | "info";
  /** `false`/`undefined` → no icon; `true` → default info-circle; node → custom. */
  icon?: boolean | React.ReactNode;
  id?: string;
}) {
  const toneClass = HELP_TONE[tone];
  const iconNode =
    icon === true ? (
      <IconInfoCircle size={16} aria-hidden="true" />
    ) : icon ? (
      icon
    ) : null;
  return (
    <div id={id} className="flex items-start gap-1 text-paragraph-sm">
      {iconNode && (
        <span
          className={cn(
            "inline-flex h-[1lh] w-4 shrink-0 items-center justify-center [&_svg]:block [&_svg]:size-4",
            toneClass
          )}
        >
          {iconNode}
        </span>
      )}
      <p className={cn("m-0", toneClass)}>{children}</p>
    </div>
  );
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      className,
      wrapperClassName,
      variant = "default",
      type,
      label,
      required,
      labelIcon = false,
      helpText,
      helpIcon,
      helpTone = "default",
      error = false,
      prefix,
      prefixChevron,
      suffix,
      suffixChevron,
      leadingIcon,
      trailingIcon,
      clearable = true,
      onClear,
      forgotPassword = false,
      forgotPasswordHref,
      onForgotPassword,
      disabled,
      id,
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const helpId = `${inputId}-help`;

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(
      () => String(defaultValue ?? "")
    );
    const currentValue = isControlled ? String(value ?? "") : internalValue;
    const [focused, setFocused] = React.useState(false);
    const [passwordVisible, setPasswordVisible] = React.useState(false);

    const showPrefix =
      variant === "prefix" || prefix != null;
    const showSuffix =
      variant === "suffix" || suffix != null;
    const isPassword = variant === "password";
    const isDate = variant === "date";
    const isTime = variant === "time";

    const resolvedPrefix = prefix ?? (variant === "prefix" ? "https://" : undefined);
    const resolvedSuffix = suffix ?? (variant === "suffix" ? "mins" : undefined);
    const showPrefixChevron = prefixChevron ?? (resolvedPrefix != null);
    const showSuffixChevron = suffixChevron ?? (resolvedSuffix != null);

    const hasAddon =
      Boolean(showPrefix && resolvedPrefix != null) ||
      Boolean(showSuffix && resolvedSuffix != null);

    const showClear =
      clearable &&
      !disabled &&
      !isPassword &&
      !isDate &&
      !isTime &&
      !hasAddon &&
      focused &&
      currentValue.length > 0;

    const resolvedTrailing =
      trailingIcon ??
      (isDate ? (
        <IconCalendar size={16} className="size-4" aria-hidden="true" />
      ) : isTime ? (
        <IconClock size={16} className="size-4" aria-hidden="true" />
      ) : null);

    const nativeType = isPassword
      ? passwordVisible
        ? "text"
        : "password"
      : isDate
        ? type ?? "text"
        : isTime
          ? type ?? "text"
          : type ?? "text";

    const resolvedHelpIcon = helpIcon ?? Boolean(helpText);
    const effectiveHelpTone: "default" | "error" | "info" = error
      ? "error"
      : helpTone;
    const showForgot =
      isPassword && Boolean(forgotPassword) && !disabled;
    const forgotContent =
      forgotPassword === true ? "Forgot password?" : forgotPassword;

    const labelIconNode =
      labelIcon === true ? (
        <IconInfoCircle size={20} className="size-5 shrink-0 text-foreground" aria-hidden="true" />
      ) : labelIcon ? (
        labelIcon
      ) : null;

    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalValue(event.target.value);
      onChange?.(event);
    };

    const handleClear = () => {
      if (!isControlled) setInternalValue("");
      onClear?.();
      if (onChange) {
        const target = inputRef.current ?? ({ value: "" } as HTMLInputElement);
        if (inputRef.current) inputRef.current.value = "";
        onChange({
          target,
          currentTarget: target,
        } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    return (
      <div className={cn("flex w-full flex-col gap-2", wrapperClassName)}>
        {(label != null && label !== false) || showForgot ? (
          <div
            className={cn(
              "flex w-full items-center gap-1",
              showForgot ? "justify-between" : ""
            )}
          >
            {label != null && label !== false && (
              <span className="inline-flex items-center gap-1">
                <label
                  htmlFor={inputId}
                  className={cn(
                    "cursor-pointer select-none text-label-md text-foreground",
                    disabled && "cursor-not-allowed"
                  )}
                >
                  {label}
                  {required && (
                    <span className="text-error" aria-hidden="true">
                      {" "}
                      *
                    </span>
                  )}
                </label>
                {labelIconNode}
              </span>
            )}
            {showForgot &&
              (forgotPasswordHref ? (
                <a
                  href={forgotPasswordHref}
                  className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto shrink-0")}
                >
                  {forgotContent}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto shrink-0 border-0")}
                >
                  {forgotContent}
                </button>
              ))}
          </div>
        ) : null}

        <div
          className={cn(
            fieldShellBase,
            error && fieldShellError,
            !hasAddon && "px-3",
            className
          )}
        >
          {showPrefix && resolvedPrefix != null && (
            <Addon
              side="start"
              chevron={showPrefixChevron}
              disabled={disabled}
            >
              {resolvedPrefix}
            </Addon>
          )}

          <div
            className={cn(
              "flex h-full min-w-0 flex-1 items-center gap-2",
              hasAddon && "px-3"
            )}
          >
            {leadingIcon && (
              <span
                className={cn(
                  "inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-full",
                  disabled ? "text-disabled-fg" : "text-foreground"
                )}
              >
                {leadingIcon}
              </span>
            )}

            <input
              ref={inputRef}
              id={inputId}
              type={nativeType}
              disabled={disabled}
              value={currentValue}
              onChange={handleChange}
              onFocus={(e) => {
                setFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setFocused(false);
                onBlur?.(e);
              }}
              aria-invalid={error || undefined}
              aria-describedby={helpText ? helpId : undefined}
              aria-required={required || undefined}
              className={inputBase}
              {...props}
            />

            {showClear && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="Clear"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClear}
                className="inline-flex size-4 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-foreground"
              >
                <IconClear size={16} className="size-4" aria-hidden="true" />
              </button>
            )}

            {isPassword && !disabled && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setPasswordVisible((v) => !v)}
                className="inline-flex size-4 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-foreground"
              >
                {passwordVisible ? (
                  <IconEyeOff size={16} className="size-4" aria-hidden="true" />
                ) : (
                  <IconEye size={16} className="size-4" aria-hidden="true" />
                )}
              </button>
            )}

            {resolvedTrailing && !isPassword && (
              <span
                className={cn(
                  "inline-flex size-4 shrink-0 items-center justify-center [&_svg]:size-full",
                  disabled ? "text-disabled-fg" : "text-foreground"
                )}
              >
                {resolvedTrailing}
              </span>
            )}
          </div>

          {showSuffix && resolvedSuffix != null && (
            <Addon
              side="end"
              chevron={showSuffixChevron}
              disabled={disabled}
            >
              {resolvedSuffix}
            </Addon>
          )}
        </div>

        {helpText != null && helpText !== false && (
          <HelpRow id={helpId} tone={effectiveHelpTone} icon={resolvedHelpIcon}>
            {helpText}
          </HelpRow>
        )}
      </div>
    );
  }
);
InputField.displayName = "InputField";

/* ------------------------------------------------------------------ */
/* TextArea — synced from Figma "Design System 2.0 / Text Area"       */
/* (node 5394:3053). Same chrome as InputField; fixed 128px tall box. */
/* ------------------------------------------------------------------ */

export interface TextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  label?: React.ReactNode;
  required?: boolean;
  labelIcon?: boolean | React.ReactNode;
  helpText?: React.ReactNode;
  helpIcon?: boolean;
  error?: boolean;
  wrapperClassName?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      className,
      wrapperClassName,
      label,
      required,
      labelIcon = false,
      helpText,
      helpIcon,
      error = false,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const helpId = `${inputId}-help`;
    const resolvedHelpIcon = helpIcon ?? Boolean(helpText);

    const labelIconNode =
      labelIcon === true ? (
        <IconInfoCircle size={20} className="size-5 shrink-0 text-foreground" aria-hidden="true" />
      ) : labelIcon ? (
        labelIcon
      ) : null;

    return (
      <div className={cn("flex w-full flex-col gap-2", wrapperClassName)}>
        {label != null && label !== false && (
          <span className="inline-flex items-center gap-1">
            <label
              htmlFor={inputId}
              className={cn(
                "cursor-pointer select-none text-label-md text-foreground",
                disabled && "cursor-not-allowed"
              )}
            >
              {label}
              {required && (
                <span className="text-error" aria-hidden="true">
                  {" "}
                  *
                </span>
              )}
            </label>
            {labelIconNode}
          </span>
        )}

        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-describedby={helpText ? helpId : undefined}
          aria-required={required || undefined}
          className={cn(
            "h-32 w-full resize-y rounded-[4px] border border-solid border-line bg-white px-3 py-2.5",
            "text-paragraph-md text-foreground outline-none transition-colors",
            "placeholder:text-disabled-fg",
            "hover:border-control-border",
            "focus:border-brand focus:hover:border-brand",
            "disabled:cursor-not-allowed disabled:border-line disabled:bg-control-disabled-bg",
            "disabled:text-disabled-fg disabled:placeholder:text-disabled-fg disabled:hover:border-line",
            error &&
              "border-error hover:border-error focus:border-error focus:hover:border-error",
            className
          )}
          {...props}
        />

        {helpText != null && helpText !== false && (
          <HelpRow
            id={helpId}
            tone={error ? "error" : "default"}
            icon={resolvedHelpIcon}
          >
            {helpText}
          </HelpRow>
        )}
      </div>
    );
  }
);
TextArea.displayName = "TextArea";
