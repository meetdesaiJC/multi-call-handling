import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, initialsFromName, type AvatarColor } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { LockedControl, type Lock } from "@/components/LockedControl";
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
  TableSortLabel,
  type TableSortDirection,
} from "@/components/Table";
import {
  IconCopy,
  IconDownload,
  IconFilter,
  IconInfoCircle,
  IconPencil,
  IconSearch,
  IconSelectAll,
  IconTrash,
  IconUsersGroup,
} from "@/components/Icon";
import { LockedCheckbox } from "./LockedCheckbox";
import flagUk from "./assets/flag-uk.svg";
import flagUs from "./assets/dialer/us-flag.svg";
import { RowAction } from "./TeamMembersPage";
import {
  PENDING_COUNT,
  PHONE_NUMBERS,
  PORTING_COUNT,
  type Capability,
  type NumberShare,
  type PhoneNumber,
} from "./phoneNumbersData";

/**
 * Phone Numbers — the account's numbers, mirroring the live JustCall page.
 * The registration banner the live page shows is left out on purpose: it is
 * account state, not part of what this page teaches about licenses.
 */

/** Actions the signed-in license can't take here; omit for full access. */
export interface PhoneNumberLocks {
  addNumber?: Lock;
  portNumber?: Lock;
  edit?: Lock;
  duplicate?: Lock;
  remove?: Lock;
}

type NumbersTab = "active" | "pending" | "porting";

const TABS = [
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending", badge: PENDING_COUNT },
  { key: "porting", label: "Porting", badge: PORTING_COUNT },
];

const CAPABILITY_LABEL: Record<Capability, string> = { call: "Call", sms: "SMS", mms: "MMS" };

const SHARE_COLORS: AvatarColor[] = ["pink", "purple", "orange", "indigo", "bluegrey"];

function colorFor(name: string): AvatarColor {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  return SHARE_COLORS[hash % SHARE_COLORS.length];
}

function NumberCell({ row }: { row: PhoneNumber }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={row.country === "uk" ? flagUk : flagUs}
        alt={row.country === "uk" ? "United Kingdom" : "United States"}
        // The US asset (shared with the dialer) pads its circle to 80% of the
        // box; scale it so both flags read the same size.
        className={cn("size-8 shrink-0 rounded-full", row.country === "us" && "scale-125")}
      />
      {row.label ? (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-label-md text-foreground">{row.label}</span>
          <span className="truncate text-paragraph-sm text-muted-foreground">{row.digits}</span>
        </div>
      ) : (
        <span className="truncate text-label-md text-foreground">{row.number}</span>
      )}
    </div>
  );
}

function CapabilityTags({ row, registrationCta }: { row: PhoneNumber; registrationCta?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {row.capabilities.map((capability) => {
        const label = CAPABILITY_LABEL[capability];
        if (!row.pending.includes(capability)) {
          return (
            <Tag key={capability} size="md" color="indigo">
              {label}
            </Tag>
          );
        }
        // Pending registration reads as "not yet", not "off": grey, with the
        // reason one hover away rather than a second line in every row.
        return (
          <TooltipTrigger
            key={capability}
            placement="bottom"
            // The link has to survive the trip from tag to bubble.
            interactive={registrationCta}
            content={
              registrationCta ? (
                // Lite can finish registration themselves, so the reason
                // doubles as the way out rather than just a status. Kept to
                // one line: wrapping only splits the link from its verb.
                <Tooltip theme="dark" arrow="top-center" className="max-w-none">
                  Complete{" "}
                  <a
                    href="#"
                    onClick={(event) => event.preventDefault()}
                    className="text-tooltip-dark-link underline underline-offset-2 hover:opacity-80"
                  >
                    A2P 10DLC Registration
                  </a>{" "}
                  to activate {label}
                </Tooltip>
              ) : (
                <Tooltip
                  theme="dark"
                  arrow="top-center"
                  title="A2P 10DLC registration pending"
                />
              )
            }
          >
            <Tag size="md" color="grey" icon={<IconInfoCircle size={16} />}>
              {label}
            </Tag>
          </TooltipTrigger>
        );
      })}
    </div>
  );
}

function ShareAvatar({ share }: { share: NumberShare }) {
  if (share.kind === "team") {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-avatar-indigo-bg text-avatar-indigo-fg">
        <IconUsersGroup size={16} />
      </span>
    );
  }
  return <Avatar size="md" color={colorFor(share.name)} initials={initialsFromName(share.name)} />;
}

/**
 * One share, then "+N" for the rest — the house rule for any row of chosen
 * items, so a widely shared number doesn't push the column into half-avatars.
 */
function SharedWith({ shares }: { shares: NumberShare[] }) {
  if (shares.length === 0) {
    return <span className="text-paragraph-md text-muted-foreground">-</span>;
  }
  const [first, ...rest] = shares;
  const describe = (share: NumberShare) =>
    share.kind === "team" ? `${share.name} (team)` : share.name;
  return (
    <div className="flex items-center gap-2">
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title={describe(first)} />}
      >
        <span tabIndex={0} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand/24">
          <ShareAvatar share={first} />
        </span>
      </TooltipTrigger>
      {rest.length > 0 ? (
        <TooltipTrigger
          placement="bottom"
          content={
            <Tooltip
              theme="dark"
              arrow="top-center"
              title="Also shared with"
              description={rest.map(describe).join(", ")}
              className="max-w-[260px]"
            />
          }
        >
          <span tabIndex={0} className="rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-brand/24">
            <Tag size="md" color="grey">
              +{rest.length}
            </Tag>
          </span>
        </TooltipTrigger>
      ) : null}
    </div>
  );
}

function NumberRowActions({ row, locks }: { row: PhoneNumber; locks?: PhoneNumberLocks }) {
  return (
    <div className="inline-flex items-center" role="group" aria-label={`Actions for ${row.label ?? row.number}`}>
      <RowAction label="Edit settings" icon={<IconPencil size={20} />} position="first" locked={locks?.edit} />
      <RowAction
        label="Delete number"
        // Destructive, so red when it's live; a lock mutes it like any other.
        icon={<IconTrash size={20} className={cn(!locks?.remove && "text-error")} />}
        position="middle"
        locked={locks?.remove}
      />
      <RowAction label="Duplicate settings" icon={<IconCopy size={20} />} position="last" locked={locks?.duplicate} />
    </div>
  );
}

/** Locks one header button when `lock` is set; renders it untouched otherwise. */
function Gate({ lock, children }: { lock?: Lock; children: React.ReactElement<Record<string, unknown>> }) {
  return (
    <LockedControl locked={Boolean(lock)} reason={lock?.reason} hint={lock?.hint}>
      {children}
    </LockedControl>
  );
}

export function PhoneNumbersPage({
  locks,
  registrationCta,
}: {
  locks?: PhoneNumberLocks;
  /** Pending SMS / MMS tooltips link to A2P 10DLC registration (Lite). */
  registrationCta?: boolean;
}) {
  const [tab, setTab] = useState<NumbersTab>("active");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TableSortDirection>(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    // Pending and Porting aren't modelled — the prototype is about the
    // Active list and what each license can do to it.
    if (tab !== "active") return [];
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const rows = q
      ? PHONE_NUMBERS.filter(
          (row) =>
            row.number.toLowerCase().includes(q) ||
            (qDigits !== "" && row.digits.includes(qDigits)) ||
            (row.label?.toLowerCase().includes(q) ?? false) ||
            row.owner.toLowerCase().includes(q)
        )
      : PHONE_NUMBERS;
    if (!sort) return rows;
    const name = (row: PhoneNumber) => (row.label ?? row.number).toLowerCase();
    return [...rows].sort((a, b) => name(a).localeCompare(name(b)) * (sort === "asc" ? 1 : -1));
  }, [tab, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const allVisibleSelected = visible.length > 0 && visible.every((row) => selected.has(row.id));
  const someVisibleSelected = visible.some((row) => selected.has(row.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    // Relative so the bulk bar can float over the table, above the pager.
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="border-b border-line px-6">
        <Tabs
          items={TABS}
          value={tab}
          onValueChange={(key) => {
            setTab(key as NumbersTab);
            setPage(1);
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex h-9 items-center gap-3">
            <InputField
              placeholder="Search number"
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
            <Button variant="grey-outline" size="sm" leftIcon={<IconFilter size={16} />}>
              Filters
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <TooltipTrigger
              placement="bottom"
              content={<Tooltip theme="dark" arrow="top-center" title="Export numbers" />}
            >
              <button
                type="button"
                aria-label="Export numbers"
                className="flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                <IconDownload size={20} />
              </button>
            </TooltipTrigger>
            <Gate lock={locks?.portNumber}>
              <Button variant="primary-outline" size="md">
                Port Number
              </Button>
            </Gate>
            <Gate lock={locks?.addNumber}>
              <Button size="md">Add Number</Button>
            </Gate>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="table-fixed">
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow>
                  <TableHead className="sticky top-0 z-10 w-12">
                    <LockedCheckbox
                      lock={locks?.remove}
                      aria-label="Select all on this page"
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected && !allVisibleSelected}
                      onCheckedChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          visible.forEach((row) =>
                            allVisibleSelected ? next.delete(row.id) : next.add(row.id)
                          );
                          return next;
                        })
                      }
                    />
                  </TableHead>
                  <TableHead className="sticky top-0 z-10">
                    <TableSortLabel
                      direction={sort}
                      onClick={() => setSort((s) => (s === "asc" ? "desc" : s === "desc" ? false : "asc"))}
                    >
                      Phone Number
                    </TableSortLabel>
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 w-[11%]">Number type</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[19%]">Capabilities</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[14%]">Number Owner</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[13%]">Shared with</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:border-b-0">
                {visible.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="text-paragraph-md text-muted-foreground">
                      {tab === "active" ? "No matching numbers" : `No ${tab} numbers to show in this prototype`}
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((row) => (
                    <TableRow key={row.id} state={selected.has(row.id) ? "selected" : undefined}>
                      <TableCell>
                        <LockedCheckbox
                          lock={locks?.remove}
                          aria-label={`Select ${row.label ?? row.number}`}
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggle(row.id)}
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <NumberCell row={row} />
                      </TableCell>
                      <TableCell className="text-paragraph-md text-foreground">{row.type}</TableCell>
                      <TableCell>
                        <CapabilityTags row={row} registrationCta={registrationCta} />
                      </TableCell>
                      <TableCell className="truncate text-paragraph-md text-foreground">{row.owner}</TableCell>
                      <TableCell>
                        <SharedWith shares={row.sharedWith} />
                      </TableCell>
                      <TableCell>
                        <NumberRowActions row={row} locks={locks} />
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

      <TableBulkBar
        count={selected.size}
        label={selected.size === 1 ? "Item Selected" : "Items Selected"}
        actions={
          <>
            {filtered.every((row) => selected.has(row.id)) ? null : (
              <Button
                variant="grey-outline"
                size="sm"
                className="bg-white"
                leftIcon={<IconSelectAll size={16} />}
                onClick={() => setSelected(new Set(filtered.map((row) => row.id)))}
              >
                Select All
              </Button>
            )}
            <Button
              variant="error"
              size="sm"
              leftIcon={<IconTrash size={16} />}
              onClick={() => setSelected(new Set())}
            >
              Delete
            </Button>
          </>
        }
      />
    </main>
  );
}
