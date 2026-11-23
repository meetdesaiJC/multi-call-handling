import type { CSSProperties, ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";

/**
 * The two shapes a call control takes, and the only two.
 *
 * `BarControl` is the icon-only circle on the 72px call bar; `CallControl` is
 * the larger bordered circle with a caption on the 360px phone. The ringing →
 * live morph carries one into the other, which is why they live in the same
 * file: their geometry is a matched pair, and `data-morph` on both is what
 * pairs them up.
 *
 * They were inline in `DialerPanel` while the bar was the only caller. Six
 * popovers now render their own triggers, so the vocabulary moved here rather
 * than being imported back out of the screen that uses it.
 */

/**
 * Mute and Hold engaged go red — both of them interrupt the line, and the
 * agent has to be able to tell at a glance that the caller cannot hear them.
 * Every other control on the bar opens something, and stays white.
 */
export type CallControlTone = "default" | "interrupt";

export interface BarControlProps {
  label: string;
  pressed?: boolean;
  /** Something came back while the panel was shut — a dot, not a count. */
  badge?: boolean;
  tone?: CallControlTone;
  morphKey?: string;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  /**
   * Suppress the hover label. Set while this control's own popover is open:
   * a tooltip naming the panel that is already on screen, over the top of
   * that panel, is noise.
   */
  tooltipDisabled?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  children: ReactNode;
}

/**
 * One icon-only control on the bar. The label is the only naming the control
 * gets, so it does double duty: the accessible name, and the hover tooltip
 * that stands in for the caption the phone's controls wear. The bubble sits
 * below — the bar is pinned to the top of the workspace.
 */
export function BarControl({
  label,
  pressed,
  badge,
  tone = "default",
  morphKey,
  buttonRef,
  tooltipDisabled,
  disabled,
  className,
  style,
  onClick,
  children,
}: BarControlProps) {
  return (
    <TooltipTrigger
      placement="bottom"
      disabled={tooltipDisabled}
      content={<Tooltip theme="dark" arrow="top-center" title={label} />}
      className="shrink-0"
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        data-morph={morphKey}
        data-morph-scale={morphKey ? "height" : undefined}
        data-tone={tone === "interrupt" ? "interrupt" : undefined}
        style={style}
        onClick={onClick}
        className={cn(
          "call-bar-control relative flex size-9 shrink-0 items-center justify-center rounded-full text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.97]",
          disabled && "cursor-not-allowed opacity-45",
          className
        )}
      >
        <span className="relative flex size-5 items-center justify-center overflow-clip">
          {children}
        </span>
        {badge ? (
          <span
            aria-hidden="true"
            // Ringed in the bar's own dark so the dot reads as sitting on the
            // icon rather than floating next to it.
            className="absolute top-1.5 right-1.5 size-2 rounded-full border border-dialer-surface bg-brand"
          />
        ) : null}
      </button>
    </TooltipTrigger>
  );
}

export interface CallControlProps {
  label: string;
  /**
   * Overrides the caption when engaged, so the button says what it will do
   * next — "Unmute", "Resume" — while the accessible name stays `label`.
   */
  pressedLabel?: string;
  pressed?: boolean;
  disabled?: boolean;
  tone?: CallControlTone;
  morphKey?: string;
  onClick?: () => void;
  children: ReactNode;
}

/** The phone's control: a bordered circle with its name under it. */
export function CallControl({
  label,
  pressedLabel,
  pressed,
  disabled,
  tone = "default",
  morphKey,
  onClick,
  children,
}: CallControlProps) {
  const engaged = pressed && tone === "interrupt";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 outline-none transition-opacity duration-base",
        disabled && "cursor-not-allowed opacity-45"
      )}
    >
      {/* The mark travels, not the button — circle to circle, so the ratio the
          morph reads off the height is the two diameters. */}
      <span
        data-morph={morphKey}
        className={cn(
          "flex size-14 items-center justify-center overflow-clip rounded-full border transition-colors duration-base",
          engaged
            ? "border-error bg-error"
            : pressed
              ? "border-white bg-white/15"
              : "border-white bg-transparent",
          !disabled &&
            (engaged
              ? "hover:bg-error-hover focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.97]"
              : "hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.97]")
        )}
      >
        <span className="relative flex size-6 items-center justify-center overflow-clip text-white">
          {children}
        </span>
      </span>
      <span className="text-[10px] leading-3 whitespace-nowrap text-white">
        {pressed && pressedLabel ? pressedLabel : label}
      </span>
    </button>
  );
}
