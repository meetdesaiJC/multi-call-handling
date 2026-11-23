import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/Icon";

/**
 * Table — synced from Figma "Design System 2.0 / Table" (node 2555:111230).
 *
 * Figma exposes the composed Table as:
 *   Type              → `type` ("default" | "empty")
 *   Pagination        → `pagination` slot / `TablePagination`
 *   Bulk Selection    → `bulkSelection` slot / `TableBulkBar`
 *   Vertical Scroll   → `verticalScroll` on the scroll wrapper
 *   Horizontal Scroll → `horizontalScroll` on the scroll wrapper
 *
 * Building blocks (also in Figma):
 *   .Table header cell → `TableHead` (checkbox | text, 44px)
 *   Body cell          → `TableCell` (72px; states via `TableRow`)
 *   .Table header      → `TableSortLabel` (sortable column label)
 *
 * Compose with semantic HTML (`table` / `thead` / `tbody` / `tr` / `th` / `td`)
 * so screen readers and keyboard navigation work out of the box.
 */

/* ------------------------------------------------------------------ */
/* Root / scroll shell                                                 */
/* ------------------------------------------------------------------ */

const tableShellVariants = cva("relative w-full bg-white", {
  variants: {
    verticalScroll: {
      true: "overflow-y-auto",
      false: "",
    },
    horizontalScroll: {
      true: "overflow-x-auto",
      false: "",
    },
  },
  defaultVariants: {
    verticalScroll: false,
    horizontalScroll: false,
  },
});

export interface TableProps
  extends React.HTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableShellVariants> {
  /** Max height of the scrollable body region (enables vertical scroll). */
  maxHeight?: number | string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    {
      className,
      verticalScroll = false,
      horizontalScroll = false,
      maxHeight,
      ...props
    },
    ref
  ) => {
    const needsShell = verticalScroll || horizontalScroll || maxHeight != null;

    const table = (
      <table
        ref={ref}
        className={cn(
          "w-full caption-bottom border-collapse text-left",
          !needsShell && className
        )}
        {...props}
      />
    );

    if (!needsShell) return table;

    return (
      <div
        className={cn(
          tableShellVariants({ verticalScroll, horizontalScroll }),
          className
        )}
        style={maxHeight != null ? { maxHeight } : undefined}
      >
        {table}
      </div>
    );
  }
);
Table.displayName = "Table";

/* ------------------------------------------------------------------ */
/* Structural parts                                                    */
/* ------------------------------------------------------------------ */

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("[&_tr]:border-b [&_tr]:border-line", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t border-line bg-white", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const tableRowVariants = cva(
  "border-b border-line transition-colors",
  {
    variants: {
      state: {
        default: "bg-white hover:bg-secondary-bg",
        hover: "bg-secondary-bg",
        selected: "bg-brand-subtle hover:bg-brand-subtle",
        disabled: "bg-white opacity-60 pointer-events-none",
      },
    },
    defaultVariants: { state: "default" },
  }
);

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement>,
    VariantProps<typeof tableRowVariants> {}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, state, ...props }, ref) => (
    <tr
      ref={ref}
      data-state={state === "selected" ? "selected" : undefined}
      className={cn(tableRowVariants({ state }), className)}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 whitespace-nowrap bg-secondary-bg px-3 py-3 text-left align-middle",
      "text-label-sm text-muted-foreground font-medium",
      "[&:has([role=checkbox])]:w-11 [&:has([role=checkbox])]:px-3",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "h-[72px] px-3 py-3 align-middle text-label-md text-foreground",
      "[&:has([role=checkbox])]:w-11 [&:has([role=checkbox])]:px-3",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-paragraph-md text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

/* ------------------------------------------------------------------ */
/* Sortable header label                                               */
/* ------------------------------------------------------------------ */

export type TableSortDirection = "asc" | "desc" | false;

export interface TableSortLabelProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Current sort direction. `false` = unsorted. */
  direction?: TableSortDirection;
  /** Hide the chevron until hover / active. Default false (always visible when sortable). */
  hideIcon?: boolean;
}

function SortIcon({ direction }: { direction?: TableSortDirection }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={cn(
        "shrink-0 text-muted-foreground transition-opacity",
        direction === false && "opacity-40"
      )}
    >
      <path
        d="M3.5 4.5L6 2L8.5 4.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 7.5L6 10L8.5 7.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const TableSortLabel = React.forwardRef<
  HTMLButtonElement,
  TableSortLabelProps
>(({ className, children, direction = false, disabled, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    disabled={disabled}
    className={cn(
      "inline-flex items-center gap-1 text-label-sm text-muted-foreground",
      "hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <SortIcon direction={direction} />
  </button>
));
TableSortLabel.displayName = "TableSortLabel";

/* ------------------------------------------------------------------ */
/* Cell content helpers                                                */
/* ------------------------------------------------------------------ */

export interface TableCellTextProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Primary line (medium, foreground). */
  primary: React.ReactNode;
  /** Optional supporting line under the primary (muted). */
  supporting?: React.ReactNode;
  /** Optional leading media (avatar, icon, flag). */
  lead?: React.ReactNode;
}

export function TableCellText({
  primary,
  supporting,
  lead,
  className,
  ...props
}: TableCellTextProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      {lead != null && (
        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {lead}
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-label-md text-foreground">{primary}</span>
        {supporting != null && (
          <span className="truncate text-paragraph-md text-muted-foreground">
            {supporting}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export interface TablePaginationProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Current page (1-indexed). */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /** Called when the user picks a page. */
  onPageChange?: (page: number) => void;
  /** Page size shown in the "Show N entries" control. */
  pageSize?: number;
  /** Options for the page-size select. */
  pageSizeOptions?: number[];
  /** Called when page size changes. */
  onPageSizeChange?: (size: number) => void;
  /** Range label, e.g. "1-25 of 103 items". */
  rangeLabel?: React.ReactNode;
  /** Hide the page-size control. */
  hidePageSize?: boolean;
}

function pageWindow(page: number, pageCount: number, max = 6): number[] {
  if (pageCount <= max) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const half = Math.floor(max / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(pageCount, start + max - 1);
  start = Math.max(1, end - max + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function TablePagination({
  className,
  page,
  pageCount,
  onPageChange,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  onPageSizeChange,
  rangeLabel,
  hidePageSize = false,
  ...props
}: TablePaginationProps) {
  const pages = pageWindow(page, pageCount);

  return (
    <div
      className={cn(
        "flex h-16 w-full items-center justify-between rounded-b-md bg-white px-6 py-3",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-8">
        {!hidePageSize && (
          <label className="flex items-center gap-2 text-paragraph-md text-muted-foreground">
            <span>Show</span>
            <span className="relative flex h-10 w-[66px] shrink-0 items-center">
              <select
                aria-label="Rows per page"
                className="h-full w-full cursor-pointer appearance-none rounded-[4px] bg-transparent pl-3.5 pr-7 text-label-md text-foreground outline-none focus-visible:ring-4 focus-visible:ring-brand/16"
                value={pageSize}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <IconChevronDown
                size={20}
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 size-5 -translate-y-1/2 text-foreground"
              />
            </span>
            <span>entries</span>
          </label>
        )}
        {rangeLabel != null && (
          <span className="text-label-sm text-muted-foreground">{rangeLabel}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          className="inline-flex size-9 items-center justify-center rounded-[4px] text-foreground hover:bg-secondary-bg disabled:pointer-events-none disabled:opacity-40"
        >
          <IconChevronLeft size={20} className="size-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-1">
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange?.(p)}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-[2px]",
                p === page
                  ? "bg-muted text-label-md text-foreground"
                  : "text-paragraph-md text-muted-foreground hover:bg-secondary-bg"
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange?.(page + 1)}
          className="inline-flex size-9 items-center justify-center rounded-[4px] text-foreground hover:bg-secondary-bg disabled:pointer-events-none disabled:opacity-40"
        >
          <IconChevronRight size={20} className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk selection bar                                                  */
/* ------------------------------------------------------------------ */

export interface TableBulkBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of selected rows. */
  count: number;
  /** Label after the count badge. Default "Items selected". */
  label?: React.ReactNode;
  /** Action buttons rendered on the right. */
  actions?: React.ReactNode;
}

export function TableBulkBar({
  className,
  count,
  label = "Items selected",
  actions,
  ...props
}: TableBulkBarProps) {
  if (count <= 0) return null;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto absolute bottom-20 left-1/2 z-10 flex h-[60px] -translate-x-1/2",
        "items-center gap-4 rounded-[6px] bg-gray-800 px-4 shadow-400",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 text-white">
        {/* A pill, not a circle: "Select All" can put a four-digit count here. */}
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-label-sm text-gray-800 tabular-nums">
          {count.toLocaleString("en-US")}
        </span>
        <span className="text-label-md whitespace-nowrap">{label}</span>
      </div>
      {actions != null && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export interface TableEmptyProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Optional illustration above the copy. */
  illustration?: React.ReactNode;
  /** Heading. */
  title?: React.ReactNode;
  /** Supporting description. */
  description?: React.ReactNode;
  /** CTA row (typically Secondary + Primary buttons). */
  actions?: React.ReactNode;
}

function DefaultEmptyIllustration() {
  return (
    <div
      className="relative flex size-[120px] items-center justify-center overflow-hidden rounded-full bg-secondary-bg"
      aria-hidden="true"
    >
      <div className="flex w-[72px] flex-col gap-1.5 rounded-[6px] border border-line bg-white p-2.5 shadow-200">
        <div className="h-1.5 w-10 rounded-full bg-line" />
        <div className="h-4 w-full rounded-[3px] border border-line bg-secondary-bg" />
        <div className="h-1.5 w-14 rounded-full bg-line" />
      </div>
      <div className="absolute bottom-7 right-7 size-0 border-l-[7px] border-r-[7px] border-t-[12px] border-l-transparent border-r-transparent border-t-brand" />
    </div>
  );
}

export function TableEmpty({
  className,
  illustration,
  title = "This is empty state header",
  description = "There is no content to display at the moment. Start by adding or creating new items to populate this section.",
  actions,
  ...props
}: TableEmptyProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center px-8 py-8",
        className
      )}
      {...props}
    >
      <div className="flex max-w-[420px] flex-col items-center gap-6 text-center">
        {illustration ?? <DefaultEmptyIllustration />}
        <div className="flex flex-col gap-2">
          <p className="text-heading-lg text-foreground">{title}</p>
          {description != null && (
            <p className="text-paragraph-md text-muted-foreground">{description}</p>
          )}
        </div>
        {actions != null && (
          <div className="flex items-start gap-4">{actions}</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composed shell matching Figma Table                                 */
/* ------------------------------------------------------------------ */

export interface DataTableProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tableShellVariants> {
  /**
   * Figma `Type`:
   * - `"default"` — normal data table
   * - `"empty"` — header + empty state + optional pagination
   */
  type?: "default" | "empty";
  /** Show pagination footer. Figma `Pagination`. Default true. */
  pagination?: boolean;
  /** Pagination props when `pagination` is true. */
  paginationProps?: Omit<TablePaginationProps, "className">;
  /** Bulk selection bar (shown when count > 0). Figma `Bulk Selection`. */
  bulkBar?: TableBulkBarProps | null;
  /** Empty-state content when `type="empty"`. */
  empty?: TableEmptyProps;
  /** The `<table>` (or fragment of Table* parts). Ignored when `type="empty"`. */
  children?: React.ReactNode;
  /** Max height for the scrollable table region. */
  maxHeight?: number | string;
}

export function DataTable({
  className,
  type = "default",
  pagination = true,
  paginationProps,
  bulkBar,
  empty,
  children,
  verticalScroll = true,
  horizontalScroll = true,
  maxHeight,
  ...props
}: DataTableProps) {
  return (
    <div className={cn("relative w-full overflow-hidden bg-white", className)} {...props}>
      {type === "empty" ? (
        <div className="w-full">
          {/* Header row is expected to be passed via empty.header or children above empty */}
          {children}
          <TableEmpty {...empty} />
        </div>
      ) : (
        <Table
          verticalScroll={verticalScroll}
          horizontalScroll={horizontalScroll}
          maxHeight={maxHeight}
        >
          {children}
        </Table>
      )}

      {bulkBar != null && <TableBulkBar {...bulkBar} />}

      {pagination && paginationProps != null && (
        <div className="border-t border-line">
          <TablePagination {...paginationProps} />
        </div>
      )}
    </div>
  );
}

export { tableShellVariants, tableRowVariants };
