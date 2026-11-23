import * as React from "react";
import { Button } from "@/components/Button";
import { IconClose } from "@/components/Icon";
import { AdminPageHeader } from "./AgentAssistAdmin";
import { ConnectSourceModal } from "./ConnectSourceModal";
import { SourceLogo } from "./icons/IntegrationLogos";
import {
  CONNECTED_SOURCE_LIMIT,
  knowledgeConnectionCapabilityLabel,
  knowledgeIntegrationLabel,
  newKnowledgeContentId,
  type KnowledgeIntegrationRef,
} from "./knowledgeData";

/**
 * Account-level connections. Knowledge Bases can answer from these without
 * each one connecting them again; customer context is shared for the person
 * on the call.
 */

export interface IntegrationsPageProps {
  connections: KnowledgeIntegrationRef[];
  onConnectionsChange: (next: KnowledgeIntegrationRef[]) => void;
}

export function IntegrationsPage({
  connections,
  onConnectionsChange,
}: IntegrationsPageProps) {
  const [picking, setPicking] = React.useState(false);
  const full = connections.length >= CONNECTED_SOURCE_LIMIT;
  const connectedProviders = connections.map((item) => item.provider);
  const isEmpty = connections.length === 0;

  const connect = (next: Omit<KnowledgeIntegrationRef, "id">) => {
    onConnectionsChange([
      ...connections,
      { id: newKnowledgeContentId("ki"), ...next },
    ]);
  };

  const disconnect = (id: string) => {
    onConnectionsChange(connections.filter((item) => item.id !== id));
  };

  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <AdminPageHeader
        title="Integrations"
        description="Connect each app once. Knowledge Bases can answer from them, and Agent Assist can read customer context on the live call."
        actions={
          isEmpty ? null : (
            <Button size="sm" disabled={full} onClick={() => setPicking(true)}>
              Connect source
            </Button>
          )
        }
      />

      {isEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-6 pb-14">
          <div className="flex max-w-[460px] flex-col items-center gap-6 text-center">
            <div className="relative flex size-[132px] items-center justify-center rounded-full bg-secondary-bg">
              <span className="absolute bottom-[34px] left-2 size-12 -rotate-[16deg] rounded-[10px] border border-line bg-white" />
              <span className="absolute bottom-[34px] right-2 size-12 rotate-[16deg] rounded-[10px] border border-line bg-white" />
              <span className="absolute bottom-[30px] flex h-[72px] w-[76px] items-center justify-center rounded-[10px] border border-line bg-white text-muted-foreground shadow-100">
                <IconPlug size={20} />
              </span>
              <span className="absolute bottom-[18px] flex size-8 items-center justify-center rounded-full border-2 border-white bg-brand text-white">
                <IconPlus size={16} />
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[16px] leading-6 font-semibold text-foreground">
                No sources connected
              </p>
              <p className="text-[14px] leading-5 text-muted-foreground">
                Connect HubSpot, Zendesk, Notion, or any other tool once for the
                account. Company knowledge can feed every Knowledge Base;
                customer context stays shared for the person on the call.
              </p>
            </div>
            <Button size="md" onClick={() => setPicking(true)}>
              Connect source
            </Button>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
          <div className="flex flex-col rounded-lg border border-line bg-white">
            <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <p className="text-label-md-semi text-foreground">
                Connected sources
              </p>
              <p className="text-paragraph-sm text-muted-foreground">
                {connections.length} of {CONNECTED_SOURCE_LIMIT}
              </p>
            </div>
            <ul className="flex flex-col gap-2 p-4">
              {connections.map((item) => {
                const label = knowledgeIntegrationLabel(item);
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-muted-foreground">
                      <SourceLogo
                        provider={item.provider}
                        label={label}
                        size={16}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label-md text-foreground">
                        {label}
                      </span>
                      <span className="block truncate text-paragraph-sm text-muted-foreground">
                        {knowledgeConnectionCapabilityLabel(item)}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Disconnect ${label}`}
                      onClick={() => disconnect(item.id)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
                    >
                      <IconClose size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
            {full ? (
              <p className="px-4 pb-4 text-paragraph-sm text-muted-foreground">
                This account is at its {CONNECTED_SOURCE_LIMIT}-connection
                limit.
              </p>
            ) : null}
          </div>
        </div>
      )}

      <ConnectSourceModal
        open={picking}
        onClose={() => setPicking(false)}
        connectedProviders={connectedProviders}
        limitReached={full}
        onConnect={connect}
      />
    </main>
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

function IconPlug({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M8.333 2.5v3.333M13.333 2.5v3.333"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M5.833 5.833h9.584v2.5a4.792 4.792 0 0 1-4.792 4.792A4.792 4.792 0 0 1 5.833 8.333v-2.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M10.625 13.125V17.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
