import * as React from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Modal } from "@/components/Modal";
import { Dropdown, useDropdownPresence } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconFilter,
  IconPencil,
  IconSearch,
  IconTeamManagement,
} from "@/components/Icon";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellText,
  TablePagination,
  TableBulkBar,
} from "@/components/Table";
import {
  AdminPageHeader,
  IconTrash,
  StatusToggle,
} from "./AgentAssistAdmin";
import { AssignmentAvatarStack } from "./AssignmentAvatarStack";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import { CreateActionPage } from "./CreateActionPage";
import actionsEmptyIllustration from "./assets/actions-empty.svg";
import { IntegrationLogo, IntegrationName } from "./icons/IntegrationLogos";
import { ActionInCallPreview } from "./InCallActionCard";
import { PageEmptyState } from "./PageEmptyState";
import { TEAM_MEMBERS, USER_GROUPS } from "./guidanceData";
import {
  actionAssignees,
  actionIsAssigned,
  actionLibraryStatus,
  cloneAction,
  createEmptyAction,
  integrationById,
  type AgentAction,
  type Integration,
  type IntegrationId,
} from "./actionsData";

/**
 * Actions — what an agent can do in a connected app while the call is running.
 *
 * This is its own primary destination rather than a tab inside Conversation
 * Guidance: the three sections read as one story — Knowledge is what AI may
 * know, Conversation Guidance is how to respond, Actions is what to do. An
 * Action can surface on its own during a call; Response Cards no longer
 * attach or configure Actions.
 */

export interface ActionsPageProps {
  actions: AgentAction[];
  onActionsChange: (next: AgentAction[]) => void;
  integrations: Integration[];
  onIntegrationsChange: (next: Integration[]) => void;
}

export function ActionsPage({
  actions,
  onActionsChange,
  integrations,
  onIntegrationsChange,
}: ActionsPageProps) {
  const [search, setSearch] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [memberFilter, setMemberFilter] = React.useState<string[]>([]);
  const [groupFilter, setGroupFilter] = React.useState<string[]>([]);
  const [integrationFilter, setIntegrationFilter] = React.useState<string[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [launch, setLaunch] = React.useState<{
    mode: "create" | "edit";
    item: AgentAction;
  } | null>(null);
  const [deleting, setDeleting] = React.useState<AgentAction[] | null>(null);
  const [previewTarget, setPreviewTarget] = React.useState<AgentAction | null>(null);
  const [assignTarget, setAssignTarget] = React.useState<AgentAction | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const activeFilterCount =
    memberFilter.length +
    groupFilter.length +
    integrationFilter.length +
    statusFilter.length;
  const hasFilters = activeFilterCount > 0;

  const filtered = actions.filter((row) => {
    if (
      memberFilter.length > 0 &&
      !memberFilter.some((value) => row.teamMembers.includes(value))
    ) {
      return false;
    }
    if (
      groupFilter.length > 0 &&
      !groupFilter.some((value) => row.userGroups.includes(value))
    ) {
      return false;
    }
    if (
      integrationFilter.length > 0 &&
      !integrationFilter.includes(row.integrationId)
    ) {
      return false;
    }
    if (
      statusFilter.length > 0 &&
      !statusFilter.includes(actionLibraryStatus(row, integrations))
    ) {
      return false;
    }
    if (!query) return true;
    return (
      row.name.toLowerCase().includes(query) ||
      row.agentLabel.toLowerCase().includes(query)
    );
  });
  const isEmpty = filtered.length === 0 && !query && !hasFilters;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const visibleIds = visible.map((row) => row.id);
  const selectedVisible = selected.filter((id) => visibleIds.includes(id));
  const allSelected =
    visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const someSelected = selectedVisible.length > 0 && !allSelected;
  const selectedVisibleRows = actions.filter((row) =>
    selectedVisible.includes(row.id)
  );

  const toggleAll = () => {
    setSelected(allSelected ? [] : visibleIds);
  };

  const toggleRow = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const createAction = () =>
    setLaunch({ mode: "create", item: createEmptyAction() });

  const saveAction = (item: AgentAction) => {
    const exists = actions.some((row) => row.id === item.id);
    onActionsChange(
      exists
        ? actions.map((row) => (row.id === item.id ? item : row))
        : [item, ...actions]
    );
    setLaunch(null);
    setToast(exists ? "Action saved" : "Action created");
  };

  const removeActions = (ids: string[]) => {
    onActionsChange(actions.filter((row) => !ids.includes(row.id)));
    setSelected((current) => current.filter((id) => !ids.includes(id)));
    setDeleting(null);
  };

  const connectIntegration = (id: IntegrationId) => {
    const integration = integrationById(integrations, id);
    onIntegrationsChange(
      integrations.map((item) =>
        item.id === id ? { ...item, connected: true } : item
      )
    );
    if (integration) setToast(`${integration.name} connected`);
  };

  const confirmDelete = (items: AgentAction[]) => {
    removeActions(items.map((item) => item.id));
  };

  const assignAction = (row: AgentAction, members: string[], groups: string[]) => {
    onActionsChange(
      actions.map((item) => {
        if (item.id !== row.id) return item;
        const next: AgentAction = {
          ...item,
          teamMembers: members,
          userGroups: groups,
          audience: members.length > 0 ? "users" : groups.length > 0 ? "teams" : item.audience,
          updated: "Just now",
        };
        return !actionIsAssigned(next) && next.status === "active"
          ? { ...next, status: "inactive" as const }
          : next;
      })
    );
  };

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (launch) {
    return (
      <CreateActionPage
        initial={launch.item}
        mode={launch.mode}
        integrations={integrations}
        onIntegrationsChange={onIntegrationsChange}
        onClose={() => setLaunch(null)}
        onSave={saveAction}
      />
    );
  }

  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <AdminPageHeader
        title="In-call Actions"
        description="Let agents take relevant actions during a conversation when specific conditions are met."
        actions={
          isEmpty ? null : (
            <Button size="sm" onClick={createAction}>
              Create action
            </Button>
          )
        }
      />

      {isEmpty ? (
        <ActionsEmptyState onAction={createAction} />
      ) : (
        <>
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex h-9 items-center gap-3">
              <InputField
                placeholder="Search actions"
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
              <Button
                variant="grey-outline"
                size="sm"
                leftIcon={
                  <IconFilter
                    size={16}
                    className={cn(
                      "origin-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]",
                      filtersOpen && "rotate-180"
                    )}
                  />
                }
                aria-expanded={filtersOpen}
                aria-controls="agent-assist-action-filters"
                aria-label={
                  hasFilters
                    ? `${filtersOpen ? "Hide filters" : "Filters"}, ${activeFilterCount} active`
                    : undefined
                }
                className={cn((filtersOpen || hasFilters) && "bg-surface-hover")}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                {filtersOpen ? "Hide filters" : "Filters"}
                {hasFilters ? (
                  <Badge variant="blue-grey" className="tabular-nums">
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
            </div>
          </div>

          <div
            id="agent-assist-action-filters"
            className={cn("aa-filter-row", filtersOpen && "is-open")}
            aria-hidden={!filtersOpen}
            inert={!filtersOpen ? true : undefined}
          >
            <div className="aa-filter-row-clip">
              <div className="aa-filter-row-inner flex flex-wrap items-center gap-3 border-t border-line px-6 py-3">
                <Dropdown
                  placeholder="Team members"
                  searchPlaceholder="Search team members"
                  appliedField="Members"
                  options={TEAM_MEMBERS}
                  multiple
                  confirm
                  searchable
                  value={memberFilter}
                  onValueChange={(value) => {
                    setMemberFilter(Array.isArray(value) ? value : [value]);
                    setPage(1);
                  }}
                  className="w-[220px] shrink-0"
                  triggerClassName="h-9"
                />
                <Dropdown
                  placeholder="User groups"
                  searchPlaceholder="Search user groups"
                  appliedField="User groups"
                  options={USER_GROUPS}
                  multiple
                  confirm
                  searchable
                  value={groupFilter}
                  onValueChange={(value) => {
                    setGroupFilter(Array.isArray(value) ? value : [value]);
                    setPage(1);
                  }}
                  className="w-[220px] shrink-0"
                  triggerClassName="h-9"
                />
                <Dropdown
                  placeholder="Integration"
                  appliedField="Integration"
                  options={integrations.map((item) => ({
                    value: item.id,
                    label: item.name,
                    icon: <IntegrationLogo id={item.id} size={14} />,
                  }))}
                  multiple
                  confirm
                  value={integrationFilter}
                  onValueChange={(value) => {
                    setIntegrationFilter(Array.isArray(value) ? value : [value]);
                    setPage(1);
                  }}
                  className="w-[180px] shrink-0"
                  triggerClassName="h-9"
                />
                <Dropdown
                  placeholder="Status"
                  appliedField="Status"
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "needs_attention", label: "Needs attention" },
                  ]}
                  multiple
                  confirm
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(Array.isArray(value) ? value : [value]);
                    setPage(1);
                  }}
                  className="w-[180px] shrink-0"
                  triggerClassName="h-9"
                />
                {hasFilters ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setMemberFilter([]);
                      setGroupFilter([]);
                      setIntegrationFilter([]);
                      setStatusFilter([]);
                      setPage(1);
                    }}
                  >
                    Clear all
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="min-h-0 flex-1 overflow-auto">
                <ActionsTable
                  rows={visible}
                  integrations={integrations}
                  selectedIds={selected}
                  allSelected={allSelected}
                  someSelected={someSelected}
                  onToggleAll={toggleAll}
                  onToggleRow={toggleRow}
                  onEdit={(row) => setLaunch({ mode: "edit", item: row })}
                  onPreview={setPreviewTarget}
                  onAssign={setAssignTarget}
                  onDuplicate={(row) =>
                    onActionsChange([cloneAction(row), ...actions])
                  }
                  onToggleStatus={(row) =>
                    onActionsChange(
                      actions.map((item) =>
                        item.id === row.id
                          ? {
                              ...item,
                              status:
                                item.status === "active" ? "inactive" : "active",
                              updated: "Just now",
                            }
                          : item
                      )
                    )
                  }
                  onConnectIntegration={connectIntegration}
                  onDelete={(row) => setDeleting([row])}
                />
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
            <TableBulkBar
              count={selectedVisible.length}
              label="selected"
              actions={
                <Button
                  variant="grey-outline"
                  size="sm"
                  className="bg-white"
                  onClick={() => setDeleting(selectedVisibleRows)}
                >
                  Delete
                </Button>
              }
            />
          </div>
        </>
      )}

      {previewTarget ? (
        <Modal
          open
          onClose={() => setPreviewTarget(null)}
          size="md"
          title="Preview"
          description="What the agent would see during a call"
        >
          <ActionInCallPreview
            key={previewTarget.id}
            action={previewTarget}
            integrations={integrations}
          />
        </Modal>
      ) : null}

      {assignTarget ? (
        <AssignActionModal
          key={assignTarget.id}
          action={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSave={(members, groups) => {
            assignAction(assignTarget, members, groups);
            setAssignTarget(null);
          }}
        />
      ) : null}

      {deleting && deleting.length > 0 ? (
        <Modal
          open
          onClose={() => setDeleting(null)}
          size="sm"
          title={
            deleting.length === 1 ? `Delete “${deleting[0]!.name}”?` : "Delete actions"
          }
          description={
            deleting.length === 1
              ? "This Action will no longer be available to agents."
              : `${deleting.length} actions will no longer be available to agents.`
          }
          footer={
            <>
              <Button
                variant="grey-outline"
                size="sm"
                onClick={() => setDeleting(null)}
              >
                Cancel
              </Button>
              <Button
                variant="error"
                size="sm"
                onClick={() => confirmDelete(deleting)}
              >
                {deleting.length === 1 ? "Delete Action" : "Delete"}
              </Button>
            </>
          }
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="pointer-events-none absolute right-6 bottom-6 z-30 rounded-[6px] border border-line bg-white px-3 py-2 text-label-md text-foreground shadow-400"
        >
          {toast}
        </div>
      ) : null}
    </main>
  );
}

function ActionsEmptyState({ onAction }: { onAction: () => void }) {
  return (
    <PageEmptyState
      illustrationSrc={actionsEmptyIllustration}
      title="Help agents take the right action at the right time"
      description="Surface actions during calls so agents can quickly update records, create tasks, send follow-ups, and keep work moving."
      actionLabel="Create action"
      onAction={onAction}
    />
  );
}

interface ActionMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}

/**
 * Kebab menu for secondary row actions. The list body scrolls and clips,
 * so the popover renders in a portal and tracks the trigger.
 */
function ActionMenu({ label, items }: { label: string; items: ActionMenuItem[] }) {
  const [open, setOpen] = React.useState(false);
  const { mounted, state } = useDropdownPresence(open);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (!mounted) return;
    const update = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = menu;
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      const below = rect.bottom + 4;
      const top = below + height > window.innerHeight - 8 ? rect.top - height - 4 : below;
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [mounted]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <TooltipTrigger
        placement="bottom"
        disabled={open}
        content={<Tooltip theme="dark" arrow="top-center" title="More actions" />}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "flex size-9 items-center justify-center rounded-r-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg",
            open && "bg-secondary-bg"
          )}
        >
          <IconDotsVertical size={20} />
        </button>
      </TooltipTrigger>
      {mounted && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={label}
              data-state={state}
              className="dropdown-panel fixed z-[100] min-w-[180px] rounded-[6px] border border-line bg-white py-1 shadow-400"
              style={{ top: 0, left: 0 }}
            >
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                  className={cn(
                    "dropdown-item flex w-full items-center gap-2 px-3 py-2 text-left text-paragraph-md",
                    item.destructive
                      ? "text-error hover:bg-error-subtle"
                      : "text-foreground hover:bg-secondary-bg"
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

/** Same row chrome as Scripts, Response Cards, and Live Coaching. */
function ActionRowButtons({
  name,
  onEdit,
  onPreview,
  onDuplicate,
  onAssign,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onAssign: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="inline-flex items-center">
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Edit" />}
      >
        <button
          type="button"
          aria-label={`Edit ${name}`}
          onClick={onEdit}
          className="-mr-px flex size-9 items-center justify-center rounded-l-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconPencil size={20} />
        </button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Preview" />}
      >
        <button
          type="button"
          aria-label={`Preview ${name}`}
          onClick={onPreview}
          className="-mr-px flex size-9 items-center justify-center border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconEye size={20} />
        </button>
      </TooltipTrigger>
      <ActionMenu
        label={`More actions for ${name}`}
        items={[
          {
            key: "duplicate",
            label: "Duplicate",
            icon: <IconCopy size={16} />,
            onSelect: onDuplicate,
          },
          {
            key: "assign",
            label: "Assign",
            icon: <IconTeamManagement size={16} />,
            onSelect: onAssign,
          },
          {
            key: "delete",
            label: "Delete",
            icon: <IconTrash size={16} />,
            onSelect: onDelete,
            destructive: true,
          },
        ]}
      />
    </div>
  );
}

function AssignActionModal({
  action,
  onClose,
  onSave,
}: {
  action: AgentAction;
  onClose: () => void;
  onSave: (members: string[], groups: string[]) => void;
}) {
  const [selectedMembers, setSelectedMembers] = React.useState(action.teamMembers);
  const [selectedGroups, setSelectedGroups] = React.useState(action.userGroups);

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      className="overflow-visible"
      bodyClassName="overflow-visible"
      title="Assign"
      description="Choose who sees this action on their calls."
      footer={
        <>
          <Button variant="grey-outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(selectedMembers, selectedGroups)}>
            Save
          </Button>
        </>
      }
    >
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-label-sm text-muted-foreground">Action</dt>
          <dd className="text-paragraph-md text-foreground">{action.name}</dd>
        </div>
        <AssignTeamAndGroups
          variant="summary"
          members={TEAM_MEMBERS}
          groups={USER_GROUPS}
          selectedMembers={selectedMembers}
          selectedGroups={selectedGroups}
          onMembersChange={setSelectedMembers}
          onGroupsChange={setSelectedGroups}
        />
      </dl>
    </Modal>
  );
}

function ActionStatusToggle({
  row,
  status,
  integrations,
  onToggle,
  onConnect,
}: {
  row: AgentAction;
  status: ReturnType<typeof actionLibraryStatus>;
  integrations: Integration[];
  onToggle: () => void;
  onConnect: (id: IntegrationId) => void;
}) {
  const integration = integrationById(integrations, row.integrationId);
  const blocked = status === "needs_attention";
  const disconnected = Boolean(blocked && integration && !integration.connected);
  // Same rule as response cards and live coaching: nothing goes live until
  // someone is assigned to it.
  const unassigned = status !== "active" && !actionIsAssigned(row);

  return (
    <StatusToggle
      name={row.name}
      checked={status === "active"}
      disabled={blocked || unassigned}
      disabledReason={
        disconnected
          ? (integration?.connectHint ?? `Connect ${integration?.name ?? "this app"} to enable this action`)
          : blocked
            ? `This operation isn’t available in ${integration?.name ?? "the connected app"} yet.`
            : unassigned
              ? "Assign users or groups before publishing"
              : undefined
      }
      disabledAction={
        disconnected && integration ? (
          <button
            type="button"
            className="cursor-pointer bg-transparent p-0 font-medium"
            onClick={() => onConnect(integration.id)}
          >
            Connect {integration.name}
          </button>
        ) : undefined
      }
      onCheckedChange={onToggle}
    />
  );
}

function ActionsTable({
  rows,
  integrations,
  selectedIds,
  allSelected,
  someSelected,
  onToggleAll,
  onToggleRow,
  onEdit,
  onPreview,
  onDuplicate,
  onAssign,
  onToggleStatus,
  onConnectIntegration,
  onDelete,
}: {
  rows: AgentAction[];
  integrations: Integration[];
  selectedIds: string[];
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onToggleRow: (id: string) => void;
  onEdit: (row: AgentAction) => void;
  onPreview: (row: AgentAction) => void;
  onDuplicate: (row: AgentAction) => void;
  onAssign: (row: AgentAction) => void;
  onToggleStatus: (row: AgentAction) => void;
  onConnectIntegration: (id: IntegrationId) => void;
  onDelete: (row: AgentAction) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <TableHead className="sticky top-0 z-10 w-11">
            <Checkbox
              size="sm"
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={onToggleAll}
              aria-label="Select all actions"
            />
          </TableHead>
          <TableHead className="sticky top-0 z-10 w-[220px]">Action</TableHead>
          <TableHead className="sticky top-0 z-10 w-[160px]">Integration</TableHead>
          <TableHead className="sticky top-0 z-10 w-[150px]">Assigned to</TableHead>
          <TableHead className="sticky top-0 z-10 w-[140px]">Status</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Last updated</TableHead>
          <TableHead className="sticky top-0 z-10 w-[148px] text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const status = actionLibraryStatus(row, integrations);
          const people = actionAssignees(row);
          const isSelected = selectedIds.includes(row.id);
          return (
            <TableRow
              key={row.id}
              state={isSelected ? "selected" : "default"}
              className="border-b-0"
            >
              <TableCell className="w-11">
                <Checkbox
                  size="sm"
                  checked={isSelected}
                  onCheckedChange={() => onToggleRow(row.id)}
                  aria-label={`Select ${row.name}`}
                />
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="max-w-full min-w-0 bg-transparent p-0 text-left font-medium hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
                >
                  <TableCellText primary={row.name} />
                </button>
              </TableCell>
              <TableCell>
                <IntegrationName
                  id={row.integrationId}
                  name={
                    integrationById(integrations, row.integrationId)?.name ??
                    row.integrationId
                  }
                />
              </TableCell>
              <TableCell>
                {row.audience === "everyone" ? (
                  <TableCellText primary="Everyone" />
                ) : (
                  <AssignmentAvatarStack people={people} />
                )}
              </TableCell>
              <TableCell>
                <ActionStatusToggle
                  row={row}
                  status={status}
                  integrations={integrations}
                  onToggle={() => onToggleStatus(row)}
                  onConnect={onConnectIntegration}
                />
              </TableCell>
              <TableCell className="text-paragraph-md">{row.updated}</TableCell>
              <TableCell className="text-center">
                <ActionRowButtons
                  name={row.name}
                  onEdit={() => onEdit(row)}
                  onPreview={() => onPreview(row)}
                  onDuplicate={() => onDuplicate(row)}
                  onAssign={() => onAssign(row)}
                  onDelete={() => onDelete(row)}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
