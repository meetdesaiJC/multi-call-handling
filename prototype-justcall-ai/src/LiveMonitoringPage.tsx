import * as React from "react";
import { useMemo, useState } from "react";
import { Badge, type BadgeProps } from "@/components/Badge";
import { Button } from "@/components/Button";
import { LockedControl, type Lock } from "@/components/LockedControl";
import { Chip } from "@/components/Chip";
import { DotsLoader } from "@/components/DotsLoader";
import {
  IconArrowDown,
  IconChevronDown,
  IconDotsVertical,
  IconInfoCircle,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconReload,
  IconSearch,
} from "@/components/Icon";
import { InputField } from "@/components/InputField";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Table";
import { Tabs } from "@/components/Tabs";
import { cn } from "@/lib/utils";
import { MonitorCallWidget } from "./MonitorCallWidget";
import {
  CALLERS_IN_QUEUE,
  LIVE_CALL_BREAKDOWN,
  LIVE_CALLS,
  QUEUE_SUMMARY,
  SLA,
  TEAM_SUMMARY,
  type LiveCall,
  type LiveCallStatus,
} from "./liveMonitoringData";

/**
 * Live Monitoring — Figma "Live monitoring" (node 2002:25123).
 *
 * Open to both non-calling licenses; what differs is the monitoring action
 * itself, which View-only sees locked (see licenseLocks.ts). KPI cards across
 * the top, then the live-calls widget.
 */

/* ------------------------------------------------------------------ */
/* KPI cards                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-1 flex-col rounded-lg border border-line bg-white px-5 py-3",
        className
      )}
    >
      {children}
    </section>
  );
}

const DOT_TONE = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
} as const;

/** The 8px status dot, ringed in white so it holds its edge on any fill. */
function StatusDot({ tone }: { tone: keyof typeof DOT_TONE }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 shrink-0 rounded-[4px] border-[1.5px] border-white", DOT_TONE[tone])}
    />
  );
}

function SubMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: keyof typeof DOT_TONE;
}) {
  return (
    <div className="flex items-center justify-between rounded-[4px] bg-secondary-bg px-2 py-1">
      <span className="flex items-center gap-2 text-paragraph-md text-muted-foreground">
        {tone && <StatusDot tone={tone} />}
        {label}
      </span>
      <span className="text-label-md-semi text-foreground">{value}</span>
    </div>
  );
}

function CountCard({
  title,
  total,
  rows,
}: {
  title: string;
  total: number;
  rows: readonly { label: string; value: string; tone?: keyof typeof DOT_TONE }[];
}) {
  return (
    <KpiCard>
      <div className="flex flex-col gap-1">
        <h2 className="text-label-md text-foreground">{title}</h2>
        <p className="text-heading-xxxl text-foreground">{total}</p>
      </div>
      <div className="mt-4 flex flex-col gap-1.5">
        {rows.map((row) => (
          <SubMetric key={row.label} {...row} />
        ))}
      </div>
    </KpiCard>
  );
}

/*
 * The SLA dial: a 180° track with the rate swept over it from the left. Drawn
 * rather than exported so the sweep follows the number.
 */
const GAUGE = { width: 142.15, radius: 62.19, stroke: 17.77 };

function SlaGauge({ rate }: { rate: number }) {
  const cx = GAUGE.width / 2;
  const cy = GAUGE.width / 2;
  const r = GAUGE.radius;
  const angle = Math.PI * (1 - Math.min(Math.max(rate, 0), 100) / 100);
  const end = { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  const track = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fill = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;

  return (
    <div className="relative h-20 w-[142px]">
      <svg
        width={GAUGE.width}
        height={80}
        viewBox={`0 0 ${GAUGE.width} 80`}
        fill="none"
        aria-hidden="true"
      >
        <path d={track} className="stroke-muted" strokeWidth={GAUGE.stroke} strokeLinecap="round" />
        {rate > 0 && (
          <path
            d={fill}
            className="stroke-chart-outbound"
            strokeWidth={GAUGE.stroke}
            strokeLinecap="round"
          />
        )}
      </svg>
      <p className="absolute top-[39px] left-1/2 flex -translate-x-1/2 items-baseline text-foreground">
        <span className="text-heading-xxxl">{rate}</span>
        <span className="text-label-md">%</span>
      </p>
    </div>
  );
}

function SlaCard() {
  return (
    <KpiCard className="items-center gap-3">
      <div className="flex w-full items-center justify-between">
        <h2 className="flex items-center gap-1 text-label-md text-foreground">
          SLA Rate
          <IconInfoCircle size={16} className="text-muted-foreground" aria-hidden="true" />
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Refresh SLA rate"
            className="flex size-4 cursor-pointer items-center justify-center rounded-[4px] text-brand outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconReload size={16} />
          </button>
          <button
            type="button"
            aria-label="SLA rate options"
            className="flex size-4 cursor-pointer items-center justify-center rounded-[4px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconDotsVertical size={16} />
          </button>
        </div>
      </div>
      <SlaGauge rate={SLA.rate} />
      <div className="flex flex-col items-center gap-1">
        <p className="flex items-center gap-1">
          <Badge
            variant="error-inverted"
            className="gap-0 pr-1.5 pl-1"
            icon={<IconArrowDown size={16} className="size-3" />}
          >
            {SLA.deltaVsLastHour}
          </Badge>
          <span className="text-paragraph-sm text-muted-foreground">vs last hour</span>
        </p>
        <p className="text-paragraph-sm text-muted-foreground">
          <span className="font-semibold text-foreground underline decoration-dotted underline-offset-2">
            {SLA.missedCalls} calls
          </span>{" "}
          not answered in <span className="font-semibold text-foreground">{SLA.window}</span>
        </p>
      </div>
    </KpiCard>
  );
}

/* ------------------------------------------------------------------ */
/* Live calls widget                                                   */
/* ------------------------------------------------------------------ */

const STATUS: Record<LiveCallStatus, { label: string; variant: BadgeProps["variant"] }> = {
  ringing: { label: "Ringing", variant: "purple" },
  ivr: { label: "Playing IVR", variant: "purple" },
  "in-progress": { label: "In Progress", variant: "primary-outline" },
};

function DirectionIcon({ call }: { call: LiveCall }) {
  return call.direction === "inbound" ? (
    <IconPhoneIncoming size={20} className="text-success" aria-label="Inbound call" />
  ) : (
    <IconPhoneOutgoing size={20} className="text-brand" aria-label="Outbound call" />
  );
}

const TEXT_CELL = "h-14 text-paragraph-md text-foreground";

function LiveCallRow({
  call,
  monitorLock,
  onMonitor,
}: {
  call: LiveCall;
  monitorLock?: Lock;
  onMonitor: (call: LiveCall) => void;
}) {
  const status = STATUS[call.status];
  // Nothing to listen to until an agent is on the line.
  const canMonitor = call.status === "in-progress";
  return (
    <TableRow className="border-b-0">
      <TableCell className="h-14 pr-0 pl-[22px]">
        <DirectionIcon call={call} />
      </TableCell>
      <TableCell className="h-14 pl-2">
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell className={TEXT_CELL}>
        {call.member ? (
          <span className="block truncate">{call.member}</span>
        ) : (
          // Still in the IVR — nobody is on the line yet, so the slot waits.
          <DotsLoader label="Waiting for a team member" />
        )}
      </TableCell>
      <TableCell className={TEXT_CELL}>
        <span className="block truncate">{call.phoneNumber}</span>
      </TableCell>
      <TableCell className={TEXT_CELL}>
        <span className="block truncate">{call.contact}</span>
      </TableCell>
      <TableCell className={cn(TEXT_CELL, !call.channel && "text-disabled-fg")}>
        <span className="block truncate">{call.channel ?? "--"}</span>
      </TableCell>
      <TableCell className="h-14">
        <Badge variant="grey-inverted" className="text-muted-foreground">
          {call.timeInSystem}
        </Badge>
      </TableCell>
      <TableCell className="h-14 text-center">
        {/* When the license can't monitor, every row is locked and says why —
            ringing and IVR rows included, or a column of identical muted
            buttons would explain itself on some rows and not others. Without
            a lock, a call with nobody on it is plainly disabled: that's the
            call's state, and it changes on its own. */}
        <LockedControl
          locked={Boolean(monitorLock)}
          reason={monitorLock?.reason}
          hint={monitorLock?.hint}
        >
          <Button
            variant="primary-outline"
            size="xs"
            disabled={!monitorLock && !canMonitor}
            onClick={() => onMonitor(call)}
          >
            Monitor Call
          </Button>
        </LockedControl>
      </TableCell>
    </TableRow>
  );
}

const FILTERS = ["Call Type", "Team Member", "User Group"];

type WidgetTab = "live-calls" | "queue" | "availability";

function LiveCallsWidget({ locks }: { locks?: LiveMonitoringLocks }) {
  const [tab, setTab] = useState<WidgetTab>("live-calls");
  const [search, setSearch] = useState("");
  // One call at a time: a supervisor can't listen to two lines at once, so
  // monitoring another call swaps the widget rather than stacking a second.
  const [monitoring, setMonitoring] = useState<LiveCall | null>(null);

  const calls = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return LIVE_CALLS;
    return LIVE_CALLS.filter((call) =>
      [call.member, call.phoneNumber, call.contact].some((field) =>
        field?.toLowerCase().includes(query)
      )
    );
  }, [search]);

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-line bg-white">
      <div className="border-b border-line px-5 pt-3">
        <Tabs
          value={tab}
          onValueChange={(key) => setTab(key as WidgetTab)}
          items={[
            {
              key: "live-calls",
              label: "Live Calls",
              icon: <StatusDot tone="success" />,
              badge: LIVE_CALLS.length,
              badgeVariant: "success",
            },
            {
              key: "queue",
              label: "Callers in Queue",
              badge: CALLERS_IN_QUEUE,
              badgeVariant: "warning",
            },
            { key: "availability", label: "Team Availability" },
          ]}
        />
      </div>

      {tab === "live-calls" ? (
        <>
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            <InputField
              placeholder="Search member or phone number"
              leadingIcon={<IconSearch size={16} />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              clearable={false}
              wrapperClassName="w-[320px]"
            />
            <div className="flex items-center gap-2">
              {FILTERS.map((filter) => (
                <Chip key={filter} size="md" className="pr-1.5 pl-2">
                  <span className="flex items-center gap-1">
                    {filter}
                    <IconChevronDown size={16} className="text-muted-foreground" />
                  </span>
                </Chip>
              ))}
            </div>
          </div>
          <Table className="table-fixed">
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px]">
                  <span className="sr-only">Direction</span>
                </TableHead>
                <TableHead className="w-[120px] pl-2">Call Status</TableHead>
                <TableHead className="w-[140px]">Team Member</TableHead>
                <TableHead className="w-[200px]">Phone Number</TableHead>
                <TableHead className="w-[200px]">Contact</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="w-[120px]">Time in System</TableHead>
                <TableHead className="w-[150px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.length === 0 ? (
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableCell colSpan={8} className="text-paragraph-md text-muted-foreground">
                    No live calls match “{search.trim()}”
                  </TableCell>
                </TableRow>
              ) : (
                calls.map((call) => (
                  <LiveCallRow
                    key={call.id}
                    call={call}
                    monitorLock={locks?.monitor}
                    onMonitor={setMonitoring}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </>
      ) : (
        // Only Live Calls is drawn in the Figma; the other tabs exist so the
        // strip reads as it will ship.
        <p className="px-6 py-10 text-center text-paragraph-md text-muted-foreground">
          {tab === "queue" ? "Callers in Queue" : "Team Availability"} isn’t part of this
          prototype yet.
        </p>
      )}
      {monitoring ? (
        <MonitorCallWidget
          key={monitoring.id}
          call={monitoring}
          bargeLock={locks?.barge}
          onEnd={() => setMonitoring(null)}
        />
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** Actions the signed-in license can't take here; omit for full access. */
export interface LiveMonitoringLocks {
  /** Monitor Call on a live call. */
  monitor?: Lock;
  /** Barge, inside the monitor widget. */
  barge?: Lock;
}

export function LiveMonitoringPage({ locks }: { locks?: LiveMonitoringLocks } = {}) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-white">
      <div className="flex flex-col gap-3 px-6 pt-3 pb-10">
        <div className="flex items-stretch gap-3">
          <SlaCard />
          <CountCard title="Live Calls" total={LIVE_CALLS.length} rows={LIVE_CALL_BREAKDOWN} />
          <CountCard title="Callers in Queue" total={QUEUE_SUMMARY.total} rows={QUEUE_SUMMARY.rows} />
          <CountCard title="Total Team Members" total={TEAM_SUMMARY.total} rows={TEAM_SUMMARY.rows} />
        </div>
        <LiveCallsWidget locks={locks} />
      </div>
    </main>
  );
}
