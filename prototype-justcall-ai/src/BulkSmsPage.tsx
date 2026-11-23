import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, initialsFromName } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import {
  IconCalendar,
  IconChartBar,
  IconCopy,
  IconDownload,
  IconFilter,
  IconMessage2,
  IconPencil,
  IconSearch,
} from "@/components/Icon";
import { InputField } from "@/components/InputField";
import { LockedControl, type Lock } from "@/components/LockedControl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/Table";
import { Tabs } from "@/components/Tabs";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  BULK_SMS_CAMPAIGNS,
  BULK_SMS_TOTAL,
  type BulkSmsCampaign,
} from "./bulkSmsData";

/**
 * Messaging › Bulk SMS/MMS — Figma "Bulk Messages – Campaigns", node 126:4939.
 * Campaigns / Contact List tabs, the toolbar, then the campaign table with its
 * pager pinned to the bottom of the page.
 *
 * Lite and View-only both land here and both keep the list and each
 * campaign's analytics — reviewing what went out is the point of those
 * licenses. What a license blocks stays where it is, muted, and says why.
 */

/** Actions the signed-in license can't take here; omit for full access. */
export interface BulkSmsLocks {
  /** Create Campaign. */
  create?: Lock;
  /** Row ✎ edit. */
  edit?: Lock;
  /** Row ⧉ duplicate. */
  duplicate?: Lock;
  /** Follow-up on a sent campaign — no entry point in this frame yet. */
  followUp?: Lock;
  /** Deleting a campaign — no entry point in this frame yet. */
  delete?: Lock;
  /** Buying segments inside the SMS Segments popover — no entry point in this
   *  frame yet. The SMS Segments button itself only opens the popover. */
  payment?: Lock;
  /** SMS settings edits — no entry point in this frame yet. */
  smsSettings?: Lock;
}

/** Locks one control when `lock` is set; renders it untouched otherwise. */
function Gate({
  lock,
  placement,
  triggerClassName,
  children,
}: {
  lock?: Lock;
  placement?: "top" | "bottom";
  triggerClassName?: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return (
    <LockedControl
      locked={Boolean(lock)}
      reason={lock?.reason}
      hint={lock?.hint}
      placement={placement}
      triggerClassName={triggerClassName}
    >
      {children}
    </LockedControl>
  );
}

const TABS = [
  { key: "campaigns", label: "Campaigns" },
  { key: "contacts", label: "Contact List" },
];

/** Figma "Action groups": three 40px icon buttons sharing their borders. */
const ACTION_BUTTON =
  "flex size-10 items-center justify-center border border-line bg-white text-foreground transition-colors hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24 " +
  "data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white";

/**
 * ✎ edit · ⧉ duplicate · analytics. An open action names itself on hover; a
 * locked one explains itself instead — one tooltip, never two on a button.
 */
function RowAction({
  label,
  lock,
  className,
  children,
}: {
  label: string;
  lock?: Lock;
  className?: string;
  children: React.ReactNode;
}) {
  const button = (
    <button type="button" aria-label={label} className={cn(ACTION_BUTTON, className)}>
      {children}
    </button>
  );
  if (lock) {
    return (
      <Gate lock={lock} triggerClassName="-mr-px last:mr-0">
        {button}
      </Gate>
    );
  }
  return (
    <TooltipTrigger
      placement="bottom"
      className="-mr-px last:mr-0"
      content={<Tooltip theme="dark" arrow="top-center" title={label} />}
    >
      {button}
    </TooltipTrigger>
  );
}

function RowActions({ campaign, locks }: { campaign: BulkSmsCampaign; locks?: BulkSmsLocks }) {
  return (
    <div className="inline-flex items-center" role="group" aria-label={`Actions for ${campaign.name}`}>
      <RowAction label="Edit campaign" lock={locks?.edit} className="rounded-l-[4px]">
        <IconPencil size={20} />
      </RowAction>
      <RowAction label="Duplicate" lock={locks?.duplicate}>
        <IconCopy size={20} />
      </RowAction>
      <RowAction label="View analytics" className="rounded-r-[4px]">
        <IconChartBar size={20} />
      </RowAction>
    </div>
  );
}

function CampaignsTable({
  rows,
  searching,
  locks,
}: {
  rows: BulkSmsCampaign[];
  searching: boolean;
  locks?: BulkSmsLocks;
}) {
  const [page, setPage] = useState(3);
  const [pageSize, setPageSize] = useState(10);

  // The fixture is one page of a 103-campaign account. Unsearched, the pager
  // reports the account's size; a search narrows it to what matched.
  const total = searching ? rows.length : BULK_SMS_TOTAL;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const first = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = Math.min(total, current * pageSize);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table className="min-w-[1080px] table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky top-0 z-10 w-14">By</TableHead>
              <TableHead className="sticky top-0 z-10 w-[280px]">Campaign name</TableHead>
              <TableHead className="sticky top-0 z-10 w-[53px]">Type</TableHead>
              <TableHead className="sticky top-0 z-10">JustCall number</TableHead>
              <TableHead className="sticky top-0 z-10">Created on</TableHead>
              <TableHead className="sticky top-0 z-10">Start date</TableHead>
              <TableHead className="sticky top-0 z-10">Status</TableHead>
              <TableHead className="sticky top-0 z-10 w-[142px] text-center text-label-md">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr]:border-b-0">
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="text-paragraph-md text-muted-foreground">
                  No matching campaigns
                </TableCell>
              </TableRow>
            ) : (
              rows.slice(0, pageSize).map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Avatar size="md" color="indigo" initials={initialsFromName(campaign.createdBy)} />
                  </TableCell>
                  <TableCell>
                    <span className="block truncate">{campaign.name}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <IconMessage2 size={20} aria-label="SMS" className="inline-block" />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{campaign.number}</TableCell>
                  <TableCell className="whitespace-nowrap text-paragraph-md text-muted-foreground">
                    {campaign.createdOn}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-paragraph-md text-muted-foreground">
                    {campaign.startDate}
                  </TableCell>
                  <TableCell>
                    {campaign.status === "completed" ? (
                      <Badge variant="success">Completed</Badge>
                    ) : (
                      <Badge variant="warning">Paused</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <RowActions campaign={campaign} locks={locks} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        className="shrink-0"
        page={current}
        pageCount={pageCount}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        rangeLabel={`${first}-${last} of ${total} items`}
      />
    </div>
  );
}

export function BulkSmsPage({ locks }: { locks?: BulkSmsLocks } = {}) {
  const [tab, setTab] = useState("campaigns");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? BULK_SMS_CAMPAIGNS.filter(
          (c) => c.name.toLowerCase().includes(q) || c.number.includes(q)
        )
      : BULK_SMS_CAMPAIGNS;
  }, [search]);

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white px-6 pt-2">
      <div className="shrink-0 border-b border-line">
        <Tabs items={TABS} value={tab} onValueChange={setTab} />
      </div>

      {tab === "campaigns" ? (
        <>
          <div className="mt-2 flex shrink-0 items-center gap-3 py-3">
            <div className="flex h-9 items-center gap-3">
              <InputField
                aria-label="Search campaigns"
                placeholder="Search campaigns"
                leadingIcon={<IconSearch size={20} />}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                clearable={false}
                wrapperClassName="w-[280px]"
                // The toolbar's compact search: 36px tall, 20px glass,
                // Paragraph/Small — the field's default is the 40px form size.
                className="h-9 [&_input]:text-paragraph-sm [&_span:has(>svg)]:size-5"
              />
              <span className="h-full w-px shrink-0 bg-line" aria-hidden="true" />
              <Button
                variant="grey-outline"
                size="sm"
                leftIcon={<IconCalendar size={20} />}
                className="gap-2 pr-4 pl-3 text-paragraph-md [&_svg]:size-5"
              >
                All time
              </Button>
              <Button
                variant="grey-outline"
                size="sm"
                leftIcon={<IconFilter size={20} />}
                className="gap-2 pr-4 pl-3 [&_svg]:size-5"
              >
                Filters
              </Button>
            </div>

            <div className="flex flex-1 items-center justify-end gap-4">
              <TooltipTrigger
                placement="bottom"
                content={<Tooltip theme="dark" arrow="top-center" title="Export campaigns" />}
              >
                <button
                  type="button"
                  aria-label="Export campaigns"
                  className="flex size-9 items-center justify-center rounded-[4px] text-foreground transition-colors outline-none hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/24"
                >
                  <IconDownload size={20} />
                </button>
              </TooltipTrigger>
              {/* Opens the segments popover — reading a balance isn't an
                  action, so it stays open for every license. */}
              <Button variant="primary-outline" size="sm" className="px-4">
                SMS Segments
              </Button>
              <Gate lock={locks?.create}>
                <Button size="sm" className="px-4">
                  Create Campaign
                </Button>
              </Gate>
            </div>
          </div>

          <div className="mt-2 flex min-h-0 flex-1 flex-col">
            <CampaignsTable rows={rows} searching={search.trim().length > 0} locks={locks} />
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-paragraph-md text-muted-foreground">
          No contact lists yet
        </div>
      )}
    </main>
  );
}
