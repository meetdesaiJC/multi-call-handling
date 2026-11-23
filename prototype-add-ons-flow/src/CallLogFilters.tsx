import { Button } from "@/components/Button";
import {
  IconCalendar,
  IconChevronDown,
  IconDownload,
  IconFilter,
} from "@/components/Icon";

/**
 * Filters row for the Call Logs prototype page — sits directly under the
 * Tabs bar. Page-local to this prototype, not a design-system component.
 */
export function CallLogFilters() {
  return (
    <div className="flex items-center gap-3 bg-white px-6 py-3">
      <div className="flex h-9 items-center gap-3">
        <div className="flex h-full w-[320px] items-center overflow-hidden rounded-[4px] border border-line pr-4">
          <button
            type="button"
            className="flex h-full shrink-0 items-center gap-1 border-r border-line bg-secondary-bg px-2 text-paragraph-md text-foreground hover:bg-surface-hover"
          >
            Contact
            <IconChevronDown size={16} className="size-4 shrink-0" aria-hidden="true" />
          </button>
          <input
            type="text"
            placeholder="Search"
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent px-2 text-paragraph-md text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <button
          type="button"
          className="flex h-9 w-[280px] items-center justify-between rounded-[4px] border border-line bg-white px-3.5 text-paragraph-md text-muted-foreground hover:bg-surface-hover"
        >
          Last Month
          <IconCalendar size={20} className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>

        <div className="h-full w-px bg-line" aria-hidden="true" />

        <Button
          type="button"
          variant="grey-outline"
          size="sm"
          leftIcon={<IconFilter size={20} className="size-5" aria-hidden="true" />}
        >
          Filters
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4">
        <button
          type="button"
          aria-label="Download"
          className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-foreground hover:bg-surface-hover"
        >
          <IconDownload size={20} className="size-5" aria-hidden="true" />
        </button>

        <Button type="button" variant="link" size="sm">
          View archived calls
        </Button>
      </div>
    </div>
  );
}
