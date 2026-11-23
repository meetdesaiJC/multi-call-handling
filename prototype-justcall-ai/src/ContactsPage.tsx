import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, initialsFromName } from "@/components/Avatar";
import { Button } from "@/components/Button";
import {
  IconDotsVertical,
  IconDownload,
  IconMessage2,
  IconPhone,
  IconSearch,
  IconSelectAll,
} from "@/components/Icon";
import { InputField } from "@/components/InputField";
import { LockedControl, type Lock } from "@/components/LockedControl";
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
import { Tabs } from "@/components/Tabs";
import { LockedCheckbox } from "./LockedCheckbox";
import dialerFavicon from "./assets/dialer-favicon.svg";
import {
  CONTACTS,
  CONTACTS_PAGE,
  CONTACTS_PAGE_COUNT,
  CONTACTS_TOTAL,
  type Contact,
} from "./contactsData";

/**
 * Contacts — Figma node 9:41256. Tabs, a search + actions bar, then the
 * contact table with per-row call / SMS buttons and pagination.
 */

/** Actions the signed-in license can't take here; omit for full access. */
export interface ContactsLocks {
  /** Click-to-call on a contact row. */
  call?: Lock;
  /** SMS from a contact row. */
  sms?: Lock;
  /** Contact import and bulk sync. This frame draws no import control, so it
   *  locks nothing yet; kept so the caller's license map stays complete. */
  importContacts?: Lock;
  /** Creating or editing contacts — the "Add Contact" button. */
  editContact?: Lock;
  /** Integration connection changes. This frame shows none; see importContacts. */
  integrationChanges?: Lock;
  /** Exporting the contact list — the download button. */
  exportContacts?: Lock;
}

/** Locks one control when `lock` is set; renders it untouched otherwise. */
function Gate({
  lock,
  placement,
  children,
}: {
  lock?: Lock;
  placement?: "top" | "bottom";
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
  { key: "all", label: "All Contacts" },
  { key: "restricted", label: "Restricted Contacts" },
];

/** Figma "Action groups": two 40px icon buttons sharing one border. */
const actionButton =
  "flex size-10 items-center justify-center border border-line bg-white text-foreground outline-none transition-colors hover:bg-surface-hover focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white";

function RowActions({
  contact,
  locks,
}: {
  contact: Contact;
  locks?: ContactsLocks;
}) {
  return (
    <div className="flex items-start">
      <Gate lock={locks?.call}>
        <button
          type="button"
          aria-label={`Call ${contact.name}`}
          className={cn(actionButton, "-mr-px rounded-l-[4px]")}
        >
          <IconPhone size={20} />
        </button>
      </Gate>
      <Gate lock={locks?.sms}>
        <button
          type="button"
          aria-label={`Message ${contact.name}`}
          className={cn(actionButton, "rounded-r-[4px]")}
        >
          <IconMessage2 size={20} />
        </button>
      </Gate>
    </div>
  );
}

export function ContactsPage({ locks }: { locks?: ContactsLocks } = {}) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(CONTACTS_PAGE);
  const [pageSize, setPageSize] = useState(10);

  const rows = useMemo(() => {
    // The design has no restricted contacts to show, so that tab is empty.
    if (tab === "restricted") return [];
    const q = search.trim().toLowerCase();
    if (!q) return CONTACTS;
    // Numbers match on digits alone, so "(843) 461" and "843461" both find Olivia.
    const digits = q.replace(/\D/g, "");
    return CONTACTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (digits !== "" && c.phone.replace(/\D/g, "").includes(digits)),
    );
  }, [tab, search]);

  const allSelected = rows.length > 0 && rows.every((c) => selected.has(c.id));
  const someSelected = rows.some((c) => selected.has(c.id));

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    // Relative so the bulk bar can float over the table, above the pager.
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex h-11 shrink-0 items-end gap-8 border-b border-line px-6">
        <Tabs items={TABS} value={tab} onValueChange={setTab} />
        {/* Not a tab: it leaves Contacts for the Sales Dialer product, so it
            sits beside the tablist rather than inside it. */}
        <button
          type="button"
          className="flex items-center gap-2 self-start pt-2.5 text-paragraph-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:underline"
        >
          <span className="flex size-5 items-center justify-center">
            <img
              src={dialerFavicon}
              alt=""
              width={17}
              height={17}
              className="size-[17px]"
            />
          </span>
          Sales Dialer
        </button>
      </div>

      <div className="flex shrink-0 items-center justify-between px-6 py-3">
        <InputField
          aria-label="Search contacts"
          placeholder="Search contacts"
          leadingIcon={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          clearable={false}
          wrapperClassName="w-[240px]"
          className="h-9 px-4"
        />
        <div className="flex items-center gap-4">
          <Gate lock={locks?.exportContacts}>
            <button
              type="button"
              aria-label="Export contacts"
              className="flex size-9 items-center justify-center rounded-[4px] text-foreground outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent"
            >
              <IconDownload size={20} />
            </button>
          </Gate>
          <Gate lock={locks?.editContact}>
            <Button size="sm" className="pr-3.5 pl-4">
              Add Contact
            </Button>
          </Gate>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6">
        <div className="min-h-0 flex-1 overflow-auto">
          <Table className="table-fixed">
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky top-0 z-10 w-11 border-b border-line">
                  {/* A flex box, not inline: inline-flex sits on the 16px text
                      baseline and grows the 44px header row. */}
                  <div className="flex">
                    <LockedCheckbox
                      lock={locks?.editContact}
                      size="md"
                      aria-label="Select all contacts"
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onCheckedChange={(on) =>
                        setSelected(
                          on ? new Set(rows.map((c) => c.id)) : new Set(),
                        )
                      }
                    />
                  </div>
                </TableHead>
                {["Name", "Phone number", "Email"].map((label) => (
                  <TableHead
                    key={label}
                    className="sticky top-0 z-10 border-b border-line text-label-md"
                  >
                    {label}
                  </TableHead>
                ))}
                <TableHead className="sticky top-0 z-10 w-[128px] border-b border-line text-label-md">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-b-0">
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="text-paragraph-md text-muted-foreground"
                  >
                    {tab === "restricted"
                      ? "No restricted contacts"
                      : "No matching contacts"}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((contact) => {
                  const isSelected = selected.has(contact.id);
                  return (
                    <TableRow
                      key={contact.id}
                      state={isSelected ? "selected" : "default"}
                    >
                      <TableCell>
                        <div className="flex">
                          <LockedCheckbox
                            lock={locks?.editContact}
                            size="md"
                            aria-label={`Select ${contact.name}`}
                            checked={isSelected}
                            onCheckedChange={(on) => toggle(contact.id, on)}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            size="md"
                            color="indigo"
                            initials={initialsFromName(contact.name)}
                            className="shrink-0"
                          />
                          <span className="truncate text-label-md text-foreground">
                            {contact.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-label-md text-foreground">
                        {contact.phone}
                      </TableCell>
                      <TableCell className="truncate text-paragraph-md text-muted-foreground">
                        {contact.email}
                      </TableCell>
                      <TableCell>
                        <RowActions contact={contact} locks={locks} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          className="shrink-0"
          page={page}
          pageCount={CONTACTS_PAGE_COUNT}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          rangeLabel={`1-25 of ${CONTACTS_TOTAL} items`}
        />
      </div>

      {/* Every verb here edits contacts, so the checkboxes follow the edit
          lock — disabled for View-only, and this bar never opens there. */}
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
                onClick={() => setSelected(new Set(rows.map((c) => c.id)))}
              >
                Select all
              </Button>
            )}
            <Button variant="error" size="sm" onClick={() => setSelected(new Set())}>
              Delete
            </Button>
            <Button
              variant="grey-outline"
              size="sm"
              iconOnly
              aria-label="More bulk actions"
              className="bg-white"
            >
              <IconDotsVertical size={16} />
            </Button>
          </>
        }
      />
    </main>
  );
}
