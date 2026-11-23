import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, initialsFromName } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { LockedControl, type Lock } from "@/components/LockedControl";
import { Menu, type MenuItem } from "@/components/Menu";
import { Tabs } from "@/components/Tabs";
import { Tag } from "@/components/Tag";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  Table,
  TableBody,
  TableBulkBar,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/Table";
import {
  IconArchive,
  IconCalendar,
  IconChartBar,
  IconCopy,
  IconDotsVertical,
  IconDownload,
  IconFilter,
  IconInfoCircle,
  IconPencil,
  IconPlayerPlay,
  IconRotateClockwise,
  IconSearch,
  IconSelectAll,
  IconUsersGroup,
} from "@/components/Icon";
import { type SidenavItem } from "@/components/Sidenav";
import {
  IconCallLogs,
  IconContacts,
  IconDashboard,
  IconIntegrations,
  IconJustCallAI,
  IconPhoneNumbers,
  IconWorkflows,
} from "@/components/Sidenav/icons";
import { LockedCheckbox } from "./LockedCheckbox";
import { IconJcaiSettings } from "./icons/JustCallAiNavIcons";
import { IconSdCampaigns, IconSdGetStarted, IconSdSalesfloor } from "./icons/SalesDialerNavIcons";
import {
  ANSWER_RATE_INSIGHT,
  CAMPAIGNS,
  CAMPAIGN_TOTALS,
  type Campaign,
  type CampaignStatus,
} from "./campaignsData";

/**
 * Sales Dialer › Campaigns — the list every Sales Dialer visit lands on. It
 * mirrors the live page; the license work is in what each control does.
 *
 * Lite and View-only both arrive here and both see every campaign, its
 * progress and its analytics — reviewing is what those licenses are for.
 * What changes is which verbs still work (see salesDialerLocks): the locked
 * ones stay where they always are, muted, and say why.
 */

/** The Sales Dialer nav that replaces the product nav while in Sales Dialer. */
export const SALES_DIALER_NAV_ITEMS: SidenavItem[] = [
  { key: "get-started", label: "Get Started", icon: <IconSdGetStarted /> },
  { key: "sd-dashboard", label: "Dashboard", icon: <IconDashboard />, expandable: true },
  { key: "campaigns", label: "Campaigns", icon: <IconSdCampaigns /> },
  { key: "salesfloor", label: "Salesfloor", icon: <IconSdSalesfloor /> },
  { key: "sd-contacts", label: "All Contacts", icon: <IconContacts /> },
  { key: "sd-phone-numbers", label: "Phone Numbers", icon: <IconPhoneNumbers /> },
  { key: "sd-call-logs", label: "Call Logs", icon: <IconCallLogs /> },
  { key: "sd-justcall-ai", label: "JustCall AI", icon: <IconJustCallAI /> },
  { key: "sd-settings", label: "Settings", icon: <IconJcaiSettings /> },
  { key: "sd-integrations", label: "Integrations", icon: <IconIntegrations /> },
  { key: "sd-workflows", label: "Workflows", icon: <IconWorkflows /> },
];

/** Actions the signed-in license can't take here; omit for full access. */
export interface CampaignLocks {
  createCampaign?: Lock;
  startDialing?: Lock;
  edit?: Lock;
  duplicate?: Lock;
  assignAgents?: Lock;
  archive?: Lock;
  reviewFixes?: Lock;
}

const TABS: { key: CampaignStatus; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
];

const count = new Intl.NumberFormat("en-US");

/** Locks one control when `lock` is set; renders it untouched otherwise. */
function Gate({
  lock,
  placement,
  children,
}: {
  lock?: Lock;
  placement?: "top" | "bottom" | "left" | "right";
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

function HeadWithInfo({ label, info }: { label: string; info: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" description={info} className="max-w-[240px]" />}
      >
        <button
          type="button"
          aria-label={`About ${label}`}
          className="flex rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconInfoCircle size={16} />
        </button>
      </TooltipTrigger>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Cells                                                               */
/* ------------------------------------------------------------------ */

function Progress({ completed, total }: { completed: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-paragraph-sm text-muted-foreground">
        {completed} / {total}
      </span>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-label={`${completed} of ${total} contacts completed`}
        className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-secondary-bg"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

const Dash = () => <span className="text-paragraph-md text-muted-foreground">-</span>;

/**
 * One assignee named, the rest as "+N" — the house rule for any row of
 * chosen items. A team or group has no initials, so it shows the person glyph.
 */
function Assignees({ campaign }: { campaign: Campaign }) {
  const [first, ...rest] = campaign.assignees;
  if (!first) return <Dash />;
  return (
    <TooltipTrigger
      placement="bottom"
      content={
        <Tooltip
          theme="dark"
          arrow="top-center"
          className="max-w-[240px]"
          title={first.name}
          description={rest.length ? `and ${count.format(rest.length)} more` : undefined}
        />
      }
    >
      <span
        tabIndex={0}
        className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
      >
        <Avatar
          size="md"
          color="indigo"
          initials={first.kind === "agent" ? initialsFromName(first.name) : undefined}
        />
        {rest.length ? (
          <Tag size="sm" color="grey">
            +{count.format(rest.length)}
          </Tag>
        ) : null}
      </span>
    </TooltipTrigger>
  );
}

const ACTION_BUTTON =
  "flex size-9 items-center justify-center border border-line bg-white text-foreground transition-colors hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24 " +
  "data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white";

/**
 * ▷ start dialing · analytics · ⋮ more. A locked action explains itself
 * instead of naming itself — one tooltip, never two on the same button.
 */
function RowActions({ campaign, locks }: { campaign: Campaign; locks?: CampaignLocks }) {
  const play = (
    <button type="button" aria-label="Start dialing" className={cn(ACTION_BUTTON, "rounded-l-[4px]")}>
      <IconPlayerPlay size={20} />
    </button>
  );
  const menuItems: MenuItem[] = [
    { key: "edit", label: "Edit campaign", icon: <IconPencil size={16} />, locked: locks?.edit },
    { key: "duplicate", label: "Duplicate", icon: <IconCopy size={16} />, locked: locks?.duplicate },
    { key: "assign", label: "Assign agents", icon: <IconUsersGroup size={16} />, locked: locks?.assignAgents },
    { key: "report", label: "Download report", icon: <IconDownload size={16} />, separatorBefore: true },
    {
      key: "archive",
      label: "Archive",
      icon: <IconArchive size={16} />,
      destructive: true,
      separatorBefore: true,
      locked: locks?.archive,
    },
  ];

  return (
    <div className="inline-flex items-center" role="group" aria-label={`Actions for ${campaign.name}`}>
      {locks?.startDialing ? (
        <LockedControl reason={locks.startDialing.reason} hint={locks.startDialing.hint} triggerClassName="-mr-px">
          {play}
        </LockedControl>
      ) : (
        <TooltipTrigger
          placement="bottom"
          className="-mr-px"
          content={<Tooltip theme="dark" arrow="top-center" title="Start dialing" />}
        >
          {play}
        </TooltipTrigger>
      )}
      <TooltipTrigger
        placement="bottom"
        className="-mr-px"
        content={<Tooltip theme="dark" arrow="top-center" title="View analytics" />}
      >
        <button type="button" aria-label="View analytics" className={ACTION_BUTTON}>
          <IconChartBar size={20} />
        </button>
      </TooltipTrigger>
      <Menu
        label={`More actions for ${campaign.name}`}
        items={menuItems}
        trigger={
          <button type="button" aria-label="More actions" className={cn(ACTION_BUTTON, "rounded-r-[4px]")}>
            <IconDotsVertical size={20} />
          </button>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Answer-rate insight                                                 */
/* ------------------------------------------------------------------ */

/** Rising bars: the uplift the fixes promise, drawn from tokens alone. */
function UpliftArt() {
  return (
    <div aria-hidden="true" className="flex h-[88px] items-end gap-1.5 self-end pr-2">
      <span className="h-[22%] w-6 rounded-t-[3px] bg-brand/25" />
      <span className="h-[45%] w-6 rounded-t-[3px] bg-brand/45" />
      <span className="h-[70%] w-6 rounded-t-[3px] bg-brand/70" />
      <span className="h-full w-6 rounded-t-[3px] bg-brand" />
    </div>
  );
}

function AnswerRateInsight({ lock }: { lock?: Lock }) {
  return (
    <section className="flex items-stretch justify-between gap-6 overflow-hidden rounded-lg bg-brand-subtle px-6 pt-5 pb-0">
      <div className="flex flex-col gap-1 pb-5">
        <h2 className="text-heading-lg text-foreground">Improve campaign answer rates</h2>
        <p className="text-paragraph-md text-muted-foreground">
          {ANSWER_RATE_INSIGHT.atRiskNumbers} of your calling numbers are at risk of being SPAM
          flagged. Apply {ANSWER_RATE_INSIGHT.fixes} fixes to uplift your answer rates.
        </p>
        <div className="pt-3">
          <Gate lock={lock}>
            <Button size="xs">Review Fixes</Button>
          </Gate>
        </div>
      </div>
      <UpliftArt />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function CampaignsPage({ locks }: { locks?: CampaignLocks }) {
  const [tab, setTab] = useState<CampaignStatus>("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Bulk bar › Select All reaches past this page to every campaign the tab
  // (or search) holds — the fixture only has one page, so it's a flag rather
  // than 1,737 ids. Any row unticked drops back to an explicit selection.
  const [allMatching, setAllMatching] = useState(false);

  const rows = useMemo(() => {
    const inTab = CAMPAIGNS.filter((c) => c.status === tab);
    const q = search.trim().toLowerCase();
    return q
      ? inTab.filter((c) => c.name.toLowerCase().includes(q) || c.id.includes(q))
      : inTab;
  }, [tab, search]);

  // The fixture is one page of a 1,737-row account. Unsearched, the pager
  // reports the account's real size; a search narrows to what matched.
  const searching = search.trim().length > 0;
  const total = searching ? rows.length : CAMPAIGN_TOTALS[tab];
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (Math.min(page, pageCount) - 1) * pageSize;
  const visible = rows.slice(0, pageSize);

  const allSelected = visible.length > 0 && visible.every((c) => selected.has(c.id));
  const someSelected = !allSelected && visible.some((c) => selected.has(c.id));
  const toggleAll = (checked: boolean) => {
    setAllMatching(false);
    setSelected(checked ? new Set(visible.map((c) => c.id)) : new Set());
  };
  const toggleOne = (id: string, checked: boolean) => {
    setAllMatching(false);
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const selectAllMatching = () => {
    setSelected(new Set(rows.map((c) => c.id)));
    setAllMatching(true);
  };
  const selectedCount = allMatching ? total : selected.size;

  const resetView = () => {
    setPage(1);
    setSelected(new Set());
    setAllMatching(false);
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="border-b border-line px-6">
        <Tabs
          items={TABS}
          value={tab}
          onValueChange={(key) => {
            setTab(key as CampaignStatus);
            resetView();
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 pt-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-9 items-center gap-3">
            <InputField
              placeholder="Search by name or ID"
              leadingIcon={<IconSearch size={16} />}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetView();
              }}
              clearable={false}
              wrapperClassName="w-[266px]"
            />
            <InputField
              aria-label="Created date"
              value="All"
              readOnly
              trailingIcon={<IconCalendar size={16} />}
              clearable={false}
              wrapperClassName="w-[240px]"
            />
            <span className="h-full w-px shrink-0 bg-line" aria-hidden="true" />
            <Button variant="grey-outline" size="sm" leftIcon={<IconFilter size={16} />}>
              Filters
            </Button>
          </div>
          <Gate lock={locks?.createCampaign}>
            <Button size="md">Create Campaign</Button>
          </Gate>
        </div>

        {tab === "active" ? <AnswerRateInsight lock={locks?.reviewFixes} /> : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {selected.size > 0 ? (
            // Matches live: Select All and Archive only. Reports download one
            // campaign at a time, from the row's ⋮ menu.
            <TableBulkBar
              count={selectedCount}
              label={selectedCount === 1 ? "Campaign selected" : "Campaigns selected"}
              actions={
                <>
                  {allMatching ? null : (
                    <Button
                      variant="grey-outline"
                      size="xs"
                      leftIcon={<IconSelectAll size={16} />}
                      onClick={selectAllMatching}
                    >
                      Select All
                    </Button>
                  )}
                  <Gate lock={locks?.archive}>
                    <Button variant="error-grey-outline" size="xs" leftIcon={<IconArchive size={16} />}>
                      Archive
                    </Button>
                  </Gate>
                </>
              }
            />
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="min-w-[1140px] table-fixed">
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky top-0 z-10 w-11">
                    <LockedCheckbox
                      lock={locks?.archive}
                      aria-label="Select all campaigns on this page"
                      checked={allSelected}
                      indeterminate={someSelected}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 z-10">Name</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[204px]">
                    <HeadWithInfo
                      label="Completed / Active Contacts"
                      info="Contacts dialed to a final disposition, out of everyone still in the campaign."
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 w-[104px]">Dialing Mode</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[104px]">Overdue Calls</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[112px]">
                    <HeadWithInfo
                      label="Connect Rate"
                      info="Share of dials that reached a person, across the campaign so far."
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 w-[104px]">Assigned To</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[156px]">Created By</TableHead>
                  {/* Pinned right, so the verbs stay in reach while the
                      columns scroll beneath them. */}
                  <TableHead className="sticky top-0 right-0 z-20 w-[148px] border-l border-line text-center">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:border-b-0">
                {visible.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="text-paragraph-md text-muted-foreground">
                      {searching ? "No matching campaigns" : `No ${tab} campaigns`}
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((campaign) => {
                    const isSelected = selected.has(campaign.id);
                    return (
                      <TableRow
                        key={campaign.id}
                        state={isSelected ? "selected" : "default"}
                        className="group"
                      >
                        <TableCell>
                          <LockedCheckbox
                            lock={locks?.archive}
                            aria-label={`Select ${campaign.name}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => toggleOne(campaign.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-label-md text-foreground">{campaign.name}</span>
                            <span className="text-paragraph-sm text-muted-foreground">#{campaign.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Progress completed={campaign.completed} total={campaign.total} />
                        </TableCell>
                        <TableCell className="text-paragraph-md">{campaign.mode}</TableCell>
                        <TableCell>
                          {campaign.overdue > 0 ? (
                            <Tag size="md" color="orange" icon={<IconRotateClockwise size={16} />}>
                              {campaign.overdue}
                            </Tag>
                          ) : (
                            <Dash />
                          )}
                        </TableCell>
                        <TableCell>
                          {campaign.connectRate == null ? (
                            <Dash />
                          ) : (
                            <Button variant="link" size="sm" className="h-auto underline underline-offset-2">
                              {campaign.connectRate}%
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Assignees campaign={campaign} />
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar size="md" color="indigo" initials={initialsFromName(campaign.createdBy)} />
                            <span className="truncate text-paragraph-md">{campaign.createdBy}</span>
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "sticky right-0 z-[1] border-l border-line text-center transition-colors",
                            isSelected ? "bg-brand-subtle" : "bg-white group-hover:bg-secondary-bg"
                          )}
                        >
                          <RowActions campaign={campaign} locks={locks} />
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
              page={Math.min(page, pageCount)}
              pageCount={pageCount}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              rangeLabel={`${total === 0 ? 0 : count.format(start + 1)}-${count.format(
                Math.min(start + pageSize, total)
              )} of ${count.format(total)} items`}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
