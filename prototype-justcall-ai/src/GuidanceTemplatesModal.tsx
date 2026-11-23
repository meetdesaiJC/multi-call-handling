import { Modal } from "@/components/Modal";
import { IconSparkles } from "@/components/Icon";
import { cn } from "@/lib/utils";
import {
  GUIDANCE_TEMPLATE_GROUPS,
  guidanceTemplatesInGroup,
  type GuidanceTemplateId,
} from "./guidanceData";

/**
 * Two ways in on every scope: a template or an empty form. V1 also offers AI
 * drafting from a Knowledge Base — the admin still reviews every field before
 * anything publishes. V2 keeps the authored-only path.
 */
export type GuidanceStartChoice =
  | { type: "template"; templateId: GuidanceTemplateId }
  | { type: "scratch" }
  /** AI drafts the whole thing from selected knowledge bases. */
  | { type: "generate" };

const choiceCardClass =
  "rounded-lg border border-line bg-white text-left transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-brand/40 hover:bg-brand-subtle/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24";

function PlusIcon({ size = 20 }: { size?: number }) {
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

export interface GuidanceTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (choice: GuidanceStartChoice) => void;
  /** V1: show "Generate with AI" next to the manual option. */
  allowGenerate?: boolean;
}

export function GuidanceTemplatesModal({
  open,
  onClose,
  onSelect,
  allowGenerate = false,
}: GuidanceTemplatesModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Create a response card"
      description={
        allowGenerate
          ? "Choose what you want to help agents handle during calls. Start with a template, create your own, or let AI draft one from your Knowledge Base."
          : "Choose what you want to help agents handle during calls. Start with a template, or create your own."
      }
    >
      <div className="flex flex-col gap-5">
        {GUIDANCE_TEMPLATE_GROUPS.map((group) => (
          <section key={group.id} className="flex flex-col gap-2">
            <h3 className="text-label-sm font-medium tracking-[0.04em] text-muted-foreground uppercase">
              {group.label}
            </h3>
            <div className="grid grid-cols-2 items-stretch gap-2">
              {guidanceTemplatesInGroup(group.id).map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() =>
                    onSelect({ type: "template", templateId: template.id })
                  }
                  className={cn("flex h-full flex-col gap-1 px-3.5 py-3", choiceCardClass)}
                >
                  <span className="text-balance text-label-md-semi text-foreground">
                    {template.name}
                  </span>
                  <span className="text-pretty text-paragraph-sm text-muted-foreground">
                    {template.description}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        <div className="flex items-center gap-3" role="separator" aria-label="or">
          <span className="h-px flex-1 bg-line" />
          <span className="text-label-sm tracking-[0.12em] text-muted-foreground">
            OR
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        {/* Two cards share the row when Generate is on. A lone manual option
            keeps the width of a template card — stretched across the modal it
            reads as something missing beside it. */}
        <div className="grid grid-cols-2 items-stretch gap-2">
          <button
            type="button"
            onClick={() => onSelect({ type: "scratch" })}
            className={cn("flex h-full items-center gap-3 px-4 py-3", choiceCardClass)}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-foreground">
              <PlusIcon size={20} />
            </span>
            <span className="min-w-0 text-label-md-semi text-foreground">
              Create manually
            </span>
          </button>

          {allowGenerate ? (
            <button
              type="button"
              onClick={() => onSelect({ type: "generate" })}
              className={cn("flex h-full items-center gap-3 px-4 py-3", choiceCardClass)}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-brand-subtle text-brand">
                <IconSparkles size={20} />
              </span>
              <span className="min-w-0 text-label-md-semi text-foreground">
                Generate with AI
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
