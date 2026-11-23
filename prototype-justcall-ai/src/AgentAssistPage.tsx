import * as React from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Modal } from "@/components/Modal";
import { Dropdown, useDropdownPresence, type DropdownListItem } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  IconSearch,
  IconFilter,
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconPencil,
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
import scriptsEmptyIllustration from "./assets/scripts-empty.svg";
import responseCardsEmptyIllustration from "./assets/response-cards-empty.svg";
import coachingEmptyIllustration from "./assets/coaching-empty.svg";
import {
  ScriptTemplatesModal,
  type ScriptStartChoice,
} from "./ScriptTemplatesModal";
import { ScriptBuilderPage, type BuilderLaunch } from "./ScriptBuilderPage";
import { ScriptPreviewModal } from "./ScriptTestPanel";
import {
  clonePlaybook,
  countSteps,
  playbookAssignees,
  playbookAssignmentLabel,
  SCRIPT_TEAM_MEMBERS,
  SCRIPT_USER_GROUPS,
  SEED_SCRIPTS,
  type AssignmentPerson,
  type ScriptPlaybook,
} from "./scriptPlaybook";
import { AssignmentAvatarStack } from "./AssignmentAvatarStack";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import { GuidanceResourceModal } from "./GuidanceCard";
import { LiveGuidanceCard } from "./LiveGuidance";
import { CreateGuidancePage } from "./CreateGuidancePage";
import {
  GuidanceTemplatesModal,
  type GuidanceStartChoice,
} from "./GuidanceTemplatesModal";
import {
  TEAM_MEMBERS,
  USER_GROUPS,
  createEmptyGuidance,
  createGuidanceFromTemplate,
  customerLineForGuidance,
  formatAssignment,
  guidanceAssignees,
  priorityForGuidance,
  stanceForGuidance,
  type GuidanceItem,
  type GuidanceResource,
  type GuidanceTemplateId,
} from "./guidanceData";
import {
  AdminPageHeader,
  IconTrash,
  StatusToggle,
} from "./AgentAssistAdmin";
import {
  CoachingPreview,
  CoachingTemplatesModal,
  CreateCoachingPage,
  type CoachingStartChoice,
} from "./CreateCoachingPage";
import {
  coachingDetectLabel,
  createCoachingRuleFromTemplate,
  type CoachingRule,
} from "./coachingData";
import { CoachingCueIcon, coachingTone } from "./coachingVisuals";
import { PageEmptyState } from "./PageEmptyState";
import type { KnowledgeSourceRecord } from "./knowledgeData";
import { type AgentAssistScope } from "./agentAssistScope";

/**
 * Scripts, Response Cards, and Behavioral Coaching — three lists that answer
 * different questions during the same call: a Script says what to follow, a
 * Response Card says what to say, and Behavioral Coaching says how to adjust.
 * What the agent can *do* in a connected app is its own destination, In-call
 * Actions.
 *
 * All three used to be tabs under a "Conversation Guidance" parent; they are now
 * side-nav destinations (see AgentAssistNav), so this page renders whichever one
 * the nav selected and owns no tab bar of its own. The three lists still share
 * one component because they share everything below the header — search,
 * assignment filters, selection, bulk publish, and pagination all behave
 * identically, and splitting them would mean maintaining that three times.
 */

type PublishStatus = "live" | "draft";

/**
 * The three kinds keep their short internal keys; everything an admin reads
 * comes from here so the vocabulary stays in one place.
 */
const KIND_LABEL = {
  script: "Script",
  guidance: "Response Card",
  coaching: "Behavioral Coaching",
} as const;

const KIND_LABEL_LOWER = {
  script: "script",
  guidance: "response card",
  coaching: "behavioral coaching",
} as const;

const KIND_LABEL_PLURAL = {
  script: "scripts",
  guidance: "response cards",
  coaching: "behavioral coaching rules",
} as const;

interface RowSelection {
  selectedIds: string[];
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onToggleRow: (id: string) => void;
}

type GuidanceKind = keyof typeof KIND_LABEL;

interface ScriptRow {
  id: string;
  name: string;
  team: string;
  steps: number;
  status: PublishStatus;
  updated: string;
  playbook: ScriptPlaybook;
}

/**
 * Which of the three lists is showing. Named `PlaybookView` rather than `Tab`
 * since the nav — not a tab bar — now decides it.
 */
export type PlaybookView = "scripts" | "guidance" | "coaching";

/**
 * Each view is its own nav destination, so the page header names the list on
 * screen instead of describing a section that spans all three.
 */
const VIEW_COPY: Record<PlaybookView, { title: string; description: string }> = {
  scripts: {
    title: "Call Scripts",
    description:
      "Create structured talk tracks agents can follow throughout a conversation.",
  },
  guidance: {
    title: "Response Cards",
    description:
      "Surface the right response when it matters.",
  },
  coaching: {
    title: "Behavioral Coaching",
    description:
      "Nudge agents on pacing, talk balance, and tone while the call is still live.",
  },
};

function toScriptRow(
  playbook: ScriptPlaybook,
  status: PublishStatus = "live",
  updated = "Just now"
): ScriptRow {
  return {
    id: playbook.id,
    name: playbook.name,
    team: playbookAssignmentLabel(playbook) || "Unassigned",
    steps: countSteps(playbook),
    status,
    updated,
    playbook,
  };
}

interface ActionMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}

/**
 * Kebab menu for the secondary row actions. The list body scrolls and clips,
 * so the popover renders in a portal and tracks the trigger — same approach
 * the tooltips use.
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

function ActionButtonGroup({
  entity,
  onEdit,
  onPreview,
  onDuplicate,
  onAssign,
  onDelete,
}: {
  entity: GuidanceKind;
  onEdit?: () => void;
  onPreview?: () => void;
  onDuplicate?: () => void;
  onAssign?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="inline-flex items-center">
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Edit" />}
      >
        <button
          type="button"
          aria-label={`Edit ${KIND_LABEL_LOWER[entity]}`}
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
          aria-label={`Preview ${KIND_LABEL_LOWER[entity]}`}
          onClick={onPreview}
          className="-mr-px flex size-9 items-center justify-center border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconEye size={20} />
        </button>
      </TooltipTrigger>
      <ActionMenu
        label={`More ${KIND_LABEL_LOWER[entity]} actions`}
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

export interface AgentAssistPlaybooksPageProps {
  /** Which list to show — owned by the side nav. */
  view: PlaybookView;
  /**
   * Whether Scripts starts with the demo library. Off for the empty-state
   * walkthrough, where every list begins with nothing in it.
   */
  seeded?: boolean;
  guidanceItems: GuidanceItem[];
  onGuidanceItemsChange: (next: GuidanceItem[]) => void;
  coachingRules: CoachingRule[];
  onCoachingRulesChange: (next: CoachingRule[]) => void;
  knowledgeSources: KnowledgeSourceRecord[];
  onOpenKnowledge: () => void;
  /** V1 offers AI drafting from a Knowledge Base on response cards. */
  scope?: AgentAssistScope;
}

export function AgentAssistPlaybooksPage({
  view: tab,
  seeded = true,
  guidanceItems,
  onGuidanceItemsChange,
  coachingRules,
  onCoachingRulesChange,
  knowledgeSources,
  onOpenKnowledge,
  scope = "v2",
}: AgentAssistPlaybooksPageProps) {
  const [search, setSearch] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [memberFilter, setMemberFilter] = React.useState<string[]>([]);
  const [groupFilter, setGroupFilter] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [deleting, setDeleting] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [guidanceTemplatesOpen, setGuidanceTemplatesOpen] = React.useState(false);
  const [coachingTemplatesOpen, setCoachingTemplatesOpen] = React.useState(false);
  const [builder, setBuilder] = React.useState<BuilderLaunch | null>(null);
  const [scripts, setScripts] = React.useState<ScriptRow[]>(() =>
    seeded
      ? SEED_SCRIPTS.map((item) =>
          toScriptRow(item.playbook, item.status, item.updated)
        )
      : []
  );
  const [guidanceLaunch, setGuidanceLaunch] = React.useState<{
    mode: "create" | "edit";
    item: GuidanceItem;
    templateId?: GuidanceTemplateId | null;
    /** Opens the AI drafting step straight away. */
    generate?: boolean;
  } | null>(null);
  const allowGenerate = scope === "v1";
  const [coachingLaunch, setCoachingLaunch] = React.useState<{
    mode: "create" | "edit";
    rule: CoachingRule;
  } | null>(null);
  const [previewScript, setPreviewScript] = React.useState<ScriptPlaybook | null>(null);
  const [previewGuidance, setPreviewGuidance] = React.useState<GuidanceItem | null>(null);
  const [previewCoaching, setPreviewCoaching] = React.useState<CoachingRule | null>(null);
  const [viewingResource, setViewingResource] = React.useState<GuidanceResource | null>(null);
  const [assignTarget, setAssignTarget] = React.useState<
    | { type: "script"; row: ScriptRow }
    | { type: "guidance"; row: GuidanceItem }
    | { type: "coaching"; row: CoachingRule }
    | null
  >(null);
  const isScripts = tab === "scripts";
  const isGuidance = tab === "guidance";
  const isCoaching = tab === "coaching";

  // Search, filters, selection, and page are all about the list you were just
  // looking at, so leaving for another one clears them — same reset the tab bar
  // used to do on switch. Drafts and newly created rows survive: the three lists
  // share this component, so a nav switch is a re-render, not a remount.
  React.useEffect(() => {
    setSearch("");
    setMemberFilter([]);
    setGroupFilter([]);
    setSelected([]);
    setPage(1);
  }, [tab]);

  const query = search.trim().toLowerCase();
  const activeFilterCount = memberFilter.length + groupFilter.length;
  const hasFilters = activeFilterCount > 0;
  // A row survives the filter row when it is assigned to at least one of the
  // picked members and at least one of the picked groups (each filter is
  // ignored while empty).
  const matchesAssignment = (members: string[], groups: string[]) =>
    (memberFilter.length === 0 || memberFilter.some((value) => members.includes(value))) &&
    (groupFilter.length === 0 || groupFilter.some((value) => groups.includes(value)));

  const filteredScripts = scripts.filter((row) => {
    if (
      !matchesAssignment(row.playbook.assignedMembers, row.playbook.assignedGroups)
    ) {
      return false;
    }
    return (
      !query ||
      row.name.toLowerCase().includes(query) ||
      row.team.toLowerCase().includes(query)
    );
  });
  const filteredGuidance = guidanceItems.filter((row) => {
    if (!matchesAssignment(row.teamMembers, row.userGroups)) return false;
    if (!query) return true;
    return (
      row.name.toLowerCase().includes(query) ||
      row.trigger.toLowerCase().includes(query) ||
      formatAssignment(row).toLowerCase().includes(query)
    );
  });
  const filteredCoaching = coachingRules.filter((row) => {
    if (!matchesAssignment(row.teamMembers, row.userGroups)) return false;
    if (!query) return true;
    return (
      row.name.toLowerCase().includes(query) ||
      row.message.toLowerCase().includes(query) ||
      coachingDetectLabel(row).toLowerCase().includes(query)
    );
  });
  const filtered = isScripts
    ? filteredScripts
    : isGuidance
      ? filteredGuidance
      : filteredCoaching;
  const isEmpty = filtered.length === 0 && !query && !hasFilters;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visibleScripts = filteredScripts.slice(start, start + pageSize);
  const visibleGuidance = filteredGuidance.slice(start, start + pageSize);
  const visibleCoaching = filteredCoaching.slice(start, start + pageSize);
  const visibleIds = (
    isScripts ? visibleScripts : isGuidance ? visibleGuidance : visibleCoaching
  ).map((row) => row.id);
  const selectedVisible = selected.filter((id) => visibleIds.includes(id));
  const allSelected =
    visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const someSelected = selectedVisible.length > 0 && !allSelected;
  const selection: RowSelection = {
    selectedIds: selected,
    allSelected,
    someSelected,
    onToggleAll: () => setSelected(allSelected ? [] : visibleIds),
    onToggleRow: (id) =>
      setSelected((current) =>
        current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id]
      ),
  };
  const activeKind: GuidanceKind = isScripts
    ? "script"
    : isGuidance
      ? "guidance"
      : "coaching";
  const selectedVisibleRows = isScripts
    ? scripts.filter((row) => selectedVisible.includes(row.id))
    : isGuidance
      ? guidanceItems.filter((row) => selectedVisible.includes(row.id))
      : coachingRules.filter((row) => selectedVisible.includes(row.id));

  const removeSelected = () => {
    const ids = selectedVisible;
    if (isScripts) {
      setScripts((current) => current.filter((item) => !ids.includes(item.id)));
    } else if (isGuidance) {
      onGuidanceItemsChange(guidanceItems.filter((item) => !ids.includes(item.id)));
    } else {
      onCoachingRulesChange(coachingRules.filter((item) => !ids.includes(item.id)));
    }
    setSelected((current) => current.filter((id) => !ids.includes(id)));
    setDeleting(false);
  };

  const openScriptTemplates = () => setTemplatesOpen(true);

  const handleTemplateSelect = (choice: ScriptStartChoice) => {
    setTemplatesOpen(false);
    if (choice.type === "scratch") {
      setBuilder({ type: "blank" });
      return;
    }
    setBuilder({ type: "template", templateId: choice.templateId });
  };

  const publishPlaybook = (playbook: ScriptPlaybook) => {
    const row = toScriptRow(playbook, "live");
    setScripts((current) => {
      const index = current.findIndex((item) => item.id === playbook.id);
      if (index === -1) return [row, ...current];
      const next = [...current];
      next[index] = row;
      return next;
    });
    setBuilder(null);
  };

  const openGuidanceTemplates = () => setGuidanceTemplatesOpen(true);

  const handleGuidanceTemplateSelect = (choice: GuidanceStartChoice) => {
    setGuidanceTemplatesOpen(false);
    if (choice.type === "generate") {
      // AI proposes the draft; the admin still reviews it in the editor.
      setGuidanceLaunch({
        mode: "create",
        item: createEmptyGuidance(),
        generate: true,
      });
      return;
    }
    if (choice.type === "scratch") {
      setGuidanceLaunch({ mode: "create", item: createEmptyGuidance() });
      return;
    }
    setGuidanceLaunch({
      mode: "create",
      item: createGuidanceFromTemplate(choice.templateId),
      templateId: choice.templateId,
    });
  };

  const handleCoachingTemplateSelect = (choice: CoachingStartChoice) => {
    setCoachingTemplatesOpen(false);
    setCoachingLaunch({
      mode: "create",
      rule: createCoachingRuleFromTemplate(choice.templateId),
    });
  };

  const saveGuidance = (item: GuidanceItem) => {
    const exists = guidanceItems.some((row) => row.id === item.id);
    onGuidanceItemsChange(
      exists
        ? guidanceItems.map((row) => (row.id === item.id ? item : row))
        : [item, ...guidanceItems]
    );
    setGuidanceLaunch(null);
  };

  const saveCoaching = (rule: CoachingRule) => {
    const exists = coachingRules.some((row) => row.id === rule.id);
    onCoachingRulesChange(
      exists
        ? coachingRules.map((row) => (row.id === rule.id ? rule : row))
        : [rule, ...coachingRules]
    );
    setCoachingLaunch(null);
  };

  const patchCoaching = (id: string, patch: Partial<CoachingRule>) => {
    onCoachingRulesChange(
      coachingRules.map((row) =>
        row.id === id ? { ...row, ...patch, updated: "Just now" } : row
      )
    );
  };

  const assignScript = (row: ScriptRow, members: string[], groups: string[]) => {
    const playbook = { ...row.playbook, assignedMembers: members, assignedGroups: groups };
    setScripts((current) =>
      current.map((item) =>
        item.id === row.id ? toScriptRow(playbook, item.status, "Just now") : item
      )
    );
  };

  const assignGuidance = (row: GuidanceItem, members: string[], groups: string[]) => {
    onGuidanceItemsChange(
      guidanceItems.map((item) => {
        if (item.id !== row.id) return item;
        const next = { ...item, teamMembers: members, userGroups: groups, updated: "Just now" };
        // Live guidance needs at least one assignee — drop to draft if it loses them.
        return guidanceAssignees(next).length === 0 ? { ...next, status: "draft" as const } : next;
      })
    );
  };

  const assignCoaching = (row: CoachingRule, members: string[], groups: string[]) => {
    onCoachingRulesChange(
      coachingRules.map((item) => {
        if (item.id !== row.id) return item;
        const next = {
          ...item,
          teamMembers: members,
          userGroups: groups,
          updated: "Just now",
        };
        return next.teamMembers.length + next.userGroups.length === 0
          ? { ...next, status: "draft" as const }
          : next;
      })
    );
  };

  const duplicateGuidance = (item: GuidanceItem) => {
    onGuidanceItemsChange([
      {
        ...item,
        id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${item.name} (copy)`,
        status: "draft",
        updated: "Just now",
      },
      ...guidanceItems,
    ]);
  };

  const duplicateCoaching = (rule: CoachingRule) => {
    onCoachingRulesChange([
      {
        ...rule,
        id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${rule.name} (copy)`,
        status: "draft",
        updated: "Just now",
      },
      ...coachingRules,
    ]);
  };

  if (guidanceLaunch) {
    return (
      <CreateGuidancePage
        initial={guidanceLaunch.item}
        mode={guidanceLaunch.mode}
        templateId={guidanceLaunch.templateId}
        knowledgeSources={knowledgeSources}
        allowGenerate={allowGenerate}
        startWithGenerate={guidanceLaunch.generate}
        onUseKnowledgeInstead={() => {
          setGuidanceLaunch(null);
          onOpenKnowledge();
        }}
        onOpenKnowledge={() => {
          setGuidanceLaunch(null);
          onOpenKnowledge();
        }}
        onClose={() => setGuidanceLaunch(null)}
        onSave={saveGuidance}
      />
    );
  }

  if (coachingLaunch) {
    return (
      <CreateCoachingPage
        initial={coachingLaunch.rule}
        mode={coachingLaunch.mode}
        onClose={() => setCoachingLaunch(null)}
        onSave={saveCoaching}
      />
    );
  }

  if (builder) {
    return (
      <ScriptBuilderPage
        launch={builder}
        onClose={() => setBuilder(null)}
        onPublish={publishPlaybook}
      />
    );
  }

  // One primary creation CTA per view (§4): the active view decides what it
  // creates, and the empty state owns the call to action when it is showing.
  // Header and empty state read the same label from here, so the wording an
  // admin sees before they have anything is the wording they keep afterwards.
  const createCta = isScripts
    ? { label: "Create script", onClick: openScriptTemplates }
    : isGuidance
      ? { label: "Create response card", onClick: openGuidanceTemplates }
      : {
          label: "Create coaching rule",
          onClick: () => setCoachingTemplatesOpen(true),
        };

  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <AdminPageHeader
        title={VIEW_COPY[tab].title}
        description={VIEW_COPY[tab].description}
        actions={
          isEmpty ? null : (
            <Button size="sm" onClick={createCta.onClick}>
              {createCta.label}
            </Button>
          )
        }
      />

      {isEmpty ? (
        isScripts ? (
          <PageEmptyState
            illustrationSrc={scriptsEmptyIllustration}
            title="Guide agents through every call"
            description="Create scripts with the talking points and steps agents should follow during conversations."
            actionLabel={createCta.label}
            onAction={createCta.onClick}
          />
        ) : isCoaching ? (
          <PageEmptyState
            illustrationSrc={coachingEmptyIllustration}
            title="Help every agent perform at their best"
            description="Give agents timely coaching during calls so they can adjust their approach while the conversation is still happening."
            actionLabel={createCta.label}
            onAction={createCta.onClick}
          />
        ) : (
          <PageEmptyState
            illustrationSrc={responseCardsEmptyIllustration}
            title="Give agents the right guidance at the right time"
            description="Surface helpful guidance when specific questions, topics, or situations come up during a call."
            actionLabel={createCta.label}
            onAction={createCta.onClick}
          />
        )
      ) : (
        <>
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex h-9 items-center gap-3">
              <InputField
                placeholder={
                  isScripts
                    ? "Search scripts"
                    : isGuidance
                      ? "Search response cards"
                      : "Search behavioral coaching"
                }
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
                aria-controls="agent-assist-filters"
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
            id="agent-assist-filters"
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
                  options={isScripts ? SCRIPT_TEAM_MEMBERS : TEAM_MEMBERS}
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
                  options={isScripts ? SCRIPT_USER_GROUPS : USER_GROUPS}
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
                      setMemberFilter([]);
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
                {isScripts ? (
                  <ScriptsTable
                    rows={visibleScripts}
                    selection={selection}
                    onEdit={(row) => setBuilder({ type: "edit", playbook: row.playbook })}
                    onPreview={(row) => setPreviewScript(row.playbook)}
                    onAssign={(row) => setAssignTarget({ type: "script", row })}
                    onDuplicate={(row) => {
                      const copy = clonePlaybook(row.playbook);
                      copy.name = `Copy of ${row.playbook.name}`;
                      setScripts((current) => [toScriptRow(copy, "draft"), ...current]);
                    }}
                    onDelete={(row) => {
                      setScripts((current) => current.filter((item) => item.id !== row.id));
                      setSelected((current) => current.filter((id) => id !== row.id));
                    }}
                    onStatusChange={(row, live) =>
                      setScripts((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, status: live ? "live" : "draft", updated: "Just now" }
                            : item
                        )
                      )
                    }
                  />
                ) : isGuidance ? (
                  <GuidanceTable
                    rows={visibleGuidance}
                    selection={selection}
                    onEdit={(row) =>
                      setGuidanceLaunch({ mode: "edit", item: row })
                    }
                    onPreview={setPreviewGuidance}
                    onAssign={(row) => setAssignTarget({ type: "guidance", row })}
                    onDuplicate={duplicateGuidance}
                    onDelete={(row) => {
                      onGuidanceItemsChange(
                        guidanceItems.filter((item) => item.id !== row.id)
                      );
                      setSelected((current) => current.filter((id) => id !== row.id));
                    }}
                    onStatusChange={(row, live) => {
                      if (live && guidanceAssignees(row).length === 0) return;
                      onGuidanceItemsChange(
                        guidanceItems.map((item) =>
                          item.id === row.id
                            ? { ...item, status: live ? "live" : "draft", updated: "Just now" }
                            : item
                        )
                      );
                    }}
                  />
                ) : (
                  <CoachingTable
                    rows={visibleCoaching}
                    selection={selection}
                    onEdit={(row) => setCoachingLaunch({ mode: "edit", rule: row })}
                    onPreview={setPreviewCoaching}
                    onAssign={(row) => setAssignTarget({ type: "coaching", row })}
                    onDuplicate={duplicateCoaching}
                    onDelete={(row) => {
                      onCoachingRulesChange(
                        coachingRules.filter((item) => item.id !== row.id)
                      );
                      setSelected((current) => current.filter((id) => id !== row.id));
                    }}
                    onStatusChange={(row, live) => {
                      if (live && row.teamMembers.length + row.userGroups.length === 0) {
                        return;
                      }
                      patchCoaching(row.id, { status: live ? "live" : "draft" });
                    }}
                  />
                )}
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
                  onClick={() => setDeleting(true)}
                >
                  Delete
                </Button>
              }
            />
          </div>
        </>
      )}

      <ScriptTemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onSelect={handleTemplateSelect}
      />
      <GuidanceTemplatesModal
        open={guidanceTemplatesOpen}
        onClose={() => setGuidanceTemplatesOpen(false)}
        onSelect={handleGuidanceTemplateSelect}
        allowGenerate={allowGenerate}
      />
      <CoachingTemplatesModal
        open={coachingTemplatesOpen}
        onClose={() => setCoachingTemplatesOpen(false)}
        onSelect={handleCoachingTemplateSelect}
      />

      {previewScript ? (
        <ScriptPreviewModal
          open
          playbook={previewScript}
          onClose={() => setPreviewScript(null)}
        />
      ) : null}

      <Modal
        open={Boolean(previewGuidance)}
        onClose={() => setPreviewGuidance(null)}
        size="md"
        title="Preview"
        description="What the agent would see during a call"
      >
        {previewGuidance ? (
          <LiveGuidanceCard
            item={{
              id: previewGuidance.id,
              atMs: 0,
              quote: customerLineForGuidance(previewGuidance),
              item: previewGuidance,
              priority: priorityForGuidance(previewGuidance),
              stance: stanceForGuidance(previewGuidance),
            }}
            reduced
            onViewResource={setViewingResource}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(previewCoaching)}
        onClose={() => setPreviewCoaching(null)}
        size="md"
        title="Preview"
        description="What the agent would see during a call"
      >
        {previewCoaching ? (
          <CoachingPreview rule={previewCoaching} caption={false} />
        ) : null}
      </Modal>

      <GuidanceResourceModal
        resource={viewingResource}
        onClose={() => setViewingResource(null)}
      />

      {assignTarget ? (
        <AssignModal
          key={assignTarget.row.id}
          name={assignTarget.row.name}
          entity={assignTarget.type}
          members={assignTarget.type === "script" ? SCRIPT_TEAM_MEMBERS : TEAM_MEMBERS}
          groups={assignTarget.type === "script" ? SCRIPT_USER_GROUPS : USER_GROUPS}
          initialMembers={
            assignTarget.type === "script"
              ? assignTarget.row.playbook.assignedMembers
              : assignTarget.row.teamMembers
          }
          initialGroups={
            assignTarget.type === "script"
              ? assignTarget.row.playbook.assignedGroups
              : assignTarget.row.userGroups
          }
          onClose={() => setAssignTarget(null)}
          onSave={(nextMembers, nextGroups) => {
            if (assignTarget.type === "script") {
              assignScript(assignTarget.row, nextMembers, nextGroups);
            } else if (assignTarget.type === "guidance") {
              assignGuidance(assignTarget.row, nextMembers, nextGroups);
            } else {
              assignCoaching(assignTarget.row, nextMembers, nextGroups);
            }
            setAssignTarget(null);
          }}
        />
      ) : null}

      {deleting && selectedVisibleRows.length > 0 ? (
        <Modal
          open
          onClose={() => setDeleting(false)}
          size="sm"
          title={
            selectedVisibleRows.length === 1
              ? `Delete ${KIND_LABEL_LOWER[activeKind]}`
              : `Delete ${KIND_LABEL_PLURAL[activeKind]}`
          }
          description={
            selectedVisibleRows.length === 1
              ? `“${selectedVisibleRows[0]!.name}” will no longer be available to agents.`
              : `${selectedVisibleRows.length} ${KIND_LABEL_PLURAL[activeKind]} will no longer be available to agents.`
          }
          footer={
            <>
              <Button
                variant="grey-outline"
                size="sm"
                onClick={() => setDeleting(false)}
              >
                Cancel
              </Button>
              <Button variant="error" size="sm" onClick={removeSelected}>
                Delete
              </Button>
            </>
          }
        />
      ) : null}
    </main>
  );
}

/** Assign a playbook to users and groups without opening the editor. */
function AssignModal({
  name,
  entity,
  members,
  groups,
  initialMembers,
  initialGroups,
  onClose,
  onSave,
}: {
  name: string;
  entity: "script" | "guidance" | "coaching";
  members: DropdownListItem[];
  groups: DropdownListItem[];
  initialMembers: string[];
  initialGroups: string[];
  onClose: () => void;
  onSave: (members: string[], groups: string[]) => void;
}) {
  const [selectedMembers, setSelectedMembers] = React.useState(initialMembers);
  const [selectedGroups, setSelectedGroups] = React.useState(initialGroups);

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      className="overflow-visible"
      bodyClassName="overflow-visible"
      title="Assign"
      description={`Choose who sees this ${KIND_LABEL_LOWER[entity]} on their calls.`}
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
          <dt className="text-label-sm text-muted-foreground">
            {KIND_LABEL[entity]}
          </dt>
          <dd className="text-paragraph-md text-foreground">{name}</dd>
        </div>
        <AssignTeamAndGroups
          variant="summary"
          members={members}
          groups={groups}
          selectedMembers={selectedMembers}
          selectedGroups={selectedGroups}
          onMembersChange={setSelectedMembers}
          onGroupsChange={setSelectedGroups}
        />
      </dl>
    </Modal>
  );
}

function SelectionHead({
  allSelected,
  someSelected,
  onToggleAll,
  label,
}: {
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  label: string;
}) {
  return (
    <TableHead className="sticky top-0 z-10 w-11">
      <Checkbox
        size="sm"
        checked={allSelected}
        indeterminate={someSelected}
        onCheckedChange={onToggleAll}
        aria-label={label}
      />
    </TableHead>
  );
}

function SelectionCell({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <TableCell className="w-11">
      <Checkbox
        size="sm"
        checked={checked}
        onCheckedChange={onToggle}
        aria-label={label}
      />
    </TableCell>
  );
}

function ScriptsTable({
  rows,
  selection,
  onEdit,
  onPreview,
  onDuplicate,
  onAssign,
  onDelete,
  onStatusChange,
}: {
  rows: ScriptRow[];
  selection: RowSelection;
  onEdit: (row: ScriptRow) => void;
  onPreview: (row: ScriptRow) => void;
  onDuplicate: (row: ScriptRow) => void;
  onAssign: (row: ScriptRow) => void;
  onDelete: (row: ScriptRow) => void;
  onStatusChange: (row: ScriptRow, live: boolean) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <SelectionHead
            allSelected={selection.allSelected}
            someSelected={selection.someSelected}
            onToggleAll={selection.onToggleAll}
            label="Select all scripts"
          />
          <TableHead className="sticky top-0 z-10 w-[280px]">Name</TableHead>
          <TableHead className="sticky top-0 z-10 w-[160px]">Assigned to</TableHead>
          <TableHead className="sticky top-0 z-10 w-[100px]">Steps</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Status</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Updated</TableHead>
          <TableHead className="sticky top-0 z-10 w-[148px] text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isSelected = selection.selectedIds.includes(row.id);
          return (
          <TableRow
            key={row.id}
            state={isSelected ? "selected" : "default"}
            className="border-b-0"
          >
              <SelectionCell
                checked={isSelected}
                onToggle={() => selection.onToggleRow(row.id)}
                label={`Select ${row.name}`}
              />
              <TableCell>
                <TableCellText primary={row.name} />
              </TableCell>
              <TableCell>
                <AssignmentAvatarStack people={playbookAssignees(row.playbook)} />
              </TableCell>
              <TableCell className="text-paragraph-md">{row.steps}</TableCell>
              <TableCell>
                <StatusToggle
                  name={row.name}
                  checked={row.status === "live"}
                  onCheckedChange={(live) => onStatusChange(row, live)}
                />
              </TableCell>
              <TableCell className="text-paragraph-md">{row.updated}</TableCell>
              <TableCell className="text-center">
                <ActionButtonGroup
                  entity="script"
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

function GuidanceTable({
  rows,
  selection,
  onEdit,
  onPreview,
  onDuplicate,
  onAssign,
  onDelete,
  onStatusChange,
}: {
  rows: GuidanceItem[];
  selection: RowSelection;
  onEdit: (row: GuidanceItem) => void;
  onPreview: (row: GuidanceItem) => void;
  onDuplicate: (row: GuidanceItem) => void;
  onAssign: (row: GuidanceItem) => void;
  onDelete: (row: GuidanceItem) => void;
  onStatusChange: (row: GuidanceItem, live: boolean) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <SelectionHead
            allSelected={selection.allSelected}
            someSelected={selection.someSelected}
            onToggleAll={selection.onToggleAll}
            label="Select all response cards"
          />
          <TableHead className="sticky top-0 z-10 w-[220px]">Response card</TableHead>
          <TableHead className="sticky top-0 z-10">Trigger</TableHead>
          <TableHead className="sticky top-0 z-10 w-[160px]">Assigned to</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Status</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Last updated</TableHead>
          <TableHead className="sticky top-0 z-10 w-[148px] text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isSelected = selection.selectedIds.includes(row.id);
          return (
            <TableRow
              key={row.id}
              state={isSelected ? "selected" : "default"}
              className="border-b-0"
            >
              <SelectionCell
                checked={isSelected}
                onToggle={() => selection.onToggleRow(row.id)}
                label={`Select ${row.name}`}
              />
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
                <TooltipTrigger
                  className="w-full min-w-0 max-w-full"
                  placement="top-left"
                  content={
                    <Tooltip theme="dark" arrow="bottom-left" title={row.trigger} />
                  }
                >
                  <span className="block min-w-0 w-full truncate text-paragraph-md text-muted-foreground">
                    {row.trigger}
                  </span>
                </TooltipTrigger>
              </TableCell>
              <TableCell>
                <AssignmentAvatarStack people={guidanceAssignees(row)} />
              </TableCell>
              <TableCell>
                <StatusToggle
                  name={row.name}
                  checked={row.status === "live"}
                  disabled={row.status !== "live" && guidanceAssignees(row).length === 0}
                  disabledReason="Assign users or groups before publishing"
                  onCheckedChange={(live) => onStatusChange(row, live)}
                />
              </TableCell>
              <TableCell className="text-paragraph-md">{row.updated}</TableCell>
              <TableCell className="text-center">
                <ActionButtonGroup
                  entity="guidance"
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

/**
 * Behavioral Coaching reads differently from a response card: the coaching
 * concept and when it fires are the important columns. Preview still exists — it
 * shows the mid-call banner rather than a card.
 */
function CoachingTable({
  rows,
  selection,
  onEdit,
  onPreview,
  onDuplicate,
  onAssign,
  onDelete,
  onStatusChange,
}: {
  rows: CoachingRule[];
  selection: RowSelection;
  onEdit: (row: CoachingRule) => void;
  onPreview: (row: CoachingRule) => void;
  onDuplicate: (row: CoachingRule) => void;
  onAssign: (row: CoachingRule) => void;
  onDelete: (row: CoachingRule) => void;
  onStatusChange: (row: CoachingRule, live: boolean) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <SelectionHead
            allSelected={selection.allSelected}
            someSelected={selection.someSelected}
            onToggleAll={selection.onToggleAll}
            label="Select all behavioral coaching"
          />
          <TableHead className="sticky top-0 z-10 w-[240px]">Coaching</TableHead>
          <TableHead className="sticky top-0 z-10">Detect</TableHead>
          <TableHead className="sticky top-0 z-10 w-[140px]">Assigned to</TableHead>
          <TableHead className="sticky top-0 z-10 w-[100px]">Status</TableHead>
          <TableHead className="sticky top-0 z-10 w-[110px]">Last updated</TableHead>
          <TableHead className="sticky top-0 z-10 w-[148px] text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isSelected = selection.selectedIds.includes(row.id);
          return (
            <TableRow
              key={row.id}
              state={isSelected ? "selected" : "default"}
              className="border-b-0"
            >
              <SelectionCell
                checked={isSelected}
                onToggle={() => selection.onToggleRow(row.id)}
                label={`Select ${row.name}`}
              />
              <TableCell>
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="flex max-w-full min-w-0 items-center gap-2 bg-transparent p-0 text-left font-medium hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-[5px]",
                      coachingTone(row.templateId).well
                    )}
                  >
                    <CoachingCueIcon
                      templateId={row.templateId}
                      className="size-3.5"
                    />
                  </span>
                  <TableCellText primary={row.name} />
                </button>
              </TableCell>
              <TableCell>
                <TooltipTrigger
                  className="w-full min-w-0 max-w-full"
                  placement="top-left"
                  content={<Tooltip theme="dark" arrow="bottom-left" title={row.message} />}
                >
                  <span className="block w-full min-w-0 truncate text-paragraph-md text-muted-foreground">
                    {coachingDetectLabel(row)} · {row.window.toLowerCase()}
                  </span>
                </TooltipTrigger>
              </TableCell>
              <TableCell>
                <AssignmentAvatarStack people={coachingAssignees(row)} />
              </TableCell>
              <TableCell>
                <StatusToggle
                  name={row.name}
                  checked={row.status === "live"}
                  disabled={
                    row.status !== "live" &&
                    row.teamMembers.length + row.userGroups.length === 0
                  }
                  disabledReason="Assign users or groups before publishing"
                  onCheckedChange={(live) => onStatusChange(row, live)}
                />
              </TableCell>
              <TableCell className="text-paragraph-md">{row.updated}</TableCell>
              <TableCell className="text-center">
                <ActionButtonGroup
                  entity="coaching"
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

/** Behavioral Coaching reuses the response card assignment vocabulary. */
function coachingAssignees(rule: CoachingRule): AssignmentPerson[] {
  return guidanceAssignees({
    ...createEmptyGuidance(),
    teamMembers: rule.teamMembers,
    userGroups: rule.userGroups,
  });
}

