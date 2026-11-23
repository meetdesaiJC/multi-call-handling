import * as React from "react";
import { IconClose } from "@/components/Icon";
import { cn } from "@/lib/utils";
import {
  createEmptyFaq,
  deriveFaqTitle,
  generateSimilarQuestions,
  type FaqItem,
} from "./knowledgeRepository";

function DragHandleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="4" r="1.1" />
      <circle cx="10.5" cy="4" r="1.1" />
      <circle cx="5.5" cy="8" r="1.1" />
      <circle cx="10.5" cy="8" r="1.1" />
      <circle cx="5.5" cy="12" r="1.1" />
      <circle cx="10.5" cy="12" r="1.1" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-[4px] border border-line bg-white px-3 py-2 text-paragraph-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/16";

export interface FaqEditorProps {
  faqs: FaqItem[];
  onChange: (faqs: FaqItem[]) => void;
}

export function FaqEditor({ faqs, onChange }: FaqEditorProps) {
  const dragRef = React.useRef<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);

  const updateFaq = (faqId: string, patch: Partial<FaqItem>) => {
    onChange(
      faqs.map((item) => {
        if (item.id !== faqId) return item;
        const question = patch.question ?? item.question;
        return {
          ...item,
          ...patch,
          title: patch.question !== undefined ? deriveFaqTitle(question) : item.title,
          exampleQuestions:
            patch.question !== undefined
              ? generateSimilarQuestions(question)
              : item.exampleQuestions,
          updated: "Just now",
        };
      })
    );
  };

  const addFaq = () => {
    onChange([...faqs, createEmptyFaq()]);
  };

  const removeFaq = (faqId: string) => {
    onChange(faqs.filter((item) => item.id !== faqId));
  };

  const reorderFaq = (from: number, to: number) => {
    if (from === to) return;
    const next = [...faqs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-5">
        {faqs.map((item, index) => {
          const isOver = overIndex === index && dragRef.current !== null && dragRef.current !== index;

          return (
            <article
              key={item.id}
              onDragOver={(event) => {
                event.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragRef.current !== null) {
                  reorderFaq(dragRef.current, index);
                }
                dragRef.current = null;
                setOverIndex(null);
              }}
              className={cn(
                "rounded-[8px] border border-line bg-white p-3",
                isOver && "border-brand/40 bg-brand-subtle/40"
              )}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <button
                  type="button"
                  draggable
                  aria-label={`Reorder ${item.question || "FAQ"}`}
                  onDragStart={() => {
                    dragRef.current = index;
                  }}
                  onDragEnd={() => {
                    dragRef.current = null;
                    setOverIndex(null);
                  }}
                  className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-[4px] text-muted-foreground hover:bg-secondary-bg hover:text-foreground active:cursor-grabbing"
                >
                  <DragHandleIcon />
                </button>
                <input
                  value={item.question}
                  onChange={(event) => updateFaq(item.id, { question: event.target.value })}
                  placeholder="Question"
                  aria-label="Question"
                  className={cn(inputClass, "min-w-0 flex-1")}
                />
                <button
                  type="button"
                  aria-label={`Remove ${item.question || "FAQ"}`}
                  onClick={() => removeFaq(item.id)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-secondary-bg hover:text-foreground"
                >
                  <IconClose size={16} />
                </button>
              </div>

              <textarea
                value={item.answer}
                onChange={(event) => updateFaq(item.id, { answer: event.target.value })}
                placeholder="Answer"
                aria-label="Answer"
                rows={3}
                className={cn(inputClass, "min-h-[72px] resize-y")}
              />
            </article>
          );
        })}

        <button
          type="button"
          onClick={addFaq}
          className="flex h-8 items-center self-start rounded-[4px] px-1 text-label-sm text-brand hover:bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          + Add FAQ
        </button>
      </div>
    </div>
  );
}
