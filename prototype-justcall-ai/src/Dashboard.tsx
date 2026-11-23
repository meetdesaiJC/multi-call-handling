import { useState } from "react";
import { cn } from "@/lib/utils";
import { GlobalHeader, type GlobalHeaderProps } from "@/components/GlobalHeader";
import { Button, buttonVariants } from "@/components/Button";
import {
  IconInfoCircleFilled,
  IconCalendar,
  IconFilter,
  IconInfoCircle,
  IconDotsVertical,
} from "@/components/Icon";
import { ProfileMenu, type ProfileMenuProps } from "@/components/ProfileMenu";
import { IconCalendarTime, IconMailShare } from "@/components/Icon";
import { DialerPanel } from "./DialerPanel";
import { type AgentAssistScope } from "./agentAssistScope";
import { openDialerWindow } from "./dialerWindow";

/**
 * Dashboard — landing content for the JustCall AI prototype.
 *
 * Lifted from the add-ons "Approve pending license requests" flow (the
 * Calls dashboard the admin lands on), with the floating pending-requests
 * banner and license-review wiring removed. Sidenav lives in App so the
 * logo stays fixed across the JustCall AI nav swap animation.
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

export interface DashboardProps {
  /** Signed-in user's full name shown in the profile dropdown header. */
  profileName?: string;
  /** Passed straight to the dialer — see `agentAssistScope`. */
  scope?: AgentAssistScope;
  /**
   * Passed straight to the dialer: off walks the same call on an account with
   * nothing authored in Agent Assist, so it never leaves the webphone.
   */
  assistConfigured?: boolean;
  /** Passed straight to the dialer: false is today's dialer, no Agent Assist. */
  agentAssist?: boolean;
  /** Dialer opens in its own tab instead of over the page, as V1 does. */
  dialerInNewTab?: boolean;
  /**
   * False leaves the header's Dialer button inert, as on every other admin
   * page: the admin story is configuration, and a phone opening mid-demo
   * pulls the walkthrough off it.
   */
  dialerInteractive?: boolean;
  /** The blue "Explore Live Monitoring" announcement above Calls Overview. */
  showLiveMonitoringBanner?: boolean;
  /** Profile menu › Billing. Omit and the item stays inert, as before. */
  onBillingClick?: () => void;
  /** Header › SMS Inbox. Omit and the icon stays inert, as before. */
  onMessagesClick?: () => void;
  /** The license can't call: the Dialer stays visible but locked, with this reason. */
  dialerLocked?: GlobalHeaderProps["dialerLocked"];
  /** Profile menu rows the license blocks, by label — see ProfileMenu `itemLocks`. */
  profileMenuLocks?: ProfileMenuProps["itemLocks"];
}

export function Dashboard({
  profileName = "Sarah Johnson",
  scope = "v2",
  assistConfigured = true,
  agentAssist = true,
  dialerInNewTab = false,
  dialerInteractive = true,
  showLiveMonitoringBanner = true,
  onBillingClick,
  onMessagesClick,
  dialerLocked,
  profileMenuLocks,
}: DashboardProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [dialerOpen, setDialerOpen] = useState(false);
  // V1's webphone is its own tab, so the dashboard never gives up its content
  // to it — and the Dialer button stops being a toggle, since this page has no
  // way to know whether that tab is still up. See `dialerWindow`.
  const poppedOut = scope === "v1" || dialerInNewTab;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {profileMenuOpen && (
        <div
          className="fixed inset-x-0 top-[60px] bottom-0 z-40"
          onClick={() => setProfileMenuOpen(false)}
        />
      )}
      <GlobalHeader
        title={dialerOpen ? "Dialer" : "Dashboard"}
        dialerOpen={dialerOpen}
        dialerLocked={dialerLocked}
        onDialerClick={
          dialerInteractive
            ? () => {
                setProfileMenuOpen(false);
                if (poppedOut) {
                  openDialerWindow({ scope, assistConfigured, agentAssist });
                  return;
                }
                setDialerOpen((open) => !open);
              }
            : undefined
        }
        onMessagesClick={
          onMessagesClick &&
          (() => {
            setProfileMenuOpen(false);
            setDialerOpen(false);
            onMessagesClick();
          })
        }
        profileMenuOpen={profileMenuOpen}
        onProfileClick={() => {
          setDialerOpen(false);
          setProfileMenuOpen((open) => !open);
        }}
        profileMenuPanel={
          <ProfileMenu
            userName={profileName}
            itemLocks={profileMenuLocks}
            onBillingClick={
              onBillingClick &&
              (() => {
                setProfileMenuOpen(false);
                onBillingClick();
              })
            }
          />
        }
      />

      {dialerOpen ? (
        <DialerPanel
          scope={scope}
          assistConfigured={assistConfigured}
          agentAssist={agentAssist}
          onClose={() => setDialerOpen(false)}
        />
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
        <Button size="sm" variant="grey-outline" leftIcon={<IconFilter size={20} />} className="[&_svg]:size-5">
          Filters
        </Button>
        <span className="flex-1" />
        <Button size="sm" variant="grey-outline" iconOnly aria-label="Schedule" className="[&_svg]:size-5">
          <IconCalendarTime />
        </Button>
        <Button size="sm" variant="grey-outline" leftIcon={<IconMailShare />} className="[&_svg]:size-5">
          Share
        </Button>
      </div>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-6 pb-6">
        <div className="flex w-full flex-col gap-3">
          {showLiveMonitoringBanner ? (
            <div className="flex w-full items-center gap-2 rounded-[4px] bg-info-secondary px-4 py-4">
              <IconInfoCircleFilled size={20} className="size-5 shrink-0 text-info" />
              <p className="min-w-0 flex-1 text-paragraph-md text-foreground">
                <span className="text-label-md-semi">Monitor calls and agents in one place!</span> You can now view
                live calls along with agent availability in the Live Monitoring page.
              </p>
              <Button size="xs" className="shrink-0">
                Explore Live Monitoring
              </Button>
            </div>
          ) : null}

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
  );
}
