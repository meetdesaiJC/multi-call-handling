import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sidenav } from "@/components/Sidenav";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Button, buttonVariants } from "@/components/Button";
import {
  IconInfoCircleFilled,
  IconCalendar,
  IconFilter,
  IconInfoCircle,
  IconDotsVertical,
  IconClose,
} from "@/components/Icon";
import { NotificationPanel } from "./NotificationPanel";
import { ProfileMenu } from "@/components/ProfileMenu";
import { IconCalendarTime, IconMailShare } from "@/components/Icon";
import { IconTranscriptionAi } from "./icons/AiInsightsIcons";
import { ManageLicensesModal, type AccountHolder, type TeamMember } from "./ManageLicensesModal";
import { TeamMembersPage } from "./TeamMembers";

/**
 * Dashboard — landing page for the admin "Approve pending license requests"
 * flow, styled to match the live JustCall "Calls" dashboard (header, tabs,
 * toolbar, the "Calls Overview" KPI row + volume chart, and "Inbound
 * Calls"). Everything below the toolbar bar is presentational; the
 * notifications bell is this flow's actual entry point.
 */

function ArrowDownIcon() {
  return (
    <svg width="7" height="8" viewBox="0 0 7 8" fill="none" aria-hidden="true">
      <path
        d="M3.5 0.5V7.5M0.5 4.5L3.5 7.5L6.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="8" height="9" viewBox="0 0 8 9" fill="none" aria-hidden="true">
      <path
        d="M4 1V8M1 4L4 1L7 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeltaBadge({ direction, value }: { direction: "up" | "down"; value: string }) {
  const positive = direction === "up";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full py-0.5 pl-1 pr-1.5 text-label-sm",
        positive ? "bg-success-secondary text-success-text" : "bg-error-secondary text-error"
      )}
    >
      {positive ? <ArrowUpIcon /> : <ArrowDownIcon />}
      {value}
    </span>
  );
}

interface KpiCardData {
  label: string;
  value: string;
  suffix?: string;
  showInfo?: boolean;
  showMenu?: boolean;
  delta?: { direction: "up" | "down"; value: string };
  footer?: string;
}

function KpiCard({ label, value, suffix, showInfo, showMenu, delta, footer }: KpiCardData) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-1 flex-col gap-4 px-6 py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-label-md text-foreground">{label}</span>
            {showInfo && <IconInfoCircle size={16} className="size-4 shrink-0 text-muted-foreground" />}
          </div>
          {showMenu && <IconDotsVertical size={16} className="size-4 shrink-0 text-foreground" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-heading-xxxl text-foreground">{value}</span>
          {suffix && <span className="text-paragraph-sm text-muted-foreground">{suffix}</span>}
          {delta && <DeltaBadge {...delta} />}
        </div>
      </div>
      {footer && (
        <div className="border-t border-line px-5 py-3">
          <button type="button" className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto")}>
            {footer}
          </button>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, lastUpdated }: { title: string; lastUpdated?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-secondary-bg px-6 py-2">
      <p className="text-heading-lg text-foreground">{title}</p>
      {lastUpdated && (
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Refresh" className="flex size-4 items-center justify-center text-brand">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M11.12 6.53a5.13 5.13 0 0 1-1.11 2.63A5.19 5.19 0 0 1 2.3 2.09a5.19 5.19 0 0 1 8.49 1.75M11.17.5v3.34H7.83"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="text-paragraph-sm text-muted-foreground">Last updated 2 mins ago</span>
          <IconDotsVertical size={16} className="size-4 shrink-0 text-foreground" />
        </div>
      )}
    </div>
  );
}

const OUTBOUND_COLOR = "var(--color-chart-outbound)";
const INBOUND_COLOR = "var(--color-chart-inbound)";

// Exact vertices exported from Figma's "Calls volume over time" chart
// (node 40002621:32275) — kept as literal coordinates rather than a charting
// library since this is presentational, first-fold-only content.
const OUTBOUND_POINTS: [number, number][] = [
  [2.36, 153.81],
  [140.01, 108.44],
  [273.73, 4.3],
  [408, 38.06],
  [543.4, 38.06],
  [678.8, 27.7],
  [813.64, 46.26],
];
const INBOUND_POINTS: [number, number][] = [
  [6.85, 78.82],
  [138.88, 47.73],
  [274.84, 59.49],
  [409.12, 52.49],
  [543.95, 31.2],
  [678.79, 51.93],
  [813.63, 3.48],
];

function pointsToPath(points: [number, number][]) {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
}

// Total plot coordinate space the exported vertices above sit in (matches
// the x-axis tick baseline from Figma) — used to convert each vertex into a
// left/top percentage so dots can be plain fixed-size circles instead of
// living inside the non-uniformly-scaled chart SVG (which would otherwise
// stretch them into ellipses).
const CHART_WIDTH = 818;
const CHART_HEIGHT = 172.31;
const OUTBOUND_OFFSET_Y = 8.36;
const INBOUND_OFFSET_Y = 84.75;

const CHART_Y_LABELS = ["20k", "10k", "1000", "500", "0"];
const CHART_X_LABELS = ["Aug 15", "Aug 16", "Aug 17", "Aug 18", "Aug 19", "Aug 20", "Aug 21"];

function ChartDots({ points, offsetY, color }: { points: [number, number][]; offsetY: number; color: string }) {
  return (
    <>
      {points.map(([x, y]) => (
        <span
          key={`${x}-${y}`}
          className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${(x / CHART_WIDTH) * 100}%`,
            top: `${((y + offsetY) / CHART_HEIGHT) * 100}%`,
            backgroundColor: color,
          }}
        />
      ))}
    </>
  );
}

function CallsVolumeChart() {
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex h-[200px] flex-col">
        <div className="relative flex-1">
          <div className="flex h-full flex-col justify-between">
            {CHART_Y_LABELS.map((label) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-9 shrink-0 text-right text-paragraph-sm text-muted-foreground">{label}</span>
                <div className="h-px flex-1 bg-line" />
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-12 right-0">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
              className="size-full"
              fill="none"
            >
              <g transform={`translate(0 ${OUTBOUND_OFFSET_Y})`}>
                <path d={pointsToPath(OUTBOUND_POINTS)} stroke={OUTBOUND_COLOR} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
              </g>
              <g transform={`translate(0 ${INBOUND_OFFSET_Y})`}>
                <path d={pointsToPath(INBOUND_POINTS)} stroke={INBOUND_COLOR} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
              </g>
            </svg>
            <ChartDots points={OUTBOUND_POINTS} offsetY={OUTBOUND_OFFSET_Y} color={OUTBOUND_COLOR} />
            <ChartDots points={INBOUND_POINTS} offsetY={INBOUND_OFFSET_Y} color={INBOUND_COLOR} />
          </div>
        </div>
        <div className="flex items-center justify-between pl-12">
          {CHART_X_LABELS.map((label) => (
            <span key={label} className="text-paragraph-sm text-muted-foreground">
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-4">
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: INBOUND_COLOR }} />
          <span className="text-paragraph-md text-muted-foreground">Inbound Calls</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: OUTBOUND_COLOR }} />
          <span className="text-paragraph-md text-muted-foreground">Outbound Calls</span>
        </span>
      </div>
    </div>
  );
}

const CALLS_OVERVIEW_CARDS: KpiCardData[] = [
  { label: "Outbound Calls", value: "1987", delta: { direction: "down", value: "14%" }, footer: "View Breakdown" },
  { label: "Inbound Calls", value: "1500", delta: { direction: "down", value: "14%" }, footer: "View Breakdown" },
  { label: "Missed Calls", value: "525", delta: { direction: "down", value: "14%" }, footer: "View Breakdown" },
  { label: "Team Efficiency Rate", value: "75%", showInfo: true, delta: { direction: "down", value: "14%" }, footer: "Explore Agent Efficiency" },
];

const INBOUND_CALLS_CARDS: KpiCardData[] = [
  { label: "Inbound Calls", value: "1500", delta: { direction: "down", value: "14%" } },
  { label: "Answer Rate", value: "50%", suffix: "(750 calls)", showInfo: true, delta: { direction: "down", value: "14%" } },
  { label: "Missed Calls", value: "524", delta: { direction: "up", value: "42%" } },
  { label: "SLA Rate", value: "25%", suffix: "(508 calls)", showInfo: true, showMenu: true, delta: { direction: "down", value: "14%" } },
];

// PendingRequestsBanner — Figma "User-level pricing for Add-ons / Notifications"
// pop-up notification (node 40002647:9557): a dismissible card that floats
// over the dashboard on arrival, surfacing the same AI Review Assist
// request the notifications bell links to. Reuses the `.toast-panel`
// enter/exit motion (globals.css) and the bg-brand-subtle + white icon
// circle treatment already used for the unread request row in
// `NotificationPanel`.
const BANNER_EXIT_MS = 140;

function PendingRequestsBanner({
  count,
  onReview,
  onDismiss,
}: {
  count: number;
  onReview?: () => void;
  onDismiss: () => void;
}) {
  const [phase, setPhase] = useState<"entering" | "open" | "exiting">("entering");

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase("open"));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setPhase("exiting");
    setTimeout(onDismiss, BANNER_EXIT_MS);
  };

  return (
    <div data-state={phase} className="toast-panel absolute right-6 top-[68px] z-20 w-[420px]">
      <div className="flex gap-3 rounded-[4px] border border-line bg-brand-subtle p-4 shadow-300">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white">
          <IconTranscriptionAi className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-1">
            <p className="text-label-md text-foreground">
              {count} team member{count === 1 ? "" : "s"} requested AI Review Assist
            </p>
            <p className="text-paragraph-sm text-muted-foreground">
              Review their requests and assign licenses.
            </p>
          </div>
          <button
            type="button"
            onClick={onReview}
            className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto self-start")}
          >
            Review requests
          </button>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 self-start text-muted-foreground hover:text-foreground"
        >
          <IconClose size={20} className="size-5" />
        </button>
      </div>
    </div>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

export interface DashboardProps {
  /** Name of the team member surfaced in the notifications bell panel. */
  pendingRequesterName?: string;
  /** Total paid AI Review Assist licenses on the account, for the Review requests modal. */
  aiReviewAssistLicenses?: number;
  /** Team members backing the Review requests modal opened from the notifications bell. */
  teamMembers?: TeamMember[];
  onBuyAdditionalLicenses?: () => void;
  /** Signed-in user's full name shown in the profile dropdown header. */
  profileName?: string;
  /** "Billing" item in the profile dropdown — sends the admin to the full Billing Overview page. */
  onGoToBilling?: () => void;
}

export function Dashboard({
  pendingRequesterName,
  aiReviewAssistLicenses = 0,
  teamMembers: initialTeamMembers = [],
  onBuyAdditionalLicenses,
  profileName = "Sarah Johnson",
  onGoToBilling,
}: DashboardProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [reviewRequestsOpen, setReviewRequestsOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [activeNav, setActiveNav] = useState<"dashboard" | "team-members">("dashboard");
  const [pendingRequestsBannerDismissed, setPendingRequestsBannerDismissed] = useState(false);
  // The signed-in admin already has a license by default in this prototype —
  // she's the one managing everyone else's access.
  const [accountHolderAssigned, setAccountHolderAssigned] = useState(true);
  const pendingRequestsCount = teamMembers.filter((member) => member.requested).length;
  const accountHolder: AccountHolder = {
    name: profileName,
    email: `${profileName.toLowerCase().replace(/\s+/g, ".")}@email.com`,
    initials: initialsFromName(profileName),
    assigned: accountHolderAssigned,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidenav
        activeKey={activeNav}
        onItemSelect={(key) => {
          if (key === "dashboard" || key === "team-members") setActiveNav(key);
        }}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {activeNav === "dashboard" && pendingRequestsCount > 0 && !pendingRequestsBannerDismissed && (
          <PendingRequestsBanner
            count={pendingRequestsCount}
            onReview={() => setReviewRequestsOpen(true)}
            onDismiss={() => setPendingRequestsBannerDismissed(true)}
          />
        )}
        {(notificationsOpen || profileMenuOpen) && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setNotificationsOpen(false);
              setProfileMenuOpen(false);
            }}
          />
        )}
        <GlobalHeader
          title={activeNav === "dashboard" ? "Dashboard" : "Team Members"}
          notificationCount={pendingRequesterName ? 1 : 0}
          notificationsOpen={notificationsOpen}
          onNotificationsClick={() => {
            setProfileMenuOpen(false);
            setNotificationsOpen((open) => !open);
          }}
          notificationsPanel={
            pendingRequesterName ? (
              <NotificationPanel
                requesterName={pendingRequesterName}
                onReview={() => {
                  setNotificationsOpen(false);
                  setReviewRequestsOpen(true);
                }}
              />
            ) : null
          }
          profileMenuOpen={profileMenuOpen}
          onProfileClick={() => {
            setNotificationsOpen(false);
            setProfileMenuOpen((open) => !open);
          }}
          profileMenuPanel={
            <ProfileMenu
              userName={profileName}
              onBillingClick={() => {
                setProfileMenuOpen(false);
                onGoToBilling?.();
              }}
            />
          }
        />

        {activeNav === "team-members" ? (
          <TeamMembersPage onReviewRequests={() => setReviewRequestsOpen(true)} />
        ) : (
          <>
            <div className="flex items-center gap-8 border-b border-line px-6">
              <span className="flex cursor-not-allowed items-center gap-1.5 py-2.5" aria-disabled="true">
                <span className="text-paragraph-md text-muted-foreground">Overview</span>
                <span className="rounded-full bg-avatar-pink-bg px-2 py-0.5 text-label-xs text-avatar-pink-fg">
                  Coming Soon
                </span>
              </span>
              <button type="button" className="flex flex-col items-center gap-2 pt-2.5 outline-none">
                <span className="text-label-md text-foreground">Calls</span>
                <span className="h-1 w-full shrink-0 rounded-t-lg bg-brand" />
              </button>
              <button
                type="button"
                className="pb-[9px] pt-2.5 text-paragraph-md text-muted-foreground outline-none hover:text-foreground"
              >
                Sales Dialer
              </button>
            </div>

            <div className="flex items-center gap-3 bg-white px-6 py-2">
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "grey-outline", size: "sm" }),
                  "w-[280px] justify-between text-muted-foreground [&_svg]:size-5"
                )}
              >
                Last 7 Days
                <IconCalendar size={20} />
              </button>
              <span className="h-9 w-px shrink-0 bg-line" aria-hidden="true" />
              <Button
                size="sm"
                variant="grey-outline"
                leftIcon={<IconFilter size={20} />}
                className="[&_svg]:size-5"
              >
                Filters
              </Button>
              <span className="flex-1" />
              <Button
                size="sm"
                variant="grey-outline"
                iconOnly
                aria-label="Schedule"
                className="[&_svg]:size-5"
              >
                <IconCalendarTime />
              </Button>
              <Button
                size="sm"
                variant="grey-outline"
                leftIcon={<IconMailShare />}
                className="[&_svg]:size-5"
              >
                Share
              </Button>
            </div>

            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-6 pb-6">
              <div className="flex w-full flex-col gap-3">
                <div className="flex w-full items-center gap-2 rounded-[4px] bg-info-secondary px-4 py-4">
                  <IconInfoCircleFilled size={20} className="size-5 shrink-0 text-info" />
                  <p className="min-w-0 flex-1 text-paragraph-md text-foreground">
                    <span className="text-label-md-semi">Monitor calls and agents in one place!</span> You can now
                    view live calls along with agent availability in the Live Monitoring page.
                  </p>
                  <Button size="xs" className="shrink-0">
                    Explore Live Monitoring
                  </Button>
                </div>

                <div className="flex flex-col gap-3">
                  <SectionHeader title="Calls Overview" lastUpdated />
                  <div className="flex gap-3">
                    {CALLS_OVERVIEW_CARDS.map((card) => (
                      <KpiCard key={card.label} {...card} />
                    ))}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between border-b border-line p-4">
                      <p className="text-heading-lg capitalize text-foreground">Calls volume over time</p>
                      <IconDotsVertical size={16} className="size-4 shrink-0 text-foreground" />
                    </div>
                    <CallsVolumeChart />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <SectionHeader title="Inbound Calls" lastUpdated />
                  <div className="flex gap-3">
                    {INBOUND_CALLS_CARDS.map((card) => (
                      <KpiCard key={card.label} {...card} />
                    ))}
                  </div>
                </div>
              </div>
            </main>
          </>
        )}
      </div>

      <ManageLicensesModal
        open={reviewRequestsOpen}
        onClose={() => setReviewRequestsOpen(false)}
        licensesTotal={aiReviewAssistLicenses}
        members={teamMembers}
        accountHolder={accountHolder}
        initialTab="requests"
        onBuyAdditionalLicenses={onBuyAdditionalLicenses}
        onAssignAccountHolder={() => setAccountHolderAssigned(true)}
        onRemoveAccountHolder={() => setAccountHolderAssigned(false)}
        onAssign={(id) =>
          setTeamMembers((prev) => prev.map((member) => (member.id === id ? { ...member, assigned: true } : member)))
        }
        onRemove={(id) =>
          setTeamMembers((prev) => prev.map((member) => (member.id === id ? { ...member, assigned: false } : member)))
        }
        onApproveRequest={(id) =>
          setTeamMembers((prev) =>
            prev.map((member) => (member.id === id ? { ...member, assigned: true, requested: false } : member))
          )
        }
        onDenyRequest={(id) =>
          setTeamMembers((prev) =>
            prev.map((member) => (member.id === id ? { ...member, requested: false } : member))
          )
        }
        onApproveAll={() =>
          setTeamMembers((prev) => {
            let remaining = aiReviewAssistLicenses - prev.filter((member) => member.assigned).length;
            return prev.map((member) => {
              if (!member.requested || remaining <= 0) return member;
              remaining -= 1;
              return { ...member, assigned: true, requested: false };
            });
          })
        }
      />
    </div>
  );
}
