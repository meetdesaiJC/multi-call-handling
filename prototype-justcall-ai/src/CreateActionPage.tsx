import * as React from "react";
import { Badge } from "@/components/Badge";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Dropdown, type DropdownListItem } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import { Toggle } from "@/components/Toggle";
import { IconClose, IconFile } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { useAgentAssistTakeover } from "./agentAssistTakeover";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import { TEAM_MEMBERS, USER_GROUPS } from "./guidanceData";
import { ActionInCallPreview } from "./InCallActionCard";
import {
  ACTION_OBJECT_OPTIONS,
  ACTION_PROPERTY_OPTIONS,
  EMAIL_ATTACHMENT_PRESETS,
  EMAIL_CRM_FIELD_OPTIONS,
  EMAIL_RECIPIENT_OPTIONS,
  EMAIL_TEMPLATE_VARIABLES,
  VALUE_SOURCE_OPTIONS,
  capabilityById,
  capabilityNeedsRecord,
  createDefaultEmailConfig,
  createEmptyAction,
  defaultExtractPrompt,
  defaultPropertyForCapability,
  emailConfigReady,
  integrationById,
  isSendEmailCapability,
  operationsForIntegration,
  suggestedAgentLabel,
  suggestedInternalName,
  type ActionValueSource,
  type AgentAction,
  type EmailActionConfig,
  type EmailAttachment,
  type EmailRecipientKind,
  type Integration,
  type IntegrationId,
} from "./actionsData";

export interface CreateActionPageProps {
  initial?: AgentAction | null;
  mode?: "create" | "edit";
  integrations: Integration[];
  onIntegrationsChange: (next: Integration[]) => void;
  onClose: () => void;
  onSave: (action: AgentAction) => void;
}

function pick(value: string | string[]): string {
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-label-sm font-medium tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

/**
 * One rung of the When → Then → Trigger Action rail. The connector runs behind
 * the dot so consecutive steps read as a single continuous line, the same way
 * the Voice Agent action builder stacks its stages.
 */
function SetupStep({
  badge,
  title,
  description,
  first = false,
  last = false,
  children,
}: {
  badge: string;
  title: string;
  description?: string;
  first?: boolean;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    // The step spacing sits on the content column, not the row, so the rail
    // stretches through it and the connector stays unbroken between steps.
    <li className="relative flex gap-4">
      <div className="relative flex w-2.5 shrink-0 justify-center" aria-hidden>
        {first ? null : (
          <span className="absolute top-0 h-2.5 w-px bg-line" />
        )}
        {last ? null : (
          <span className="absolute top-2.5 bottom-0 w-px bg-line" />
        )}
        <span className="absolute top-2.5 size-2.5 -translate-y-1/2 rounded-full bg-control-border" />
      </div>

      <div
        className={cn(
          // Field pairs inside a step size off this column, not the viewport —
          // the two asides squeeze it well below the `sm` breakpoint.
          "@container flex min-w-0 flex-1 flex-col gap-4",
          last ? null : "pb-9"
        )}
      >
        <header className="flex flex-col gap-1">
          <Badge
            variant="primary-inverted"
            className="mb-1 self-start rounded-[4px]"
          >
            {badge}
          </Badge>
          <h2 className="text-heading-lg text-foreground">{title}</h2>
          {description ? (
            <p className="text-pretty text-paragraph-md text-muted-foreground">
              {description}
            </p>
          ) : null}
        </header>
        {children}
      </div>
    </li>
  );
}

/** Groups the fields a single operation needs, so they read as one payload. */
function ConfigCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-secondary-bg p-4">
      {children}
    </div>
  );
}

function FieldGroup({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {title ? (
        <h3 className="text-label-md-semi text-foreground">{title}</h3>
      ) : null}
      {children}
    </div>
  );
}

export function CreateActionPage({
  initial,
  mode,
  integrations,
  onIntegrationsChange,
  onClose,
  onSave,
}: CreateActionPageProps) {
  useAgentAssistTakeover();
  const isEditing = mode ? mode === "edit" : Boolean(initial);
  const [draft, setDraft] = React.useState<AgentAction>(
    () => initial ?? createEmptyAction()
  );
  const [extractTouched, setExtractTouched] = React.useState(
    () =>
      initial?.value.kind === "from_conversation" &&
      Boolean(initial.value.extractPrompt)
  );
  const integration = integrationById(integrations, draft.integrationId);
  const capability = draft.capabilityId
    ? capabilityById(integrations, draft.integrationId, draft.capabilityId)
    : undefined;
  const needsReconnect = Boolean(
    draft.capabilityId && integration && !integration.connected
  );

  const withGenerated = React.useCallback(
    (current: AgentAction, partial: Partial<AgentAction>): AgentAction => {
      const merged: AgentAction = { ...current, ...partial };
      const nextCapability = merged.capabilityId
        ? capabilityById(integrations, merged.integrationId, merged.capabilityId)
        : undefined;
      const nextIntegration = integrationById(integrations, merged.integrationId);
      const agentLabel = suggestedAgentLabel(merged, nextCapability);
      const name = suggestedInternalName(nextIntegration?.name ?? "", agentLabel);
      return { ...merged, agentLabel, name };
    },
    [integrations]
  );

  const patch = (partial: Partial<AgentAction>) =>
    setDraft((current) => withGenerated(current, partial));

  const objects = capability?.objects ?? [];
  const objectOptions =
    objects.length > 0
      ? ACTION_OBJECT_OPTIONS.filter((item) => objects.includes(item.value))
      : ACTION_OBJECT_OPTIONS;
  const needsRecord = capabilityNeedsRecord(capability);
  const isEmail = isSendEmailCapability(capability);

  const valueReady = isEmail
    ? emailConfigReady(draft.email)
    : draft.value.kind === "fixed"
      ? draft.value.value.trim().length > 0
      : draft.value.extractPrompt.trim().length > 0;

  const hasAssignees =
    draft.teamMembers.length > 0 || draft.userGroups.length > 0;

  const canSave =
    (draft.agentLabel.trim().length > 0 || draft.name.trim().length > 0) &&
    // An AI-recommended action has nothing to match on without its moment.
    draft.detectWhen.trim().length > 0 &&
    Boolean(draft.capabilityId) &&
    Boolean(integration?.connected) &&
    valueReady &&
    (!needsRecord || (Boolean(draft.object) && Boolean(draft.property)));

  const patchEmail = (partial: Partial<EmailActionConfig>) =>
    setDraft((current) =>
      withGenerated(current, {
        email: { ...(current.email ?? createDefaultEmailConfig()), ...partial },
      })
    );

  const selectOperation = (integrationId: IntegrationId, capabilityId: string) => {
    const next = capabilityById(integrations, integrationId, capabilityId);
    const sendingEmail = isSendEmailCapability(next);
    const defaultObject = sendingEmail ? "Contact" : (next?.objects?.[0] ?? "");
    const defaultProperty = capabilityNeedsRecord(next)
      ? draft.integrationId === integrationId
        ? draft.property
        : ""
      : defaultPropertyForCapability(next);
    const nextValue: ActionValueSource =
      draft.value.kind === "fixed"
        ? draft.value
        : {
            kind: "from_conversation",
            extractPrompt: defaultExtractPrompt(defaultProperty),
          };
    setExtractTouched(false);
    patch({
      integrationId,
      capabilityId,
      object: defaultObject,
      property: sendingEmail ? "" : defaultProperty,
      value: nextValue,
      email: sendingEmail ? (draft.email ?? createDefaultEmailConfig()) : draft.email,
      requiresConfirmation: sendingEmail ? true : draft.requiresConfirmation,
    });
  };

  /** Switching app clears the operation — its fields never carry across apps. */
  const selectIntegration = (id: IntegrationId) => {
    if (id === draft.integrationId) return;
    patch({
      integrationId: id,
      capabilityId: "",
      object: "",
      property: "",
    });
  };

  const connectIntegration = (id: IntegrationId) => {
    onIntegrationsChange(
      integrations.map((item) =>
        item.id === id ? { ...item, connected: true } : item
      )
    );
  };

  const setValueSource = (kind: ActionValueSource["kind"]) => {
    if (kind === "fixed") {
      patch({
        value: {
          kind: "fixed",
          value: draft.value.kind === "fixed" ? draft.value.value : "",
        },
      });
      return;
    }
    const prompt =
      draft.value.kind === "from_conversation"
        ? draft.value.extractPrompt
        : defaultExtractPrompt(draft.property);
    patch({ value: { kind: "from_conversation", extractPrompt: prompt } });
  };

  const published = (): AgentAction => {
    const agentLabel = (draft.agentLabel || suggestedAgentLabel(draft, capability)).trim();
    const name = (
      draft.name ||
      suggestedInternalName(integration?.name ?? "", agentLabel)
    ).trim();
    return {
      ...draft,
      name,
      agentLabel,
      description: draft.description.trim(),
      trigger: "ai_recommended",
      detectWhen: draft.detectWhen.trim(),
      detectExamples: draft.detectExamples.filter((item) => item.trim()),
      audience:
        draft.teamMembers.length > 0
          ? "users"
          : draft.userGroups.length > 0
            ? "teams"
            : "users",
      // An unassigned action has nobody to show it to, so it saves inactive —
      // the same way an unassigned response card stays a draft.
      status:
        draft.status === "inactive" || !hasAssignees ? "inactive" : "active",
      updated: "Just now",
    };
  };

  const save = () => {
    if (!canSave) return;
    onSave(published());
  };

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={20} />
          </button>
          <h1 className="truncate text-heading-lg text-foreground">
            {isEditing ? "Edit action" : "Create action"}
          </h1>
        </div>
        <Button size="sm" disabled={!canSave} onClick={save}>
          Save action
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Assignment reads the same here as on response cards and live coaching:
            a widget top-left, not a step in the setup flow. */}
        <aside className="hidden w-[300px] shrink-0 flex-col overflow-auto py-6 pl-6 lg:flex">
          <AssignTeamAndGroups
            members={TEAM_MEMBERS}
            groups={USER_GROUPS}
            selectedMembers={draft.teamMembers}
            selectedGroups={draft.userGroups}
            onMembersChange={(teamMembers) => patch({ teamMembers })}
            onGroupsChange={(userGroups) => patch({ userGroups })}
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-6 py-6">
            {needsReconnect && integration ? (
              <Banner
                variant="warning"
                width="page"
                title={`Connect ${integration.name} to continue`}
                actions={
                  <Button
                    size="xs"
                    variant="grey-outline"
                    onClick={() => connectIntegration(integration.id)}
                  >
                    Connect {integration.name}
                  </Button>
                }
              >
                This setup is kept as-is. Connecting uses your existing JustCall
                integration — nothing is written yet.
              </Banner>
            ) : null}

            <ol className="flex flex-col">
              <SetupStep
                first
                badge="When"
                title="Caller says"
                description="Outline the conversation moment that should surface this action."
              >
                <textarea
                  id="action-detect-when"
                  rows={3}
                  value={draft.detectWhen}
                  onChange={(event) => patch({ detectWhen: event.target.value })}
                  placeholder="e.g. The customer mentions a competitor they use or are evaluating"
                  className={textareaClass}
                />
              </SetupStep>

              <SetupStep
                badge="Then"
                title="Agent Assist suggests"
                description="Pick the connected app and what the agent can run in one tap."
              >
                <ActionPicker
                  integrations={integrations}
                  selectedIntegrationId={draft.integrationId}
                  selectedCapabilityId={draft.capabilityId}
                  onSelectIntegration={selectIntegration}
                  onSelectOperation={selectOperation}
                  onConnect={connectIntegration}
                />
              </SetupStep>

              <SetupStep
                last
                badge="Trigger Action"
                title="Action details"
                description={
                  capability && integration
                    ? `Set what ${integration.name} receives when the agent confirms.`
                    : "Choose an app and action above to set up what it receives."
                }
              >
                {capability && integration?.connected ? (
                  <ConfigCard>
                    {isEmail ? (
                      <EmailThenConfig
                        email={draft.email ?? createDefaultEmailConfig()}
                        onChange={patchEmail}
                      />
                    ) : (
                      <RecordThenConfig
                        needsRecord={needsRecord}
                        object={draft.object}
                        objectOptions={objectOptions}
                        property={draft.property}
                        value={draft.value}
                        onObjectChange={(object) => patch({ object })}
                        onPropertyChange={(property) => {
                          patch({
                            property,
                            value:
                              draft.value.kind === "from_conversation" &&
                              !extractTouched
                                ? {
                                    kind: "from_conversation",
                                    extractPrompt:
                                      defaultExtractPrompt(property),
                                  }
                                : draft.value,
                          });
                        }}
                        onValueKindChange={setValueSource}
                        onExtractChange={(extractPrompt) => {
                          setExtractTouched(true);
                          patch({
                            value: { kind: "from_conversation", extractPrompt },
                          });
                        }}
                        onFixedChange={(value) =>
                          patch({ value: { kind: "fixed", value } })
                        }
                      />
                    )}
                  </ConfigCard>
                ) : (
                  <div className="rounded-lg border border-dashed border-line px-4 py-5">
                    <p className="text-pretty text-paragraph-sm text-muted-foreground">
                      Nothing to configure yet — the fields here follow the
                      action you pick above.
                    </p>
                  </div>
                )}

                <Toggle
                  size="sm"
                  controlPosition="end"
                  checked={draft.requiresConfirmation}
                  onCheckedChange={(checked) =>
                    patch({ requiresConfirmation: checked })
                  }
                  label={
                    isEmail
                      ? "Ask agent to review before sending"
                      : "Ask the agent to confirm before writing"
                  }
                  description={
                    isEmail
                      ? "The agent can review and edit the generated email before it is sent."
                      : "On by default for actions that write to a connected app."
                  }
                  wrapperClassName="justify-between"
                />
              </SetupStep>
            </ol>

            <div className="flex flex-col gap-4 lg:hidden">
              <AssignTeamAndGroups
                members={TEAM_MEMBERS}
                groups={USER_GROUPS}
                selectedMembers={draft.teamMembers}
                selectedGroups={draft.userGroups}
                onMembersChange={(teamMembers) => patch({ teamMembers })}
                onGroupsChange={(userGroups) => patch({ userGroups })}
              />
              <AgentPreviewPanel draft={draft} integrations={integrations} />
            </div>
          </div>
        </div>

        <aside className="hidden w-[360px] shrink-0 flex-col overflow-auto border-l border-line bg-secondary-bg lg:flex">
          <AgentPreviewPanel draft={draft} integrations={integrations} />
        </aside>
      </div>
    </main>
  );
}

/**
 * App, then operation — two labelled selects instead of one long radio list of
 * every operation across every app. Disconnected apps stay pickable so the
 * connect step happens in place rather than sending the user to Integrations.
 */
function ActionPicker({
  integrations,
  selectedIntegrationId,
  selectedCapabilityId,
  onSelectIntegration,
  onSelectOperation,
  onConnect,
}: {
  integrations: Integration[];
  selectedIntegrationId: IntegrationId;
  selectedCapabilityId: string;
  onSelectIntegration: (id: IntegrationId) => void;
  onSelectOperation: (integrationId: IntegrationId, capabilityId: string) => void;
  onConnect: (id: IntegrationId) => void;
}) {
  const connected = integrations.filter((item) => item.connected);
  const disconnected = integrations.filter((item) => !item.connected);

  const appOptions: DropdownListItem[] = [
    ...connected.map((item) => ({ value: item.id, label: item.name })),
    ...(disconnected.length > 0
      ? ([
          { type: "separator" },
          { type: "heading", label: "Not connected" },
          ...disconnected.map((item) => ({
            value: item.id,
            label: item.name,
          })),
        ] as DropdownListItem[])
      : []),
  ];

  const selected = integrations.find((item) => item.id === selectedIntegrationId);
  const operations = selected ? operationsForIntegration(selected) : [];
  const operationOptions: DropdownListItem[] = operations.map((operation) => ({
    value: operation.id,
    label: operation.label,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 @md:grid-cols-2">
        <Dropdown
          label="App"
          placeholder="Select an app"
          searchable={false}
          options={appOptions}
          value={selectedIntegrationId}
          onValueChange={(next) =>
            onSelectIntegration(pick(next) as IntegrationId)
          }
          triggerClassName="h-9"
        />
        <Dropdown
          label="Action"
          placeholder={
            selected?.connected ? "Select an action" : "Connect the app first"
          }
          searchable={false}
          disabled={!selected?.connected}
          options={operationOptions}
          value={selectedCapabilityId}
          onValueChange={(next) =>
            onSelectOperation(selectedIntegrationId, pick(next))
          }
          triggerClassName="h-9"
        />
      </div>

      {selected && !selected.connected ? (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-secondary-bg px-4 py-3">
          <div className="flex flex-col gap-1">
            <p className="text-label-md-semi text-foreground">
              Connect {selected.name} to continue
            </p>
            <p className="text-pretty text-paragraph-sm text-muted-foreground">
              {selected.connectHint} Uses your existing JustCall connection —
              this setup stays exactly where you left it.
            </p>
          </div>
          <Button
            size="sm"
            className="self-start"
            onClick={() => onConnect(selected.id)}
          >
            Connect {selected.name}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function RecordThenConfig({
  needsRecord,
  object,
  objectOptions,
  property,
  value,
  onObjectChange,
  onPropertyChange,
  onValueKindChange,
  onExtractChange,
  onFixedChange,
}: {
  needsRecord: boolean;
  object: string;
  objectOptions: { value: string; label: string }[];
  property: string;
  value: ActionValueSource;
  onObjectChange: (value: string) => void;
  onPropertyChange: (value: string) => void;
  onValueKindChange: (kind: ActionValueSource["kind"]) => void;
  onExtractChange: (value: string) => void;
  onFixedChange: (value: string) => void;
}) {
  return (
    <FieldGroup title={needsRecord ? "Record and field" : "Value"}>
      <div className="grid gap-3 @md:grid-cols-2">
        {needsRecord ? (
          <>
            <Dropdown
              label="Record"
              placeholder="Select a record"
              searchable={false}
              options={objectOptions}
              value={object}
              onValueChange={(next) => onObjectChange(pick(next))}
              triggerClassName="h-9"
            />
            <Dropdown
              label="Field"
              placeholder="Select a field"
              searchable
              searchPlaceholder="Search fields"
              options={ACTION_PROPERTY_OPTIONS}
              value={property}
              onValueChange={(next) => onPropertyChange(pick(next))}
              triggerClassName="h-9"
            />
          </>
        ) : null}
        <Dropdown
          label="Value comes from"
          placeholder="Select a source"
          searchable={false}
          options={VALUE_SOURCE_OPTIONS}
          value={value.kind}
          onValueChange={(next) =>
            onValueKindChange(pick(next) as ActionValueSource["kind"])
          }
          triggerClassName="h-9"
        />
      </div>

      {needsRecord && !property ? null : value.kind === "from_conversation" ? (
        <InputField
          label="What should AI extract?"
          placeholder="The competitor the customer is currently using or evaluating."
          value={value.kind === "from_conversation" ? value.extractPrompt : ""}
          onChange={(event) => onExtractChange(event.target.value)}
          clearable={false}
        />
      ) : (
        <InputField
          label="Fixed value"
          placeholder="e.g. Qualified"
          value={value.kind === "fixed" ? value.value : ""}
          onChange={(event) => onFixedChange(event.target.value)}
          clearable={false}
        />
      )}
    </FieldGroup>
  );
}

const textareaClass =
  "w-full resize-y rounded-[4px] border border-line bg-white px-3 py-2.5 text-paragraph-md text-foreground placeholder:text-disabled-fg outline-none hover:border-control-border focus:border-brand focus:ring-2 focus:ring-brand/16";

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-label-md text-foreground">
      {children}
    </label>
  );
}

function VariableChips({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {EMAIL_TEMPLATE_VARIABLES.map((variable) => (
        <button
          key={variable}
          type="button"
          onClick={() => onInsert(`{{${variable}}}`)}
          className="cursor-pointer rounded-[4px] border border-line bg-white px-1.5 py-0.5 font-mono text-[12px] leading-4 text-muted-foreground outline-none hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          {`{{${variable}}}`}
        </button>
      ))}
    </div>
  );
}

function appendToken(current: string, token: string): string {
  if (current.includes(token)) return current;
  if (!current.trim()) return token;
  return `${current.trim()} ${token}`;
}

function EmailThenConfig({
  email,
  onChange,
}: {
  email: EmailActionConfig;
  onChange: (partial: Partial<EmailActionConfig>) => void;
}) {
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkName, setLinkName] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const attachedIds = new Set(email.attachments.map((item) => item.id));

  const addAttachment = (item: EmailAttachment) => {
    if (attachedIds.has(item.id)) return;
    onChange({ attachments: [...email.attachments, item] });
  };

  const addLink = () => {
    const name = linkName.trim();
    const href = linkUrl.trim();
    if (!name || !href) return;
    addAttachment({
      id: `att-${Date.now()}`,
      name,
      kind: "url",
      href,
    });
    setLinkName("");
    setLinkUrl("");
    setLinkOpen(false);
    setAttachOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup title="Recipient">
        <Dropdown
          label="Send email to"
          placeholder="Choose recipient"
          options={EMAIL_RECIPIENT_OPTIONS}
          value={email.recipient}
          onValueChange={(next) => {
            const recipient = (
              Array.isArray(next) ? next[0] : next
            ) as EmailRecipientKind;
            onChange({ recipient });
          }}
          className="max-w-[320px]"
          triggerClassName="h-9"
        />
        {email.recipient === "crm_field" ? (
          <Dropdown
            label="CRM email field"
            placeholder="Choose field"
            options={EMAIL_CRM_FIELD_OPTIONS}
            value={email.crmField}
            onValueChange={(next) =>
              onChange({ crmField: Array.isArray(next) ? next[0] ?? "" : next })
            }
            className="max-w-[320px]"
            triggerClassName="h-9"
          />
        ) : null}
        {email.recipient === "custom" ? (
          <InputField
            label="Email address"
            type="email"
            placeholder="name@company.com"
            value={email.customEmail}
            onChange={(event) => onChange({ customEmail: event.target.value })}
            clearable={false}
            wrapperClassName="max-w-[320px]"
          />
        ) : null}
      </FieldGroup>

      <FieldGroup title="Email content">
        <div className="flex flex-col gap-2">
          <InputField
            label="Subject"
            placeholder="JustCall vs {{competitor_name}}"
            value={email.subject}
            onChange={(event) => onChange({ subject: event.target.value })}
            clearable={false}
          />
          <VariableChips
            onInsert={(token) => onChange({ subject: appendToken(email.subject, token) })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="action-email-message">Message</FieldLabel>
          <textarea
            id="action-email-message"
            rows={8}
            value={email.message}
            onChange={(event) => onChange({ message: event.target.value })}
            placeholder="Hi {{first_name}},&#10;&#10;Based on what we discussed…"
            className={textareaClass}
          />
          <VariableChips
            onInsert={(token) => onChange({ message: appendToken(email.message, token) })}
          />
        </div>
      </FieldGroup>

      <FieldGroup title="AI personalization">
        <Toggle
          size="sm"
          controlPosition="end"
          checked={email.personalize}
          onCheckedChange={(personalize) => onChange({ personalize })}
          label="Personalize using conversation context"
          description="AI adapts the email using relevant details from the current conversation."
          wrapperClassName="justify-between"
        />
        {email.personalize ? (
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="action-email-include">What should AI include?</FieldLabel>
            <textarea
              id="action-email-include"
              rows={3}
              value={email.includeInstructions}
              onChange={(event) =>
                onChange({ includeInstructions: event.target.value })
              }
              placeholder="Include the competitor discussed, relevant JustCall differentiators, and any follow-up items promised during the call."
              className={textareaClass}
            />
          </div>
        ) : null}
      </FieldGroup>

      <FieldGroup title="Attachments">
        <Button
          variant="link"
          size="sm"
          className="self-start"
          onClick={() => setAttachOpen(true)}
        >
          + Add document or link
        </Button>
        {email.attachments.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {email.attachments.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-[4px] border border-line bg-white px-3 py-2"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-muted-foreground">
                  <IconFile size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label-md text-foreground">{item.name}</p>
                  <p className="text-label-sm text-muted-foreground">
                    {item.kind === "url"
                      ? "Link"
                      : item.kind === "article"
                        ? "Help article"
                        : item.kind === "pdf"
                          ? "PDF"
                          : "Document"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() =>
                    onChange({
                      attachments: email.attachments.filter(
                        (attachment) => attachment.id !== item.id
                      ),
                    })
                  }
                  className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                >
                  <IconClose size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </FieldGroup>

      <Modal
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        size="sm"
        title="Add document or link"
        footer={
          <Button
            variant="grey-outline"
            size="sm"
            onClick={() => setAttachOpen(false)}
          >
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1">
            {EMAIL_ATTACHMENT_PRESETS.map((item) => {
              const added = attachedIds.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => addAttachment(item)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[4px] px-2 py-2 text-left outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24 disabled:opacity-50",
                      added && "cursor-default"
                    )}
                  >
                    <span className="text-label-md text-foreground">{item.name}</span>
                    <span className="text-label-sm text-muted-foreground">
                      {added
                        ? "Added"
                        : item.kind === "article"
                          ? "Article"
                          : item.kind === "pdf"
                            ? "PDF"
                            : "Document"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Button
            variant="link"
            size="sm"
            className="self-start"
            onClick={() => setLinkOpen(true)}
          >
            + Add URL
          </Button>
        </div>
      </Modal>

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        size="sm"
        title="Add link"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="grey-outline"
              size="sm"
              onClick={() => setLinkOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!linkName.trim() || !linkUrl.trim()}
              onClick={addLink}
            >
              Add link
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <InputField
            label="Name"
            placeholder="e.g. JustCall vs Dialpad"
            value={linkName}
            onChange={(event) => setLinkName(event.target.value)}
            clearable={false}
          />
          <InputField
            label="URL"
            placeholder="https://"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            clearable={false}
          />
        </div>
      </Modal>
    </div>
  );
}

function AgentPreviewPanel({
  draft,
  integrations,
}: {
  draft: AgentAction;
  integrations: Integration[];
}) {
  const ready = Boolean(draft.capabilityId);

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex min-w-0 flex-col gap-1">
        <SectionKicker>Agent preview</SectionKicker>
        <p className="text-pretty text-paragraph-sm text-muted-foreground">
          What the agent will see during the call.
        </p>
      </div>

      {ready ? (
        <ActionInCallPreview action={draft} integrations={integrations} />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-3 py-4">
          <p className="text-pretty text-paragraph-sm text-muted-foreground">
            Choose what the agent should do to see a preview.
          </p>
        </div>
      )}
    </div>
  );
}

