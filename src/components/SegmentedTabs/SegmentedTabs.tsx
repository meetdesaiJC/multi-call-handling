import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * SegmentedTabs — synced from Figma "Voice Agent V2 / Tab System"
 * (node 82:10918), variants Active=1…6.
 *
 * A segmented control: one recessed track holding equal-width segments, the
 * selected one lifted out as a white card. Distinct from the DS `Tabs`, which
 * is the underline pattern — that one labels *sections of a page*, this one
 * switches *the content of one panel*, so the whole control has to read as a
 * single object with a moving piece inside it.
 *
 * Figma spec:
 *   track     48px tall — 6px padding, 6px gap, rounded-md, bg/secondary,
 *             1px border/primary
 *   segment   36px tall — 8px padding, 8px gap, rounded-[4px], flex-1
 *   selected  white fill + light/200 elevation
 *   separator 1px × 24px border/primary between every neighbouring pair
 *   label     Headline-m|Med (text-label-md) at text/primary in *both* states
 *
 * Note that only the surface changes between states — the label keeps the same
 * weight and colour whether selected or not, which is what makes the segments
 * read as siblings rather than as one active item and four dimmed ones. Don't
 * "fix" this by muting the inactive labels; the design leans on the card lift
 * alone.
 *
 * Unselected segments are left transparent rather than filled with
 * bg-secondary-bg as Figma draws them — the fill is identical to the track, so
 * painting it would only get in the way of the hover state.
 *
 * The track outline is an inset ring, not a `border`. Figma's 48px is the hug
 * of 6 + 36 + 6 with the stroke drawn *inside* that box, so a border — which
 * Tailwind adds to the height — would push the control to 50px and knock it out
 * of rhythm with the other 48px-tall controls in a toolbar row.
 *
 * Two additions Figma doesn't specify, because a control with no feedback
 * reads as broken: a hover fill one step darker than the track (`muted`, so it
 * never previews the white selected card), and the DS focus ring.
 *
 * ── Motion ─────────────────────────────────────────────────────────────
 * The white card is **one element that moves**, not a fill that hops between
 * five buttons. It is absolutely positioned in the track and re-measured onto
 * the selected segment; the transition is declared on `.segmented-tabs-*` in
 * base.css. Everything else — hover, press, the separator fade — is kept
 * quieter than that move on purpose, so the control still reads as utility
 * navigation rather than as animated tabs.
 *
 * Geometry is written straight to the node instead of through React state.
 * Two reasons: a resize has to land *without* a transition while a selection
 * has to land *with* one, and that flag has to reach the DOM in the same style
 * resolution as the new geometry — a re-render cannot promise that. And
 * short-circuiting on unchanged geometry means an unrelated parent re-render
 * mid-flight can't stamp `data-animate="false"` onto a transition that is
 * still running and snap the card to its destination.
 *
 * Interruption (spec §9: Web Pages → Text → Files mid-flight) needs no code —
 * a CSS transition retargeted before it finishes interpolates from its current
 * computed value, so the card redirects rather than queueing.
 */

export interface SegmentedTabItem {
  key: string;
  label?: string;
  /** Optional leading 20px icon — inherits the label colour. */
  icon?: React.ReactNode;
  /**
   * An unavailable source. Stays focusable and tooltip-able (this is
   * `aria-disabled`, not the `disabled` attribute — a disabled button swallows
   * the pointer events a "why is this off?" tooltip needs) but cannot be
   * selected, and arrow-key navigation steps over it.
   */
  disabled?: boolean;
}

/**
 * `default` is the Voice Agent tab system described above. `outlined` is the
 * Billing Overview (Apex) treatment, Figma node 40003082:109278: the card
 * carries its own 1px border, inactive labels drop to secondary text, there
 * are no separators, and the track pads 8px inside its 1px outline (so 54px
 * tall, not 48). There the label colour *does* carry state, because without
 * separators the card alone doesn't say which neighbours are tabs.
 */
const trackVariants = cva(
  "segmented-tabs relative flex w-full items-center gap-1.5 rounded-md bg-secondary-bg inset-ring-1 inset-ring-line",
  {
    variants: {
      variant: {
        default: "p-1.5",
        // 1px inset outline + 8px padding = Figma's border + p-8.
        outlined: "p-[9px]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface SegmentedTabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect">,
    VariantProps<typeof trackVariants> {
  items: SegmentedTabItem[];
  /** Controlled active segment key. */
  value: string;
  onValueChange?: (key: string) => void;
}

export const SegmentedTabs = React.forwardRef<
  HTMLDivElement,
  SegmentedTabsProps
>(({ items, value, onValueChange, variant, className, onKeyDown, ...props }, ref) => {
  const outlined = variant === "outlined";
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const indicatorRef = React.useRef<HTMLSpanElement | null>(null);
  const buttonRefs = React.useRef(new Map<string, HTMLButtonElement>());

  // Last geometry actually written, so a no-op render stays a no-op.
  const placed = React.useRef<string | null>(null);
  const lastValue = React.useRef<string | null>(null);
  const parity = React.useRef(0);
  const placeRef = React.useRef<(animate: boolean) => void>(() => {});

  const place = (animate: boolean) => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const target = buttonRefs.current.get(value);
    if (!target) {
      indicator.dataset.visible = "false";
      placed.current = null;
      return;
    }

    const { offsetLeft: x, offsetTop: y, offsetWidth: w, offsetHeight: h } = target;
    const geometry = `${x},${y},${w},${h}`;
    if (geometry === placed.current) return;
    placed.current = geometry;

    indicator.dataset.animate = animate ? "true" : "false";
    indicator.dataset.visible = "true";
    indicator.style.width = `${w}px`;
    indicator.style.height = `${h}px`;
    indicator.style.transform = `translate(${x}px, ${y}px)`;

    if (animate) {
      // Alternated so the reduced-motion crossfade restarts on every switch —
      // re-applying an identical animation-name would not replay it.
      parity.current ^= 1;
      indicator.dataset.parity = String(parity.current);
    }
  };

  React.useLayoutEffect(() => {
    placeRef.current = place;
    // First measurement lands silently: animating in from 0,0 would read as
    // the control assembling itself on load.
    const animate = lastValue.current !== null && lastValue.current !== value;
    lastValue.current = value;
    place(animate);
  });

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    // A container resize moves the card without the user asking, so it lands
    // instantly — an indicator easing sideways during a window drag reads as
    // lag, not as motion design.
    const observer = new ResizeObserver(() => placeRef.current(false));
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const setTrackRef = (node: HTMLDivElement | null) => {
    trackRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const selectable = items.filter((item) => !item.disabled);
  const hasSelection = items.some((item) => item.key === value);

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || selectable.length === 0) return;

    const keys = selectable.map((item) => item.key);
    const current = keys.indexOf(value);
    let next: number | null = null;

    if (event.key === "ArrowRight") {
      next = current < 0 ? 0 : (current + 1) % keys.length;
    } else if (event.key === "ArrowLeft") {
      next = current < 0 ? keys.length - 1 : (current - 1 + keys.length) % keys.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = keys.length - 1;
    }

    if (next === null) return;
    event.preventDefault();
    const nextKey = keys[next];
    onValueChange?.(nextKey);
    buttonRefs.current.get(nextKey)?.focus();
  };

  return (
    <div
      ref={setTrackRef}
      role="tablist"
      className={cn(trackVariants({ variant }), className)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <span
        ref={indicatorRef}
        aria-hidden="true"
        data-visible="false"
        className={cn(
          "segmented-tabs-indicator pointer-events-none absolute left-0 top-0 rounded-[4px] bg-background shadow-200",
          // A real border, not an inset ring: both are box-shadows, so a
          // ring would replace the shadow-200 lift rather than add to it.
          outlined && "border border-line"
        )}
      />

      {items.map((item, index) => {
        const selected = item.key === value;
        const disabled = item.disabled === true;
        // Roving tabindex. With nothing selected the first selectable segment
        // holds the stop, so the control is never a keyboard dead end.
        const focusable = hasSelection
          ? selected
          : item.key === selectable[0]?.key;

        return (
          <React.Fragment key={item.key}>
            {index > 0 && !outlined && (
              <span
                aria-hidden="true"
                // The seam next to the card is dropped, not drawn under it:
                // a divider butting against the white surface makes the card
                // look docked to its neighbour rather than sitting on top.
                data-hidden={items[index - 1].key === value || selected}
                className="segmented-tabs-separator h-6 w-px shrink-0 self-center bg-line"
              />
            )}
            <button
              ref={(el) => {
                if (el) buttonRefs.current.set(item.key, el);
                else buttonRefs.current.delete(item.key);
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-disabled={disabled || undefined}
              data-selected={selected}
              data-disabled={disabled}
              tabIndex={focusable ? 0 : -1}
              onClick={() => {
                if (!disabled) onValueChange?.(item.key);
              }}
              className={cn(
                "segmented-tabs-segment relative z-[1] flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[4px] p-2 text-label-md",
                "outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
                disabled
                  ? "text-disabled-fg"
                  : outlined && !selected
                    ? "text-muted-foreground"
                    : "text-foreground"
              )}
            >
              {item.icon}
              {item.label && <span className="truncate">{item.label}</span>}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
});
SegmentedTabs.displayName = "SegmentedTabs";
