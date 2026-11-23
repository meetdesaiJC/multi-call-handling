import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useDropdownPresence } from "@/components/Dropdown";
import { LockedControl, type Lock } from "@/components/LockedControl";

/**
 * Menu — a list of actions opened from a trigger, usually a row's ⋮ button.
 *
 * Unlike Dropdown it holds no value: every row is a verb, and choosing one
 * closes the menu. It wears the same `.dropdown-panel` skin and presence
 * timing so the two read as one family.
 *
 * The panel is portalled and fixed-positioned against the trigger, because
 * row menus live inside scrolling tables whose `overflow` would clip an
 * absolutely positioned panel on the last rows. Scrolling or resizing closes
 * it rather than letting it drift away from its row.
 *
 * A row the license blocks stays in the list, muted, and says why on hover —
 * the LockedControl rule — instead of disappearing from the menu.
 */

export interface MenuItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onSelect?: () => void;
  /** Red text, for the one destructive verb at the bottom of a menu. */
  destructive?: boolean;
  locked?: Lock;
  /** Draws a divider above this row, to group verbs. */
  separatorBefore?: boolean;
}

export interface MenuProps {
  items: MenuItem[];
  /**
   * The control that opens the menu. It is cloned with `onClick`,
   * `aria-haspopup` and `aria-expanded`, so pass a single button.
   */
  trigger: React.ReactElement<Record<string, unknown>>;
  /** Which edge of the trigger the panel lines up with. Default `end`. */
  align?: "start" | "end";
  /** Accessible name for the list. */
  label?: string;
  className?: string;
}

const GAP = 4;

export function Menu({ items, trigger, align = "end", label, className }: MenuProps) {
  const [open, setOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState<DOMRect | null>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const { mounted, state } = useDropdownPresence(open);

  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    // Capture, so a scroll inside any ancestor (the table body) closes it too.
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  // Move focus into the list on open, so arrow keys work straight away.
  React.useEffect(() => {
    if (open && state === "open") {
      panelRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    }
  }, [open, state]);

  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const rows = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []
    );
    const index = rows.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    rows[(index + step + rows.length) % rows.length]?.focus();
  };

  const triggerElement = React.cloneElement(trigger, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
    },
    "aria-haspopup": "menu",
    "aria-expanded": open,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      setAnchor(event.currentTarget.getBoundingClientRect());
      setOpen((current) => !current);
    },
  });

  const panelStyle: React.CSSProperties | undefined = anchor
    ? {
        top: anchor.bottom + GAP,
        ...(align === "end"
          ? { right: window.innerWidth - anchor.right }
          : { left: anchor.left }),
      }
    : undefined;

  return (
    <>
      {triggerElement}
      {mounted && anchor
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              aria-label={label}
              data-state={state}
              onKeyDown={onListKeyDown}
              style={panelStyle}
              className={cn(
                "dropdown-panel fixed z-50 flex min-w-[200px] flex-col overflow-hidden rounded-[4px] border border-line bg-white py-1 shadow-400",
                align === "end" ? "origin-top-right" : "origin-top-left",
                className
              )}
            >
              {items.map((item) => {
                const row = (
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                      item.onSelect?.();
                      close();
                    }}
                    className={cn(
                      "dropdown-item flex w-full items-center gap-2 px-3 py-2 text-left text-paragraph-md outline-none transition-colors",
                      "hover:bg-surface-hover focus-visible:bg-surface-hover",
                      item.destructive ? "text-error" : "text-foreground",
                      "data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent",
                      "[&_svg]:size-4 [&_svg]:shrink-0"
                    )}
                  >
                    {item.icon}
                    <span className="flex-1 truncate">{item.label}</span>
                  </button>
                );
                return (
                  <React.Fragment key={item.key}>
                    {item.separatorBefore ? (
                      <div className="my-1 h-px bg-line" aria-hidden="true" />
                    ) : null}
                    {item.locked ? (
                      <LockedControl
                        reason={item.locked.reason}
                        hint={item.locked.hint}
                        placement="left"
                        triggerClassName="flex w-full"
                      >
                        {row}
                      </LockedControl>
                    ) : (
                      row
                    )}
                  </React.Fragment>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
