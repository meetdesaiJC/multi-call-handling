import * as React from "react";
import { Sidesheet } from "@/components/Sidesheet";
import { Avatar } from "@/components/Avatar";
import { Tabs, type TabItem } from "@/components/Tabs";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  IconClose,
  IconCalendar,
  IconClock,
  IconPhone,
  IconCallOnHold,
  IconWrapUpTimeSetting,
  IconScheduleCalls,
  IconQueue,
  IconPostCallSurvey,
  IconCallDisposition,
  IconInfoCircle,
  IconDotsVertical,
} from "@/components/Icon";
import {
  IconUser,
  IconStar,
  IconArrowUp,
  IconArrowDown,
  IconMessageSquare,
} from "./icons/CallDetailsIcons";
import aiReviewAssistIllustration from "./illustrations/ai-review-assist-illustration.svg";
import type { CallLogRow } from "./CallLogsTable";

/**
 * Call details sidesheet — Figma "Sidesheet/Info" (node 40002568:19554).
 * Slides in from the right on a Call Logs row click; only the "Info" tab
 * has designed content today, the rest are placeholders until their Figma
 * frames land.
 *
 * Note: `IconCallOnHold` / `IconScheduleCalls` / `IconQueue` /
 * `IconPostCallSurvey` / `IconCallDisposition` are requested at `size={24}`
 * and scaled down via `className` — their 16px source crops are
 * mis-extracted upstream (all collapse to the same phone glyph). Tracked
 * separately; 24px is correct and visually close enough at 16px. Two of
 * them (`IconCallOnHold`, `IconQueue`) also hardcode a red/orange stroke at
 * every size — `InfoRow` forces `stroke-current` so they stay neutral grey
 * like the rest of the row icons.
 */

const TAB_ITEMS: TabItem[] = [
  { key: "info", label: "Info" },
  { key: "ai-insights", label: "AI Insights" },
  { key: "integration-logs", label: "Integration logs" },
  { key: "journey", label: "Journey" },
];

const DISPOSITION_OPTIONS = [
  { value: "resolved", label: "Resolved" },
  { value: "follow-up", label: "Follow-up needed" },
  { value: "unresolved", label: "Unresolved" },
  { value: "spam", label: "Spam" },
];

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function fmtSecs(s: number): string {
  if (s <= 0) return "0s";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

/** Deterministic per-row detail figures — the table only carries summary fields. */
function buildDetails(row: CallLogRow) {
  const seed = hashSeed(row.id);
  const connected = row.status === "Completed";
  const ring = 3 + (seed % 20);
  const totalRing = ring + (seed % 6);
  const hold = connected ? seed % 40 : 0;
  const wrapUp = connected ? 15 + (seed % 45) : 0;
  const queueWait = 2 + (seed % 12);
  const defaultDisposition =
    row.status === "Completed"
      ? "resolved"
      : row.status === "Busy"
        ? "follow-up"
        : "unresolved";

  return {
    dateTime: row.datetime,
    duration: row.duration,
    agentRingTime: fmtSecs(ring),
    totalRingTime: fmtSecs(totalRing),
    agentName: row.agent,
    justCallNumber: row.justcall.secondary ?? row.justcall.primary,
    holdTime: fmtSecs(hold),
    wrapUpTime: fmtSecs(wrapUp),
    handleTime: connected ? row.duration : "0s",
    queueWaitTime: fmtSecs(queueWait),
    postCallSurvey: connected ? "4.5 / 5" : "-",
    callSid: `CA${seed.toString(16).padStart(8, "0")}${row.id.padStart(4, "0")}fd2cb60`,
    defaultDisposition,
  };
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").concat(parts[1]?.[0] ?? "").toUpperCase();
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-4 items-center justify-center rounded-[2px] border border-line bg-secondary-bg">
      {children}
    </span>
  );
}

function HeaderActionButton({
  icon,
  label,
  first,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <TooltipTrigger
      placement="bottom"
      content={<Tooltip theme="dark" arrow="top-center" title={label} />}
    >
      <button
        type="button"
        aria-label={label}
        className={`-ml-px inline-flex size-9 items-center justify-center border border-line bg-white text-foreground first:ml-0 hover:bg-secondary-bg ${
          first ? "rounded-l-[4px]" : ""
        } ${last ? "rounded-r-[4px]" : ""}`}
      >
        {icon}
      </button>
    </TooltipTrigger>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full items-center">
      <div className="flex w-[165px] shrink-0 items-center gap-1.5 py-1 pr-[27px]">
        <span className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_path]:stroke-current">
          {icon}
        </span>
        <span className="text-label-md whitespace-nowrap text-muted-foreground">{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center px-3 py-1">{children}</div>
    </div>
  );
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className="flex items-center gap-2" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={value >= n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="text-line hover:text-warning"
        >
          <IconStar filled={n <= display} className={n <= display ? "size-6 text-warning" : "size-6"} />
        </button>
      ))}
    </div>
  );
}

function AiInsightsEmptyState({
  variant = "admin",
  accessRequested,
  onGetAiReviewAssist,
  onRequestAccess,
}: {
  variant?: "admin" | "team-member";
  accessRequested?: boolean;
  onGetAiReviewAssist?: () => void;
  onRequestAccess?: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <img src={aiReviewAssistIllustration} alt="" className="block w-full shrink-0" />
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="flex flex-col items-center gap-1">
          <p className="text-heading-lg text-foreground">Never miss key conversation details</p>
          <p className="text-paragraph-md text-muted-foreground">
            Generate AI-powered summaries, action items, smart chapters, topic analysis, transcription
            search, and more for every call.
          </p>
        </div>
        {variant === "team-member" ? (
          accessRequested ? (
            <p className="text-paragraph-md text-disabled-fg">Request sent to admin</p>
          ) : (
            <Button variant="primary" size="sm" onClick={onRequestAccess}>
              Request access
            </Button>
          )
        ) : (
          <Button variant="primary" size="sm" onClick={onGetAiReviewAssist}>
            Get AI Review Assist
          </Button>
        )}
      </div>
    </div>
  );
}

export interface CallDetailsSidesheetProps {
  open: boolean;
  onClose: () => void;
  row: CallLogRow | null;
  variant?: "admin" | "team-member";
  onGetAiReviewAssist?: () => void;
}

export function CallDetailsSidesheet({
  open,
  onClose,
  row,
  variant = "admin",
  onGetAiReviewAssist,
}: CallDetailsSidesheetProps) {
  const [activeTab, setActiveTab] = React.useState("info");
  const [disposition, setDisposition] = React.useState("");
  const [rating, setRating] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [accessRequested, setAccessRequested] = React.useState(false);

  // Reset per-row UI state when a different call is opened.
  React.useEffect(() => {
    if (!row) return;
    const details = buildDetails(row);
    setActiveTab("info");
    setDisposition(details.defaultDisposition);
    setRating(0);
    setNotes("");
    setAccessRequested(false);
  }, [row?.id]);

  if (!row) return null;

  const details = buildDetails(row);
  const displayName = /^\d/.test(row.contact.primary) ? "Unknown" : row.contact.primary;
  const phoneNumber = row.contact.secondary ?? row.contact.primary;

  return (
    <Sidesheet open={open} onClose={onClose} width={480}>
      <div className="shrink-0">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 text-paragraph-md text-disabled-fg">
            <span>Use</span>
            <span className="flex items-center gap-1">
              <KeyCap>
                <IconArrowUp className="size-3" />
              </KeyCap>
              <KeyCap>
                <IconArrowDown className="size-3" />
              </KeyCap>
            </span>
            <span>to navigate across Call logs</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-6 items-center justify-center rounded-[4px] text-foreground outline-none hover:text-muted-foreground focus-visible:ring-4 focus-visible:ring-brand/16"
          >
            <IconClose size={24} className="size-6" />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 pb-4">
          <div className="flex min-w-0 items-center gap-5">
            <Avatar size="lg" initials={initialsFor(displayName)} color="indigo" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-heading-lg text-foreground">{displayName}</p>
              <p className="truncate text-label-sm text-muted-foreground">{phoneNumber}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-start">
            <HeaderActionButton icon={<IconPhone size={20} className="size-5" />} label="Call" first />
            <HeaderActionButton icon={<IconMessageSquare className="size-5" />} label="Message" />
            <HeaderActionButton
              icon={<IconDotsVertical size={20} className="size-5" />}
              label="More options"
              last
            />
          </div>
        </div>

        <Tabs items={TAB_ITEMS} value={activeTab} onValueChange={setActiveTab} className="w-full px-6" />
        <div className="border-b border-line" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "info" ? (
          <>
            <div className="flex flex-col gap-4 border-b border-line p-6">
              <p className="text-label-md-semi text-foreground">About this call</p>
              <div className="flex flex-col gap-4">
                <InfoRow icon={<IconCalendar size={16} className="size-4" />} label="Date & Time">
                  <span className="text-paragraph-md text-foreground">{details.dateTime}</span>
                </InfoRow>
                <InfoRow icon={<IconClock size={16} className="size-4" />} label="Duration">
                  <span className="text-paragraph-md text-foreground">{details.duration}</span>
                </InfoRow>
                <InfoRow icon={<IconPhone size={16} className="size-4" />} label="Agent Ring Time">
                  <span className="text-paragraph-md text-foreground">{details.agentRingTime}</span>
                </InfoRow>
                <InfoRow icon={<IconPhone size={16} className="size-4" />} label="Total Ring Time">
                  <span className="text-paragraph-md text-foreground">{details.totalRingTime}</span>
                </InfoRow>
                <InfoRow icon={<IconUser className="size-4" />} label="Agent Name">
                  <span className="text-paragraph-md text-foreground">{details.agentName}</span>
                </InfoRow>
                <InfoRow icon={<IconPhone size={16} className="size-4" />} label="JustCall Number">
                  <span className="text-paragraph-md text-foreground">{details.justCallNumber}</span>
                </InfoRow>
                <InfoRow
                  icon={<IconCallOnHold size={24} className="size-4" />}
                  label="Hold Time"
                >
                  <span className="text-paragraph-md text-foreground">{details.holdTime}</span>
                </InfoRow>
                <InfoRow icon={<IconWrapUpTimeSetting size={16} className="size-4" />} label="Wrap Up Time">
                  <span className="text-paragraph-md text-foreground">{details.wrapUpTime}</span>
                </InfoRow>
                <InfoRow icon={<IconScheduleCalls size={24} className="size-4" />} label="Handle Time">
                  <span className="text-paragraph-md text-foreground">{details.handleTime}</span>
                </InfoRow>
                <InfoRow icon={<IconQueue size={24} className="size-4" />} label="Queue Wait Time">
                  <span className="text-paragraph-md text-foreground">{details.queueWaitTime}</span>
                </InfoRow>
                <InfoRow icon={<IconPostCallSurvey size={24} className="size-4" />} label="Post Call Survey">
                  <span className="text-paragraph-md text-foreground">{details.postCallSurvey}</span>
                </InfoRow>
                <InfoRow icon={<IconCallDisposition size={24} className="size-4" />} label="Select Disposition">
                  <Dropdown
                    className="w-[200px]"
                    searchable={false}
                    options={DISPOSITION_OPTIONS}
                    value={disposition}
                    onValueChange={(v) => setDisposition(v as string)}
                    placeholder="Select…"
                  />
                </InfoRow>
                <InfoRow icon={<IconStar className="size-4" />} label="Select Rating">
                  <StarRating value={rating} onChange={setRating} />
                </InfoRow>
                <InfoRow icon={<IconInfoCircle size={16} className="size-4" />} label="Call SID">
                  <span className="text-paragraph-md break-all text-foreground">{details.callSid}</span>
                </InfoRow>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-6">
              <p className="text-label-md-semi text-foreground">Notes</p>
              <div className="flex flex-col rounded-[6px] border border-line">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type your notes here"
                  rows={7}
                  className="w-full resize-none bg-warning-secondary px-4 py-3 text-paragraph-md text-foreground outline-none placeholder:text-disabled-fg"
                />
                <div className="flex justify-end border-t border-line bg-white px-4 py-3">
                  <Button variant="primary" size="xs" disabled={!notes.trim()}>
                    Save Note
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === "ai-insights" ? (
          <AiInsightsEmptyState
            variant={variant}
            accessRequested={accessRequested}
            onGetAiReviewAssist={onGetAiReviewAssist}
            onRequestAccess={() => setAccessRequested(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
            <p className="text-label-md-semi text-foreground">
              {TAB_ITEMS.find((t) => t.key === activeTab)?.label}
            </p>
            <p className="text-paragraph-md text-muted-foreground">Coming soon.</p>
          </div>
        )}
      </div>
    </Sidesheet>
  );
}
