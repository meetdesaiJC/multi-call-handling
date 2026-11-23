import * as React from "react";
import { Checkbox } from "@/components/Checkbox";
import { Tag } from "@/components/Tag";
import { Button } from "@/components/Button";
import { IconOngoing, IconVoicemailDrop } from "@/components/Icon";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellText,
  TableSortLabel,
  TablePagination,
  type TableSortDirection,
} from "@/components/Table";
import {
  IconCallBusy,
  IconCallFailed,
  IconCallOutgoing,
  IconCallJourney,
  IconPlayRecording,
  IconArchiveCall,
} from "./icons/CallLogIcons";
import { CallDetailsSidesheet } from "./CallDetailsSidesheet";

/**
 * Call Logs table — Figma "Table" (node 40002555:12812), prototype-local.
 * Composed entirely from `@/components/Table`, `Tag`, and `Checkbox`
 * so it inherits DS states/tokens; only the call-type and row-action glyphs
 * are page-local (not yet in the shared Icon set).
 */

export type CallType = "completed" | "voicemail" | "busy" | "outgoing" | "failed";
export type CallStatus = "Completed" | "No answer" | "Busy" | "Failed";

export interface CallLogRow {
  id: string;
  type: CallType;
  contact: { primary: string; secondary?: string };
  justcall: { primary: string; secondary?: string };
  agent: string;
  status: CallStatus;
  duration: string;
  datetime: string;
  traits: string[];
  hasRecording: boolean;
  notes?: string;
}

const ROWS: CallLogRow[] = [
  {
    id: "1",
    type: "completed",
    contact: { primary: "Quantify Data", secondary: "9268445621" },
    justcall: { primary: "New JustCall number", secondary: "(012) 156-2157" },
    agent: "Olivia Rhye",
    status: "Completed",
    duration: "2m 9s",
    datetime: "Jun 3, 2023 3:38 am",
    traits: ["IVR", "Transfer call", "+5"],
    hasRecording: true,
  },
  {
    id: "2",
    type: "voicemail",
    contact: { primary: "Quantify Data", secondary: "9168445621" },
    justcall: { primary: "USA line number", secondary: "(621) 156-3157" },
    agent: "Olivia Rhye",
    status: "No answer",
    duration: "0s",
    datetime: "Jun 3, 2023 3:38 am",
    traits: [],
    hasRecording: false,
  },
  {
    id: "3",
    type: "busy",
    contact: { primary: "Quantify Data", secondary: "8268445621" },
    justcall: { primary: "(621) 356-3157" },
    agent: "Olivia Rhye",
    status: "Busy",
    duration: "0s",
    datetime: "Jun 3, 2023 3:38 am",
    traits: ["Transfer call"],
    hasRecording: false,
  },
  {
    id: "4",
    type: "completed",
    contact: { primary: "LambdaTest", secondary: "0168445621" },
    justcall: { primary: "Sales team", secondary: "(021) 156-3157" },
    agent: "Olivia Rhye",
    status: "Completed",
    duration: "16m",
    datetime: "Jun 3, 2023 3:38 am",
    traits: ["IVR", "Transfer call"],
    hasRecording: true,
  },
  {
    id: "5",
    type: "failed",
    contact: { primary: "9281134567" },
    justcall: { primary: "New JustCall number", secondary: "(012) 156-2157" },
    agent: "Olivia Rhye",
    status: "Failed",
    duration: "0s",
    datetime: "Jun 3, 2023 3:38 am",
    traits: ["Transfer call"],
    hasRecording: false,
  },
  {
    id: "6",
    type: "completed",
    contact: { primary: "Salesforce", secondary: "8764322453" },
    justcall: { primary: "Sales team", secondary: "(021) 156-3157" },
    agent: "Olivia Rhye",
    status: "Completed",
    duration: "6m 7s",
    datetime: "Jun 3, 2023 3:38 am",
    traits: ["IVR"],
    hasRecording: true,
  },
  {
    id: "7",
    type: "completed",
    contact: { primary: "Quantify Data", secondary: "9268445621" },
    justcall: { primary: "(621) 356-3157" },
    agent: "Olivia Rhye",
    status: "Completed",
    duration: "8m 7s",
    datetime: "Jun 3, 2023 3:38 am",
    traits: ["Transfer call"],
    hasRecording: true,
  },
  {
    id: "8",
    type: "outgoing",
    contact: { primary: "Quantify Data", secondary: "9268445621" },
    justcall: { primary: "New JustCall number", secondary: "(012) 156-2157" },
    agent: "Olivia Rhye",
    status: "Completed",
    duration: "10s",
    datetime: "Jun 3, 2023 3:38 am",
    traits: ["IVR", "Transfer call", "+2"],
    hasRecording: true,
  },
  {
    id: "9",
    type: "outgoing",
    contact: { primary: "Quantify Data", secondary: "9268445621" },
    justcall: { primary: "New JustCall number", secondary: "(012) 156-2157" },
    agent: "Olivia Rhye",
    status: "Completed",
    duration: "10s",
    datetime: "Jun 3, 2023 3:38 am",
    traits: ["IVR", "Transfer call"],
    hasRecording: true,
  },
  {
    id: "10",
    type: "completed",
    contact: { primary: "Acme Corp", secondary: "9345567281" },
    justcall: { primary: "Sales team", secondary: "(021) 156-3157" },
    agent: "Phoenix Baker",
    status: "Completed",
    duration: "4m 32s",
    datetime: "Jun 3, 2023 2:14 am",
    traits: ["IVR", "Transfer call"],
    hasRecording: true,
  },
  {
    id: "11",
    type: "voicemail",
    contact: { primary: "Globex", secondary: "8871223456" },
    justcall: { primary: "USA line number", secondary: "(621) 156-3157" },
    agent: "Phoenix Baker",
    status: "No answer",
    duration: "0s",
    datetime: "Jun 3, 2023 1:52 am",
    traits: [],
    hasRecording: false,
  },
  {
    id: "12",
    type: "outgoing",
    contact: { primary: "Initech", secondary: "7765412398" },
    justcall: { primary: "New JustCall number", secondary: "(012) 156-2157" },
    agent: "Olivia Rhye",
    status: "Completed",
    duration: "1m 12s",
    datetime: "Jun 2, 2023 6:40 pm",
    traits: ["IVR"],
    hasRecording: true,
  },
  {
    id: "13",
    type: "busy",
    contact: { primary: "LambdaTest", secondary: "0168445621" },
    justcall: { primary: "Sales team", secondary: "(021) 156-3157" },
    agent: "Phoenix Baker",
    status: "Busy",
    duration: "0s",
    datetime: "Jun 2, 2023 5:22 pm",
    traits: ["Transfer call"],
    hasRecording: false,
  },
  {
    id: "14",
    type: "failed",
    contact: { primary: "9871234509" },
    justcall: { primary: "New JustCall number", secondary: "(012) 156-2157" },
    agent: "Olivia Rhye",
    status: "Failed",
    duration: "0s",
    datetime: "Jun 2, 2023 4:05 pm",
    traits: [],
    hasRecording: false,
  },
  {
    id: "15",
    type: "completed",
    contact: { primary: "Quantify Data", secondary: "9268445621" },
    justcall: { primary: "(621) 356-3157" },
    agent: "Olivia Rhye",
    status: "Completed",
    duration: "3m 48s",
    datetime: "Jun 2, 2023 2:31 pm",
    traits: ["IVR", "Transfer call", "+1"],
    hasRecording: true,
  },
  {
    id: "16",
    type: "outgoing",
    contact: { primary: "Salesforce", secondary: "8764322453" },
    justcall: { primary: "Sales team", secondary: "(021) 156-3157" },
    agent: "Phoenix Baker",
    status: "Completed",
    duration: "22s",
    datetime: "Jun 2, 2023 1:09 pm",
    traits: ["Transfer call"],
    hasRecording: true,
  },
  {
    id: "17",
    type: "voicemail",
    contact: { primary: "Acme Corp", secondary: "9345567281" },
    justcall: { primary: "USA line number", secondary: "(621) 156-3157" },
    agent: "Olivia Rhye",
    status: "No answer",
    duration: "0s",
    datetime: "Jun 2, 2023 11:47 am",
    traits: [],
    hasRecording: false,
  },
  {
    id: "18",
    type: "completed",
    contact: { primary: "LambdaTest", secondary: "0168445621" },
    justcall: { primary: "New JustCall number", secondary: "(012) 156-2157" },
    agent: "Phoenix Baker",
    status: "Completed",
    duration: "9m 4s",
    datetime: "Jun 2, 2023 10:15 am",
    traits: ["IVR", "Transfer call"],
    hasRecording: true,
  },
  {
    id: "19",
    type: "busy",
    contact: { primary: "Initech", secondary: "7765412398" },
    justcall: { primary: "(621) 356-3157" },
    agent: "Olivia Rhye",
    status: "Busy",
    duration: "0s",
    datetime: "Jun 2, 2023 9:02 am",
    traits: ["Transfer call"],
    hasRecording: false,
  },
  {
    id: "20",
    type: "outgoing",
    contact: { primary: "Quantify Data", secondary: "9268445621" },
    justcall: { primary: "New JustCall number", secondary: "(012) 156-2157" },
    agent: "Phoenix Baker",
    status: "Completed",
    duration: "45s",
    datetime: "Jun 2, 2023 8:30 am",
    traits: ["IVR", "Transfer call", "+3"],
    hasRecording: true,
  },
];

function CallTypeIcon({ type }: { type: CallType }) {
  switch (type) {
    case "completed":
      return <IconOngoing size={20} className="size-5 shrink-0" aria-hidden="true" />;
    case "voicemail":
      return (
        <IconVoicemailDrop
          size={20}
          className="size-5 shrink-0 text-purple-600"
          aria-hidden="true"
        />
      );
    case "busy":
      return <IconCallBusy className="size-5 shrink-0" />;
    case "outgoing":
      return <IconCallOutgoing className="size-5 shrink-0" />;
    case "failed":
      return <IconCallFailed className="size-5 shrink-0" />;
  }
}

function StatusBadge({ status }: { status: CallStatus }) {
  if (status === "Completed") return <Tag color="green" size="md">Completed</Tag>;
  if (status === "Busy") return <Tag color="orange" size="md">Busy</Tag>;
  return <Tag color="red" size="md">{status}</Tag>;
}

function TraitTags({ traits }: { traits: string[] }) {
  if (traits.length === 0) {
    return <span className="text-label-md text-foreground">-</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {traits.map((trait, i) =>
        trait.startsWith("+") ? (
          <Tag key={i} color="grey" size="md">
            {trait}
          </Tag>
        ) : (
          <Tag key={i} color="purple" size="md">
            {trait}
          </Tag>
        )
      )}
    </div>
  );
}

/** Small inline plus glyph for the "Add note" link — not yet in the shared Icon set. */
function IconPlusSmall(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8 3.333v9.334M3.333 8h9.334"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Notes cell — shows the saved note or an "Add note" link when empty. */
function NotesCell({ notes }: { notes?: string }) {
  if (notes) {
    return <span className="text-label-md text-foreground">{notes}</span>;
  }
  return (
    <Button variant="link" size="sm" leftIcon={<IconPlusSmall className="size-4" />}>
      Add note
    </Button>
  );
}

/** One shimmering placeholder row, shown while the table "reloads". */
function SkeletonRow() {
  return (
    <TableRow className="border-b-0 hover:bg-transparent">
      <TableCell>
        <div className="skeleton size-4" />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-center">
          <div className="skeleton size-5" />
        </div>
      </TableCell>
      <TableCell>
        <div className="skeleton h-4 w-24" />
      </TableCell>
      <TableCell>
        <div className="skeleton h-4 w-28" />
      </TableCell>
      <TableCell>
        <div className="skeleton h-4 w-24" />
      </TableCell>
      <TableCell>
        <div className="skeleton h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <div className="skeleton h-4 w-14" />
      </TableCell>
      <TableCell>
        <div className="skeleton h-4 w-32" />
      </TableCell>
      <TableCell>
        <div className="skeleton h-4 w-full max-w-[180px]" />
      </TableCell>
      <TableCell>
        <div className="skeleton h-4 w-20" />
      </TableCell>
      <TableCell className="sticky right-0 z-10 bg-white text-center">
        <div className="flex justify-center">
          <div className="skeleton h-9 w-[108px]" />
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Segmented row-action group — call journey / play / archive. */
function RowActions({ hasRecording }: { hasRecording: boolean }) {
  return (
    <div className="inline-flex" role="group" aria-label="Row actions">
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Call Journey" />}
      >
        <button
          type="button"
          aria-label="Call journey"
          className="-ml-px inline-flex size-9 items-center justify-center rounded-l-[4px] border border-line bg-white text-foreground first:ml-0 hover:bg-secondary-bg"
        >
          <IconCallJourney className="size-5" />
        </button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        content={
          <Tooltip
            theme="dark"
            arrow="top-center"
            title={hasRecording ? "Play Recording" : "Recording Not Available"}
          />
        }
      >
        <span className="inline-flex">
          <button
            type="button"
            disabled={!hasRecording}
            aria-label="Play recording"
            className="-ml-px inline-flex size-9 items-center justify-center border border-line bg-white text-foreground hover:enabled:bg-secondary-bg disabled:opacity-40"
          >
            <IconPlayRecording className="size-5" />
          </button>
        </span>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Archive" />}
      >
        <button
          type="button"
          aria-label="Archive call"
          className="-ml-px inline-flex size-9 items-center justify-center rounded-r-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconArchiveCall className="size-5" />
        </button>
      </TooltipTrigger>
    </div>
  );
}

export interface CallLogsTableProps {
  variant?: "admin" | "team-member";
  onGetAiReviewAssist?: () => void;
}

export function CallLogsTable({ variant = "admin", onGetAiReviewAssist }: CallLogsTableProps) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [durationSort, setDurationSort] = React.useState<TableSortDirection>(false);
  const [dateSort, setDateSort] = React.useState<TableSortDirection>("desc");
  const [page, setPage] = React.useState(6);
  const [pageSize, setPageSize] = React.useState(10);
  const [isScrolledRight, setIsScrolledRight] = React.useState(false);
  const [activeRowIndex, setActiveRowIndex] = React.useState<number | null>(null);

  // Simulate a real fetch on mount/reload — brief shimmer before rows appear.
  const [isLoading, setIsLoading] = React.useState(true);
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const allSelected = selected.length === ROWS.length;
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = () => setSelected(allSelected ? [] : ROWS.map((r) => r.id));
  const toggleRow = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const cycleSort = (dir: TableSortDirection): TableSortDirection =>
    dir === "asc" ? "desc" : dir === "desc" ? false : "asc";

  const closeSidesheet = () => setActiveRowIndex(null);

  // ↑ / ↓ steps through call log rows while the sidesheet is open — mirrors
  // the Figma "Use ↑ ↓ to navigate across Call logs" hint. Ignored while the
  // user is typing (notes) or driving another control (disposition dropdown).
  React.useEffect(() => {
    if (activeRowIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      setActiveRowIndex((prev) => {
        if (prev === null) return prev;
        const next = e.key === "ArrowUp" ? prev - 1 : prev + 1;
        return Math.min(Math.max(next, 0), ROWS.length - 1);
      });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeRowIndex]);

  // Only show the frozen actions column's elevation shadow once there's
  // content scrolled behind it — not on initial, unscrolled load.
  const actionsShadow = isScrolledRight ? "shadow-300" : "";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div
        className="min-h-0 flex-1 overflow-auto"
        onScroll={(e) => setIsScrolledRight(e.currentTarget.scrollLeft > 0)}
      >
        <Table className="min-w-[1460px]">
          {/* Header cells are sticky individually (not via a sticky <thead>) —
              Chrome/Blink doesn't support position:sticky on table-header-group. */}
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="border-b-0 hover:bg-transparent">
              <TableHead className="sticky top-0 z-10 w-11">
                <Checkbox
                  size="sm"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rows"
                />
              </TableHead>
              <TableHead className="sticky top-0 z-10 w-10" aria-label="Call type" />
              <TableHead className="sticky top-0 z-10 min-w-[150px]">Contact</TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[180px]">JustCall number</TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[150px]">Agent name</TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[110px]">Status</TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[110px]">
                <TableSortLabel
                  direction={durationSort}
                  onClick={() => setDurationSort(cycleSort)}
                >
                  Duration
                </TableSortLabel>
              </TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[180px]">
                <TableSortLabel direction={dateSort} onClick={() => setDateSort(cycleSort)}>
                  Date &amp; Time
                </TableSortLabel>
              </TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[220px]">Traits</TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[160px]">Notes</TableHead>
              <TableHead
                className={`sticky top-0 right-0 z-20 w-[130px] bg-secondary-bg text-center ${actionsShadow}`}
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }, (_, i) => <SkeletonRow key={i} />)
            ) : (
              ROWS.map((row, index) => {
                const isSelected = selected.includes(row.id);
                // Highlighted when checked OR when this is the row whose
                // sidesheet is open — applied the instant the sheet opens,
                // and dropped the instant it's told to close (independent
                // of the sheet's own close animation).
                const isHighlighted = isSelected || index === activeRowIndex;
                return (
                  <TableRow
                    key={row.id}
                    state={isHighlighted ? "selected" : "default"}
                    className="cursor-pointer border-b-0"
                    onClick={() => setActiveRowIndex(index)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="sm"
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(row.id)}
                        aria-label={`Select call from ${row.contact.primary}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <CallTypeIcon type={row.type} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <TableCellText primary={row.contact.primary} supporting={row.contact.secondary} />
                    </TableCell>
                    <TableCell>
                      <TableCellText primary={row.justcall.primary} supporting={row.justcall.secondary} />
                    </TableCell>
                    <TableCell className="text-paragraph-md">{row.agent}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-paragraph-md">{row.duration}</TableCell>
                    <TableCell className="text-paragraph-md">{row.datetime}</TableCell>
                    <TableCell>
                      <TraitTags traits={row.traits} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <NotesCell notes={row.notes} />
                    </TableCell>
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className={`sticky right-0 z-10 bg-white text-center hover:z-20 focus-within:z-20 ${
                        isHighlighted ? "bg-brand-subtle" : ""
                      } ${actionsShadow}`}
                    >
                      <div className="flex justify-center">
                        <RowActions hasRecording={row.hasRecording} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="shrink-0 border-t border-line">
        <TablePagination
          page={page}
          pageCount={6}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          rangeLabel="1-25 of 103 items"
        />
      </div>

      <CallDetailsSidesheet
        open={activeRowIndex !== null}
        onClose={closeSidesheet}
        row={activeRowIndex !== null ? ROWS[activeRowIndex] : null}
        variant={variant}
        onGetAiReviewAssist={onGetAiReviewAssist}
      />
    </div>
  );
}
