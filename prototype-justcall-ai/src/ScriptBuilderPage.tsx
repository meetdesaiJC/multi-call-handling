import * as React from "react";
import { Button } from "@/components/Button";
import { IconClose, IconEye } from "@/components/Icon";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import { useAgentAssistTakeover } from "./agentAssistTakeover";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import { PlaybookEditor } from "./PlaybookEditor";
import { ScriptPreviewModal } from "./ScriptTestPanel";
import { ScriptUploadWizard } from "./ScriptUploadWizard";
import {
  countSteps,
  createBlankPlaybook,
  createPlaybookFromTemplate,
  playbookUnknownFields,
  playbookUsedFields,
  SCRIPT_TEAM_MEMBERS,
  SCRIPT_USER_GROUPS,
  type ScriptPlaybook,
  type ScriptTemplateId,
} from "./scriptPlaybook";
import { FieldFallbacksCard } from "./ContactFieldControls";
import { contactFieldMeta } from "./contactFields";

export type BuilderLaunch =
  | { type: "blank" }
  | { type: "upload" }
  | { type: "template"; templateId: ScriptTemplateId }
  | { type: "edit"; playbook: ScriptPlaybook };

export interface ScriptBuilderPageProps {
  launch: BuilderLaunch;
  onClose: () => void;
  onPublish: (playbook: ScriptPlaybook) => void;
}

export function ScriptBuilderPage({ launch, onClose, onPublish }: ScriptBuilderPageProps) {
  useAgentAssistTakeover();
  const [playbook, setPlaybook] = React.useState<ScriptPlaybook>(() => {
    if (launch.type === "edit") return launch.playbook;
    if (launch.type === "template") return createPlaybookFromTemplate(launch.templateId);
    return createBlankPlaybook();
  });
  const [uploadOpen, setUploadOpen] = React.useState(launch.type === "upload");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const canPublish = playbook.stages.some((stage) => stage.steps.length > 0);
  const hasAssignees =
    playbook.assignedMembers.length > 0 || playbook.assignedGroups.length > 0;
  const canConfirmPublish = canPublish && hasAssignees;
  const stepCount = countSteps(playbook);
  const usedFields = playbookUsedFields(playbook);
  const unknownFields = playbookUnknownFields(playbook);
  /**
   * A field left to say nothing is a decision, not an omission — but it is one
   * worth showing before publish, because the sentence the admin wrote is not
   * the sentence half their calls will hear.
   */
  const silentFields = usedFields.filter(
    (id) => (playbook.fieldFallbacks[id] ?? "").trim().length === 0
  );

  const updatePlaybook = (patch: Partial<ScriptPlaybook>) => {
    setPlaybook((current) => ({ ...current, ...patch }));
  };

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
          <h1 className="truncate text-heading-lg text-foreground">
            {launch.type === "edit" ? "Edit script" : "Create script"}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="grey-outline"
            size="sm"
            leftIcon={<IconEye size={16} />}
            onClick={() => setPreviewOpen(true)}
          >
            Preview
          </Button>
          <Button
            size="sm"
            disabled={!canPublish}
            onClick={() => setPublishOpen(true)}
          >
            Publish
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden bg-white px-6 py-6">
          <aside className="flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto">
            <AssignTeamAndGroups
              members={SCRIPT_TEAM_MEMBERS}
              groups={SCRIPT_USER_GROUPS}
              selectedMembers={playbook.assignedMembers}
              selectedGroups={playbook.assignedGroups}
              onMembersChange={(assignedMembers) => updatePlaybook({ assignedMembers })}
              onGroupsChange={(assignedGroups) => updatePlaybook({ assignedGroups })}
            />
            {/* Appears the moment the first field goes in, and only then —
                a script with no fields has nothing to fall back to. */}
            <FieldFallbacksCard
              used={usedFields}
              fallbacks={playbook.fieldFallbacks}
              onChange={(fieldFallbacks) => updatePlaybook({ fieldFallbacks })}
            />
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            <section className="flex shrink-0 flex-col gap-4 rounded-lg border border-line bg-white p-4">
              <InputField
                label="Script name"
                placeholder="e.g. Discovery call"
                value={playbook.name}
                onChange={(e) => updatePlaybook({ name: e.target.value })}
                helpText="Give this script an internal name so your team can identify it."
                helpIcon
                clearable={false}
              />
            </section>
            <PlaybookEditor
              playbook={playbook}
              onChange={setPlaybook}
              onImportDocument={() => setUploadOpen(true)}
            />
          </div>
        </div>

      <ScriptUploadWizard
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onImport={(next) => {
          setPlaybook(next);
          setUploadOpen(false);
        }}
      />

      <ScriptPreviewModal
        open={previewOpen}
        playbook={playbook}
        onClose={() => setPreviewOpen(false)}
      />

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        size="sm"
        className="overflow-visible"
        bodyClassName="overflow-visible"
        title="Ready to publish"
        description="Agents will start seeing this script on matching conversations."
        footer={
          <>
            <Button variant="grey-outline" size="sm" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!canConfirmPublish}
              onClick={() => {
                if (!canConfirmPublish) return;
                onPublish(playbook);
              }}
            >
              Publish
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-8">
              <SummaryRow label="Script" value={playbook.name} />
              <SummaryRow
                label="Steps"
                value={`${stepCount} ${stepCount === 1 ? "step" : "steps"}`}
              />
            </div>
            <AssignTeamAndGroups
              variant="summary"
              members={SCRIPT_TEAM_MEMBERS}
              groups={SCRIPT_USER_GROUPS}
              selectedMembers={playbook.assignedMembers}
              selectedGroups={playbook.assignedGroups}
              onMembersChange={(assignedMembers) => updatePlaybook({ assignedMembers })}
              onGroupsChange={(assignedGroups) => updatePlaybook({ assignedGroups })}
            />
            {usedFields.length > 0 ? (
              <div className="min-w-0">
                <dt className="text-label-sm text-muted-foreground">
                  Contact fields
                </dt>
                <dd className="text-paragraph-md text-foreground">
                  {usedFields.map((id) => contactFieldMeta(id).label).join(", ")}
                </dd>
                {silentFields.length > 0 ? (
                  <p className="mt-1 text-paragraph-sm text-warning-text">
                    {silentFields.map((id) => contactFieldMeta(id).label).join(", ")}
                    {silentFields.length === 1 ? " has" : " have"} no fallback —
                    agents will skip {silentFields.length === 1 ? "it" : "them"}{" "}
                    when the record is empty.
                  </p>
                ) : null}
                {unknownFields.length > 0 ? (
                  <p className="mt-1 text-paragraph-sm text-error">
                    {unknownFields.map((name) => `{{${name}}}`).join(", ")}{" "}
                    {unknownFields.length === 1 ? "is not a" : "are not"} contact
                    field{unknownFields.length === 1 ? "" : "s"} and will be
                    dropped from what agents see.
                  </p>
                ) : null}
              </div>
            ) : null}
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-label-sm text-muted-foreground">{label}</dt>
      <dd className="text-paragraph-md text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
