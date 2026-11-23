import * as React from "react";
import { cn } from "@/lib/utils";
import { IconChevronDown } from "@/components/Icon";

/**
 * Accordion — a stack of disclosure rows.
 *
 * Built for a settings list: an icon, a name, and everything that setting owns
 * folded away behind it. The shape it is answering is a screen too small to
 * show five groups at once, where the agent only ever wants one of them.
 *
 * `type="single"` (the default) closes the open row when another opens, which
 * is what makes it useful on a narrow surface — two open rows and the second
 * one's contents are already below the fold. `type="multiple"` lets them stack
 * for a wide page.
 *
 * ## The one place this breaks CLAUDE.md §4
 *
 * §4 says don't animate layout properties that force reflow. A disclosure has
 * no way around it: the row genuinely gets taller, and nothing about
 * `transform` can fake a sibling moving down. So the panel interpolates
 * `grid-template-rows` between `0fr` and `1fr` — the cheapest technique that
 * still lets the panel size itself to its own content, and the only one that
 * doesn't need a measured pixel height in JS that goes stale the moment
 * anything inside re-wraps. Reduced motion snaps it.
 */

export interface AccordionItemProps {
  /** Identity within the accordion. Also the `aria-controls` target. */
  value: string;
  /** Leading 20px mark. */
  icon?: React.ReactNode;
  label: React.ReactNode;
  /**
   * Sits after the label, inside the row. For a count, a "New" tag, or the
   * kind of offer that is the reason the row exists.
   */
  badge?: React.ReactNode;
  children: React.ReactNode;
}

interface AccordionContextValue {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

export interface AccordionProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** One row open at a time (default), or as many as the reader opens. */
  type?: "single" | "multiple";
  /** Controlled open rows. */
  value?: string[];
  /** Uncontrolled initial open rows. */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  children: React.ReactNode;
}

export const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      type = "single",
      value,
      defaultValue,
      onValueChange,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolled, setUncontrolled] = React.useState<string[]>(
      defaultValue ?? []
    );
    const open = value ?? uncontrolled;

    const commit = (next: string[]) => {
      if (value === undefined) setUncontrolled(next);
      onValueChange?.(next);
    };

    const context = React.useMemo<AccordionContextValue>(
      () => ({
        isOpen: (item) => open.includes(item),
        toggle: (item) => {
          if (open.includes(item)) {
            commit(open.filter((entry) => entry !== item));
            return;
          }
          commit(type === "single" ? [item] : [...open, item]);
        },
      }),
      // `commit` closes over `open`, so the identity has to change with it.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [open, type]
    );

    return (
      <AccordionContext.Provider value={context}>
        <div ref={ref} className={cn("flex flex-col", className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = "Accordion";

export function AccordionItem({
  value,
  icon,
  label,
  badge,
  children,
}: AccordionItemProps) {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("AccordionItem must be rendered inside an Accordion");
  }
  const open = context.isOpen(value);
  const panelId = `accordion-panel-${value}`;
  const triggerId = `accordion-trigger-${value}`;

  return (
    <div className="accordion-item border-b border-line last:border-b-0">
      <h3>
        <button
          type="button"
          id={triggerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => context.toggle(value)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors duration-base",
            "hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24"
          )}
        >
          {icon ? (
            <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
              {icon}
            </span>
          ) : null}
          {/* A row label is the name of a section, not body copy — `heading-lg`
              rather than `paragraph-lg`. Same 16px, one weight up, so a
              collapsed stack reads as a table of contents. */}
          <span className="min-w-0 flex-1 text-heading-lg text-foreground">
            {label}
          </span>
          {badge ? <span className="shrink-0">{badge}</span> : null}
          {/* One glyph for both states rather than two icons swapped: rotating
              is a transform, so the chevron turns instead of blinking. */}
          <IconChevronDown
            size={20}
            aria-hidden="true"
            data-open={open ? "true" : undefined}
            className="accordion-chevron size-5 shrink-0 text-muted-foreground"
          />
        </button>
      </h3>

      {/* The grid is the animation — see the note at the top of this file. The
          inner element must be the one that clips, or the panel's own padding
          leaks out while the row is closed. */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        data-open={open ? "true" : undefined}
        className="accordion-panel grid"
      >
        <div className="accordion-panel-inner overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
