import type { ReactNode } from "react";
import { Modal } from "@/components/Modal";
import { IconFile, IconPencil, IconSparkles } from "@/components/Icon";
import { cn } from "@/lib/utils";
import type { KnowledgeCreateMethod } from "./knowledgeRepository";

const OPTIONS: Array<{
  id: KnowledgeCreateMethod;
  title: string;
  description: string;
  icon: ReactNode;
  accent?: boolean;
}> = [
  {
    id: "import",
    title: "Import FAQs",
    description: "Upload a CSV or XLSX of questions and answers. Best if you already keep structured FAQs.",
    icon: <IconFile size={20} />,
  },
  {
    id: "manual",
    title: "Add manually",
    description: "Create questions and answers directly. Best for small repositories or a first set of answers.",
    icon: <IconPencil size={20} />,
  },
  {
    id: "generate",
    title: "Generate with AI",
    description: "Drop PDFs, documents, or webpage links. AI reads them and drafts FAQs for you to review.",
    icon: <IconSparkles size={20} />,
    accent: true,
  },
];

export interface KnowledgeCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (method: KnowledgeCreateMethod) => void;
}

export function KnowledgeCreateModal({
  open,
  onClose,
  onSelect,
}: KnowledgeCreateModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Create FAQ repository"
      description="Give agents instant answers during live conversations. Agent Assist automatically surfaces relevant information based on what is being discussed."
    >
      <div className="flex flex-col gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors",
              "hover:border-brand/40 hover:bg-brand-subtle/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
              option.accent
                ? "border-dashed border-brand/50 bg-brand-subtle/30"
                : "border-line bg-white"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[6px]",
                option.accent
                  ? "bg-white text-ai shadow-[0_0_0_1px_rgba(103,59,255,0.16)]"
                  : "bg-secondary-bg text-foreground"
              )}
            >
              {option.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-label-md-semi text-foreground">{option.title}</span>
              <span className="mt-0.5 block text-pretty text-paragraph-sm text-muted-foreground">
                {option.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
