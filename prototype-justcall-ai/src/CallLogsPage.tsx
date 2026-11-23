import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import {
  IconAddPlus,
  IconArchive,
  IconArrowsSort,
  IconCalendar,
  IconChevronDown,
  IconDotsVertical,
  IconDownload,
  IconFilter,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconPlayerPlay,
  IconSelectAll,
} from "@/components/Icon";
import { LockedControl, type Lock } from "@/components/LockedControl";
import {
  Table,
  TableBody,
  TableBulkBar,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/Table";
import { Tabs } from "@/components/Tabs";
import { Tag } from "@/components/Tag";
import { LockedCheckbox } from "./LockedCheckbox";
import transcriptAi from "./assets/transcript-ai.svg";
import {
  CALL_LOGS,
  CALL_LOGS_PAGE_COUNT,
  CALL_LOGS_TOTAL,
  type CallLog,
} from "./callLogsData";

/**
 * Call Logs — Figma "Call Logs", node 9:65151. Tabs, a search + date toolbar,
 * a row of filter chips, then the log itself: a wide table that scrolls
 * sideways under a pinned Actions column, with the pager fixed beneath it.
 */

/** Actions the signed-in license can't take here; omit for full access. */
export interface CallLogsLocks {
  /** Archiving calls, one row or a bulk selection. */
  archive?: Lock;
  /**
   * Deleting a transcript. No delete control is on this screen — transcripts
   * open elsewhere — so this is accepted for the caller's config and unused.
   */
  deleteTranscript?: Lock;
}

/** Locks one control when `lock` is set; renders it untouched otherwise. */
function Gate({
  lock,
  placement,
  children,
}: {
  lock?: Lock;
  placement?: "top" | "bottom" | "left";
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return (
    <LockedControl
      locked={Boolean(lock)}
      reason={lock?.reason}
      hint={lock?.hint}
      placement={placement}
    >
      {children}
    </LockedControl>
  );
}

const TABS = [
  { key: "all", label: "All" },
  { key: "missed", label: "Missed" },
  { key: "voicemail", label: "Voicemail" },
];

/** Figma's filter dropdown triggers: 32px, 4px radius, Paragraph/Medium. */
function FilterChip({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-8 items-center gap-1 rounded-[4px] border border-line bg-white pr-2.5 pl-3 text-paragraph-md text-foreground outline-none transition-colors hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/24"
    >
      {children}
      <IconChevronDown size={16} />
    </button>
  );
}

function Toolbar({
  search,
  onSearch,
  filtersOpen,
  onToggleFilters,
}: {
  search: string;
  onSearch: (value: string) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}) {
  return (
    <div className="flex h-[60px] shrink-0 items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {/* Field picker and query share one bordered control, as in the design. */}
        <div className="flex h-9 w-[291px] overflow-hidden rounded-[4px] border border-line bg-white focus-within:border-brand">
          <button
            type="button"
            className="flex w-[97px] shrink-0 items-center gap-1 border-r border-line bg-secondary-bg pr-2 pl-3 text-paragraph-md text-foreground outline-none hover:bg-muted"
          >
            Contact
            <IconChevronDown size={20} className="text-muted-foreground" />
          </button>
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search"
            aria-label="Search call logs"
            className="min-w-0 flex-1 bg-transparent pr-3 pl-2 text-paragraph-md text-foreground outline-none placeholder:text-disabled-fg"
          />
        </div>
        <button
          type="button"
          className="flex h-9 w-[280px] items-center justify-between rounded-[4px] border border-line bg-white pr-3 pl-2.5 text-paragraph-md text-foreground outline-none hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          Last 7 Days
          <IconCalendar size={20} className="text-disabled-fg" />
        </button>
        <span className="h-9 w-px bg-line" aria-hidden />
        <Button
          variant="grey-outline"
          size="sm"
          leftIcon={<IconFilter size={20} />}
          aria-expanded={filtersOpen}
          aria-controls="call-log-filters"
          onClick={onToggleFilters}
          className={cn("gap-2 pr-3 pl-2.5 [&_svg]:size-5", filtersOpen && "bg-secondary-bg")}
        >
          {filtersOpen ? "Hide Filters" : "Filters"}
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="grey-outline" size="md" iconOnly aria-label="Export call logs" className="border-0">
          <IconDownload size={20} />
        </Button>
        <Button variant="link" size="xs" className="h-5 text-label-md">
          View archived calls
        </Button>
      </div>
    </div>
  );
}

/** Header label with Figma's two-arrow sort glyph. */
function SortHeader({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 text-label-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
    >
      {children}
      <IconArrowsSort size={16} />
    </button>
  );
}

/*
 * The Actions column stays pinned while the table scrolls sideways; a soft
 * shade on its left edge says there is more table underneath it.
 */
const PINNED =
  "sticky right-0 z-[1] shadow-[-6px_0_8px_-6px_color-mix(in_srgb,var(--color-foreground)_16%,transparent)]";

/** Figma's segmented action group: three 36px buttons in one bordered pill. */
const ACTION_BUTTON =
  "flex size-9 items-center justify-center text-foreground outline-none transition-colors duration-micro hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent";

function LogRow({
  log,
  selected,
  onToggle,
  locks,
}: {
  log: CallLog;
  selected: boolean;
  onToggle: (checked: boolean) => void;
  locks?: CallLogsLocks;
}) {
  const Direction = log.direction === "incoming" ? IconPhoneIncoming : IconPhoneOutgoing;
  return (
    <TableRow state={selected ? "selected" : "default"} className="group/row border-b-0">
      <TableCell className="w-9 pr-2 pl-3">
        <LockedCheckbox
          lock={locks?.archive}
          size="sm"
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select call with ${log.contactName ?? log.contactNumber}`}
        />
      </TableCell>
      <TableCell className="px-2.5">
        <Direction
          size={20}
          aria-label={log.direction === "incoming" ? "Incoming call" : "Outgoing call"}
          className={log.direction === "incoming" ? "text-success" : "text-brand"}
        />
      </TableCell>
      <TableCell className="text-paragraph-md">
        <div className="flex min-w-0 flex-col">
          <span className="truncate">{log.contactName ?? log.contactNumber}</span>
          {log.contactName ? (
            <span className="truncate text-paragraph-sm text-muted-foreground">
              {log.contactNumber}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-paragraph-md">
        <div className="flex min-w-0 flex-col">
          <span className="truncate">{log.justCallName}</span>
          <span className="truncate text-paragraph-sm text-muted-foreground">
            {log.justCallNumber}
          </span>
        </div>
      </TableCell>
      <TableCell className="truncate text-paragraph-md">{log.agent}</TableCell>
      <TableCell>
        <Tag size="sm" color="green" className="h-6 text-label-sm">
          {log.status}
        </Tag>
      </TableCell>
      <TableCell className="text-paragraph-md">{log.duration}</TableCell>
      <TableCell className="text-paragraph-md">{log.when}</TableCell>
      <TableCell className="truncate text-paragraph-md">{log.disposition ?? "-"}</TableCell>
      <TableCell className="text-paragraph-md">-</TableCell>
      <TableCell
        className={cn(PINNED, "px-0", selected ? "bg-brand-subtle" : "bg-white group-hover/row:bg-secondary-bg")}
      >
        <div className="ml-[12px] flex w-[112px] items-center overflow-hidden rounded-[4px] border border-line bg-white">
          <button type="button" aria-label="View transcript" className={ACTION_BUTTON}>
            <img src={transcriptAi} alt="" width={20} height={20} className="size-5" />
          </button>
          <button type="button" aria-label="Play recording" className={cn(ACTION_BUTTON, "border-l border-line")}>
            <IconPlayerPlay size={20} />
          </button>
          <Gate lock={locks?.archive} placement="left">
            <button type="button" aria-label="Archive call" className={cn(ACTION_BUTTON, "border-l border-line")}>
              <IconArchive size={20} />
            </button>
          </Gate>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function CallLogsPage({ locks }: { locks?: CallLogsLocks } = {}) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  // Collapsed by default, as on Team Members: the table is what you came for.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = search.trim().toLowerCase();
  const rows = CALL_LOGS.filter(
    (log) =>
      (tab === "all" || log.kind === tab) &&
      (!q ||
        log.contactName?.toLowerCase().includes(q) ||
        log.contactNumber.includes(q))
  );
  const allSelected = rows.length > 0 && rows.every((log) => selected.has(log.id));
  const someSelected = rows.some((log) => selected.has(log.id));

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex h-[43px] shrink-0 items-start gap-8 border-b border-line px-6">
        <Tabs items={TABS} value={tab} onValueChange={setTab} />
        <button
          type="button"
          aria-label="More call views"
          className="flex h-10 w-5 items-center justify-center rounded-[4px] text-foreground outline-none hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconDotsVertical size={20} />
        </button>
      </div>

      <Toolbar
        search={search}
        onSearch={setSearch}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
      />

      {/* Always mounted so it animates both ways (styles.css .filter-row). */}
      <div
        id="call-log-filters"
        className={cn("filter-row shrink-0", filtersOpen && "is-open")}
        aria-hidden={!filtersOpen}
        inert={!filtersOpen ? true : undefined}
      >
        <div className="filter-row-clip">
          <div className="filter-row-inner flex h-14 items-center gap-3 border-t border-line px-6">
            <FilterChip>Call Type</FilterChip>
            <FilterChip>Status</FilterChip>
            <FilterChip>JustCall Numbers</FilterChip>
            <FilterChip>Members</FilterChip>
            <Button
              variant="grey-outline"
              size="sm"
              leftIcon={<IconAddPlus size={16} />}
              className="h-8 gap-2 pr-3 pl-2.5"
            >
              Add Filter
            </Button>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-6">
        <Table
          horizontalScroll
          verticalScroll
          // The design's columns overrun the viewport on purpose: the table
          // scrolls sideways and the pinned Actions column stays put.
          className="min-h-0 flex-1 [&>table]:min-w-[1446px] [&>table]:table-fixed"
        >
          <colgroup>
            <col className="w-9" />
            <col className="w-10" />
            <col className="w-[160px]" />
            <col className="w-[180px]" />
            <col className="w-[160px]" />
            <col className="w-[120px]" />
            <col className="w-[100px]" />
            <col className="w-[180px]" />
            <col className="w-[120px]" />
            <col className="w-[220px]" />
            <col className="w-[130px]" />
          </colgroup>
          <TableHeader className="sticky top-0 z-[2]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12 w-9 pr-2 pl-3">
                <LockedCheckbox
                  lock={locks?.archive}
                  size="sm"
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onCheckedChange={(checked) =>
                    setSelected(checked ? new Set(rows.map((log) => log.id)) : new Set())
                  }
                  aria-label="Select all calls"
                />
              </TableHead>
              <TableHead className="h-12" aria-label="Direction" />
              <TableHead className="h-12">Contact</TableHead>
              <TableHead className="h-12">JustCall Number</TableHead>
              <TableHead className="h-12">Agent Names</TableHead>
              <TableHead className="h-12">Status</TableHead>
              <TableHead className="h-12">
                <SortHeader>Duration</SortHeader>
              </TableHead>
              <TableHead className="h-12">
                <SortHeader>Date &amp; Time</SortHeader>
              </TableHead>
              <TableHead className="h-12">Disposition</TableHead>
              <TableHead className="h-12">Traits</TableHead>
              <TableHead className={cn(PINNED, "h-12 text-center")}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                selected={selected.has(log.id)}
                onToggle={(checked) => toggle(log.id, checked)}
                locks={locks}
              />
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 ? (
          <TableEmpty
            className="absolute inset-x-6 top-12 bottom-16"
            title="No calls here yet"
            description="Calls matching this view and its filters will show up here."
          />
        ) : null}

        <TablePagination
          page={page}
          pageCount={CALL_LOGS_PAGE_COUNT}
          onPageChange={setPage}
          rangeLabel={`${(page - 1) * 10 + 1}-${page * 10} of ${CALL_LOGS_TOTAL} calls`}
          className="shrink-0 rounded-none border-t border-line"
        />

        <TableBulkBar
          count={selected.size}
          label={selected.size === 1 ? "Item Selected" : "Items Selected"}
          actions={
            <>
              {allSelected ? null : (
                <Button
                  variant="grey-outline"
                  size="sm"
                  className="bg-white"
                  leftIcon={<IconSelectAll size={16} />}
                  onClick={() => setSelected(new Set(rows.map((log) => log.id)))}
                >
                  Select All
                </Button>
              )}
              <Button
                variant="error"
                size="sm"
                leftIcon={<IconArchive size={16} />}
                onClick={() => setSelected(new Set())}
              >
                Archive
              </Button>
            </>
          }
        />
      </div>
    </main>
  );
}
