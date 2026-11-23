import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, initialsFromName } from "@/components/Avatar";
import { Button } from "@/components/Button";
import {
  IconAddPlus,
  IconArchive,
  IconAt,
  IconBookmark,
  IconBrandWhatsapp,
  IconChecks,
  IconChevronDown,
  IconCircleCheck,
  IconClock,
  IconDotsVertical,
  IconEditCircle,
  IconFilter,
  IconInfoCircle,
  IconLayoutSidebarLeftCollapse,
  IconMessage2Bolt,
  IconMessages,
  IconMoodSmile,
  IconPaperclip,
  IconSearch,
  IconSelectAll,
  IconSend,
  IconSparkles,
  IconTag,
  IconTrash,
  IconUser,
  IconUserX,
  IconUsersGroup,
} from "@/components/Icon";
import { LockedControl, type Lock } from "@/components/LockedControl";
import { TableBulkBar } from "@/components/Table";
import { Tag } from "@/components/Tag";
import { LockedCheckbox } from "./LockedCheckbox";
import flagUk from "./assets/flag-uk.svg";
import {
  INBOX_NUMBER,
  INBOX_SEGMENTS,
  INBOX_THREADS,
  type InboxThread,
} from "./inboxData";

/**
 * Messaging › Inbox — Figma "SMS Inbox – Handoff", node 14329:100284.
 * Three panes at the design's widths: the number and its folders (264), the
 * thread list (360), and the open conversation (the rest).
 */

/** Actions the signed-in license can't take here; omit for full access. */
export interface InboxLocks {
  newMessage?: Lock;
  composer?: Lock;
  assign?: Lock;
  close?: Lock;
  more?: Lock;
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

/** The 16px count bubble used on folders and unread threads. */
function CountBadge({ count, solid }: { count: number; solid?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full text-label-sm",
        solid ? "bg-brand text-white" : "bg-info-secondary text-brand"
      )}
    >
      {count}
    </span>
  );
}

const FOLDERS = [
  { key: "inbox", label: "Inbox", icon: IconMessages, count: 4 },
  { key: "assigned", label: "Assigned to Me", icon: IconUser },
  { key: "mentions", label: "Mentions", icon: IconAt },
  { key: "unassigned", label: "Unassigned", icon: IconUserX },
  { key: "drafts", label: "Drafts", icon: IconEditCircle },
  { key: "scheduled", label: "Scheduled", icon: IconClock },
  { key: "archived", label: "Archived", icon: IconArchive },
];

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", icon: IconBrandWhatsapp, tint: "text-success", count: 4 },
  { key: "group-sms", label: "Group SMS", icon: IconUsersGroup, tint: "text-warning" },
];

function FolderRail() {
  const [active, setActive] = useState("inbox");
  const row = (item: {
    key: string;
    label: string;
    icon: typeof IconUser;
    count?: number;
    tint?: string;
  }) => {
    const selected = item.key === active;
    const Icon = item.icon;
    return (
      <button
        key={item.key}
        type="button"
        aria-current={selected ? "page" : undefined}
        onClick={() => setActive(item.key)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-[2px] p-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/24",
          selected ? "bg-brand-subtle text-brand" : "text-muted-foreground hover:bg-secondary-bg"
        )}
      >
        <span className="flex items-center gap-1.5">
          <Icon size={16} className={cn("shrink-0", !selected && item.tint)} />
          <span className="text-label-md">{item.label}</span>
        </span>
        {item.count != null ? <CountBadge count={item.count} /> : null}
      </button>
    );
  };

  return (
    <aside className="flex w-[264px] shrink-0 flex-col justify-between border-r border-line bg-white">
      <div className="flex min-h-0 flex-col overflow-y-auto">
        <div className="p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-[4px] border border-line py-2 pr-2 pl-3 text-left outline-none hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <img src={flagUk} alt="" width={32} height={32} className="size-8 shrink-0" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-label-md text-foreground">{INBOX_NUMBER.name}</span>
                <span className="truncate text-paragraph-sm text-muted-foreground">
                  {INBOX_NUMBER.number}
                </span>
              </span>
            </span>
            <IconChevronDown size={20} className="shrink-0 text-foreground" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-2">
            <p className="text-label-sm text-disabled-fg uppercase">SMS &amp; MMS</p>
            <div className="flex flex-col gap-1">{FOLDERS.map(row)}</div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-label-sm text-disabled-fg uppercase">Other Channels</p>
            <div className="flex flex-col gap-1">{CHANNELS.map(row)}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line bg-secondary-bg p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <IconMessage2Bolt size={16} className="text-brand" />
              <span className="text-label-sm text-foreground">Segments</span>
              <IconInfoCircle size={16} className="text-muted-foreground" />
            </span>
            <span className="text-label-sm text-muted-foreground">{INBOX_SEGMENTS.left}</span>
          </div>
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-brand"
              style={{ width: `${INBOX_SEGMENTS.usedRatio * 100}%` }}
            />
          </div>
        </div>
        <Button variant="grey-outline" size="xs" className="w-full">
          Buy More
        </Button>
      </div>
    </aside>
  );
}

/** Figma "Filter chips": 32px, 4px radius, Paragraph/Medium. */
function FilterChip({
  children,
  active,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 items-center gap-1 rounded-[4px] border border-line text-paragraph-md text-foreground outline-none transition-colors hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/24",
        active ? "bg-secondary-bg" : "bg-white",
        className
      )}
    >
      {children}
    </button>
  );
}

function ThreadList({
  selectedId,
  onSelect,
  locks,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  locks?: InboxLocks;
}) {
  // Bulk actions on threads (mark read, archive, delete) are conversation
  // management — the ⋮ menu's verbs — so the checkboxes follow its lock:
  // disabled with the license reason for View-only.
  const [search, setSearch] = useState("");
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const toggle = (id: string, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const q = search.trim().toLowerCase();
  const threads = q
    ? INBOX_THREADS.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.messages.some((m) => m.text.toLowerCase().includes(q))
      )
    : INBOX_THREADS;

  return (
    <section className="flex w-[360px] shrink-0 flex-col border-r border-line bg-white">
      <div className="flex h-11 items-end px-4">
        <div className="flex h-7 w-full items-center justify-between">
          <span className="flex items-center gap-2">
            <IconLayoutSidebarLeftCollapse size={20} className="text-muted-foreground" />
            <h2 className="text-heading-lg text-foreground">Inbox</h2>
          </span>
          <Gate lock={locks?.newMessage}>
            <Button variant="primary-outline" size="xs" iconOnly aria-label="New message">
              <IconAddPlus size={16} />
            </Button>
          </Gate>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-3 pb-4">
        <label className="flex items-center gap-2 rounded-[4px] border border-line bg-white px-3 py-2 focus-within:border-brand">
          <IconSearch size={20} className="shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by keyword, contact name or number"
            className="min-w-0 flex-1 bg-transparent text-paragraph-sm text-foreground outline-none placeholder:text-disabled-fg"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active className="pr-2 pl-3">
            Open
            <IconChevronDown size={16} />
          </FilterChip>
          <FilterChip className="px-3">Unread</FilterChip>
          <FilterChip className="pr-3 pl-2">
            <IconFilter size={16} />
            Filter
          </FilterChip>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto" aria-label="Conversations">
        {threads.map((t) => {
          const selected = t.id === selectedId;
          const last = t.messages[t.messages.length - 1];
          return (
            <li key={t.id}>
              <div
                role="button"
                tabIndex={0}
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(t.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(t.id);
                  }
                }}
                className={cn(
                  "flex flex-col gap-1 px-4 py-2 outline-none transition-colors duration-micro focus-visible:ring-2 focus-visible:ring-brand/24 focus-visible:ring-inset",
                  selected ? "bg-secondary-bg" : "hover:bg-secondary-bg"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span onClick={(event) => event.stopPropagation()} className="flex">
                      <LockedCheckbox
                        lock={locks?.more}
                        size="sm"
                        aria-label={`Select ${t.name}`}
                        checked={checked.has(t.id)}
                        onCheckedChange={(on) => toggle(t.id, on)}
                      />
                    </span>
                    <span className="truncate text-label-md text-foreground">{t.name}</span>
                  </span>
                  <span className="shrink-0 text-paragraph-sm text-muted-foreground">{t.time}</span>
                </div>
                <div className={"flex items-center gap-1 pl-6"}>
                  <span className="min-w-0 flex-1 truncate text-paragraph-sm text-muted-foreground">
                    {last.text}
                  </span>
                  {t.unread ? (
                    <CountBadge count={t.unread} solid />
                  ) : last.direction === "out" ? (
                    <IconChecks size={16} aria-label="Delivered" className="shrink-0 text-muted-foreground" />
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Absolute against <main>, not this 360px column: the bar is wider
          than the list, so it centres over the whole inbox like a table's. */}
      <TableBulkBar
        count={checked.size}
        label={checked.size === 1 ? "Item Selected" : "Items Selected"}
        actions={
          <>
            {threads.every((t) => checked.has(t.id)) ? null : (
              <Button
                variant="grey-outline"
                size="sm"
                className="bg-white"
                leftIcon={<IconSelectAll size={16} />}
                onClick={() => setChecked(new Set(threads.map((t) => t.id)))}
              >
                Select All
              </Button>
            )}
            <Button
              variant="grey-outline"
              size="sm"
              className="bg-white"
              leftIcon={<IconChecks size={16} />}
              onClick={() => setChecked(new Set())}
            >
              Mark as read
            </Button>
            <Button
              variant="grey-outline"
              size="sm"
              className="bg-white"
              leftIcon={<IconArchive size={16} />}
              onClick={() => setChecked(new Set())}
            >
              Archive
            </Button>
            <Button
              variant="error"
              size="sm"
              leftIcon={<IconTrash size={16} />}
              onClick={() => setChecked(new Set())}
            >
              Delete
            </Button>
          </>
        }
      />
    </section>
  );
}

const TAG_TONE = {
  success: "border-[0.5px] border-success bg-success-secondary text-success-text",
  warning: "border-[0.5px] border-warning bg-warning-secondary text-warning-text",
} as const;

function Conversation({ thread, locks }: { thread: InboxThread; locks?: InboxLocks }) {
  const composerLocked = Boolean(locks?.composer);
  // Open on the latest message, as a chat does — before paint, so the
  // thread never flashes its oldest message first.
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.id]);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-white pb-4">
      <header className="flex items-center justify-between border-b border-line py-1 pr-3 pl-2">
        <div className="flex min-w-0 items-center gap-2 px-2 py-1.5">
          <Avatar size="lg" color="indigo" initials={initialsFromName(thread.name)} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-heading-lg text-foreground">{thread.name}</span>
            <span className="truncate text-paragraph-sm text-muted-foreground">{thread.number}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="flex items-center gap-3">
            <Gate lock={locks?.assign}>
              <Button variant="grey-outline" size="xs" rightIcon={<IconChevronDown size={16} />}>
                Assign
              </Button>
            </Gate>
            <Gate lock={locks?.close}>
              <Button variant="grey-outline" size="xs" leftIcon={<IconCircleCheck size={16} />}>
                Close
              </Button>
            </Gate>
          </div>
          <Gate lock={locks?.more}>
            <button
              type="button"
              aria-label="More actions"
              className="flex size-7 items-center justify-center rounded-[4px] text-foreground outline-none hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent"
            >
              <IconDotsVertical size={20} />
            </button>
          </Gate>
        </div>
      </header>

      <div className="flex min-h-9 items-center gap-3 border-b border-line bg-secondary-bg/50 px-4 py-2">
        {thread.tags.map((tag) => (
          <Tag key={tag.label} size="sm" className={TAG_TONE[tag.tone]}>
            {tag.label}
          </Tag>
        ))}
        <IconTag size={20} className="text-foreground" />
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-4">
        {thread.messages.map((message) => (
          <div key={message.id} className="flex flex-col gap-4">
            {message.day ? (
              <div className="flex items-center gap-4 py-1" role="separator">
                <span className="h-px flex-1 bg-line" />
                <span className="rounded-[4px] bg-secondary-bg px-2 py-1 text-paragraph-sm text-muted-foreground">
                  {message.day}
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
            ) : null}
            {message.direction === "in" ? (
              <div className="flex items-end gap-1">
                <Avatar size="xs" color="indigo" initials={initialsFromName(thread.name)} />
                <div className="flex w-[400px] max-w-full flex-col gap-1 rounded-t-[4px] rounded-br-[4px] bg-secondary-bg px-3 pt-3 pb-2">
                  <p className="pb-1 text-paragraph-md text-foreground">{message.text}</p>
                  <span className="self-end text-paragraph-sm text-muted-foreground">
                    {message.time}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <div className="flex w-[400px] max-w-full flex-col gap-1 rounded-t-[4px] rounded-bl-[4px] bg-brand-subtle px-3 pt-3 pb-2">
                  <p className="pb-1 text-paragraph-md text-foreground">{message.text}</p>
                  <span className="flex items-center gap-1 self-end text-paragraph-sm text-muted-foreground">
                    {message.time}
                    <IconChecks size={16} />
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 pt-4">
        {/* One lock over the whole composer: replying, sending and scheduling
            are one capability, so the reason is shown once. */}
        <LockedControl
          locked={composerLocked}
          reason={locks?.composer?.reason}
          hint={locks?.composer?.hint}
          placement="top"
          triggerClassName="flex w-full"
        >
          <div
            tabIndex={composerLocked ? 0 : undefined}
            className="group flex w-full flex-col gap-2 rounded-md border border-line bg-white px-3 pt-2 pb-3 outline-none focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:bg-secondary-bg"
          >
            <span className="flex h-7 items-center gap-1 text-label-md text-foreground group-data-[locked=true]:text-disabled-fg">
              Reply
              <IconChevronDown size={16} />
            </span>
            <div className="flex flex-col gap-4">
              <textarea
                disabled={composerLocked}
                placeholder="Write a message or type in # for saved templates"
                className="h-8 resize-none bg-transparent text-paragraph-md text-foreground outline-none placeholder:text-disabled-fg"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-foreground group-data-[locked=true]:text-disabled-fg">
                  {[
                    { label: "Saved templates", Icon: IconBookmark },
                    { label: "Attach a file", Icon: IconPaperclip },
                    { label: "Emoji", Icon: IconMoodSmile },
                  ].map(({ label, Icon }) => (
                    <button
                      key={label}
                      type="button"
                      aria-label={label}
                      disabled={composerLocked}
                      className="flex rounded-[4px] p-1 outline-none hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/24 disabled:hover:bg-transparent"
                    >
                      <Icon size={20} />
                    </button>
                  ))}
                  <span className="flex items-center gap-1 px-1">
                    <IconSparkles size={20} className="text-ai-gradient-from group-data-[locked=true]:text-disabled-fg" />
                    <span className="bg-[linear-gradient(101.5deg,color-mix(in_srgb,var(--color-brand)_80%,transparent)_46%,color-mix(in_srgb,var(--color-ai-gradient-to)_80%,transparent)_145%)] bg-clip-text text-label-md text-transparent group-data-[locked=true]:bg-none group-data-[locked=true]:text-disabled-fg">
                      AI Assist
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="p-1 text-paragraph-md text-muted-foreground">
                    0 <span className="text-line">/</span> 0
                  </span>
                  {/* Send and schedule share one split button; it waits at
                      half strength until there is something to send. */}
                  <span className="flex h-7 items-center gap-1 rounded-[4px] border border-brand bg-brand p-1 text-white opacity-50 group-data-[locked=true]:border-line group-data-[locked=true]:bg-disabled-bg group-data-[locked=true]:text-disabled-fg group-data-[locked=true]:opacity-100">
                    <span className="flex px-1">
                      <IconSend size={16} />
                    </span>
                    <span className="h-[18px] w-[0.5px] bg-white/60" />
                    <IconChevronDown size={16} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </LockedControl>
      </div>
    </section>
  );
}

export function InboxPage({ locks }: { locks?: InboxLocks } = {}) {
  // Figma's single state: the first thread open.
  const [selectedId, setSelectedId] = useState(INBOX_THREADS[0].id);
  const thread = INBOX_THREADS.find((t) => t.id === selectedId) ?? INBOX_THREADS[0];
  return (
    // Relative so the thread list's bulk bar centres over the whole inbox.
    <main className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-white">
      <FolderRail />
      <ThreadList selectedId={selectedId} onSelect={setSelectedId} locks={locks} />
      <Conversation thread={thread} locks={locks} />
    </main>
  );
}
