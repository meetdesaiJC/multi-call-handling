import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, initialsFromName } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Tabs } from "@/components/Tabs";
import { Tag } from "@/components/Tag";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
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
import {
  IconChartBar,
  IconCopy,
  IconDownload,
  IconFilter,
  IconPencil,
  IconSearch,
} from "@/components/Icon";
import {
  TEAM_MEMBERS,
  USER_GROUPS,
  memberGroup,
  memberLicense,
  memberRole,
  type TeamMember,
  type TeamMemberState,
} from "./teamMembersData";

/**
 * Teams › Team Members — the admin's list of everyone on the account. This is
 * the surface the license management flow builds on: today it mirrors the live
 * JustCall page as-is.
 */
type MembersTab = "all" | "pending";

const TABS = [
  { key: "all", label: "All Members" },
  { key: "pending", label: "Pending Requests" },
];

const ACTION_BUTTON =
  "flex size-9 items-center justify-center border border-line bg-white text-foreground hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24";

export function RowAction({
  label,
  icon,
  position,
  onClick,
  locked,
}: {
  label: string;
  icon: React.ReactNode;
  position: "first" | "middle" | "last";
  onClick?: () => void;
  locked?: Lock;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        ACTION_BUTTON,
        "data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white",
        position === "first" && "rounded-l-[4px]",
        position === "last" && "rounded-r-[4px]"
      )}
    >
      {icon}
    </button>
  );
  // A locked action explains itself instead of naming itself — one tooltip,
  // never two stacked on the same button.
  if (locked) {
    return (
      <LockedControl
        reason={locked.reason}
        hint={locked.hint}
        triggerClassName={position !== "last" ? "-mr-px" : undefined}
      >
        {button}
      </LockedControl>
    );
  }
  return (
    <TooltipTrigger
      placement="bottom"
      className={position !== "last" ? "-mr-px" : undefined}
      content={<Tooltip theme="dark" arrow="top-center" title={label} />}
    >
      {button}
    </TooltipTrigger>
  );
}

function MemberRowActions({
  member,
  onEdit,
  locks,
}: {
  member: TeamMember;
  onEdit?: (member: TeamMember) => void;
  locks?: TeamMemberLocks;
}) {
  return (
    <div
      className="inline-flex items-center"
      role="group"
      aria-label={`Actions for ${member.name}`}
    >
      <RowAction
        label="Duplicate"
        icon={<IconCopy size={20} />}
        position="first"
        locked={locks?.duplicate}
      />
      <RowAction
        label="Edit"
        icon={<IconPencil size={20} />}
        position="middle"
        onClick={onEdit ? () => onEdit(member) : undefined}
        locked={locks?.edit}
      />
      {/* Same three actions on every row, invited or not — a row whose last
          button changes meaning makes the column impossible to scan. */}
      <RowAction label="View analytics" icon={<IconChartBar size={20} />} position="last" />
    </div>
  );
}

function MemberNameCell({ member }: { member: TeamMember }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        size="lg"
        color="indigo"
        initials={initialsFromName(member.name)}
        status={member.status}
      />
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-label-md text-foreground">{member.name}</span>
          {member.state === "invited" ? (
            <Tag size="sm" color="indigo">
              Invited
            </Tag>
          ) : null}
          {member.state === "locked" ? (
            <Tag size="sm" color="grey">
              Locked
            </Tag>
          ) : null}
        </div>
        <span className="truncate text-paragraph-sm text-muted-foreground">
          {member.email}
        </span>
      </div>
    </div>
  );
}

const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
const asOptions = (values: string[]) => values.map((value) => ({ value, label: value }));

const STATE_LABEL: Record<TeamMemberState, string> = {
  active: "Active",
  invited: "Invited",
  locked: "Locked",
};

/**
 * The filter row: License Type first — it's what this page is about now —
 * then the live page's own filters in their usual order.
 * Each filter reads one fact off a member, so matching is the same check for
 * all five: is that fact among the values picked?
 */
const FILTERS: {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  read: (member: TeamMember) => string;
}[] = [
  {
    key: "license",
    label: "License Type",
    options: asOptions(["Standard", "Lite", "View-only"]),
    read: (m) => memberLicense(m.id),
  },
  {
    key: "role",
    label: "Role",
    options: asOptions(unique(TEAM_MEMBERS.map(memberRole))),
    read: memberRole,
  },
  {
    key: "group",
    label: "User Group",
    options: asOptions(USER_GROUPS),
    read: (m) => memberGroup(m.id),
  },
  {
    key: "zone",
    label: "Time Zone",
    options: asOptions(unique(TEAM_MEMBERS.map((m) => m.timeZone))),
    read: (m) => m.timeZone,
  },
  {
    key: "status",
    label: "Status",
    options: asOptions(Object.values(STATE_LABEL)),
    read: (m) => STATE_LABEL[m.state],
  },
];

/** Actions the signed-in license can't take here; omit for full access. */
export interface TeamMemberLocks {
  addMember?: Lock;
  duplicate?: Lock;
  edit?: Lock;
}

export function TeamMembersPage({
  onAddMember,
  onEditMember,
  locks,
}: {
  locks?: TeamMemberLocks;
  onAddMember?: () => void;
  /** The row pencil. Omit and it stays a label-only control, as before. */
  onEditMember?: (member: TeamMember) => void;
}) {
  const [tab, setTab] = useState<MembersTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const hasFilters = Object.values(picked).some((values) => values.length > 0);

  const filtered = useMemo(() => {
    const members =
      tab === "pending" ? TEAM_MEMBERS.filter((m) => m.state === "invited") : TEAM_MEMBERS;
    const q = search.trim().toLowerCase();
    return members.filter(
      (m) =>
        (!q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)) &&
        // Values within one filter widen the match; separate filters narrow it.
        FILTERS.every((f) => !picked[f.key]?.length || picked[f.key].includes(f.read(m)))
    );
  }, [tab, search, picked]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="border-b border-line px-6">
        <Tabs
          items={TABS}
          value={tab}
          onValueChange={(key) => {
            setTab(key as MembersTab);
            setPage(1);
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex h-9 items-center gap-3">
            <InputField
              placeholder="Search members"
              leadingIcon={<IconSearch size={16} />}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              clearable={false}
              wrapperClassName="w-[266px]"
            />
            <span className="h-full w-px shrink-0 bg-line" aria-hidden="true" />
            <Button
              variant="grey-outline"
              size="sm"
              leftIcon={<IconFilter size={16} />}
              aria-expanded={filtersOpen}
              aria-controls="team-member-filters"
              onClick={() => setFiltersOpen((open) => !open)}
              className={cn(filtersOpen && "bg-secondary-bg")}
            >
              {filtersOpen ? "Hide Filters" : "Filters"}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <TooltipTrigger
              placement="bottom"
              content={<Tooltip theme="dark" arrow="top-center" title="Export members" />}
            >
              <button
                type="button"
                aria-label="Export members"
                className="flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                <IconDownload size={20} />
              </button>
            </TooltipTrigger>
            <LockedControl
              locked={Boolean(locks?.addMember)}
              reason={locks?.addMember?.reason}
              hint={locks?.addMember?.hint}
            >
              <Button size="md" onClick={onAddMember}>
                Add Member
              </Button>
            </LockedControl>
          </div>
        </div>

        {/* Always mounted so it can animate both ways (styles.css
            .filter-row). Hidden, the choices still apply — closing the row is
            about room, not about undoing what was picked. */}
        <div
          id="team-member-filters"
          className={cn("filter-row -mx-6", filtersOpen && "is-open")}
          aria-hidden={!filtersOpen}
          inert={!filtersOpen ? true : undefined}
        >
          <div className="filter-row-clip">
            <div className="filter-row-inner flex flex-wrap items-center gap-3 border-t border-line px-6 py-3">
              {FILTERS.map((f) => (
                <Dropdown
                  key={f.key}
                  placeholder={f.label}
                  appliedField={f.label}
                  options={f.options}
                  multiple
                  confirm
                  selectAll={f.options.length > 5}
                  searchable={f.options.length > 6}
                  searchPlaceholder={`Search ${f.label.toLowerCase()}`}
                  value={picked[f.key] ?? []}
                  onValueChange={(value) => {
                    setPicked((prev) => ({ ...prev, [f.key]: Array.isArray(value) ? value : [value] }));
                    setPage(1);
                  }}
                  // Sized to the label, as on the live page — a row of equal
                  // wide fields read as a form, not as a set of filters.
                  className="w-auto shrink-0"
                  triggerClassName="h-9 w-auto max-w-[260px]"
                />
              ))}
              {hasFilters ? (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setPicked({});
                    setPage(1);
                  }}
                >
                  Clear all
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="table-fixed">
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow>
                  <TableHead className="sticky top-0 z-10">Name</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[13%]">License Type</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[20%]">Role</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[17%]">Time Zone</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[11%]">Extension</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:border-b-0">
                {visible.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="text-paragraph-md text-muted-foreground">
                      {tab === "pending" ? "No pending requests" : "No matching members"}
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="py-4">
                        <MemberNameCell member={member} />
                      </TableCell>
                      <TableCell>
                        {/* Grey, as in Billing's breakdown: a license is a fact
                            about the seat, not a status to draw the eye. */}
                        <Tag size="sm" color="grey">
                          {memberLicense(member.id)}
                        </Tag>
                      </TableCell>
                      <TableCell className="text-paragraph-md text-foreground">
                        {memberRole(member)}
                      </TableCell>
                      <TableCell className="text-paragraph-md text-foreground">
                        {member.timeZone}
                      </TableCell>
                      <TableCell>
                        <Tag size="md" color="orange">
                          {member.extension}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        <MemberRowActions member={member} onEdit={onEditMember} locks={locks} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
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
              rangeLabel={`${filtered.length === 0 ? 0 : start + 1}-${Math.min(
                start + pageSize,
                filtered.length
              )} of ${filtered.length} items`}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
