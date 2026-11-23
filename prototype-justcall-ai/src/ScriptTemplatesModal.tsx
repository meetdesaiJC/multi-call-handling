import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/Modal";
import { Tabs, type TabItem } from "@/components/Tabs";
import { IconChevronRight } from "@/components/Icon";
import { cn } from "@/lib/utils";
import {
  SALES_TEMPLATES,
  SUPPORT_TEMPLATES,
  type ScriptTemplateId,
  type TemplateCatalogItem,
} from "./scriptPlaybook";

export type { ScriptTemplateId };

export type ScriptStartChoice =
  | { type: "template"; templateId: ScriptTemplateId }
  | { type: "scratch" };

type TemplateCategory = "sales" | "support";

const CATEGORY_TABS: TabItem[] = [
  { key: "sales", label: "Sales" },
  { key: "support", label: "Support" },
];

const TEMPLATES_BY_CATEGORY: Record<TemplateCategory, TemplateCatalogItem[]> = {
  sales: SALES_TEMPLATES,
  support: SUPPORT_TEMPLATES,
};

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

const choiceCardClass =
  "rounded-lg border border-line bg-white text-left transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-brand/40 hover:bg-brand-subtle/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24";

function TemplateRow({
  template,
  onSelect,
}: {
  template: TemplateCatalogItem;
  onSelect: (id: ScriptTemplateId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={cn("flex w-full items-start gap-3 px-4 py-3", choiceCardClass)}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-label-md-semi text-foreground">{template.name}</span>
        <span className="mt-0.5 block text-pretty text-paragraph-sm text-muted-foreground">
          {template.description}
        </span>
      </span>
      <IconChevronRight
        size={20}
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </button>
  );
}

function ScratchOption({
  title,
  description,
  icon,
  onSelect,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn("flex items-start gap-3 px-4 py-3.5", choiceCardClass)}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-label-md-semi text-foreground">{title}</span>
        <span className="mt-0.5 block text-pretty text-paragraph-sm text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

export interface ScriptTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (choice: ScriptStartChoice) => void;
}

export function ScriptTemplatesModal({
  open,
  onClose,
  onSelect,
}: ScriptTemplatesModalProps) {
  const [category, setCategory] = useState<TemplateCategory>("sales");
  const templates = TEMPLATES_BY_CATEGORY[category];

  useEffect(() => {
    if (!open) setCategory("sales");
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Create a script"
      description="Choose the type of conversation you want to prepare agents for. Start with a template or create your own from scratch."
    >
      <div className="flex flex-col gap-5">
        <section>
          <div className="border-b border-line">
            <Tabs
              items={CATEGORY_TABS}
              value={category}
              onValueChange={(key) => setCategory(key as TemplateCategory)}
              aria-label="Template category"
            />
          </div>
          <div
            role="tabpanel"
            id={`${category}-templates`}
            className="mt-4 flex flex-col gap-2"
          >
            {templates.map((template) => (
              <TemplateRow
                key={template.id}
                template={template}
                onSelect={(templateId) => onSelect({ type: "template", templateId })}
              />
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3" role="separator" aria-label="or">
          <span className="h-px flex-1 bg-line" />
          <span className="text-label-sm tracking-[0.12em] text-muted-foreground">OR</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <ScratchOption
          title="Create custom script"
          description="Build from scratch or import an existing script."
          icon={<PlusIcon size={20} />}
          onSelect={() => onSelect({ type: "scratch" })}
        />
      </div>
    </Modal>
  );
}
