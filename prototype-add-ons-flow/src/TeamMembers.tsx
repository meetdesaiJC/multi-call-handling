import * as React from "react";
import { Button } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { Tabs, type TabItem } from "@/components/Tabs";
import { InputField } from "@/components/InputField";
import { AvatarLabelGroup } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { IconSearch, IconFilter, IconDownload, IconCopy, IconPencil, IconChartBar } from "@/components/Icon";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TablePagination,
} from "@/components/Table";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";

/**
 * Team Members — synced from Figma "User-level pricing for Add-ons / Team
 * Members - All Members" (node 40002636:26579). Reached from the Sidenav
 * "Teams" > "Team Members" sub-item.
 */

interface MemberRow {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
  memberGroup: string;
  timezone: string;
  extension: string;
  /** Presence — drives the avatar's status dot (green when online, grey otherwise). */
  online: boolean;
  /** Hasn't accepted their invite yet — shows an "Invited" badge; status dot stays grey. */
  invited?: boolean;
}

const FIRST_NAMES = [
  "Ava", "Liam", "Noah", "Maya", "Ethan", "Sophia", "Lucas", "Grace", "Priya", "Owen",
  "Isla", "Mason", "Ruby", "Leo", "Nora", "Felix", "Ivy", "Arjun", "Wren", "Kai",
];
const LAST_NAMES = [
  "Reynolds", "Chen", "Patel", "Whitfield", "Brooks", "Delgado", "Ferreira", "Okafor", "Nair", "Marsh",
  "Bennett", "Odom", "Callahan", "Winters", "Duarte", "Hartley", "Suzuki", "Malhotra", "Voss", "Ellery",
];
const ROLES = ["Admin", "Member"];
const MEMBER_GROUPS = ["Sales - EMEA", "Sales - APAC", "Support - NA", "Onboarding", "Success - EMEA", "Ops - APAC"];
const TIMEZONES = ["Asia/Kolkata", "America/New_York", "Europe/London", "Asia/Hong_Kong", "Pacific/Midway", "Australia/Sydney"];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "");
}

function initialsFor(name: string) {
  const parts = name.split(" ");
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function makeMember(name: string, index: number, overrides: Partial<MemberRow> = {}): MemberRow {
  return {
    id: slugify(name),
    name,
    email: `${slugify(name)}@justcall.dev`,
    initials: initialsFor(name),
    role: ROLES[index % ROLES.length],
    memberGroup: MEMBER_GROUPS[index % MEMBER_GROUPS.length],
    timezone: TIMEZONES[index % TIMEZONES.length],
    extension: String(100 + index),
    online: index % 3 !== 0,
    ...overrides,
  };
}

const TOTAL_MEMBERS = 103;

const FEATURED_MEMBERS: MemberRow[] = [
  makeMember("Ava Reynolds", 0, { role: "Owner" }),
  makeMember("Priya Nair", 1, { role: "Admin", invited: true }),
];

const GENERATED_MEMBERS: MemberRow[] = Array.from({ length: TOTAL_MEMBERS - FEATURED_MEMBERS.length }, (_, i) => {
  const index = i + FEATURED_MEMBERS.length;
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[(index * 3 + 7) % LAST_NAMES.length];
  return makeMember(`${first} ${last}`, index);
});

export const TEAM_MEMBERS_LIST: MemberRow[] = [...FEATURED_MEMBERS, ...GENERATED_MEMBERS];

const TABS: TabItem[] = [
  { key: "all", label: "All Members" },
  { key: "pending", label: "Pending Requests" },
];

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 4H4.667C4.02 4 3.697 4 3.45 4.127a1.17 1.17 0 0 0-.512.512C2.667 4.885 2.667 5.209 2.667 5.855v5.478c0 .646 0 .97.127 1.216.11.216.283.39.5.5.245.127.568.127 1.213.127h5.386c.645 0 .968 0 1.213-.127a1.17 1.17 0 0 0 .512-.512c.127-.245.127-.568.127-1.213V10M9.333 2.667H13.333V6.667M6.667 9.333L13.333 2.667"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActionButtonGroup() {
  return (
    <div className="inline-flex items-center">
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Copy email" />}
      >
        <button
          type="button"
          aria-label="Copy details"
          className="-mr-px flex size-9 items-center justify-center rounded-l-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconCopy size={20} />
        </button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Edit" />}
      >
        <button
          type="button"
          aria-label="Edit member"
          className="-mr-px flex size-9 items-center justify-center border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconPencil size={20} />
        </button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="View analytics" />}
      >
        <button
          type="button"
          aria-label="View analytics"
          className="flex size-9 items-center justify-center rounded-r-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconChartBar size={20} />
        </button>
      </TooltipTrigger>
    </div>
  );
}

export interface TeamMembersPageProps {
  members?: MemberRow[];
  onAddMember?: () => void;
  pendingRequestCount?: number;
  /** Opens the Manage AI Review Assist licenses modal, same as the notifications bell's "Review" action. */
  onReviewRequests?: () => void;
}

export function TeamMembersPage({
  members = TEAM_MEMBERS_LIST,
  onAddMember,
  pendingRequestCount = 3,
  onReviewRequests,
}: TeamMembersPageProps) {
  const [tab, setTab] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [showPendingBanner, setShowPendingBanner] = React.useState(pendingRequestCount > 0);

  const query = search.trim().toLowerCase();
  const filtered = members.filter(
    (member) =>
      !query || member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query)
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visibleMembers = filtered.slice(start, start + pageSize);

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {showPendingBanner && (
        <Banner
          variant="info"
          width="full"
          className="px-6"
          onClose={() => setShowPendingBanner(false)}
          title={`${pendingRequestCount} team member${pendingRequestCount === 1 ? " has" : "s have"} requested access to AI Review Assist.`}
          action={
            <button
              type="button"
              onClick={() => {
                onReviewRequests?.();
              }}
            >
              Review Requests
            </button>
          }
        >
          Review requests and Manage AI Review Assist licenses to your team.
        </Banner>
      )}

      <div className="border-b border-line px-6">
        <Tabs
          items={TABS}
          value={tab}
          onValueChange={(key) => {
            setTab(key);
            setPage(1);
          }}
        />
      </div>

      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex h-9 items-center gap-3">
          <InputField
            placeholder="Search members"
            leadingIcon={<IconSearch size={16} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            clearable={false}
            wrapperClassName="w-[280px]"
          />
          <span className="h-full w-px shrink-0 bg-line" aria-hidden="true" />
          <Button variant="grey-outline" size="sm" leftIcon={<IconFilter size={16} />}>
            Filters
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Download members"
            className="flex size-8 items-center justify-center rounded-[4px] text-foreground hover:bg-secondary-bg"
          >
            <IconDownload size={20} />
          </button>
          {tab === "pending" && (
            <span className="inline-flex items-center gap-1 text-label-sm text-brand">
              How pending request work
              <ExternalLinkIcon className="size-4" />
            </span>
          )}
          <Button size="sm" onClick={onAddMember}>
            Add Member
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
        {tab === "pending" ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-line py-16">
            <p className="text-paragraph-md text-muted-foreground">No pending requests.</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table className="table-fixed">
                <TableHeader className="[&_tr]:border-b-0">
                  <TableRow>
                    <TableHead className="sticky top-0 z-10 w-[310px]">Name</TableHead>
                    <TableHead className="sticky top-0 z-10 w-[145px]">Role</TableHead>
                    <TableHead className="sticky top-0 z-10 w-[168px]">Member Group</TableHead>
                    <TableHead className="sticky top-0 z-10 w-[180px]">Time Zone</TableHead>
                    <TableHead className="sticky top-0 z-10 w-[168px]">Extension</TableHead>
                    <TableHead className="sticky top-0 z-10 w-[172px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleMembers.map((member) => (
                    <TableRow key={member.id} className="border-b-0">
                      <TableCell>
                        <AvatarLabelGroup
                          name={
                            <span className="inline-flex items-center gap-1.5">
                              {member.name}
                              {member.role === "Owner" && <Badge variant="owner" />}
                              {member.invited && (
                                <Badge
                                  variant="primary-inverted"
                                  className="bg-avatar-purple-bg text-avatar-purple-fg"
                                >
                                  Invited
                                </Badge>
                              )}
                            </span>
                          }
                          description={member.email}
                          avatarProps={{
                            initials: member.initials,
                            color: "indigo",
                            status: member.invited || !member.online ? "ooo" : "available",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-paragraph-md text-foreground">{member.role}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-paragraph-md text-foreground">{member.memberGroup}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-paragraph-md text-foreground">{member.timezone}</span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center justify-center rounded-[4px] bg-warning-secondary px-2 py-0.5 text-paragraph-md text-warning-text">
                          {member.extension}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <ActionButtonGroup />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="shrink-0 border-t border-line">
              <TablePagination
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                rangeLabel={`${filtered.length === 0 ? 0 : start + 1}-${Math.min(start + pageSize, filtered.length)} of ${filtered.length} items`}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
