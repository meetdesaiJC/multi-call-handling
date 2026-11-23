import * as React from "react";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Modal } from "@/components/Modal";
import { Toggle } from "@/components/Toggle";
import { cn } from "@/lib/utils";
import { SourceLogo } from "./icons/IntegrationLogos";
import {
  ALL_CUSTOMER_CONTEXT_FIELD_IDS,
  ALL_CUSTOMER_CONTEXT_OBJECT_IDS,
  CUSTOMER_CONTEXT_FIELDS,
  CUSTOMER_CONTEXT_OBJECTS,
  KNOWLEDGE_INTEGRATIONS,
  knowledgeIntegrationScope,
  sourceHasCustomerContext,
  type CustomerContextObjectId,
  type KnowledgeIntegrationMeta,
  type KnowledgeIntegrationRef,
} from "./knowledgeData";

type Step = "picker" | "use" | "fields";

const OAUTH_MS = 700;

const FIELD_GROUPS = ["Contact", "Company", "Deal"] as const;

export interface ConnectSourceModalProps {
  open: boolean;
  onClose: () => void;
  connectedProviders: string[];
  limitReached: boolean;
  onConnect: (next: Omit<KnowledgeIntegrationRef, "id">) => void;
}

export function ConnectSourceModal({
  open,
  onClose,
  connectedProviders,
  limitReached,
  onConnect,
}: ConnectSourceModalProps) {
  const [step, setStep] = React.useState<Step>("picker");
  const [connectingId, setConnectingId] = React.useState<string | null>(null);
  const [app, setApp] = React.useState<KnowledgeIntegrationMeta | null>(null);
  const [usesKnowledge, setUsesKnowledge] = React.useState(true);
  const [usesCustomerContext, setUsesCustomerContext] = React.useState(true);
  const [customerObjects, setCustomerObjects] = React.useState<
    CustomerContextObjectId[]
  >(ALL_CUSTOMER_CONTEXT_OBJECT_IDS);
  const [customerFields, setCustomerFields] = React.useState<string[]>(
    ALL_CUSTOMER_CONTEXT_FIELD_IDS
  );
  const connectTimer = React.useRef<number | null>(null);

  const reset = React.useCallback(() => {
    if (connectTimer.current) window.clearTimeout(connectTimer.current);
    connectTimer.current = null;
    setStep("picker");
    setConnectingId(null);
    setApp(null);
    setUsesKnowledge(true);
    setUsesCustomerContext(true);
    setCustomerObjects(ALL_CUSTOMER_CONTEXT_OBJECT_IDS);
    setCustomerFields(ALL_CUSTOMER_CONTEXT_FIELD_IDS);
  }, []);

  React.useEffect(() => {
    if (!open) reset();
    return () => {
      if (connectTimer.current) window.clearTimeout(connectTimer.current);
    };
  }, [open, reset]);

  const finish = (next: {
    app: KnowledgeIntegrationMeta;
    usesKnowledge: boolean;
    usesCustomerContext: boolean;
    customerObjects: CustomerContextObjectId[];
    customerFields: string[];
  }) => {
    const objects = next.usesCustomerContext ? next.customerObjects : [];
    const fields = next.usesCustomerContext ? next.customerFields : [];
    onConnect({
      provider: next.app.id,
      usesKnowledge: next.usesKnowledge,
      usesCustomerContext: next.usesCustomerContext,
      customerObjects: objects,
      customerFields: fields,
      scope: knowledgeIntegrationScope({
        app: next.app,
        usesKnowledge: next.usesKnowledge,
        usesCustomerContext: next.usesCustomerContext,
        customerObjects: objects,
      }),
    });
    onClose();
  };

  const beginConnect = (next: KnowledgeIntegrationMeta) => {
    if (connectingId || connectedProviders.includes(next.id) || limitReached) return;
    setConnectingId(next.id);
    connectTimer.current = window.setTimeout(() => {
      setConnectingId(null);
      if (!sourceHasCustomerContext(next)) {
        finish({
          app: next,
          usesKnowledge: true,
          usesCustomerContext: false,
          customerObjects: [],
          customerFields: [],
        });
        return;
      }
      setApp(next);
      setUsesKnowledge(true);
      setUsesCustomerContext(true);
      setCustomerObjects(ALL_CUSTOMER_CONTEXT_OBJECT_IDS);
      setCustomerFields(ALL_CUSTOMER_CONTEXT_FIELD_IDS);
      setStep("use");
    }, OAUTH_MS);
  };

  const canContinueUse = usesKnowledge || (usesCustomerContext && customerObjects.length > 0);

  const toggleObject = (id: CustomerContextObjectId, checked: boolean) => {
    setCustomerObjects((current) => {
      const next = checked
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((item) => item !== id);
      if (next.length === 0) setUsesCustomerContext(false);
      return next;
    });
    if (checked) setUsesCustomerContext(true);
  };

  const toggleField = (id: string, checked: boolean) => {
    setCustomerFields((current) =>
      checked
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((item) => item !== id)
    );
  };

  const title =
    step === "use"
      ? "Choose what JustCall can use"
      : step === "fields"
        ? "Choose customer fields"
        : "Connect a source";

  const description =
    step === "use" && app
      ? `${app.label} is connected for this account. Company knowledge can feed every Knowledge Base. Customer context stays shared for the person on the call.`
      : step === "fields"
        ? "Control which CRM properties Agent Assist can read for the customer currently in the conversation."
        : "Connect your tools to give AI access to company knowledge and customer context.";

  const footer =
    step === "use" ? (
      <div className="flex w-full items-center justify-between gap-3">
        <Button variant="grey-outline" size="sm" onClick={() => setStep("picker")}>
          Back
        </Button>
        <Button
          size="sm"
          disabled={!canContinueUse}
          onClick={() => {
            if (!app) return;
            if (usesCustomerContext && customerObjects.length > 0) {
              setStep("fields");
              return;
            }
            finish({
              app,
              usesKnowledge,
              usesCustomerContext: false,
              customerObjects: [],
              customerFields: [],
            });
          }}
        >
          Continue
        </Button>
      </div>
    ) : step === "fields" ? (
      <div className="flex w-full items-center justify-between gap-3">
        <Button variant="grey-outline" size="sm" onClick={() => setStep("use")}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="grey-outline"
            size="sm"
            onClick={() => {
              if (!app) return;
              finish({
                app,
                usesKnowledge,
                usesCustomerContext,
                customerObjects,
                customerFields: ALL_CUSTOMER_CONTEXT_FIELD_IDS,
              });
            }}
          >
            Skip
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (!app) return;
              finish({
                app,
                usesKnowledge,
                usesCustomerContext,
                customerObjects,
                customerFields,
              });
            }}
          >
            Done
          </Button>
        </div>
      </div>
    ) : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={title}
      description={description}
      footer={footer}
      className={step === "picker" ? "max-h-[min(480px,calc(100dvh-48px))]" : undefined}
    >
      {step === "picker" ? (
        <ul className="flex flex-col gap-2">
          {KNOWLEDGE_INTEGRATIONS.map((item) => {
            const connected = connectedProviders.includes(item.id);
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-muted-foreground">
                  <SourceLogo provider={item.id} label={item.label} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-label-md text-foreground">{item.label}</span>
                  <span className="mt-0.5 block text-pretty text-paragraph-sm text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                <Button
                  variant="grey-outline"
                  size="sm"
                  className="shrink-0"
                  disabled={connected || limitReached || Boolean(connectingId)}
                  loading={connectingId === item.id}
                  onClick={() => beginConnect(item)}
                >
                  {connected ? "Connected" : "Connect"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {step === "use" && app ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-line bg-secondary-bg/60 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] border border-line bg-white">
              <SourceLogo provider={app.id} label={app.label} size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-label-md-semi text-foreground">{app.label}</p>
              <p className="text-paragraph-sm text-muted-foreground">
                Connected once for the account
              </p>
            </div>
          </div>

          <CapabilityCard>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-label-md-semi text-foreground">Company knowledge</p>
                <p className="mt-0.5 text-pretty text-paragraph-sm text-muted-foreground">
                  Sync {app.knowledgeLabel.toLowerCase()} so Knowledge Bases can
                  answer from what your team publishes.
                </p>
              </div>
              <Toggle
                size="sm"
                checked={usesKnowledge}
                onCheckedChange={setUsesKnowledge}
                aria-label="Use company knowledge"
              />
            </div>
          </CapabilityCard>

          <CapabilityCard>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-label-md-semi text-foreground">Customer context</p>
                <p className="mt-0.5 text-pretty text-paragraph-sm text-muted-foreground">
                  Contacts, companies, deals, tickets, and properties for the
                  customer on the call. Shared across Agent Assist — not stored
                  in a Knowledge Base.
                </p>
              </div>
              <Toggle
                size="sm"
                checked={usesCustomerContext}
                onCheckedChange={(checked) => {
                  setUsesCustomerContext(checked);
                  if (checked && customerObjects.length === 0) {
                    setCustomerObjects(ALL_CUSTOMER_CONTEXT_OBJECT_IDS);
                  }
                }}
                aria-label="Use customer context"
              />
            </div>
            <ul
              className={cn(
                "flex flex-col gap-2.5 border-t border-line pt-3",
                !usesCustomerContext && "opacity-50"
              )}
            >
              {CUSTOMER_CONTEXT_OBJECTS.map((object) => (
                <li key={object.id}>
                  <Checkbox
                    size="sm"
                    disabled={!usesCustomerContext}
                    checked={customerObjects.includes(object.id)}
                    onCheckedChange={(checked) => toggleObject(object.id, checked)}
                    label={object.label}
                    description={object.description}
                    wrapperClassName="w-full"
                  />
                </li>
              ))}
            </ul>
          </CapabilityCard>
        </div>
      ) : null}

      {step === "fields" ? (
        <div className="flex flex-col gap-5">
          {FIELD_GROUPS.map((group) => {
            const fields = CUSTOMER_CONTEXT_FIELDS.filter((field) => field.group === group);
            return (
              <section key={group} className="flex flex-col gap-2.5">
                <p className="text-label-sm text-muted-foreground">{group}</p>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {fields.map((field) => (
                    <li key={field.id}>
                      <Checkbox
                        size="sm"
                        checked={customerFields.includes(field.id)}
                        onCheckedChange={(checked) => toggleField(field.id, checked)}
                        label={field.label}
                        wrapperClassName="w-full"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}
    </Modal>
  );
}

function CapabilityCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line px-3.5 py-3.5">
      {children}
    </div>
  );
}
