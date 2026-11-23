import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import {
  IconChevronDown,
  IconClose,
  IconSearch,
} from "@/components/Icon";
import { useDropdownPresence } from "./useDropdownPresence";
import noResultsIllustration from "./assets/no-results.svg";

/** Decorative checkbox for menu rows (rows are the interactive control). */
function MenuCheckbox({
  checked,
  indeterminate,
  disabled,
}: {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
}) {
  const active = checked || indeterminate;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-solid",
        disabled
          ? "border-line bg-control-disabled-bg"
          : active
            ? "border-brand bg-brand"
            : "border-control-border bg-white"
      )}
    >
      {checked && !indeterminate && (
        <svg
          width={10}
          height={10}
          viewBox="0 0 16 16"
          fill="none"
          className="dropdown-check text-white"
        >
          <path
            d="M3.5 8.5L6.5 11.5L12.5 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {indeterminate && (
        <svg
          width={10}
          height={10}
          viewBox="0 0 16 16"
          fill="none"
          className="dropdown-check text-white"
        >
          <path
            d="M3.5 8H12.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

/**
 * Dropdown — synced from Figma "Design System 2.0 / Dropdown" (node 3464:126126).
 *
 * Figma exposes:
 *   Type            → `variant` ("border" | "borderless")
 *   Selection Type  → `multiple` (single vs multi-select)
 *   State           → hover / open / disabled via CSS + `disabled` / `open`
 *   Filled          → derived from whether a value is selected
 *   Prefix          → `prefix` slot (e.g. "USD")
 *   Left Icon       → `leftIcon` slot
 *   Search          → `searchable` (menu search field)
 *
 * A dropdown menu lets people pick one or many choices from a list — used in
 * forms and for filtering / sorting UI.
 *
 * Motion (base.css): open base/entrance fade + translateY(-4px→0); close
 * fast/exit fade + translateY(0→-3px); chevron base 0°↔180°; item hover
 * micro; checkmark fast. A menu flipped above its trigger (`placement`)
 * mirrors the travel so it still reads as leaving the trigger. Overlay only —
 * never pushes layout. Reduced motion keeps opacity and drops translation.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export type DropdownListItem =
  | ({ type?: "option" } & DropdownOption)
  | { type: "heading"; label: string }
  | { type: "separator" };

function isOption(
  item: DropdownListItem
): item is { type?: "option" } & DropdownOption {
  return !item.type || item.type === "option";
}

/* ------------------------------------------------------------------ */
/* Trigger                                                             */
/* ------------------------------------------------------------------ */

const triggerVariants = cva(
  "relative flex w-full items-center gap-2 overflow-hidden rounded-[4px] text-left text-paragraph-md outline-none transition-colors " +
    "disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        border:
          "h-10 border border-solid bg-white " +
          "border-line hover:border-control-border " +
          "data-[open=true]:border-brand " +
          "disabled:border-line disabled:hover:border-line",
        borderless:
          "h-10 " +
          "hover:bg-surface-hover data-[open=true]:bg-surface-hover " +
          "disabled:hover:bg-transparent",
      },
      hasPrefix: {
        true: "pr-3",
        false: "px-3",
      },
    },
    defaultVariants: {
      variant: "border",
      hasPrefix: false,
    },
  }
);

/* ------------------------------------------------------------------ */
/* Menu item                                                           */
/* ------------------------------------------------------------------ */

const itemVariants = cva(
  "dropdown-item flex w-full items-center gap-2 px-3 py-2 text-left text-paragraph-md outline-none",
  {
    variants: {
      state: {
        default: "text-foreground hover:bg-surface-hover",
        highlighted: "bg-surface-hover text-foreground",
        selected: "bg-brand-subtle text-foreground",
        disabled: "cursor-not-allowed text-disabled-fg",
      },
    },
    defaultVariants: { state: "default" },
  }
);

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface DropdownProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "prefix"> {
  /** Bordered field (default) or borderless text trigger. */
  variant?: "border" | "borderless";
  /** Allow selecting multiple values (tags + checkboxes). */
  multiple?: boolean;
  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled value — string for single, string[] for multi. */
  value?: string | string[];
  /** Uncontrolled initial value. */
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  /** Options / headings / separators for the menu. */
  options: DropdownListItem[];
  /** Placeholder when nothing is selected. */
  placeholder?: string;
  /** Field label above the trigger. */
  label?: React.ReactNode;
  /** Optional icon after the label (e.g. info). */
  labelIcon?: React.ReactNode;
  /** Leading icon inside the trigger. */
  leftIcon?: React.ReactNode;
  /** Leading prefix segment (e.g. "USD") with a divider. */
  prefix?: React.ReactNode;
  disabled?: boolean;
  /**
   * Which trigger edge the menu hangs from. `end` keeps a content-sized menu
   * inside its container when the trigger sits against the right edge.
   */
  align?: "start" | "end";
  /**
   * Which side of the trigger the menu opens on. `auto` (default) hangs it
   * below and flips it above when below has no room — the menu is absolutely
   * positioned, so a scroll container clips it rather than letting it hang
   * out of bounds.
   */
  placement?: "auto" | "bottom" | "top";
  /** Show a search field at the top of the menu. Default `true`. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Empty-state title when search yields no matches. */
  emptyTitle?: string;
  emptyDescription?: string;
  /**
   * Tags shown before the rest collapse into "+N". Default `1` — the house
   * rule for any list of chosen items: one named, the count for the rest, so
   * the field never wraps or truncates into a row of half-labels.
   */
  maxVisibleTags?: number;
  /**
   * When set and a value is selected, the trigger becomes an applied-filter
   * chip: "{field} is {first value} +N" with a clear control. Empty state
   * still uses `placeholder`.
   */
  appliedField?: string;
  /** Label for the multi-select "Select all" row. */
  selectAllLabel?: string;
  /**
   * Show the multi-select "Select all" row. Default `true`. Turn it off for a
   * short list (three or four choices), where picking every option by hand
   * is as quick and the extra row only adds noise.
   */
  selectAll?: boolean;
  /**
   * Multi-select only. Ticks are a draft until Apply, with Clear beside it —
   * for filters, where each tick would otherwise re-run the table under the
   * open menu. Closing without Apply drops the draft.
   */
  confirm?: boolean;
  /** className for the trigger button. */
  triggerClassName?: string;
  /** className for the dropdown panel. */
  menuClassName?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalizeMulti(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function optionList(items: DropdownListItem[]): DropdownOption[] {
  return items.filter(isOption);
}

/** Gap between trigger and menu, matching `top-[calc(100%+8px)]`. */
const MENU_GAP = 8;

/** Below this the menu is more scrollbar than list, so stop shrinking it. */
const MENU_MIN_HEIGHT = 120;

/**
 * The vertical band the menu can actually be seen in: the viewport, narrowed
 * by every scrolling or clipping ancestor between the trigger and the page.
 *
 * Absolute positioning does not escape `overflow: auto` — an ancestor that
 * scrolls cuts the menu off at its own edge, which is how a menu near the
 * bottom of a panel ends up half-drawn under whatever sits below the panel.
 */
function clipBand(el: HTMLElement): { top: number; bottom: number } {
  let top = 0;
  let bottom = window.innerHeight;
  let node = el.parentElement;

  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    if (style.overflowY !== "visible" || style.overflowX !== "visible") {
      const rect = node.getBoundingClientRect();
      top = Math.max(top, rect.top);
      bottom = Math.min(bottom, rect.bottom);
    }
    node = node.parentElement;
  }

  return { top, bottom };
}

/* ------------------------------------------------------------------ */
/* Tag chip (multi-select trigger)                                     */
/* ------------------------------------------------------------------ */

function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center truncate rounded-[4px] bg-muted px-2 py-0.5 text-paragraph-md text-gray-700",
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      className,
      triggerClassName,
      menuClassName,
      variant = "border",
      multiple = false,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      value: valueProp,
      defaultValue,
      onValueChange,
      options,
      placeholder = "Select…",
      label,
      labelIcon,
      leftIcon,
      prefix,
      disabled = false,
      align = "start",
      placement = "auto",
      searchable = true,
      searchPlaceholder = "Search placeholder value",
      emptyTitle = "No Results Found",
      emptyDescription = "Try searching with another keyword",
      maxVisibleTags = 1,
      appliedField,
      selectAllLabel = "Select all",
      selectAll = true,
      confirm = false,
      ...props
    },
    ref
  ) => {
    const isOpenControlled = openProp !== undefined;
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const open = isOpenControlled ? openProp : internalOpen;

    const isValueControlled = valueProp !== undefined;
    const [internalValue, setInternalValue] = React.useState<string | string[]>(
      () =>
        defaultValue ??
        (multiple ? ([] as string[]) : ("" as string))
    );
    const value = isValueControlled ? valueProp! : internalValue;

    const [query, setQuery] = React.useState("");
    const [highlight, setHighlight] = React.useState(-1);

    const { mounted, state: panelState } = useDropdownPresence(open);

    const rootRef = React.useRef<HTMLDivElement>(null);
    const anchorRef = React.useRef<HTMLDivElement>(null);
    const panelRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const searchRef = React.useRef<HTMLInputElement>(null);
    const listboxId = React.useId();

    // Resolved side + height cap for the open menu, measured against whatever
    // is clipping it. Held across the close animation so the menu leaves the
    // way it arrived.
    const [flipped, setFlipped] = React.useState(false);
    const [maxHeight, setMaxHeight] = React.useState<number | null>(null);

    React.useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

    const setOpen = React.useCallback(
      (next: boolean) => {
        if (!isOpenControlled) setInternalOpen(next);
        onOpenChange?.(next);
      },
      [isOpenControlled, onOpenChange]
    );

    // Keep the list stable while the close animation plays.
    React.useEffect(() => {
      if (mounted) return;
      setQuery("");
      setHighlight(-1);
    }, [mounted]);

    const setValue = React.useCallback(
      (next: string | string[]) => {
        if (!isValueControlled) setInternalValue(next);
        onValueChange?.(next);
      },
      [isValueControlled, onValueChange]
    );

    const optionsOnly = React.useMemo(() => optionList(options), [options]);
    const selectedValues = multiple
      ? normalizeMulti(value)
      : value
        ? [String(value)]
        : [];
    // With `confirm`, the menu edits a copy and the trigger keeps showing
    // what's applied until Apply commits it.
    const confirming = multiple && confirm;
    const [draft, setDraft] = React.useState<string[]>([]);
    const committedKey = selectedValues.join("\u0000");
    React.useEffect(() => {
      if (open && confirming) setDraft(committedKey ? committedKey.split("\u0000") : []);
      // Seed once per open — re-seeding on every commit would wipe the draft.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, confirming]);
    const menuValues = confirming ? draft : selectedValues;
    const draftChanged =
      confirming &&
      (draft.length !== selectedValues.length ||
        draft.some((v) => !selectedValues.includes(v)));

    const selectedSet = React.useMemo(
      () => new Set(menuValues),
      [menuValues]
    );

    const filteredItems = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return options;
      return options.filter((item) => {
        if (!isOption(item)) return true;
        return item.label.toLowerCase().includes(q);
      });
    }, [options, query]);

    const filteredOptions = React.useMemo(
      () => optionList(filteredItems),
      [filteredItems]
    );

    const enabledOptions = React.useMemo(
      () => filteredOptions.filter((o) => !o.disabled),
      [filteredOptions]
    );

    const filled = selectedValues.length > 0;
    const allSelected =
      multiple &&
      optionsOnly.length > 0 &&
      optionsOnly.every((o) => o.disabled || selectedSet.has(o.value));
    const someSelected =
      multiple && menuValues.length > 0 && !allSelected;

    // Click outside → close
    React.useEffect(() => {
      if (!open) return;
      const onPointerDown = (event: MouseEvent) => {
        if (!rootRef.current?.contains(event.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", onPointerDown);
      return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open, setOpen]);

    // Focus search on open
    React.useEffect(() => {
      if (open && searchable) {
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    }, [open, searchable]);

    /**
     * Place the menu against the room it actually has. Below by default;
     * above when below is short and above is roomier; capped to the band
     * either way, so a scroll container never gets to cut the list in half.
     *
     * Runs in a layout effect and on scroll/resize while open — before paint,
     * so the flip is never a visible jump.
     */
    React.useLayoutEffect(() => {
      if (!mounted) return;

      const measure = () => {
        const anchor = anchorRef.current;
        const panel = panelRef.current;
        if (!anchor || !panel) return;

        // Read the menu's own height with any previous cap lifted — measuring
        // it capped would ratchet the menu smaller on every pass.
        const capped = panel.style.maxHeight;
        panel.style.maxHeight = "";
        const wanted = panel.offsetHeight;
        panel.style.maxHeight = capped;

        const rect = anchor.getBoundingClientRect();
        const band = clipBand(anchor);
        const below = band.bottom - rect.bottom - MENU_GAP;
        const above = rect.top - band.top - MENU_GAP;

        const goUp =
          placement === "top" ||
          (placement === "auto" && wanted > below && above > below);
        const room = goUp ? above : below;

        setFlipped(goUp);
        // Only the option list scrolls — capping the no-results state would
        // crop its illustration instead of making anything reachable.
        const scrolls = filteredOptions.length > 0;
        setMaxHeight(
          scrolls && wanted > room
            ? Math.max(Math.floor(room), MENU_MIN_HEIGHT)
            : null
        );
      };

      measure();

      window.addEventListener("resize", measure);
      // Capture, so scrolling an ancestor container counts and not just the page.
      document.addEventListener("scroll", measure, true);
      return () => {
        window.removeEventListener("resize", measure);
        document.removeEventListener("scroll", measure, true);
      };
    }, [mounted, placement, filteredOptions]);

    const selectSingle = (option: DropdownOption) => {
      if (option.disabled) return;
      setValue(option.value);
      setOpen(false);
    };

    const toggleMulti = (option: DropdownOption) => {
      if (option.disabled) return;
      const next = selectedSet.has(option.value)
        ? menuValues.filter((v) => v !== option.value)
        : [...menuValues, option.value];
      if (confirming) setDraft(next);
      else setValue(next);
    };

    const toggleSelectAll = () => {
      const next = allSelected
        ? []
        : optionsOnly.filter((o) => !o.disabled).map((o) => o.value);
      if (confirming) setDraft(next);
      else setValue(next);
    };

    const onTriggerKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) return;
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlight(0);
        } else if (event.key === "Enter" || event.key === " ") {
          const opt = enabledOptions[highlight];
          if (opt) {
            multiple ? toggleMulti(opt) : selectSingle(opt);
          }
        }
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
    };

    const onMenuKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlight((i) =>
          enabledOptions.length === 0
            ? -1
            : Math.min(i + 1, enabledOptions.length - 1)
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlight((i) =>
          enabledOptions.length === 0 ? -1 : Math.max(i - 1, 0)
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        const opt = enabledOptions[highlight];
        if (!opt) return;
        multiple ? toggleMulti(opt) : selectSingle(opt);
      }
    };

    // Keep highlighted row in view
    React.useEffect(() => {
      if (highlight < 0 || !listRef.current) return;
      const node = listRef.current.querySelector<HTMLElement>(
        `[data-option-index="${highlight}"]`
      );
      node?.scrollIntoView({ block: "nearest" });
    }, [highlight]);

    const selectedLabels = selectedValues
      .map((v) => optionsOnly.find((o) => o.value === v)?.label ?? v)
      .filter(Boolean);

    const visibleTags = selectedLabels.slice(0, maxVisibleTags);
    const overflowCount = Math.max(
      0,
      selectedLabels.length - maxVisibleTags
    );
    const isApplied = Boolean(appliedField) && filled;
    const appliedExtra = Math.max(0, selectedLabels.length - 1);
    const appliedTitle = selectedLabels.join(", ");

    const displayValue = !multiple
      ? (optionsOnly.find((o) => o.value === value)?.label ?? "")
      : "";

    const hasResults = filteredOptions.length > 0;
    let optionIndex = -1;

    const triggerTextClass = cn(
      // A filter chip's empty label names the filter ("Status"), it isn't a
      // hint to type over — so it reads at full strength, like the live
      // product's filter row.
      filled || appliedField
        ? "text-foreground"
        : "text-disabled-fg",
      disabled && "text-disabled-fg"
    );

    return (
      <div
        ref={rootRef}
        className={cn(
          "relative flex w-full flex-col gap-2",
          className,
          isApplied && "w-max max-w-[360px]"
        )}
        {...props}
      >
        {label != null && label !== "" && (
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "text-label-md text-foreground",
                disabled && "text-disabled-fg"
              )}
            >
              {label}
            </span>
            {labelIcon && (
              <span
                className={cn(
                  "inline-flex size-5 shrink-0 items-center justify-center text-foreground [&_svg]:size-5",
                  disabled && "text-disabled-fg"
                )}
              >
                {labelIcon}
              </span>
            )}
          </div>
        )}

        <div ref={anchorRef} className="relative w-full">
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={mounted ? listboxId : undefined}
            data-open={open ? "true" : "false"}
            onClick={() => !disabled && setOpen(!open)}
            onKeyDown={onTriggerKeyDown}
            className={cn(
              triggerVariants({ variant, hasPrefix: Boolean(prefix) }),
              // Applied chips take a grey fill so a row of filters shows at a
              // glance which ones are doing something.
              isApplied && "min-w-0 gap-0 bg-secondary-bg px-0",
              triggerClassName
            )}
            aria-label={
              isApplied
                ? `${appliedField} is ${appliedTitle}`
                : undefined
            }
          >
            {prefix != null && (
              <span
                className={cn(
                  "flex h-full shrink-0 items-center border-r border-line px-3",
                  disabled
                    ? "bg-muted text-disabled-fg"
                    : "bg-surface-hover text-foreground"
                )}
              >
                {prefix}
              </span>
            )}

            {leftIcon && (
              <span
                className={cn(
                  "inline-flex size-5 shrink-0 items-center justify-center text-foreground [&_svg]:size-5",
                  disabled && "text-disabled-fg",
                  prefix && "ml-3"
                )}
              >
                {leftIcon}
              </span>
            )}

            <span
              className={cn(
                "flex min-w-0 flex-1 items-center",
                isApplied ? "gap-1 py-2 pl-3 pr-2.5" : "gap-2",
                prefix && !leftIcon && !isApplied && "pl-3",
                multiple && filled && disabled && "opacity-50"
              )}
              title={isApplied ? `${appliedField} is ${appliedTitle}` : undefined}
            >
              {isApplied ? (
                <>
                  <span className="shrink-0 whitespace-nowrap text-paragraph-md text-muted-foreground">
                    {appliedField} is
                  </span>
                  {/* Capped so a long value truncates and "+N" stays in view. */}
                  <span className="min-w-0 max-w-[120px] truncate text-paragraph-md text-foreground">
                    {selectedLabels[0]}
                  </span>
                  {appliedExtra > 0 && (
                    <span className="shrink-0 tabular-nums text-paragraph-md text-foreground">
                      +{appliedExtra}
                    </span>
                  )}
                </>
              ) : multiple && filled ? (
                <>
                  {visibleTags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                  {overflowCount > 0 && (
                    <Tag className="shrink-0">+{overflowCount}</Tag>
                  )}
                </>
              ) : (
                <span
                  className={cn("truncate", triggerTextClass)}
                  title={filled ? displayValue : undefined}
                >
                  {filled ? displayValue : placeholder}
                </span>
              )}
            </span>

            {isApplied ? (
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex w-8 shrink-0 items-center justify-center self-stretch border-l border-line",
                  disabled
                    ? "text-disabled-fg"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (disabled) return;
                  setValue(multiple ? [] : "");
                }}
              >
                <IconClose size={16} className="size-4" />
              </span>
            ) : (
              <span
                className={cn(
                  "dropdown-chevron inline-flex size-5 shrink-0 items-center justify-center",
                  disabled ? "text-disabled-fg" : "text-foreground"
                )}
                data-open={open ? "true" : "false"}
              >
                <IconChevronDown
                  size={20}
                  className="size-5"
                  aria-hidden="true"
                />
              </span>
            )}
          </button>

          {mounted && (
            <div
              ref={panelRef}
              id={listboxId}
              role="listbox"
              aria-multiselectable={multiple || undefined}
              aria-hidden={!open}
              tabIndex={-1}
              onKeyDown={onMenuKeyDown}
              data-state={panelState}
              data-placement={flipped ? "top" : "bottom"}
              style={maxHeight != null ? { maxHeight } : undefined}
              className={cn(
                "dropdown-panel absolute z-50 flex flex-col overflow-hidden rounded-[4px] border border-line bg-white shadow-400",
                flipped ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]",
                align === "end" ? "right-0" : "left-0",
                // Bordered fields read as one control with the menu, so the
                // menu matches the field. A borderless trigger is only as wide
                // as its text, so the menu sizes to its own content instead —
                // never narrower than the trigger, capped before it sprawls.
                // A filter chip (`appliedField`) is the same case: sized to
                // "Role", it would squeeze the options into "Ad…", so its menu
                // gets a floor of its own.
                variant === "borderless"
                  ? "w-max min-w-full max-w-[280px]"
                  : appliedField
                    ? "w-max min-w-[240px] max-w-[320px]"
                    : "w-full",
                menuClassName
              )}
            >
            {searchable && (
              <div className="shrink-0 border-b border-line px-3 py-2">
                <div className="flex items-center gap-2 rounded-[4px] border border-line bg-white px-3 py-2">
                  <IconSearch
                    size={20}
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setHighlight(0);
                    }}
                    placeholder={searchPlaceholder}
                    aria-label="Search options"
                    className="min-w-0 flex-1 bg-transparent text-paragraph-sm text-foreground outline-none placeholder:text-disabled-fg"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setQuery("");
                        searchRef.current?.focus();
                      }}
                      className="inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <IconClose size={20} className="size-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {!hasResults ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-8">
                <img
                  src={noResultsIllustration}
                  alt=""
                  width={80}
                  height={80}
                  className="size-20"
                  aria-hidden="true"
                />
                <div className="flex w-full flex-col items-center gap-1 px-2 text-center">
                  <p className="text-label-md-semi text-foreground">
                    {emptyTitle}
                  </p>
                  <p className="max-w-[240px] text-paragraph-sm text-muted-foreground">
                    {emptyDescription}
                  </p>
                </div>
              </div>
            ) : (
              <div
                ref={listRef}
                className="max-h-[216px] min-h-0 overflow-y-auto overscroll-contain py-0"
              >
                {multiple && selectAll && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="dropdown-item flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-hover"
                  >
                    <MenuCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                    />
                    <span className="text-label-md text-foreground">
                      {selectAllLabel}
                    </span>
                  </button>
                )}

                {filteredItems.map((item, index) => {
                  if (item.type === "separator") {
                    return (
                      <div
                        key={`sep-${index}`}
                        role="separator"
                        className="mx-2 my-0.5 border-t border-line"
                      />
                    );
                  }
                  if (item.type === "heading") {
                    return (
                      <div
                        key={`heading-${index}-${item.label}`}
                        className="px-3.5 py-2 text-label-sm text-muted-foreground"
                      >
                        {item.label}
                      </div>
                    );
                  }

                  optionIndex += 1;
                  const currentIndex = optionIndex;
                  const selected = selectedSet.has(item.value);
                  const isDisabled = Boolean(item.disabled);
                  const isHighlighted =
                    !isDisabled && highlight === currentIndex;

                  let state: "default" | "highlighted" | "selected" | "disabled" =
                    "default";
                  if (isDisabled) state = "disabled";
                  else if (!multiple && selected) state = "selected";
                  else if (isHighlighted) state = "highlighted";

                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      aria-disabled={isDisabled || undefined}
                      disabled={isDisabled}
                      data-option-index={currentIndex}
                      onMouseEnter={() =>
                        !isDisabled && setHighlight(currentIndex)
                      }
                      onClick={() =>
                        multiple ? toggleMulti(item) : selectSingle(item)
                      }
                      className={itemVariants({ state })}
                    >
                      {multiple && (
                        <MenuCheckbox
                          checked={selected}
                          disabled={isDisabled}
                        />
                      )}
                      {item.icon && (
                        <span
                          className={cn(
                            "inline-flex size-5 shrink-0 items-center justify-center [&_svg]:size-5",
                            isDisabled
                              ? "text-disabled-fg"
                              : "text-foreground"
                          )}
                        >
                          {item.icon}
                        </span>
                      )}
                      {/* Labels past the menu cap truncate — the title gives
                          the full value back on hover. */}
                      <span className="min-w-0 flex-1 truncate" title={item.label}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {confirming && (
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-3 py-2">
                {/* xs, not sm: the footer serves the list above it, and at
                    36px the buttons outweighed the 14px option rows. */}
                <Button
                  variant="link"
                  size="xs"
                  disabled={draft.length === 0}
                  onClick={() => setDraft([])}
                >
                  Clear
                </Button>
                <Button
                  size="xs"
                  // Nothing to apply until the draft differs from what's on.
                  disabled={!draftChanged}
                  onClick={() => {
                    setValue(draft);
                    setOpen(false);
                  }}
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    );
  }
);
Dropdown.displayName = "Dropdown";

export { triggerVariants, itemVariants };
