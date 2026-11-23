import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";
import { usePresence } from "@/lib/usePresence";
import { IconCheck, IconClose } from "@/components/Icon";

/**
 * The surfaces the call bar opens — network, recording, availability as
 * popovers hanging off their control; keypad, transfer and voicemail drop as
 * panels in the right-hand column; and all of them as a sheet inside the
 * phone. Three frames, one shared row vocabulary.
 *
 * Six controls needed the same surface, so the surface is written once here
 * rather than six times in `DialerPanel`. The bar it hangs off is navy and the
 * phone card is navy, but the panels themselves are the product's ordinary
 * light surface — white, `border-line`, design-system rows — because that is
 * the design language everywhere else a list is picked from, and a dark panel
 * over a light workspace read as a different product. Only the *trigger* is
 * dark; everything the agent reads inside is not.
 *
 * It stays a prototype-local component rather than a design-system one because
 * what is bespoke about it is geometry, not skin: it hangs below a 72px bar
 * pinned to the top of the workspace, and inside the 360px phone the same
 * bodies become a full-card sheet. A second prototype wanting a menu wants
 * `Dropdown`.
 *
 * It reuses the library's `.dropdown-panel` skin for the enter and exit, so
 * these panels arrive on the same curve and the same two durations as every
 * menu in the product (CLAUDE.md §4 — enter at `base`, exit one step down at
 * `fast`).
 */

/** Matches `.dropdown-panel[data-state="closed"]` in base.css. */
const POPOVER_CLOSE_MS = DURATION.fast;

export interface CallPopoverController {
  open: boolean;
  /** Stays true through the exit animation. */
  mounted: boolean;
  /** Drives `.dropdown-panel[data-state]`. */
  state: "open" | "closed";
  toggle: () => void;
  close: () => void;
  show: () => void;
  /** Goes on the `relative` wrapper around trigger + panel. */
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Open/closed state for one bar popover, plus the two ways every one of them
 * gets dismissed: a pointer landing outside it, and Escape.
 *
 * Escape is taken on the capture phase and stopped, so closing a popover never
 * also reaches whatever else on the page would have answered — the aside
 * column, or the dialer itself.
 */
export function useCallPopover(): CallPopoverController {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const { mounted, state } = usePresence(open, POPOVER_CLOSE_MS);

  const close = useCallback(() => setOpen(false), []);
  const show = useCallback(() => setOpen(true), []);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      if (anchor.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  return { open, mounted, state, toggle, close, show, anchorRef };
}

export interface CallPopoverProps {
  state: "open" | "closed";
  /**
   * Names the panel for assistive tech when it renders no visible header.
   * A panel whose trigger already says the state — the recording pill — has
   * nothing left for a title to add, but the dialog still needs a name.
   * Ignored when `title` is set, which names it already.
   */
  label?: string;
  /** Which trigger edge the panel hangs from. */
  align?: "start" | "end" | "center";
  /** Above the trigger instead of below — for the phone, whose bar is at the bottom. */
  side?: "bottom" | "top";
  title?: string;
  /** Sits under the title: what this panel is for, in one line. */
  description?: ReactNode;
  /** Trailing slot in the header — a live read-out, a state pill. */
  headerAside?: ReactNode;
  /** Sticky action row along the bottom edge. */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * The panel itself. Mount it inside the `relative` wrapper that carries
 * `controller.anchorRef`, beside the trigger.
 */
export function CallPopover({
  state,
  label,
  align = "end",
  side = "bottom",
  title,
  description,
  headerAside,
  footer,
  className,
  children,
}: CallPopoverProps) {
  return (
    <div
      role="dialog"
      aria-label={title ?? label}
      data-state={state}
      className={cn(
        "dropdown-panel absolute z-50 flex max-h-[420px] w-[300px] flex-col overflow-hidden rounded-md border border-line bg-background shadow-400",
        side === "bottom" ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]",
        align === "end" && "right-0",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        className
      )}
    >
      {title ? (
        <header className="flex shrink-0 items-start gap-3 border-b border-line px-4 pt-3 pb-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-5 font-medium text-foreground">
              {title}
            </p>
            {description ? (
              <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {headerAside ? <div className="shrink-0">{headerAside}</div> : null}
        </header>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

      {footer ? (
        <div className="shrink-0 border-t border-line px-3 py-2.5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/* ── The same panel, in the workspace column ──────────────────────────────
   Keypad, transfer and voicemail drop are read in the right-hand column now,
   beside Notes and Transcript, rather than in a popover hanging off the bar.
   The reason is the same one that put Notes there: all three are worked *while
   the call goes on*, and a popover is a surface that closes the moment
   attention moves. A transfer especially — it is two decisions with a wait in
   between, and the agent spends that wait reading the transcript behind it.

   The chrome matches the panels already in the column exactly: an 11px header
   rule, the mark and the title, and a close on the right. `CallPopover`'s
   header is a different shape because it hangs in mid-air and has to carry its
   own weight; this one sits in a card that is already framed. */

export interface CallAsidePanelProps {
  title: string;
  /** The control's own icon, so the panel and the bar button read as one thing. */
  icon?: ReactNode;
  /** Sits under the title: what this panel is for, in one line. */
  description?: ReactNode;
  onClose: () => void;
  /**
   * Let the body scroll. Off for a body that owns its own scroller — the
   * transfer picker does, because its confirm sheet is pinned to the panel's
   * bottom edge and must not scroll away with the list underneath it.
   */
  scroll?: boolean;
  className?: string;
  children: ReactNode;
}

export function CallAsidePanel({
  title,
  icon,
  description,
  onClose,
  scroll = true,
  className,
  children,
}: CallAsidePanelProps) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[16px] border border-line bg-white">
      <header className="flex min-h-11 shrink-0 items-center justify-between gap-1.5 border-b border-line px-4 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {icon ? (
            // One step up the library's weight scale (1 / 1.2 / 1.5). The 16
            // mark's own weight is 1, which reads as a hairline next to the
            // semibold title beside it — the 20 weight lands the two at the
            // same density without swapping in a bigger, differently drawn
            // glyph. Set here rather than per call site so all four panels
            // stay one set.
            <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:[stroke-width:1.2]">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="text-label-md-semi truncate text-foreground">{title}</p>
            {description ? (
              // Two lines rather than one truncated: at 340px "The message
              // plays on its own — the call ends here" is the whole reason an
              // agent hesitates over this panel, and an ellipsis eats the half
              // that answers them.
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={onClose}
          className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors duration-micro hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={16} />
        </button>
      </header>

      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col",
          scroll ? "overflow-y-auto" : "overflow-hidden",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ── The same panel, inside the phone ─────────────────────────────────────
   The 360px phone clips its own overflow — it has to, for the rounded corners
   and for the ringing → live morph — so a panel that hangs off a control
   inside it would be cut in half. It becomes a sheet over the card's body
   instead, which is also the better pattern at that width: one thing at a
   time, with a way back, rather than a 300px panel over a 328px card.

   The bodies are shared with the bar's popovers. Only the frame differs. */

export interface PhoneSheetProps {
  state: "open" | "closed";
  title: string;
  description?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function PhoneSheet({
  state,
  title,
  description,
  onClose,
  footer,
  children,
}: PhoneSheetProps) {
  return (
    <div
      role="dialog"
      aria-label={title}
      data-state={state}
      // Covers the phone's body but not its nav: the tabs stay reachable, the
      // way they do behind every other panel in the card.
      className="phone-sheet absolute inset-0 z-30 flex flex-col bg-background"
    >
      <header className="flex shrink-0 items-start gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-5 font-medium text-foreground">
            {title}
          </p>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors duration-micro hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={20} />
        </button>
      </header>

      {/* A column, not a plain scroller: a sheet fills a 490px card, so a body
          that wants to spread into the room left over says so with `flex-1` on
          its own part (see `KeypadBody`'s `fill`). Centring the whole thing
          here instead pushed every body's header rule into mid-air. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-line px-3 py-2.5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/** Presence for the phone sheet — same exit length as the bar's popovers. */
export function usePhoneSheetPresence(open: boolean) {
  return usePresence(open, POPOVER_CLOSE_MS);
}

/* ── Shared row vocabulary ─────────────────────────────────────────────────
   Every one of these panels is a list of things you can pick or read. Three
   pieces cover all six: a section label, a selectable row, and a read-out
   row. Writing them once keeps the panels from drifting apart in padding. */

export function CallPopoverSection({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("py-1.5", className)}>
      {label ? (
        <p className="px-4 pt-1 pb-1 text-[10px] leading-3 font-medium tracking-[0.08em] text-muted-foreground uppercase">
          {label}
        </p>
      ) : null}
      {children}
    </section>
  );
}

/**
 * A tab strip for a panel that holds more than one reading of the same thing —
 * the connection's status, the tips, the help links.
 *
 * The tabs are equal width on purpose: it means the indicator's position and
 * size are both expressible as a fraction of the strip, so it can be one
 * element that slides rather than one per tab fading in and out, without any
 * measurement. `translate` and `width` are the two properties animated, and
 * the element is absolutely positioned, so nothing in flow reflows
 * (CLAUDE.md §4).
 */
export function CallPopoverTabs<Key extends string>({
  items,
  value,
  onValueChange,
}: {
  items: { key: Key; label: string }[];
  value: Key;
  onValueChange: (key: Key) => void;
}) {
  const index = Math.max(
    0,
    items.findIndex((item) => item.key === value)
  );

  return (
    <div
      role="tablist"
      className="relative flex shrink-0 border-b border-line px-1"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={item.key === value}
          onClick={() => onValueChange(item.key)}
          className={cn(
            "flex-1 px-1 py-2 text-[12px] leading-4 outline-none transition-colors duration-fast focus-visible:bg-surface-hover",
            item.key === value
              ? "font-medium text-brand"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </button>
      ))}
      <span
        aria-hidden="true"
        style={{
          // `width` resolves against the strip (its padding box), so the track
          // has to have the strip's own 4px gutters taken off first;
          // `translate` resolves against the indicator, so one tab of travel
          // is exactly 100% of itself.
          width: `calc((100% - 8px) / ${items.length})`,
          translate: `calc(${index * 100}%) 0`,
        }}
        className="absolute bottom-0 left-1 h-0.5 rounded-t-[2px] bg-brand transition-[translate,width] duration-moderate ease-standard motion-reduce:transition-none"
      />
    </div>
  );
}

export function CallPopoverRow({
  label,
  meta,
  leading,
  trailing,
  selected,
  disabled,
  danger,
  onClick,
  className,
}: {
  label: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  /** Replaces the selected check — a duration, a status pill, a chevron. */
  trailing?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  /** Ends something — stop the recording, drop the third leg. */
  danger?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const interactive = Boolean(onClick) && !disabled;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={onClick && selected !== undefined ? selected : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-4 py-2 text-left outline-none transition-colors duration-micro",
        interactive && "hover:bg-surface-hover focus-visible:bg-surface-hover",
        disabled && "cursor-not-allowed opacity-45",
        !onClick && "cursor-default",
        className
      )}
    >
      {leading ? (
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center",
            danger ? "text-error-icon" : "text-muted-foreground"
          )}
        >
          {leading}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[13px] leading-5",
            danger ? "text-error-icon" : "text-foreground"
          )}
        >
          {label}
        </span>
        {meta ? (
          <span className="mt-0.5 block truncate text-[11px] leading-4 text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </span>
      {trailing ?? null}
      {trailing === undefined && selected ? (
        <IconCheck size={16} className="size-4 shrink-0 text-brand" />
      ) : null}
    </button>
  );
}

/**
 * A figure with its own name — latency, jitter, loss. The tone is on the
 * value, not on the label: the label is what we measured, the colour is the
 * verdict, and colouring both makes the panel read as an alarm.
 */
export function CallPopoverMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate text-[10px] leading-3 tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={cn(
          "text-[13px] leading-5 font-medium tabular-nums",
          tone === "neutral" && "text-foreground",
          tone === "good" && "text-success",
          tone === "warn" && "text-warning",
          tone === "bad" && "text-error-icon"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Reception, as four bars. Shared by the call bar, the network panel and the
 * settings page so one reading is never drawn three ways: `bars` is how many
 * light up, and the tone is the verdict on that count.
 *
 * `surface` is only about the *unlit* bars. The lit ones carry their own
 * colour, but an unlit bar is defined by contrast against what is behind it —
 * a light grey stub reads as lit on the navy bar, and a translucent white one
 * disappears entirely inside the white panel.
 */
export function SignalStrength({
  bars,
  tone,
  surface = "dark",
  className,
}: {
  bars: number;
  tone: "good" | "warn" | "bad";
  surface?: "dark" | "light";
  className?: string;
}) {
  const heights = ["h-[5px]", "h-2", "h-[11px]", "h-3.5"];
  return (
    <span className={cn("flex items-end gap-px", className)} aria-hidden="true">
      {heights.map((height, index) => (
        <span
          key={height}
          className={cn(
            "w-[3px] rounded-[2px] transition-colors duration-moderate",
            height,
            index < bars
              ? tone === "good"
                ? "bg-success"
                : tone === "warn"
                  ? "bg-warning"
                  : "bg-error-icon"
              : surface === "dark"
                ? "bg-white/20"
                : "bg-disabled-bg"
          )}
        />
      ))}
    </span>
  );
}
