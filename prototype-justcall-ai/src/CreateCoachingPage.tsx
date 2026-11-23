import * as React from "react";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import { IconClose } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { useAgentAssistTakeover } from "./agentAssistTakeover";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import { HeaderEditableTitle } from "./HeaderEditableTitle";
import { TEAM_MEMBERS, USER_GROUPS } from "./guidanceData";
import {
  COACHING_REPEAT_OPTIONS,
  COACHING_TEMPLATE_GROUPS,
  applyCoachingTrigger,
  coachingCardMessage,
  coachingFrequencyLabel,
  coachingOnRecommendedDetection,
  coachingStartSentence,
  coachingTemplate,
  coachingTemplatesInGroup,
  coachingTriggerOption,
  coachingTriggerSentence,
  coachingWindowOptions,
  createCoachingRuleFromTemplate,
  restoreCoachingDetection,
  type CoachingFrequency,
  type CoachingRule,
  type CoachingSentenceSegment,
  type CoachingTemplateId,
} from "./coachingData";
import { CoachingCardFace, CoachingCueIcon, coachingTone } from "./coachingVisuals";

/**
 * Live Coaching setup, template-first. The picker shows coaching concepts
 * (how the conversation is going), not detection variants. After a pick,
 * recommended trigger values are pre-filled so the admin can adjust
 * direction, threshold, duration, repeat, message, and audience.
 */

export type CoachingStartChoice = { type: "template"; templateId: CoachingTemplateId };

export function CoachingTemplatesModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (choice: CoachingStartChoice) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Set up live coaching"
      description="Choose the conversation behaviors you want Agent Assist to monitor and coach on during calls. Each option comes with recommended settings you can adjust."
    >
      <div className="flex flex-col gap-5">
        {COACHING_TEMPLATE_GROUPS.map((group) => (
          <section key={group.id} className="flex flex-col gap-2">
            <h3 className="text-label-sm font-medium tracking-[0.04em] text-muted-foreground uppercase">
              {group.label}
            </h3>
            <ul className="flex flex-col gap-2">
              {coachingTemplatesInGroup(group.id).map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => onSelect({ type: "template", templateId: template.id })}
                    className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-line bg-white p-3 text-left outline-none transition-colors hover:border-brand hover:bg-brand-subtle/30 focus-visible:ring-2 focus-visible:ring-brand/24"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-[6px]",
                        coachingTone(template.id).well
                      )}
                    >
                      <CoachingCueIcon templateId={template.id} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-label-md-semi text-foreground">
                        {template.name}
                      </span>
                      <span className="text-pretty text-paragraph-sm text-muted-foreground">
                        {template.description}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}

export interface CreateCoachingPageProps {
  initial: CoachingRule;
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (rule: CoachingRule) => void;
}

export function CreateCoachingPage({
  initial,
  mode,
  onClose,
  onSave,
}: CreateCoachingPageProps) {
  useAgentAssistTakeover();
  const [draft, setDraft] = React.useState<CoachingRule>(initial);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const template = coachingTemplate(draft.templateId);
  const trigger = coachingTriggerOption(template, draft.triggerId);
  const windowOptions = coachingWindowOptions(template, draft.triggerId);
  const showDirection = template.triggers.length > 1;
  const showThreshold = trigger.thresholdOptions.length > 1;
  const showWindow = windowOptions.length > 1;
  const onDefaults = coachingOnRecommendedDetection(draft);

  const patch = (partial: Partial<CoachingRule>) =>
    setDraft((current) => ({ ...current, ...partial }));

  const canSave = draft.name.trim().length > 0 && draft.message.trim().length > 0;
  const hasAssignees = draft.teamMembers.length > 0 || draft.userGroups.length > 0;

  const toOptions = (values: string[]) =>
    values.map((value) => ({ value, label: value }));

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={20} />
          </button>
          <HeaderEditableTitle
            value={draft.name}
            onChange={(name) => patch({ name })}
            placeholder={template.name}
            nameLabel="Live coaching name"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" disabled={!canSave} onClick={() => setPublishOpen(true)}>
            {mode === "edit" ? "Save" : "Publish"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden p-6">
        <aside className="flex w-[300px] shrink-0 flex-col overflow-auto">
          <AssignTeamAndGroups
            members={TEAM_MEMBERS}
            groups={USER_GROUPS}
            selectedMembers={draft.teamMembers}
            selectedGroups={draft.userGroups}
            onMembersChange={(teamMembers) => patch({ teamMembers })}
            onGroupsChange={(userGroups) => patch({ userGroups })}
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto pr-1">
          <SectionCard title="When to coach">
            <div className="grid grid-cols-2 gap-3">
              {showDirection ? (
                <Dropdown
                  label={template.triggerLabel}
                  searchable={false}
                  options={template.triggers.map((item) => ({
                    value: item.id,
                    label: item.label,
                  }))}
                  value={draft.triggerId}
                  onValueChange={(value) =>
                    setDraft((current) =>
                      applyCoachingTrigger(
                        current,
                        Array.isArray(value) ? value[0]! : value
                      )
                    )
                  }
                  triggerClassName="h-9"
                />
              ) : null}
              {showThreshold ? (
                <Dropdown
                  label={template.thresholdLabel}
                  searchable={false}
                  options={toOptions(trigger.thresholdOptions)}
                  value={draft.threshold}
                  onValueChange={(value) =>
                    patch({ threshold: Array.isArray(value) ? value[0]! : value })
                  }
                  triggerClassName="h-9"
                />
              ) : null}
              {showWindow ? (
                <Dropdown
                  label={template.windowLabel}
                  searchable={false}
                  options={toOptions(windowOptions)}
                  value={draft.window}
                  onValueChange={(value) =>
                    patch({ window: Array.isArray(value) ? value[0]! : value })
                  }
                  triggerClassName="h-9"
                />
              ) : null}
              <Dropdown
                label="Start checking"
                searchable={false}
                options={toOptions(template.startAfterOptions)}
                value={draft.startAfter}
                onValueChange={(value) =>
                  patch({ startAfter: Array.isArray(value) ? value[0]! : value })
                }
                triggerClassName="h-9"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Sentence segments={coachingTriggerSentence(draft)} />
              <Sentence segments={coachingStartSentence(draft)} />
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <span className="text-label-md text-foreground">Repeat coaching</span>
              <Dropdown
                variant="borderless"
                searchable={false}
                options={COACHING_REPEAT_OPTIONS}
                value={draft.frequency}
                onValueChange={(value) =>
                  patch({
                    frequency: (Array.isArray(value) ? value[0] : value) as CoachingFrequency,
                  })
                }
                className="w-auto"
                triggerClassName="h-8 w-auto gap-1 px-2 text-brand"
              />
              {draft.frequency === "cooldown" ? (
                <div className="flex items-center gap-2">
                  <InputField
                    aria-label="Cooldown in minutes"
                    type="number"
                    min={1}
                    value={String(draft.cooldownMinutes)}
                    onChange={(event) =>
                      patch({ cooldownMinutes: Math.max(1, Number(event.target.value) || 1) })
                    }
                    clearable={false}
                    wrapperClassName="w-[92px]"
                  />
                  <span className="text-paragraph-md text-muted-foreground">minutes</span>
                </div>
              ) : null}
              {onDefaults ? null : (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setDraft((current) => restoreCoachingDetection(current))}
                >
                  Restore recommended
                </Button>
              )}
            </div>
          </SectionCard>

          <SectionCard title="What the agent sees">
            <InputField
              label="Coaching message"
              placeholder={trigger.message}
              value={draft.message}
              onChange={(event) => patch({ message: event.target.value })}
              clearable={false}
            />
            <CoachingPreview rule={draft} caption={false} />
          </SectionCard>
        </div>
      </div>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        size="sm"
        className="overflow-visible"
        bodyClassName="overflow-visible"
        title="Ready to publish"
        description="Assigned agents start getting this nudge when the behaviour shows up."
        footer={
          <>
            <Button variant="grey-outline" size="sm" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!hasAssignees}
              onClick={() =>
                onSave({
                  ...draft,
                  name: draft.name.trim(),
                  message: draft.message.trim(),
                  status: "live",
                  updated: "Just now",
                })
              }
            >
              Publish
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-label-sm text-muted-foreground">Live coaching</dt>
            <dd className="text-paragraph-md text-foreground">{draft.name}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-muted-foreground">When to coach</dt>
            <dd className="mt-0.5">
              <Sentence segments={coachingTriggerSentence(draft)} />
              <p className="text-paragraph-sm text-muted-foreground">
                Repeats: {coachingFrequencyLabel(draft).toLowerCase()}
              </p>
            </dd>
          </div>
          <AssignTeamAndGroups
            variant="summary"
            members={TEAM_MEMBERS}
            groups={USER_GROUPS}
            selectedMembers={draft.teamMembers}
            selectedGroups={draft.userGroups}
            onMembersChange={(teamMembers) => patch({ teamMembers })}
            onGroupsChange={(userGroups) => patch({ userGroups })}
          />
          {!hasAssignees ? (
            <p className="text-paragraph-sm text-muted-foreground">
              Assign at least one team member or user group to publish.
            </p>
          ) : null}
        </dl>
      </Modal>
    </main>
  );
}

/** The banner exactly as it lands mid-call, so the wording can be judged. */
export function CoachingPreview({
  rule,
  caption = true,
}: {
  rule: CoachingRule;
  caption?: boolean;
}) {
  const tone = coachingTone(rule.templateId);

  return (
    <div className="flex flex-col gap-1.5">
      {caption ? (
        <span className="text-label-sm text-muted-foreground">
          What the agent sees during the call
        </span>
      ) : null}
      <div className={cn("overflow-hidden rounded-lg", tone.card)}>
        <CoachingCardFace
          rule={{
            ...rule,
            message: rule.message || "Your title shows up here",
          }}
          observation={coachingCardMessage(rule)}
          action={
            <span
              className={cn(
                "-mt-0.5 -mr-1 inline-flex h-7 shrink-0 items-center px-2 text-label-sm font-medium",
                tone.ink
              )}
            >
              Got it
            </span>
          }
        />
      </div>
    </div>
  );
}

/** Detection read back in plain language, with the chosen values weighted. */
function Sentence({ segments }: { segments: CoachingSentenceSegment[] }) {
  return (
    <p className="text-pretty text-paragraph-md text-muted-foreground">
      {segments.map((segment, index) =>
        segment.strong ? (
          <strong key={index} className="font-medium text-foreground">
            {segment.text}
          </strong>
        ) : (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        )
      )}
    </p>
  );
}

function SectionCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4">
      {title ? <h2 className="text-label-md-semi text-foreground">{title}</h2> : null}
      {children}
    </section>
  );
}

export { createCoachingRuleFromTemplate };
