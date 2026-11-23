import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import {
  IconCopyPlus,
  IconDotsVertical,
  IconEye,
  IconFilter,
  IconPencil,
  IconSearch,
  IconSelectAll,
  IconSend,
  IconTrash,
} from "@/components/Icon";
import { LockedControl, type Lock } from "@/components/LockedControl";
import { Menu, type MenuItem } from "@/components/Menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableBulkBar,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/Table";
import { Tag } from "@/components/Tag";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { LockedCheckbox } from "./LockedCheckbox";
import flagUs from "./assets/flag-us.svg";
import { WorkflowEditor } from "./WorkflowEditor";
import { WORKFLOWS, WORKFLOWS_TOTAL, type Workflow, type WorkflowStatus } from "./workflowsData";

/**
 * Workflows — Figma "Workflows", node 9:66132. A toolbar over one table of
 * Voice workflows, paged at the foot of the page.
 */

/**
 * Actions the signed-in license can't take here; omit for full access.
 * Voice and Sales Dialer workflows are licensed separately, so each has its
 * own fields rather than one "manage workflows" switch.
 */
export interface WorkflowsLocks {
  /** Create Workflow, and Duplicate — a copy is a new workflow. */
  createVoice?: Lock;
  /**
   * Rename and Publish on a Voice workflow. Not the Edit pencil — that opens
   * the builder, the only way to view a workflow, so it stays open.
   */
  editVoice?: Lock;
  /** Delete in a Voice workflow's ⋮ menu. */
  deleteVoice?: Lock;
  /**
   * Any change to a Sales Dialer workflow. The frame lists only Voice
   * workflows, so nothing here wears it yet.
   */
  manageSalesDialer?: Lock;
}

/** Locks one control when `lock` is set; renders it untouched otherwise. */
function Gate({
  lock,
  className,
  children,
}: {
  lock?: Lock;
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return (
    <LockedControl
      locked={Boolean(lock)}
      reason={lock?.reason}
      hint={lock?.hint}
      triggerClassName={className}
    >
      {children}
    </LockedControl>
  );
}

/*
 * Column widths straight from the frame's header cells (they sum to the
 * 1162px table), so every cell's 12px inset lines up under its header label.
 */
const COLUMNS = [36, 218.64, 163.98, 218.64, 185.84, 174.91, 163.99];
const TABLE_WIDTH = COLUMNS.reduce((sum, w) => sum + w, 0);

/* The frame's rows are 66px: a 42px action group with 12px above and below. */
const CELL = "h-[66px] py-0";

/* Status chips sit 20px tall at 14/20 — between the Tag's sm and md. */
const STATUS_TAG: Record<WorkflowStatus, "green" | "grey"> = {
  Active: "green",
  Default: "green",
  Draft: "grey",
};

const ACTION_BUTTON =
  "flex size-10 items-center justify-center bg-white text-foreground transition-colors hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24 " +
  "data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white";

/** A plain dark tooltip naming an icon-only action. */
function Named({
  title,
  children,
}: {
  title: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return (
    <TooltipTrigger
      placement="bottom"
      content={<Tooltip theme="dark" arrow="top-center" title={title} />}
    >
      {children}
    </TooltipTrigger>
  );
}

/**
 * Edit · duplicate · ⋮ — one bordered group of three 40px buttons. A locked
 * action explains itself instead of naming itself, so it never shows two
 * tooltips.
 */
function RowActions({
  workflow,
  locks,
  onOpen,
}: {
  workflow: Workflow;
  locks?: WorkflowsLocks;
  onOpen: () => void;
}) {
  // A license that can't edit gets the eye too: a pencil would promise an
  // edit the builder then refuses. Same button, same builder — only the
  // promise changes.
  const primary = workflow.viewOnly || locks?.editVoice ? (
    <Named title="View">
      <button type="button" aria-label="View workflow" onClick={onOpen} className={ACTION_BUTTON}>
        <IconEye size={20} />
      </button>
    </Named>
  ) : (
    // Never locked: the primary button is the only way into the builder, and
    // the builder is the only place a workflow can be read. Locking it would
    // lock a page, not a verb — the changes inside are what the license blocks.
    <Named title="Edit">
      <button type="button" aria-label="Edit workflow" onClick={onOpen} className={ACTION_BUTTON}>
        <IconPencil size={20} />
      </button>
    </Named>
  );

  const duplicate = (
    <button type="button" aria-label="Duplicate workflow" className={cn(ACTION_BUTTON, "border-l border-line")}>
      <IconCopyPlus size={20} />
    </button>
  );

  const menuItems: MenuItem[] = [
    { key: "rename", label: "Rename", icon: <IconPencil size={16} />, locked: locks?.editVoice },
    ...(workflow.status === "Draft"
      ? [{ key: "publish", label: "Publish", icon: <IconSend size={16} />, locked: locks?.editVoice }]
      : []),
    {
      key: "delete",
      label: "Delete",
      icon: <IconTrash size={16} />,
      destructive: true,
      separatorBefore: true,
      locked: locks?.deleteVoice,
    },
  ];

  return (
    <div
      role="group"
      aria-label={`Actions for ${workflow.name}`}
      className="inline-flex overflow-hidden rounded-[4px] border border-line"
    >
      {primary}
      {locks?.createVoice ? (
        <Gate lock={locks.createVoice} className="flex">
          {duplicate}
        </Gate>
      ) : (
        <Named title="Duplicate">{duplicate}</Named>
      )}
      <Menu
        label={`More actions for ${workflow.name}`}
        items={menuItems}
        trigger={
          <button type="button" aria-label="More actions" className={cn(ACTION_BUTTON, "border-l border-line")}>
            <IconDotsVertical size={20} />
          </button>
        }
      />
    </div>
  );
}

function NumberCell({ number }: { number?: Workflow["number"] }) {
  if (!number) return null;
  return (
    <span className="flex items-center gap-1">
      <Tag
        size="md"
        color="grey"
        className="gap-2 py-0 text-avatar-bluegrey-fg"
        icon={<img src={flagUs} alt="" width={16} height={16} className="size-4" />}
      >
        {number.value}
      </Tag>
      {number.more ? (
        <Tag size="md" color="grey" className="py-0">
          +{number.more}
        </Tag>
      ) : null}
    </span>
  );
}

export function WorkflowsPage({ locks }: { locks?: WorkflowsLocks } = {}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openWorkflow, setOpenWorkflow] = useState<Workflow | null>(null);

  const q = search.trim().toLowerCase();
  const rows = q ? WORKFLOWS.filter((w) => w.name.toLowerCase().includes(q)) : WORKFLOWS;
  const selectable = rows.filter((w) => !w.viewOnly);
  const allSelected = selectable.length > 0 && selectable.every((w) => selected.has(w.id));
  const someSelected = selectable.some((w) => selected.has(w.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectable.map((w) => w.id)));

  const total = q ? rows.length : WORKFLOWS_TOTAL;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);

  return (
    // Relative so the bulk bar can float over the table, above the pager.
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="mb-px flex h-[60px] shrink-0 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <label className="flex h-9 w-[230px] items-center rounded-[4px] border border-line bg-white pl-3 focus-within:border-brand">
            <IconSearch size={20} className="shrink-0 text-foreground" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search Workflows"
              aria-label="Search Workflows"
              className="h-full min-w-0 flex-1 bg-transparent pr-3 pl-2 text-paragraph-md text-foreground outline-none placeholder:text-disabled-fg"
            />
          </label>
          <span className="h-9 w-px bg-line" aria-hidden="true" />
          <Button
            variant="grey-outline"
            size="sm"
            leftIcon={<IconFilter size={20} />}
            className="gap-2 pr-3 pl-2.5 [&_svg]:size-5"
          >
            Filters
          </Button>
        </div>
        <Gate lock={locks?.createVoice}>
          <Button variant="primary" size="md" className="px-5">
            Create Workflow
          </Button>
        </Gate>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <Table className="table-fixed">
          <colgroup>
            {COLUMNS.map((width, i) => (
              // Kept as shares of the frame's table, so the columns hold their
              // proportions when the sidenav leaves a little less room.
              <col key={i} style={{ width: `${(width / TABLE_WIDTH) * 100}%` }} />
            ))}
          </colgroup>
          <TableHeader className="[&_tr]:border-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12">
                <span className="flex">
                  <LockedCheckbox
                    lock={locks?.deleteVoice}
                    size="sm"
                    aria-label="Select all workflows"
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={toggleAll}
                  />
                </span>
              </TableHead>
              {["Workflow name", "Status", "Assigned phone number", "Last updated", "Created by", "Actions"].map(
                (label) => (
                  <TableHead key={label} className="h-12 text-label-sm">
                    {label}
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((w) => (
              <TableRow
                key={w.id}
                state={selected.has(w.id) ? "selected" : "default"}
                className="border-0"
              >
                <TableCell className={CELL}>
                  <span className="flex">
                    <LockedCheckbox
                      lock={locks?.deleteVoice}
                      size="sm"
                      aria-label={`Select ${w.name}`}
                      disabled={w.viewOnly}
                      checked={selected.has(w.id)}
                      onChange={() => toggle(w.id)}
                    />
                  </span>
                </TableCell>
                <TableCell className={CELL}>
                  <span className="flex items-center gap-1.5">
                    <span title={w.name} className="max-w-[157px] truncate text-label-md text-foreground">
                      {w.name}
                    </span>
                    <Tag size="sm" color="indigo" className="shrink-0">
                      V2
                    </Tag>
                  </span>
                </TableCell>
                <TableCell className={CELL}>
                  <Tag size="md" color={STATUS_TAG[w.status]} className="py-0">
                    {w.status}
                  </Tag>
                </TableCell>
                <TableCell className={CELL}>
                  <NumberCell number={w.number} />
                </TableCell>
                <TableCell className={cn(CELL, "text-paragraph-md")}>{w.updated ?? "-"}</TableCell>
                <TableCell className={cn(CELL, "text-paragraph-md")}>
                  {w.createdBy ? (
                    <span className="flex items-center gap-2">
                      <Avatar size="md" color="indigo" initials={w.createdBy.initials} />
                      <span className="truncate">{w.createdBy.name}</span>
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className={CELL}>
                  <RowActions workflow={w} locks={locks} onOpen={() => setOpenWorkflow(w)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mx-6 shrink-0 border-t border-line">
        <TablePagination
          page={page}
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

      {/* Remove is the one bulk verb, so the checkboxes follow the delete
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
                onClick={() => setSelected(new Set(selectable.map((w) => w.id)))}
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
              Remove
            </Button>
          </>
        }
      />

      {openWorkflow ? (
        <WorkflowEditor
          workflow={openWorkflow}
          lock={locks?.editVoice}
          deleteLock={locks?.deleteVoice}
          onClose={() => setOpenWorkflow(null)}
        />
      ) : null}
    </main>
  );
}
