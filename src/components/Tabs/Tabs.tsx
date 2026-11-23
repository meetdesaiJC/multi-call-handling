import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge, type BadgeProps } from "@/components/Badge";

/**
 * Tabs — synced from Figma "Design System 2.0 / Tabs" (node 3464:126545),
 * ".Base componenets" horizontal set.
 *
 * Figma properties (Label / Icon / Badge are independent toggles):
 *   Label  → optional text
 *   Icon   → optional 20px leading icon (inherits state text colour)
 *   Badge  → optional trailing count, rendered with the DS `Badge` (error)
 *   State  → Default / Hover / Selected, driven here by `value`
 *
 * Default text is muted (Paragraph/Medium); Hover swaps to primary text;
 * Selected goes to primary text at Label/Medium weight plus a 4px brand
 * underline. The underline track is always reserved (transparent when
 * inactive) so switching tabs doesn't reflow.
 *
 * The brand underline is a single element that slides between tabs
 * (position + width animate together, --duration-base / --ease-standard)
 * rather than each tab owning its own underline — this reads as one
 * indicator moving, not one fading out while another fades in. Label
 * colour crossfades separately at --duration-fast. Both respect
 * prefers-reduced-motion by snapping instantly.
 */

export interface TabItem {
  key: string;
  label?: string;
  icon?: React.ReactNode;
  /** Trailing count — rendered inside the DS error `Badge`. */
  badge?: React.ReactNode;
  /**
   * Tone of the trailing count. Defaults to `error` (an unread tally); a
   * live count that isn't a problem — calls in progress, a queue — reads
   * better as `success` / `warning`.
   */
  badgeVariant?: BadgeProps["variant"];
}

export interface TabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: TabItem[];
  /** Controlled active tab key. */
  value: string;
  onValueChange?: (key: string) => void;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ items, value, onValueChange, className, onKeyDown, ...props }, forwardedRef) => {
    const selectableKeys = items.map((item) => item.key);

    const listRef = React.useRef<HTMLDivElement>(null);
    const trackRefs = React.useRef(new Map<string, HTMLSpanElement>());
    const [indicator, setIndicator] = React.useState<{
      left: number;
      top: number;
      width: number;
    } | null>(null);
    // Skip the indicator's transition on first paint so it doesn't slide in
    // from the edge of the tablist — it should only animate between tabs.
    const [canAnimate, setCanAnimate] = React.useState(false);

    const measureIndicator = React.useCallback(() => {
      const list = listRef.current;
      const track = trackRefs.current.get(value);
      if (!list || !track) return;
      const listRect = list.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      setIndicator({
        left: trackRect.left - listRect.left,
        top: trackRect.top - listRect.top,
        width: trackRect.width,
      });
    }, [value]);

    React.useLayoutEffect(() => {
      measureIndicator();
    }, [measureIndicator]);

    React.useEffect(() => {
      const frame = requestAnimationFrame(() => setCanAnimate(true));
      return () => cancelAnimationFrame(frame);
    }, []);

    React.useEffect(() => {
      const list = listRef.current;
      if (!list || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => measureIndicator());
      observer.observe(list);
      return () => observer.disconnect();
    }, [measureIndicator]);

    const setListRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        listRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef)
          (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current =
            node;
      },
      [forwardedRef]
    );

    const focusTab = (key: string) => {
      const el = document.querySelector<HTMLButtonElement>(
        `[data-tab-key="${key}"]`
      );
      el?.focus();
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (
      event
    ) => {
      onKeyDown?.(event);
      const currentIndex = selectableKeys.indexOf(value);
      let nextIndex: number | null = null;

      if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % selectableKeys.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex =
          (currentIndex - 1 + selectableKeys.length) % selectableKeys.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = selectableKeys.length - 1;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        const nextKey = selectableKeys[nextIndex];
        onValueChange?.(nextKey);
        focusTab(nextKey);
      }
    };

    return (
      <div
        ref={setListRef}
        role="tablist"
        className={cn("relative inline-flex items-start gap-8", className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {items.map((item) => {
          const selected = item.key === value;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              data-tab-key={item.key}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onValueChange?.(item.key)}
              className="group inline-flex flex-col items-start gap-2 pt-2.5 outline-none"
            >
              <span
                className={cn(
                  "inline-flex items-center gap-2 transition-colors duration-fast motion-reduce:transition-none",
                  selected
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {item.icon}
                {item.label && (
                  <span
                    className={cn(
                      "whitespace-nowrap",
                      selected ? "text-label-md" : "text-paragraph-md"
                    )}
                  >
                    {item.label}
                  </span>
                )}
                {item.badge != null && (
                  <Badge variant={item.badgeVariant ?? "error"}>{item.badge}</Badge>
                )}
              </span>
              <span
                ref={(el) => {
                  if (el) trackRefs.current.set(item.key, el);
                  else trackRefs.current.delete(item.key);
                }}
                className="h-1 w-full shrink-0 rounded-t-lg bg-transparent"
              />
            </button>
          );
        })}
        {indicator && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute h-1 rounded-t-lg bg-brand motion-reduce:transition-none motion-reduce:duration-instant",
              canAnimate &&
                "transition-[transform,width] duration-base ease-standard"
            )}
            style={{
              top: indicator.top,
              left: 0,
              width: indicator.width,
              transform: `translateX(${indicator.left}px)`,
            }}
          />
        )}
      </div>
    );
  }
);
Tabs.displayName = "Tabs";
