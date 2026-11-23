import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import { IconCopy, IconDotsVertical } from "@/components/Icon";
import { LockedControl, type Lock } from "@/components/LockedControl";
import { Tabs } from "@/components/Tabs";
import { Tag } from "@/components/Tag";
import zapierLogo from "./assets/integrations/zapier.svg";
import {
  CONNECTED_INTEGRATIONS,
  type ConnectedIntegration,
  type ConnectionField,
  type ConnectionStatus,
} from "./appIntegrationsData";

/**
 * Integrations › My Integrations — Figma "Integrations - Active Integrations",
 * node 9:64392. (JustCall AI's own IntegrationsPage is a different screen.)
 * A tab bar over a three-up grid of connected-integration cards.
 */

/** Actions the signed-in license can't take here; omit for full access. */
export interface AppIntegrationsLocks {
  /** Connecting an integration — here, "Re-integrate" on a disconnected one. */
  connect?: Lock;
  /** Changing an existing connection — each card's overflow (⋮) menu. */
  manage?: Lock;
  /** Sync configuration — each card's "Configure". */
  syncConfig?: Lock;
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
  { key: "all", label: "All Integrations" },
  { key: "mine", label: "My Integrations" },
  { key: "team", label: "Team Integrations" },
  {
    key: "zapier",
    label: "Integrations with Zapier",
    icon: <img src={zapierLogo} alt="" width={20} height={20} className="size-5 shrink-0" />,
  },
];

const STATUS: Record<ConnectionStatus, { label: string; color: "green" | "grey" | "red" }> = {
  enabled: { label: "Enabled", color: "green" },
  disabled: { label: "Disabled", color: "grey" },
  disconnected: { label: "Disconnected", color: "red" },
};

/** 16px copy control beside a connection detail. */
function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={() => void navigator.clipboard?.writeText(value)}
      className="flex size-4 shrink-0 items-center justify-center rounded-[2px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
    >
      <IconCopy size={16} />
    </button>
  );
}

function DetailRow({ field }: { field: ConnectionField }) {
  return (
    <div className={cn("flex h-5 items-center gap-3", field.fill && "w-full")}>
      {/* Figma fixes the label column at 54px so the values line up. */}
      <span className="w-[54px] shrink-0 text-label-sm text-muted-foreground">{field.label}</span>
      <span className={cn("flex items-center gap-1", field.fill && "min-w-0 flex-1")}>
        <span
          className={cn(
            "text-paragraph-sm whitespace-nowrap text-foreground",
            field.fill && "min-w-0 flex-1 truncate"
          )}
        >
          {field.value}
        </span>
        {field.copyable ? <CopyButton value={field.value} label={field.label} /> : null}
      </span>
    </div>
  );
}

function IntegrationCard({
  integration,
  locks,
}: {
  integration: ConnectedIntegration;
  locks: AppIntegrationsLocks;
}) {
  const status = STATUS[integration.status];
  const disconnected = integration.status === "disconnected";

  return (
    <article className="flex flex-col overflow-hidden rounded-md border border-line bg-white">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-1">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-sm">
              <img
                src={integration.logo.src}
                alt=""
                width={integration.logo.width}
                height={integration.logo.height}
              />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-label-md text-foreground">{integration.name}</span>
              <span className="text-paragraph-sm text-muted-foreground">
                {integration.category}
              </span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Tag size="sm" color={status.color}>
              {status.label}
            </Tag>
            <Gate lock={locks.manage}>
              <button
                type="button"
                aria-label={`More actions for ${integration.name}`}
                className="flex size-6 items-center justify-center rounded-[4px] text-foreground outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent"
              >
                <IconDotsVertical size={16} />
              </button>
            </Gate>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {integration.fields.map((field) => (
            <DetailRow key={field.label} field={field} />
          ))}
        </div>
      </div>

      <div className="mt-auto flex justify-end px-4 pb-4">
        {disconnected ? (
          <Gate lock={locks.connect}>
            <Button variant="grey-outline" size="xs">
              Re-integrate
            </Button>
          </Gate>
        ) : (
          <Gate lock={locks.syncConfig}>
            <Button variant="grey-outline" size="xs">
              Configure
            </Button>
          </Gate>
        )}
      </div>
    </article>
  );
}

export function AppIntegrationsPage({ locks = {} }: { locks?: AppIntegrationsLocks } = {}) {
  // Only "My Integrations" is designed; the other tabs switch but keep the
  // connected list, so the bar still behaves like tabs in a walkthrough.
  const [tab, setTab] = useState("mine");

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-line px-6">
        <Tabs items={TABS} value={tab} onValueChange={setTab} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-3 gap-4">
          {CONNECTED_INTEGRATIONS.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} locks={locks} />
          ))}
        </div>
      </div>
    </main>
  );
}
