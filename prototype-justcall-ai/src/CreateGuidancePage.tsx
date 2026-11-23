import * as React from "react";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Dropdown } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import {
  IconClose,
  IconEye,
  IconFile,
  IconSparkles,
} from "@/components/Icon";
import { cn } from "@/lib/utils";
import { useAgentAssistTakeover } from "./agentAssistTakeover";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import {
  GUIDANCE_TRIGGERED_BY_OPTIONS,
  TEAM_MEMBERS,
  USER_GROUPS,
  createEmptyGuidance,
  customerLineForGuidance,
  guidanceTriggeredBy,
  placeholdersForGuidance,
  priorityForGuidance,
  proposeGuidanceFromKnowledge,
  stanceForGuidance,
  type GuidanceItem,
  type GuidanceResource,
  type GuidanceTemplateId,
  type GuidanceTriggeredBy,
} from "./guidanceData";
import {
  SEED_KNOWLEDGE_SOURCES,
  knowledgeCoverageForTrigger,
  knowledgeEntryCount,
  knowledgeRetrievableEntries,
  liveKnowledgeSources,
  type KnowledgeSourceRecord,
} from "./knowledgeData";
import { IconKnowledge } from "./LiveAgentAssistPanel";
import { BattlecardThumb, GuidanceResourceModal } from "./GuidanceCard";
import { LiveGuidanceCard } from "./LiveGuidance";

export interface CreateGuidancePageProps {
  initial?: GuidanceItem | null;
  /** Defaults to edit when `initial` is set, create otherwise. */
  mode?: "create" | "edit";
  templateId?: GuidanceTemplateId | null;
  /** Sources AI can draft response cards from, and the coverage hint reads. */
  knowledgeSources?: KnowledgeSourceRecord[];
  /**
   * V1: AI drafting from a Knowledge Base. Off on V2, where a response card
   * is always authored rather than generated.
   */
  allowGenerate?: boolean;
  /** Opens the AI drafting flow immediately — "Generate with AI". */
  startWithGenerate?: boolean;
  /** Offered when Knowledge already covers the trigger. Optional escape hatch. */
  onUseKnowledgeInstead?: () => void;
  /**
   * Leaves for the Knowledge page. The way out when AI drafting has nothing to
   * draw on — no Knowledge Base, none live, or none with answers.
   */
  onOpenKnowledge?: () => void;
  onClose: () => void;
  onSave: (item: GuidanceItem) => void;
}

function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function LinkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.5 9.5 9.5 6.5M7 5.2l.8-.8a2.5 2.5 0 1 1 3.5 3.5l-.8.8M9 10.8l-.8.8a2.5 2.5 0 1 1-3.5-3.5l.8-.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

function SectionCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4">
      {title ? (
        <div className="flex flex-col gap-1">
          <h2 className="text-label-md-semi text-foreground">{title}</h2>
          {description ? (
            <p className="text-paragraph-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function CreateGuidancePage({
  initial,
  mode,
  templateId = null,
  knowledgeSources = SEED_KNOWLEDGE_SOURCES,
  allowGenerate = false,
  startWithGenerate = false,
  onUseKnowledgeInstead,
  onOpenKnowledge,
  onClose,
  onSave,
}: CreateGuidancePageProps) {
  useAgentAssistTakeover();
  const isEditing = mode ? mode === "edit" : Boolean(initial);
  const placeholders = placeholdersForGuidance(templateId);
  const [draft, setDraft] = React.useState<GuidanceItem>(
    () => initial ?? createEmptyGuidance()
  );
  const [generateOpen, setGenerateOpen] = React.useState(
    allowGenerate && startWithGenerate
  );
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkName, setLinkName] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [imageOpen, setImageOpen] = React.useState(false);
  const [imageName, setImageName] = React.useState("");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState("");
  const [imageError, setImageError] = React.useState("");
  const [isDraggingImage, setIsDraggingImage] = React.useState(false);
  const [testPreviewOpen, setTestPreviewOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [viewingResource, setViewingResource] =
    React.useState<GuidanceResource | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const [keepGuidanceFor, setKeepGuidanceFor] = React.useState<string[]>([]);

  const patch = (partial: Partial<GuidanceItem>) => {
    setDraft((current) => ({ ...current, ...partial }));
    setTestPreviewOpen(false);
  };

  /**
   * Nothing here blocks the admin (§2). When the trigger reads like a factual
   * question that Knowledge already answers, we say so once and let them pick;
   * dismissing is remembered per matched answer so the hint never nags.
   */
  const coverage = React.useMemo(
    () => knowledgeCoverageForTrigger(draft.trigger, knowledgeSources),
    [draft.trigger, knowledgeSources]
  );
  const showCoverage = Boolean(
    coverage && !keepGuidanceFor.includes(coverage.entry.id)
  );

  const canSave =
    draft.name.trim().length > 0 &&
    draft.trigger.trim().length > 0 &&
    (draft.suggestedResponse.trim().length > 0 ||
      draft.talkingPoints.some((point) => point.trim().length > 0));
  const hasAssignees =
    draft.teamMembers.length > 0 || draft.userGroups.length > 0;
  const canConfirmPublish = canSave && hasAssignees;

  const publishedItem = (): GuidanceItem => ({
    ...draft,
    name: draft.name.trim(),
    trigger: draft.trigger.trim(),
    suggestedResponse: draft.suggestedResponse.trim(),
    talkingPoints: draft.talkingPoints.filter((point) => point.trim()),
    updated: "Just now",
    status: "live",
  });

  const addTalkingPoint = () => {
    patch({ talkingPoints: [...draft.talkingPoints, ""] });
  };

  const addLink = () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    const resource: GuidanceResource = {
      id: `r-${Date.now()}`,
      type: "link",
      name: linkName.trim(),
      url: linkUrl.trim(),
    };
    patch({ resources: [...draft.resources, resource] });
    setLinkName("");
    setLinkUrl("");
    setLinkOpen(false);
  };

  const resetImageModal = (revokePreview: boolean) => {
    if (revokePreview && imagePreview) URL.revokeObjectURL(imagePreview);
    setImageName("");
    setImageFile(null);
    setImagePreview("");
    setImageError("");
    setIsDraggingImage(false);
  };

  const closeImageModal = () => {
    setImageOpen(false);
    resetImageModal(true);
  };

  const acceptImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setImageError("Use a PNG, JPG, GIF, or WebP image.");
      return;
    }
    setImageError("");
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageName((current) =>
      current.trim()
        ? current
        : file.name.replace(/\.[^.]+$/, "") || "Uploaded image"
    );
  };

  const addImage = () => {
    if (!imageName.trim() || !imageFile || !imagePreview) return;
    const resource: GuidanceResource = {
      id: `r-${Date.now()}`,
      type: "image",
      name: imageName.trim(),
      thumbnail: imagePreview,
    };
    patch({ resources: [...draft.resources, resource] });
    setImageOpen(false);
    resetImageModal(false);
  };

  const openPreview = () => {
    if (!canSave) return;
    setTestPreviewOpen(true);
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
            {isEditing ? "Edit response card" : "Create response card"}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="grey-outline"
            size="sm"
            disabled={!canSave}
            leftIcon={<IconEye size={16} />}
            onClick={openPreview}
          >
            Preview
          </Button>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => {
              if (!canSave) return;
              setPublishOpen(true);
            }}
          >
            {isEditing ? "Save" : "Create"}
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
          {/* Response cards can cover anything the business wants control over —
              including integrations and FAQs. On V1, AI drafting stays available
              rather than being the thing that decides what's allowed. */}
          {!isEditing ? (
            <div className="flex items-center gap-4 rounded-lg border border-line bg-secondary-bg px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-label-md-semi text-foreground">
                  Build a response card
                </p>
                <p className="mt-0.5 text-pretty text-paragraph-md text-foreground">
                  For anything you want agents to handle a particular way —
                  objections, policies, integrations, FAQs.
                </p>
              </div>
              {allowGenerate ? (
                <Button
                  variant="link"
                  size="sm"
                  className="shrink-0"
                  leftIcon={<IconSparkles size={16} />}
                  onClick={() => setGenerateOpen(true)}
                >
                  Generate from Knowledge Base
                </Button>
              ) : null}
            </div>
          ) : null}

          <SectionCard>
            <div className="flex flex-col gap-2">
              <InputField
                label="Response card name"
                placeholder={placeholders.name}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                clearable={false}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="guidance-trigger">When should this appear?</FieldLabel>
              <textarea
                id="guidance-trigger"
                rows={4}
                value={draft.trigger}
                onChange={(e) => patch({ trigger: e.target.value })}
                placeholder={placeholders.trigger}
                className={textareaClass}
              />
              {showCoverage && coverage ? (
                <KnowledgeCoverageHint
                  entryTitle={coverage.entry.title}
                  sourceName={coverage.source.name}
                  onUseKnowledge={onUseKnowledgeInstead}
                  onContinue={() =>
                    setKeepGuidanceFor((current) => [...current, coverage.entry.id])
                  }
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Dropdown
                label="Triggered by"
                searchable={false}
                options={GUIDANCE_TRIGGERED_BY_OPTIONS}
                value={guidanceTriggeredBy(draft)}
                onValueChange={(value) =>
                  patch({
                    triggeredBy: (Array.isArray(value)
                      ? value[0]
                      : value) as GuidanceTriggeredBy,
                  })
                }
                className="w-full max-w-[240px]"
                triggerClassName="h-9"
              />
            </div>
          </SectionCard>

          <SectionCard title="What should the agent see?">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="guidance-response">Suggested response</FieldLabel>
              <textarea
                id="guidance-response"
                rows={4}
                value={draft.suggestedResponse}
                onChange={(e) => patch({ suggestedResponse: e.target.value })}
                placeholder={placeholders.suggestedResponse}
                className={textareaClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <FieldLabel>Key talking points</FieldLabel>
                  {draft.talkingPoints.length === 0 ? (
                    <p className="text-paragraph-sm text-muted-foreground">
                      Optional short bullets the agent can scan during a call. Either a
                      suggested response or talking points is enough.
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto shrink-0 py-0"
                  onClick={addTalkingPoint}
                >
                  Add talking point
                </Button>
              </div>
              {draft.talkingPoints.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {draft.talkingPoints.map((point, index) => (
                    <div key={`point-${index}`} className="flex items-center gap-2">
                      <span className="text-paragraph-md text-muted-foreground">•</span>
                      <InputField
                        placeholder={placeholders.talkingPoint}
                        value={point}
                        onChange={(e) => {
                          const next = [...draft.talkingPoints];
                          next[index] = e.target.value;
                          patch({ talkingPoints: next });
                        }}
                        clearable={false}
                        wrapperClassName="flex-1"
                      />
                      <button
                        type="button"
                        aria-label={`Remove talking point ${index + 1}`}
                        onClick={() =>
                          patch({
                            talkingPoints: draft.talkingPoints.filter(
                              (_, i) => i !== index
                            ),
                          })
                        }
                        className="flex size-9 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                      >
                        <IconClose size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Supporting resources">
            <div className="flex items-center gap-3">
              <Button
                variant="grey-outline"
                size="sm"
                leftIcon={<LinkIcon size={16} />}
                onClick={() => setLinkOpen(true)}
              >
                Add link
              </Button>
              <Button
                variant="grey-outline"
                size="sm"
                leftIcon={<PlusIcon size={16} />}
                onClick={() => setImageOpen(true)}
              >
                Upload image
              </Button>
            </div>

            {draft.resources.length > 0 && (
              <ul className="flex flex-col gap-2">
                {draft.resources.map((resource) => (
                  <li
                    key={resource.id}
                    className="flex items-center gap-3 rounded-[4px] border border-line px-3 py-2"
                  >
                    {resource.type === "image" ? (
                      <span className="flex size-10 shrink-0 overflow-hidden rounded-[6px] border border-line bg-secondary-bg">
                        {resource.battlecard ? (
                          <BattlecardThumb
                            data={resource.battlecard}
                            className="size-full"
                          />
                        ) : resource.thumbnail ? (
                          <img
                            src={resource.thumbnail}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <BattlecardThumb className="size-full" />
                        )}
                      </span>
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[6px] border border-line bg-secondary-bg text-muted-foreground">
                        <IconFile size={16} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label-md text-foreground">
                        {resource.name}
                      </p>
                      <button
                        type="button"
                        className="text-paragraph-sm text-brand hover:text-brand-hover"
                        onClick={() => setViewingResource(resource)}
                      >
                        {resource.type === "image" ? "View image" : "Open link"}
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${resource.name}`}
                      onClick={() =>
                        patch({
                          resources: draft.resources.filter((item) => item.id !== resource.id),
                        })
                      }
                      className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                    >
                      <IconClose size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {allowGenerate ? (
        <GenerateFromKnowledgeModal
          open={generateOpen}
          sources={knowledgeSources}
          onGoToKnowledge={
            onOpenKnowledge
              ? () => {
                  setGenerateOpen(false);
                  onOpenKnowledge();
                }
              : undefined
          }
          onClose={() => setGenerateOpen(false)}
          onApply={(proposal) => {
            // AI fills the form; the admin still reviews and publishes.
            setDraft((current) => ({
              ...current,
              name: proposal.name,
              trigger: proposal.trigger,
              examplePhrases: proposal.examplePhrases,
              suggestedResponse: proposal.suggestedResponse,
              talkingPoints: proposal.talkingPoints,
              resources: proposal.resources,
            }));
            setGenerateOpen(false);
          }}
        />
      ) : null}

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        size="sm"
        title="Add link"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="grey-outline" size="sm" onClick={() => setLinkOpen(false)}>
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
            placeholder="e.g. Aircall comparison battlecard"
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            clearable={false}
          />
          <InputField
            label="URL"
            placeholder="https://"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            clearable={false}
          />
        </div>
      </Modal>

      <Modal
        open={imageOpen}
        onClose={closeImageModal}
        size="md"
        title="Upload image"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="grey-outline" size="sm" onClick={closeImageModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!imageName.trim() || !imageFile}
              onClick={addImage}
            >
              Upload image
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <InputField
            label="Name"
            placeholder="e.g. Aircall comparison battlecard"
            value={imageName}
            onChange={(e) => setImageName(e.target.value)}
            helpText="Shown as the title when this image appears during a call."
            helpIcon
            clearable={false}
          />
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="guidance-image-upload">Image</FieldLabel>
            <input
              id="guidance-image-upload"
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) acceptImageFile(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDraggingImage(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingImage(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setIsDraggingImage(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingImage(false);
                const file = event.dataTransfer.files[0];
                if (file) acceptImageFile(file);
              }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
                isDraggingImage
                  ? "border-brand bg-brand-subtle/60"
                  : "border-brand/40 bg-brand-subtle/20 hover:border-brand hover:bg-brand-subtle/40"
              )}
            >
              {imagePreview ? (
                <>
                  <span className="flex h-20 w-full max-w-[220px] overflow-hidden rounded-[8px] border border-line bg-white">
                    <img
                      src={imagePreview}
                      alt=""
                      className="size-full object-contain"
                    />
                  </span>
                  <span>
                    <span className="block text-label-md-semi text-foreground">
                      {imageFile?.name ?? "Image selected"}
                    </span>
                    <span className="mt-1 block text-paragraph-sm text-muted-foreground">
                      Drop a different file or click to replace.
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex size-10 items-center justify-center rounded-[8px] bg-white text-brand shadow-[0_0_0_1px_rgba(0,76,230,0.12)]">
                    <IconFile size={20} />
                  </span>
                  <span>
                    <span className="block text-label-md-semi text-foreground">
                      Upload PNG, JPG, or WebP
                    </span>
                    <span className="mt-1 block text-paragraph-sm text-muted-foreground">
                      Drop a file or click to browse.
                    </span>
                  </span>
                </>
              )}
            </button>
            {imageError ? (
              <Banner variant="error" width="page">
                {imageError}
              </Banner>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        size="sm"
        className="overflow-visible"
        bodyClassName="overflow-visible"
        title="Ready to publish"
        description="Agents will start seeing this response card on matching conversations."
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
                onSave(publishedItem());
              }}
            >
              Publish
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-label-sm text-muted-foreground">Response card</dt>
            <dd className="text-paragraph-md text-foreground">{draft.name}</dd>
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

      <Modal
        open={testPreviewOpen}
        onClose={() => setTestPreviewOpen(false)}
        size="md"
        title="Preview"
        description="What the agent would see during a call"
      >
        <LiveGuidanceCard
          item={{
            id: draft.id,
            atMs: 0,
            quote: customerLineForGuidance(draft),
            item: draft,
            priority: priorityForGuidance(draft),
            stance: stanceForGuidance(draft),
          }}
          reduced
          onViewResource={setViewingResource}
        />
      </Modal>

      <GuidanceResourceModal
        resource={viewingResource}
        onClose={() => setViewingResource(null)}
      />
    </main>
  );
}

/**
 * A recommendation, not a rule (§2). Admins keep every option; this only points
 * out that retrieval already covers the trigger they described, so they can
 * skip the maintenance if they want to.
 */
function KnowledgeCoverageHint({
  entryTitle,
  sourceName,
  onUseKnowledge,
  onContinue,
}: {
  entryTitle: string;
  sourceName: string;
  onUseKnowledge?: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-line bg-secondary-bg px-3 py-2.5">
      <IconKnowledge className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-pretty text-label-md text-foreground">
          This may already be handled automatically by your Knowledge Base.
        </p>
        <p className="text-pretty text-paragraph-sm text-muted-foreground">
          “{entryTitle}” in {sourceName} answers this today — agents get it
          without a response card to maintain.
        </p>
        <div className="-ml-1 flex flex-wrap items-center gap-2">
          {onUseKnowledge ? (
            <>
              <Button variant="link" size="sm" onClick={onUseKnowledge}>
                Use Knowledge Base instead
              </Button>
              <span className="h-3 w-px bg-line" aria-hidden="true" />
            </>
          ) : null}
          <Button
            variant="link"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={onContinue}
          >
            Continue with a response card
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate from Knowledge Base. The admin picks the Knowledge Bases to draw
 * from, AI proposes the whole draft — name, trigger, response, talking points,
 * relevant resources — and the admin reviews every field before publishing.
 */
function GenerateFromKnowledgeModal({
  open,
  sources,
  onClose,
  onApply,
  onGoToKnowledge,
}: {
  open: boolean;
  sources: KnowledgeSourceRecord[];
  onClose: () => void;
  onApply: (proposal: GuidanceItem) => void;
  /** Leaves for the Knowledge page — the only place the gap can be closed. */
  onGoToKnowledge?: () => void;
}) {
  const live = liveKnowledgeSources(sources);
  const usable = live.filter((source) => knowledgeEntryCount(source) > 0);
  const [sourceIds, setSourceIds] = React.useState<string[]>([]);
  const [proposals, setProposals] = React.useState<GuidanceItem[]>([]);

  React.useEffect(() => {
    if (!open) {
      setSourceIds([]);
      setProposals([]);
    }
  }, [open]);

  const picked = usable.filter((item) => sourceIds.includes(item.id));

  const toggleSource = (id: string) =>
    setSourceIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );

  const generate = () => {
    // A proposal per answer, capped so the review list stays scannable.
    setProposals(
      picked
        .flatMap((source) =>
          proposeGuidanceFromKnowledge(
            knowledgeRetrievableEntries(source),
            source.name
          )
        )
        .slice(0, 6)
    );
  };

  // Nothing to draft from. Which step is missing decides the copy and the
  // button, so the modal never ends on a disabled Generate.
  const gap =
    usable.length > 0
      ? null
      : sources.length === 0
        ? {
            title: "No Knowledge Base yet",
            body: "AI drafts response cards from the answers in a Knowledge Base. Create one from a help centre, files, or typed Q&A, and it can propose the trigger and the response for you.",
            action: "Create Knowledge Base",
          }
        : live.length === 0
          ? {
              title: "No Knowledge Base is on for Agent Assist",
              body: `You have ${sources.length === 1 ? "a Knowledge Base" : `${sources.length} Knowledge Bases`}, but none of ${sources.length === 1 ? "it is" : "them are"} switched on for Agent Assist yet. Turn one on and AI can draft response cards from its answers.`,
              action: "Go to Knowledge Base",
            }
          : {
              title: "No answers to draft from yet",
              body: "The Knowledge Bases on for Agent Assist have no answers in them yet. Add pages, files, or Q&A, and AI can draft response cards from them.",
              action: "Add knowledge",
            };

  if (gap) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        size="md"
        title="Generate response cards from Knowledge Base"
        footer={
          <>
            <Button variant="grey-outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {onGoToKnowledge ? (
              <Button size="sm" onClick={onGoToKnowledge}>
                {gap.action}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 px-4 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary-bg text-muted-foreground">
            <IconKnowledge className="size-5" />
          </span>
          <div className="flex max-w-[400px] flex-col gap-1">
            <p className="text-label-md-semi text-foreground">{gap.title}</p>
            <p className="text-pretty text-paragraph-md text-muted-foreground">
              {gap.body}
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Generate response cards from Knowledge Base"
      description="Pick the Knowledge Bases to draw from. AI proposes a full draft and you review it before anything publishes."
      footer={
        <>
          <Button variant="grey-outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            leftIcon={<IconSparkles size={16} />}
            disabled={picked.length === 0}
            onClick={generate}
          >
            {proposals.length > 0 ? "Regenerate" : "Generate"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-label-md text-foreground">Knowledge Bases</span>
          <ul className="flex flex-col gap-1 rounded-lg border border-line p-1">
            {usable.map((source) => (
              <li key={source.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1.5 hover:bg-secondary-bg">
                  <Checkbox
                    checked={sourceIds.includes(source.id)}
                    onCheckedChange={() => toggleSource(source.id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-paragraph-md text-foreground">
                    {source.name}
                  </span>
                  <span className="shrink-0 text-label-sm text-muted-foreground tabular-nums">
                    {knowledgeEntryCount(source)} answers
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        {proposals.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-label-md text-foreground">
              {proposals.length} drafts — load one to review and edit
            </p>
            <ul className="flex flex-col gap-2">
              {proposals.map((proposal) => (
                <li key={proposal.id}>
                  <ProposalCard proposal={proposal} onApply={() => onApply(proposal)} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

/** The AI draft laid out field by field, so review is possible before loading. */
function ProposalCard({
  proposal,
  onApply,
}: {
  proposal: GuidanceItem;
  onApply: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-sm text-muted-foreground">Response card name</p>
          <p className="text-pretty text-label-md-semi text-foreground">
            {proposal.name}
          </p>
        </div>
        <Button size="sm" variant="grey-outline" className="shrink-0" onClick={onApply}>
          Review draft
        </Button>
      </div>

      <ProposalField label="Trigger" value={proposal.trigger} />
      <ProposalField
        label="Suggested response"
        value={`“${proposal.suggestedResponse}”`}
      />

      {proposal.talkingPoints.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-label-sm text-muted-foreground">Talking points</p>
          <ul className="flex flex-col gap-0.5">
            {proposal.talkingPoints.map((point, index) => (
              <li
                key={`${proposal.id}-point-${index}`}
                className="text-pretty text-paragraph-sm text-foreground"
              >
                • {point}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {proposal.resources.length > 0 ? (
        <ProposalField
          label="Relevant resources"
          value={proposal.resources.map((resource) => resource.name).join(", ")}
        />
      ) : null}
    </div>
  );
}

function ProposalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-label-sm text-muted-foreground">{label}</p>
      <p className="text-pretty text-paragraph-sm text-foreground">{value}</p>
    </div>
  );
}
