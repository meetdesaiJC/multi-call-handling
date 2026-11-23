import * as React from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Dropdown, useDropdownPresence } from "@/components/Dropdown";
import { InputField, TextArea } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import {
  SegmentedPanel,
  SegmentedTabs,
  type SegmentedTabItem,
} from "@/components/SegmentedTabs";
import { Tag } from "@/components/Tag";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  IconClose,
  IconCopy,
  IconDotsVertical,
  IconFile,
  IconFilter,
  IconMessages,
  IconPencil,
  IconSearch,
  IconTeamManagement,
  IconWebToDevice,
  type IconProps,
} from "@/components/Icon";
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
import { cn } from "@/lib/utils";
import knowledgeEmptyIllustration from "./assets/knowledge-empty.svg";
import webPagesEmptyIllustration from "./assets/webpages-empty.svg";
import { useAgentAssistTakeover } from "./agentAssistTakeover";
import { AssignmentAvatarStack } from "./AssignmentAvatarStack";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import { HeaderEditableTitle } from "./HeaderEditableTitle";
import { PageEmptyState } from "./PageEmptyState";
import {
  createEmptyKnowledgeSource,
  formatKnowledgeFileSize,
  KNOWLEDGE_CONTENT_LIMITS,
  KNOWLEDGE_TEAMS,
  KNOWLEDGE_USERS,
  KNOWLEDGE_VOICE_AGENTS,
  knowledgeAssignees,
  knowledgeAudienceLabel,
  knowledgeContentItemCount,
  knowledgeFileTypeLabel,
  knowledgeKindFromContent,
  knowledgeOriginFromContent,
  knowledgeVoiceAgentLabel,
  newKnowledgeContentId,
  newKnowledgeSourceId,
  normalizeKnowledgeUrl,
  sampleEntriesForSource,
  type KnowledgeContentTab,
  type KnowledgeQaPair,
  type KnowledgeSourceRecord,
} from "./knowledgeData";

/**
 * Knowledge admin — one JustCall knowledge base, shared. A KB is assigned the
 * same way a Guidance item is: user groups, individual agents, and voice agents
 * stack up rather than being an either/or choice. There is no trigger to write
 * and no question to enumerate: retrieval finds the answer when a customer asks
 * for it.
 */

export interface KnowledgePageProps {
  sources: KnowledgeSourceRecord[];
  onSourcesChange: (next: KnowledgeSourceRecord[]) => void;
}

export function KnowledgePage({
  sources,
  onSourcesChange,
}: KnowledgePageProps) {
  const [search, setSearch] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [agentFilter, setAgentFilter] = React.useState<string[]>([]);
  const [groupFilter, setGroupFilter] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  /** Percent complete per knowledge base while ingestion re-runs. */
  const [training, setTraining] = React.useState<Record<string, number>>({});
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [assigning, setAssigning] = React.useState<KnowledgeSourceRecord | null>(
    null
  );
  const [deleting, setDeleting] = React.useState<KnowledgeSourceRecord[] | null>(
    null
  );
  const [editing, setEditing] = React.useState<{
    source: KnowledgeSourceRecord;
    mode: "create" | "edit";
  } | null>(null);

  const query = search.trim().toLowerCase();
  const matchesAssignment = (members: string[], groups: string[]) =>
    (agentFilter.length === 0 ||
      agentFilter.some((value) => members.includes(value))) &&
    (groupFilter.length === 0 ||
      groupFilter.some((value) => groups.includes(value)));
  const filtered = sources.filter((source) => {
    const matchesQuery =
      !query ||
      source.name.toLowerCase().includes(query) ||
      source.origin.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter.length === 0 ||
      (statusFilter.includes("success") && source.status === "live") ||
      (statusFilter.includes("failed") && source.status === "failed") ||
      (statusFilter.includes("draft") && source.status === "draft");
    // Nobody assigned means everyone, which no assignment filter excludes.
    const matchesAudience =
      (source.audienceUsers.length === 0 && source.audienceTeams.length === 0) ||
      matchesAssignment(source.audienceUsers, source.audienceTeams);
    return matchesQuery && matchesStatus && matchesAudience;
  });
  const isEmpty = sources.length === 0;
  const activeFilterCount =
    statusFilter.length +
    agentFilter.length +
    groupFilter.length;
  const hasFilters = activeFilterCount > 0;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  // Selection and the header checkbox act on the page in front of the admin.
  const visibleIds = visible.map((source) => source.id);
  const selectedVisible = selected.filter((id) => visibleIds.includes(id));
  const allSelected =
    visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const someSelected = selectedVisible.length > 0 && !allSelected;

  const saveSource = (next: KnowledgeSourceRecord) => {
    const exists = sources.some((source) => source.id === next.id);
    onSourcesChange(
      exists
        ? sources.map((source) => (source.id === next.id ? next : source))
        : [next, ...sources]
    );
    setEditing(null);
  };

  const patchSource = (id: string, patch: Partial<KnowledgeSourceRecord>) => {
    onSourcesChange(
      sources.map((source) =>
        source.id === id ? { ...source, ...patch, updated: "Just now" } : source
      )
    );
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : visibleIds);
  };

  const toggleRow = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const duplicateSource = (source: KnowledgeSourceRecord) => {
    onSourcesChange([
      {
        ...source,
        id: newKnowledgeSourceId(),
        name: `${source.name} (copy)`,
        status: "draft",
        updated: "Just now",
      },
      ...sources,
    ]);
  };

  /**
   * Ingestion stands in for the real crawl: the pie fills, then the knowledge
   * base lands published — which is also how a failed source gets retried.
   */
  const retrainSource = (id: string) => {
    if (training[id] != null) return;
    const steps = [12, 34, 58, 79, 100];
    setTraining((current) => ({ ...current, [id]: steps[0]! }));
    steps.slice(1).forEach((value, index) => {
      window.setTimeout(
        () =>
          setTraining((current) =>
            current[id] == null ? current : { ...current, [id]: value }
          ),
        (index + 1) * 280
      );
    });
    window.setTimeout(() => {
      setTraining((current) => {
        const { [id]: _done, ...rest } = current;
        return rest;
      });
      patchSource(id, { status: "live" });
    }, steps.length * 280);
  };

  /** A new KB starts empty — content decides its type, not a picker up front. */
  const createSource = () => {
    setEditing({ source: createEmptyKnowledgeSource(), mode: "create" });
  };

  const removeSources = (ids: string[]) => {
    onSourcesChange(sources.filter((source) => !ids.includes(source.id)));
    setSelected((current) => current.filter((id) => !ids.includes(id)));
    setDeleting(null);
  };

  if (editing) {
    return (
      <KnowledgeSourcePage
        source={editing.source}
        mode={editing.mode}
        onCancel={() => setEditing(null)}
        onSave={saveSource}
      />
    );
  }

  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {isEmpty ? (
        <PageEmptyState
          illustrationSrc={knowledgeEmptyIllustration}
          title="Help your AI answer with the right facts"
          description="Add the documents, FAQs, and policies your AI should draw on when it answers customer questions."
          actionLabel="Create Knowledge Base"
          onAction={createSource}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            <div className="flex h-9 items-center gap-3">
              <InputField
                placeholder="Search Knowledge Base"
                leadingIcon={<IconSearch size={16} />}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
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
                aria-controls="knowledge-filters"
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
            <Button size="sm" onClick={createSource}>
              Create Knowledge Base
            </Button>
          </div>

          <div
            id="knowledge-filters"
            className={cn("aa-filter-row", filtersOpen && "is-open")}
            aria-hidden={!filtersOpen}
            inert={!filtersOpen ? true : undefined}
          >
            <div className="aa-filter-row-clip">
              <div className="aa-filter-row-inner flex flex-wrap items-center gap-3 border-t border-line px-6 py-3">
                <Dropdown
                  placeholder="Status"
                  appliedField="Status"
                  options={STATUS_FILTER_OPTIONS}
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
                <Dropdown
                  placeholder="Agents"
                  searchPlaceholder="Search agents"
                  appliedField="Agents"
                  options={KNOWLEDGE_USERS}
                  multiple
                  confirm
                  searchable
                  value={agentFilter}
                  onValueChange={(value) => {
                    setAgentFilter(Array.isArray(value) ? value : [value]);
                    setPage(1);
                  }}
                  className="w-[220px] shrink-0"
                  triggerClassName="h-9"
                />
                <Dropdown
                  placeholder="User Groups"
                  searchPlaceholder="Search user groups"
                  appliedField="User Groups"
                  options={KNOWLEDGE_TEAMS}
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
                {hasFilters ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setStatusFilter([]);
                      setAgentFilter([]);
                      setGroupFilter([]);
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
                <Table className="table-fixed">
                  <TableHeader className="[&_tr]:border-b-0">
                    <TableRow>
                      <TableHead className="sticky top-0 z-10 w-11">
                        <Checkbox
                          size="sm"
                          checked={allSelected}
                          indeterminate={someSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all Knowledge Bases"
                        />
                      </TableHead>
                      <TableHead className="sticky top-0 z-10">Knowledge Base</TableHead>
                      <TableHead className="sticky top-0 z-10 w-[124px]">Status</TableHead>
                      <TableHead className="sticky top-0 z-10 w-[148px]">
                        Assigned to
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 w-[132px]">
                        Last Updated
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 w-[142px] text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.length === 0 ? (
                      <TableRow className="border-b-0 hover:bg-transparent">
                        <TableCell
                          colSpan={6}
                          className="text-paragraph-md text-muted-foreground"
                        >
                          No matching Knowledge Bases
                        </TableCell>
                      </TableRow>
                    ) : (
                      visible.map((source) => {
                        const isSelected = selected.includes(source.id);
                        const progress = training[source.id] ?? null;
                        return (
                          <TableRow
                            key={source.id}
                            state={isSelected ? "selected" : "default"}
                            className="border-b-0"
                          >
                            <TableCell className="w-11">
                              <Checkbox
                                size="sm"
                                checked={isSelected}
                                onCheckedChange={() => toggleRow(source.id)}
                                aria-label={`Select ${source.name}`}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="block max-w-full min-w-0 truncate text-label-md font-medium">
                                {source.name}
                              </span>
                            </TableCell>
                            <TableCell>
                              <KnowledgeStatusCell
                                status={source.status}
                                progress={progress}
                              />
                            </TableCell>
                            <TableCell>
                              <AssignmentAvatarStack
                                people={knowledgeAssignees(source)}
                              />
                            </TableCell>
                            <TableCell className="text-paragraph-md text-muted-foreground">
                              {source.updated}
                            </TableCell>
                            <TableCell className="text-center">
                              <RowActions
                                source={source}
                                retraining={progress != null}
                                onAssign={() => setAssigning(source)}
                                onRetrain={() => retrainSource(source.id)}
                                onDuplicate={() => duplicateSource(source)}
                                onEdit={() => setEditing({ source, mode: "edit" })}
                                onDelete={() => setDeleting([source])}
                              />
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
            <TableBulkBar
              count={selectedVisible.length}
              label="selected"
              actions={
                <Button
                  variant="grey-outline"
                  size="sm"
                  className="bg-white"
                  onClick={() =>
                    setDeleting(
                      sources.filter((source) => selectedVisible.includes(source.id))
                    )
                  }
                >
                  Delete
                </Button>
              }
            />
          </div>
        </>
      )}

      {assigning ? (
        <AssignAgentsModal
          source={assigning}
          onClose={() => setAssigning(null)}
          onSave={(next) => {
            patchSource(assigning.id, next);
            setAssigning(null);
          }}
        />
      ) : null}

      {deleting && deleting.length > 0 ? (
        <Modal
          open
          onClose={() => setDeleting(null)}
          size="sm"
          title={deleting.length === 1 ? "Delete Knowledge Base" : "Delete Knowledge Bases"}
          description={
            deleting.length === 1
              ? `“${deleting[0]!.name}” will be removed from Voice Agent and Agent Assist.`
              : `${deleting.length} Knowledge Bases will be removed from Voice Agent and Agent Assist.`
          }
          footer={
            <>
              <Button variant="grey-outline" size="sm" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                variant="error"
                size="sm"
                onClick={() => removeSources(deleting.map((source) => source.id))}
              >
                Delete
              </Button>
            </>
          }
        />
      ) : null}
    </main>
  );
}

const STATUS_FILTER_OPTIONS = [
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "draft", label: "Draft" },
];

function KnowledgeStatusCell({
  status,
  progress,
}: {
  status: KnowledgeSourceRecord["status"];
  /** Percent complete while ingestion runs; `null` when it isn't running. */
  progress: number | null;
}) {
  if (progress != null) {
    return (
      <span className="flex items-center gap-2">
        <TrainingPie value={progress} />
        <span className="text-paragraph-md text-muted-foreground">Training</span>
      </span>
    );
  }
  if (status === "live") {
    return (
      <Tag size="sm" color="green" className="rounded-full">
        Success
      </Tag>
    );
  }
  if (status === "failed") {
    return (
      <Tag size="sm" color="red" className="rounded-full">
        Failed
      </Tag>
    );
  }
  return (
    <Tag size="sm" color="blue-grey" className="rounded-full">
      Draft
    </Tag>
  );
}

/** How far through ingestion a knowledge base is, as a 24px dial. */
function TrainingPie({ value }: { value: number }) {
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={`Training ${Math.round(clamped)}% complete`}
      className="shrink-0"
    >
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="currentColor"
        strokeWidth="3"
        className="text-line"
      />
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-brand"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        transform="rotate(-90 12 12)"
        style={{ transition: "stroke-dashoffset 260ms linear" }}
      />
    </svg>
  );
}

function RowActions({
  source,
  retraining,
  onAssign,
  onRetrain,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  source: KnowledgeSourceRecord;
  retraining: boolean;
  onAssign: () => void;
  onRetrain: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="inline-flex items-center"
      role="group"
      aria-label={`Actions for ${source.name}`}
    >
      <TooltipTrigger
        placement="bottom"
        className="-mr-px"
        content={<Tooltip theme="dark" arrow="top-center" title="Edit" />}
      >
        <button
          type="button"
          aria-label={`Edit ${source.name}`}
          onClick={onEdit}
          className="flex size-9 items-center justify-center rounded-l-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconPencil size={20} />
        </button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        className="-mr-px"
        content={<Tooltip theme="dark" arrow="top-center" title="Retrain" />}
      >
        <button
          type="button"
          aria-label={`Retrain ${source.name}`}
          disabled={retraining}
          onClick={onRetrain}
          className="flex size-9 items-center justify-center border border-line bg-white text-foreground hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24 disabled:cursor-not-allowed disabled:text-disabled-fg"
        >
          <IconRefresh className={retraining ? "animate-spin" : undefined} />
        </button>
      </TooltipTrigger>
      <ActionMenu
        label={`More actions for ${source.name}`}
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

function AssignAgentsModal({
  source,
  onClose,
  onSave,
}: {
  source: KnowledgeSourceRecord;
  onClose: () => void;
  onSave: (patch: Partial<KnowledgeSourceRecord>) => void;
}) {
  const [members, setMembers] = React.useState(source.audienceUsers);
  const [groups, setGroups] = React.useState(source.audienceTeams);
  const [voiceAgents, setVoiceAgents] = React.useState(source.audienceVoiceAgents);

  const save = () =>
    onSave({
      audienceUsers: members,
      audienceTeams: groups,
      audienceVoiceAgents: voiceAgents,
    });

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      className="overflow-visible"
      bodyClassName="overflow-visible"
      title="Assign Agents"
      footer={
        <>
          <Button variant="grey-outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-label-sm text-muted-foreground">Knowledge Base</dt>
          <dd className="text-paragraph-md text-foreground">{source.name}</dd>
        </div>
        <AssignTeamAndGroups
          variant="summary"
          members={KNOWLEDGE_USERS}
          groups={KNOWLEDGE_TEAMS}
          selectedMembers={members}
          selectedGroups={groups}
          onMembersChange={setMembers}
          onGroupsChange={setGroups}
          voiceAgents={KNOWLEDGE_VOICE_AGENTS}
          selectedVoiceAgents={voiceAgents}
          onVoiceAgentsChange={setVoiceAgents}
        />
      </dl>
    </Modal>
  );
}

interface ActionMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}

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
      const left = Math.max(
        8,
        Math.min(rect.right - width, window.innerWidth - width - 8)
      );
      const below = rect.bottom + 4;
      const top =
        below + height > window.innerHeight - 8 ? rect.top - height - 4 : below;
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
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
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
            "flex size-9 items-center justify-center rounded-r-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
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

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M16.667 9.167a6.75 6.75 0 0 0-12.917-1.667m-.417-3.333v3.333h3.333"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.333 10.833a6.75 6.75 0 0 0 12.917 1.667m.417 3.333v-3.333h-3.333"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.333 5.833h13.334M8.333 9.167v5M11.667 9.167v5M4.167 5.833l.833 10a1.667 1.667 0 0 0 1.667 1.667h6.666a1.667 1.667 0 0 0 1.667-1.667l.833-10M7.5 5.833V3.333A.833.833 0 0 1 8.333 2.5h3.334a.833.833 0 0 1 .833.833v2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The four things a knowledge base can be made of. One KB holds any mix of
 * them, so the setup page tabs between them instead of asking the admin to
 * commit to a source type up front. The blurbs say how the content gets used,
 * not who reads it — a KB serves whoever it is assigned to. Connected apps
 * live on Integrations, not as a fifth tab.
 */
const CONTENT_TABS: {
  key: KnowledgeContentTab;
  label: string;
  /** Heading over the tab body, and the label on its card. */
  addTitle: string;
  limitLabel: string;
  blurb: string;
  emptyTitle: string;
  emptyBody: string;
  icon: (props: IconProps) => React.ReactElement;
}[] = [
  {
    key: "web",
    label: "Web Pages",
    addTitle: "Add Web Pages",
    limitLabel: `${KNOWLEDGE_CONTENT_LIMITS.webPages} web pages max`,
    blurb: "Pages are crawled and re-read, so answers follow what is published.",
    emptyTitle: "Add Web Pages to create Knowledge Base",
    emptyBody:
      "Add Web Pages containing information that can be used on live conversations",
    icon: IconWebToDevice,
  },
  {
    key: "text",
    label: "Text",
    addTitle: "Add Text",
    limitLabel: `${KNOWLEDGE_CONTENT_LIMITS.textChars.toLocaleString()} characters max`,
    blurb: "Paste policies, positioning, or anything else worth answering from.",
    emptyTitle: "Add Text to create Knowledge Base",
    emptyBody: "Paste information that can be used on live conversations",
    icon: IconTextSize,
  },
  {
    key: "qa",
    label: "Q&A",
    addTitle: "Add Q&A",
    limitLabel: `${KNOWLEDGE_CONTENT_LIMITS.qaPairs} Q&As max`,
    blurb: "Written answers come back as you wrote them when a question matches.",
    emptyTitle: "Add Q&A to create Knowledge Base",
    emptyBody:
      "Add question and answer pairs that can be used on live conversations",
    icon: IconMessages,
  },
  {
    key: "files",
    label: "Files",
    addTitle: "Add Files",
    limitLabel: `${KNOWLEDGE_CONTENT_LIMITS.files} files max`,
    blurb: "PDFs, documents, and spreadsheets are read once and answered from.",
    emptyTitle: "Add Files to create Knowledge Base",
    emptyBody: "Upload files containing information that can be used on live conversations",
    icon: IconFileUp,
  },
];

type ContentTabMeta = (typeof CONTENT_TABS)[number];

/**
 * The same tabs as `SegmentedTabItem`s. Icons render at 20px here rather than
 * the 16px the hand-rolled bar used — that is the size the DS component is
 * drawn around.
 */
const CONTENT_TAB_ITEMS: SegmentedTabItem[] = CONTENT_TABS.map(
  ({ key, label, icon: Glyph }) => ({ key, label, icon: <Glyph size={20} /> })
);

/**
 * Knowledge base setup — content on the right, everything about who it serves
 * on the left. A KB is a bucket of web pages, text, Q&A, and files rather than
 * one import, so the right pane tabs between them and the left rail keeps the
 * name and the availability settings in view while the admin fills it.
 * Connected apps are account-wide (Integrations), not a tab here.
 */
function KnowledgeSourcePage({
  source,
  mode,
  onCancel,
  onSave,
}: {
  source: KnowledgeSourceRecord;
  mode: "create" | "edit";
  onCancel: () => void;
  onSave: (next: KnowledgeSourceRecord) => void;
}) {
  useAgentAssistTakeover();
  const [draft, setDraft] = React.useState<KnowledgeSourceRecord>(source);
  // Open on whatever this knowledge base is actually made of.
  const [tab, setTab] = React.useState<KnowledgeContentTab>(() => {
    if (source.webPages.length > 0) return "web";
    if (source.text.trim()) return "text";
    if (source.qaPairs.length > 0) return "qa";
    if (source.files.length > 0) return "files";
    return "web";
  });
  const [publishOpen, setPublishOpen] = React.useState(false);

  const patch = (partial: Partial<KnowledgeSourceRecord>) =>
    setDraft((current) => ({ ...current, ...partial }));

  const contentCount = knowledgeContentItemCount(draft);
  // Assignment has no invalid state — nobody picked simply means everyone.
  const canSave = draft.name.trim().length > 0 && contentCount > 0;

  const save = () => {
    const origin = knowledgeOriginFromContent(draft);
    // Typed Q&A is already retrievable on its own. `entries` is what ingestion
    // pulled out of the pages, text, and files — stood in for here so a crawled
    // or uploaded source has something to find on a live call.
    const needsIngestion =
      draft.entries.length === 0 &&
      (draft.webPages.length > 0 || draft.files.length > 0 || draft.text.trim().length > 0);
    onSave({
      ...draft,
      name: draft.name.trim(),
      kind: knowledgeKindFromContent(draft),
      origin,
      entries: needsIngestion
        ? sampleEntriesForSource(`${draft.name} ${origin}`, draft.kind)
        : draft.entries,
      status: "live",
      updated: "Just now",
    });
  };

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={20} />
          </button>
          <h1 className="truncate text-heading-lg text-foreground">
            {mode === "edit" ? "Edit Knowledge Base" : "Create Knowledge Base"}
          </h1>
        </div>
        <Button size="sm" disabled={!canSave} onClick={() => setPublishOpen(true)}>
          {mode === "edit" ? "Save Changes" : "Publish"}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden px-6 py-6">
        <aside className="flex w-[320px] shrink-0 flex-col gap-4 overflow-y-auto pb-2">
          <section className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4">
            <HeaderEditableTitle
              value={draft.name}
              onChange={(name) => patch({ name })}
              placeholder="Untitled Knowledge Base"
              nameLabel="Knowledge Base name"
              size="compact"
              pencil="always"
              autoEdit={mode === "create" && !draft.name.trim()}
            />
            <TextArea
              aria-label="Reference note"
              placeholder="Add a quick reference note for this Knowledge Base."
              value={draft.note}
              onChange={(event) => patch({ note: event.target.value })}
              className="h-24 text-paragraph-md"
            />
          </section>

          {/* Assignment reads like a Guidance item's: three lists that add up,
              rather than one exclusive choice. Empty means everyone. */}
          <SectionCard title="Available to">
            <AssignTeamAndGroups
              variant="bare"
              members={KNOWLEDGE_USERS}
              groups={KNOWLEDGE_TEAMS}
              selectedMembers={draft.audienceUsers}
              selectedGroups={draft.audienceTeams}
              onMembersChange={(audienceUsers) => patch({ audienceUsers })}
              onGroupsChange={(audienceTeams) => patch({ audienceTeams })}
              voiceAgents={KNOWLEDGE_VOICE_AGENTS}
              selectedVoiceAgents={draft.audienceVoiceAgents}
              onVoiceAgentsChange={(audienceVoiceAgents) =>
                patch({ audienceVoiceAgents })
              }
            />
          </SectionCard>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto pb-2">
          <SegmentedTabs
            aria-label="Knowledge Base content"
            className="shrink-0"
            items={CONTENT_TAB_ITEMS}
            value={tab}
            onValueChange={(next) => setTab(next as KnowledgeContentTab)}
          />
          <SegmentedPanel activeKey={tab} className="min-w-0">
            {(key) => (
              <ContentPanel
                draft={draft}
                tab={key as KnowledgeContentTab}
                patch={patch}
              />
            )}
          </SegmentedPanel>
        </div>
      </div>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        size="sm"
        title={mode === "edit" ? "Save changes" : "Ready to publish"}
        description="Agents start getting answers from this Knowledge Base on matching questions."
        footer={
          <>
            <Button variant="grey-outline" size="sm" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              {mode === "edit" ? "Save" : "Publish"}
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-3">
          <SummaryRow label="Knowledge Base" value={draft.name || "Untitled Knowledge Base"} />
          <SummaryRow label="Content" value={contentSummary(draft)} />
          <SummaryRow label="Available to" value={knowledgeAudienceLabel(draft)} />
          <SummaryRow
            label="Voice agents"
            value={knowledgeVoiceAgentLabel(draft)}
          />
        </dl>
      </Modal>
    </main>
  );
}

/** What is in the knowledge base, in words, for the confirmation modal. */
function contentSummary(source: KnowledgeSourceRecord): string {
  const parts: string[] = [];
  if (source.webPages.length) {
    parts.push(
      `${source.webPages.length} web ${source.webPages.length === 1 ? "page" : "pages"}`
    );
  }
  if (source.text.trim()) {
    parts.push(`${source.text.trim().length.toLocaleString()} characters of text`);
  }
  if (source.qaPairs.length) {
    parts.push(`${source.qaPairs.length} Q&A`);
  }
  if (source.files.length) {
    parts.push(`${source.files.length} ${source.files.length === 1 ? "file" : "files"}`);
  }
  return parts.join(", ") || "Nothing added yet";
}

function ContentPanel({
  draft,
  tab,
  patch,
}: {
  draft: KnowledgeSourceRecord;
  tab: KnowledgeContentTab;
  patch: (partial: Partial<KnowledgeSourceRecord>) => void;
}) {
  const meta = CONTENT_TABS.find((item) => item.key === tab)!;
  const Glyph = meta.icon;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-bg text-foreground">
          <Glyph size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-heading-lg text-foreground">{meta.addTitle}</h2>
            <Tag size="sm" color="grey" outline className="rounded-full">
              {meta.limitLabel}
            </Tag>
          </div>
          <p className="text-pretty text-paragraph-md text-muted-foreground">
            {meta.blurb}
          </p>
        </div>
      </div>

      {tab === "web" ? <WebPagesTab draft={draft} patch={patch} meta={meta} /> : null}
      {tab === "text" ? <TextTab draft={draft} patch={patch} meta={meta} /> : null}
      {tab === "qa" ? <QaTab draft={draft} patch={patch} meta={meta} /> : null}
      {tab === "files" ? <FilesTab draft={draft} patch={patch} meta={meta} /> : null}
    </section>
  );
}

/** The bordered box every tab body lives in. */
function ContentCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-line bg-white">
      <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <p className="text-label-md-semi text-foreground">{title}</p>
        {action}
      </div>
      <div className="flex flex-col p-4">{children}</div>
    </div>
  );
}

/**
 * The nothing-here state: a stack of blank cards behind the tab's own glyph,
 * with the add affordance repeated as the primary button.
 *
 * `illustrationSrc` is the drawn version of that same card stack, straight
 * from Figma. Where one exists for the tab it wins — the CSS build is the
 * stand-in for tabs whose illustration hasn't been drawn yet.
 */
function ContentEmptyState({
  glyph,
  illustrationSrc,
  title,
  body,
  actionLabel,
  onAction,
}: {
  glyph: React.ReactNode;
  illustrationSrc?: string;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-14 text-center">
      {illustrationSrc ? (
        <img
          src={illustrationSrc}
          alt=""
          width={96}
          height={96}
          className="size-24 shrink-0"
        />
      ) : (
        <div className="relative flex size-[132px] items-center justify-center rounded-full bg-secondary-bg">
          <span className="absolute bottom-[34px] left-2 size-12 -rotate-[16deg] rounded-[10px] border border-line bg-white" />
          <span className="absolute bottom-[34px] right-2 size-12 rotate-[16deg] rounded-[10px] border border-line bg-white" />
          <span className="absolute bottom-[30px] flex h-[72px] w-[76px] items-center justify-center rounded-[10px] border border-line bg-white text-muted-foreground shadow-100">
            {glyph}
          </span>
          <span className="absolute bottom-[18px] flex size-8 items-center justify-center rounded-full border-2 border-white bg-brand text-white">
            <IconPlus size={16} />
          </span>
        </div>
      )}
      <div className="flex max-w-[420px] flex-col gap-1">
        <p className="text-heading-lg text-foreground">{title}</p>
        <p className="text-pretty text-paragraph-md text-muted-foreground">{body}</p>
      </div>
      <Button size="md" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

/** One item row inside a tab body — page, Q&A, or file. */
function ContentRow({
  icon,
  title,
  meta,
  onRemove,
  removeLabel,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label-md text-foreground">{title}</span>
        {meta ? (
          <span className="block truncate text-paragraph-sm text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
      >
        <IconClose size={16} />
      </button>
    </li>
  );
}

function WebPagesTab({
  draft,
  patch,
  meta,
}: {
  draft: KnowledgeSourceRecord;
  patch: (partial: Partial<KnowledgeSourceRecord>) => void;
  meta: ContentTabMeta;
}) {
  const [adding, setAdding] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState("");
  const full = draft.webPages.length >= KNOWLEDGE_CONTENT_LIMITS.webPages;

  const commit = () => {
    const href = normalizeKnowledgeUrl(url);
    if (!href) {
      setError("Enter a full webpage link, like https://help.example.com/billing.");
      return;
    }
    if (draft.webPages.some((page) => page.url === href)) {
      setError("That page is already in this Knowledge Base.");
      return;
    }
    patch({
      webPages: [
        ...draft.webPages,
        { id: newKnowledgeContentId("kw"), url: href },
      ],
    });
    setUrl("");
    setError("");
    setAdding(false);
  };

  const empty = draft.webPages.length === 0 && !adding;

  return (
    <ContentCard
      title={meta.addTitle}
      action={
        empty ? null : (
          <Button
            variant="grey-outline"
            size="sm"
            disabled={full || adding}
            onClick={() => setAdding(true)}
          >
            Add Source
          </Button>
        )
      }
    >
      {empty ? (
        <ContentEmptyState
          glyph={<IconWebToDevice size={20} />}
          illustrationSrc={webPagesEmptyIllustration}
          title={meta.emptyTitle}
          body={meta.emptyBody}
          actionLabel="Add Source"
          onAction={() => setAdding(true)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {draft.webPages.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {draft.webPages.map((page) => (
                <ContentRow
                  key={page.id}
                  icon={<IconWebToDevice size={16} />}
                  title={page.url}
                  onRemove={() =>
                    patch({
                      webPages: draft.webPages.filter((item) => item.id !== page.id),
                    })
                  }
                  removeLabel={`Remove ${page.url}`}
                />
              ))}
            </ul>
          ) : null}

          {adding ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <InputField
                  aria-label="Webpage link"
                  placeholder="https://help.yourcompany.com/billing"
                  value={url}
                  autoFocus
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commit();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setAdding(false);
                      setUrl("");
                      setError("");
                    }
                  }}
                  error={Boolean(error)}
                  helpText={error || undefined}
                  clearable={false}
                  wrapperClassName="flex-1"
                />
                <Button size="md" onClick={commit} disabled={!url.trim()}>
                  Add
                </Button>
                <Button
                  variant="grey-outline"
                  size="md"
                  onClick={() => {
                    setAdding(false);
                    setUrl("");
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {full ? (
            <p className="text-paragraph-sm text-muted-foreground">
              This Knowledge Base is at its {KNOWLEDGE_CONTENT_LIMITS.webPages}-page
              limit.
            </p>
          ) : null}
        </div>
      )}
    </ContentCard>
  );
}

function TextTab({
  draft,
  patch,
  meta,
}: {
  draft: KnowledgeSourceRecord;
  patch: (partial: Partial<KnowledgeSourceRecord>) => void;
  meta: ContentTabMeta;
}) {
  const limit = KNOWLEDGE_CONTENT_LIMITS.textChars;
  return (
    <ContentCard title={meta.addTitle}>
      <div className="flex flex-col gap-2">
        <TextArea
          aria-label="Knowledge Base text"
          placeholder="Paste the policy, positioning, or process you want answers to come from."
          value={draft.text}
          onChange={(event) => patch({ text: event.target.value.slice(0, limit) })}
          className="h-[320px]"
        />
        <p className="self-end text-paragraph-sm tabular-nums text-muted-foreground">
          {draft.text.length.toLocaleString()}/{limit.toLocaleString()}
        </p>
      </div>
    </ContentCard>
  );
}

function QaTab({
  draft,
  patch,
  meta,
}: {
  draft: KnowledgeSourceRecord;
  patch: (partial: Partial<KnowledgeSourceRecord>) => void;
  meta: ContentTabMeta;
}) {
  const full = draft.qaPairs.length >= KNOWLEDGE_CONTENT_LIMITS.qaPairs;

  const add = () =>
    patch({
      qaPairs: [
        ...draft.qaPairs,
        { id: newKnowledgeContentId("kq"), question: "", answer: "" },
      ],
    });

  const update = (id: string, partial: Partial<KnowledgeQaPair>) =>
    patch({
      qaPairs: draft.qaPairs.map((pair) =>
        pair.id === id ? { ...pair, ...partial } : pair
      ),
    });

  return (
    <ContentCard
      title={meta.addTitle}
      action={
        draft.qaPairs.length === 0 ? null : (
          <Button variant="grey-outline" size="sm" disabled={full} onClick={add}>
            Add Q&amp;A
          </Button>
        )
      }
    >
      {draft.qaPairs.length === 0 ? (
        <ContentEmptyState
          glyph={<IconMessages size={20} />}
          title={meta.emptyTitle}
          body={meta.emptyBody}
          actionLabel="Add Q&A"
          onAction={add}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {draft.qaPairs.map((pair, index) => (
            <li
              key={pair.id}
              className="flex flex-col gap-3 rounded-lg border border-line p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-label-sm text-muted-foreground">
                  Q&amp;A {index + 1}
                </p>
                <button
                  type="button"
                  aria-label={`Remove Q&A ${index + 1}`}
                  onClick={() =>
                    patch({
                      qaPairs: draft.qaPairs.filter((item) => item.id !== pair.id),
                    })
                  }
                  className="flex size-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
                >
                  <IconClose size={16} />
                </button>
              </div>
              <InputField
                label="Question"
                placeholder="What does the customer ask?"
                value={pair.question}
                onChange={(event) => update(pair.id, { question: event.target.value })}
                clearable={false}
              />
              <TextArea
                label="Answer"
                placeholder="The answer you want the agent to give."
                value={pair.answer}
                onChange={(event) => update(pair.id, { answer: event.target.value })}
                className="h-24"
              />
            </li>
          ))}
        </ul>
      )}
    </ContentCard>
  );
}

function FilesTab({
  draft,
  patch,
  meta,
}: {
  draft: KnowledgeSourceRecord;
  patch: (partial: Partial<KnowledgeSourceRecord>) => void;
  meta: ContentTabMeta;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const limit = KNOWLEDGE_CONTENT_LIMITS.files;
  const full = draft.files.length >= limit;
  const [notice, setNotice] = React.useState("");

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    if (!list.length) return;
    const room = limit - draft.files.length;
    const accepted = list.slice(0, Math.max(0, room)).map((file) => ({
      id: newKnowledgeContentId("kf"),
      name: file.name,
      typeLabel: knowledgeFileTypeLabel(file.name),
      sizeLabel: formatKnowledgeFileSize(file.size),
    }));
    patch({ files: [...draft.files, ...accepted] });
    setNotice(
      list.length > accepted.length
        ? `Only ${limit} files fit in one Knowledge Base — ${
            list.length - accepted.length
          } skipped.`
        : ""
    );
  };

  return (
    <ContentCard
      title={meta.addTitle}
      action={
        draft.files.length === 0 ? null : (
          <Button
            variant="grey-outline"
            size="sm"
            disabled={full}
            onClick={() => fileRef.current?.click()}
          >
            Add Source
          </Button>
        )
      }
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {draft.files.length === 0 ? (
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
          }}
        >
          <ContentEmptyState
            glyph={<IconFileUp size={20} />}
            title={meta.emptyTitle}
            body={meta.emptyBody}
            actionLabel="Add Source"
            onAction={() => fileRef.current?.click()}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {draft.files.map((file) => (
              <ContentRow
                key={file.id}
                icon={<IconFile size={16} />}
                title={file.name}
                meta={[file.typeLabel, file.sizeLabel].filter(Boolean).join(" · ")}
                onRemove={() => {
                  patch({
                    files: draft.files.filter((item) => item.id !== file.id),
                  });
                  setNotice("");
                }}
                removeLabel={`Remove ${file.name}`}
              />
            ))}
          </ul>
          {notice ? (
            <p className="text-paragraph-sm text-muted-foreground">{notice}</p>
          ) : null}
        </div>
      )}
    </ContentCard>
  );
}

function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 4.167v11.666M4.167 10h11.666"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}


/** The "Tt" glyph JustCall uses for pasted text. */
function IconTextSize({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M2.5 5h8.333M6.667 5v10"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M12.5 9.167h5M15 9.167V15"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}


function IconFileUp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M11.667 2.5H5.833A1.667 1.667 0 0 0 4.167 4.167v11.666A1.667 1.667 0 0 0 5.833 17.5h8.334a1.667 1.667 0 0 0 1.666-1.667V6.667L11.667 2.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.667 2.5v4.167h4.166"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 14.167V9.583M8.125 11.25 10 9.375l1.875 1.875"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-line bg-white p-4",
        className
      )}
    >
      {title ? (
        description ? (
          <div className="flex flex-col gap-1">
            <h2 className="text-label-md-semi text-foreground">{title}</h2>
            <p className="text-pretty text-paragraph-sm text-muted-foreground">
              {description}
            </p>
          </div>
        ) : (
          <h2 className="text-label-md-semi text-foreground">{title}</h2>
        )
      ) : null}
      {children}
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label-sm text-muted-foreground">{label}</dt>
      <dd className="text-paragraph-md text-foreground">{value}</dd>
    </div>
  );
}

export { SectionCard as KnowledgeSectionCard };
