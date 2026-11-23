import * as React from "react";
import { createPortal } from "react-dom";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { IconChevronDown, IconClose, IconSparkles } from "@/components/Icon";
import { useDropdownPresence } from "@/components/Dropdown";
import { cn } from "@/lib/utils";
import { HeaderEditableTitle } from "./HeaderEditableTitle";
import {
  AI_WORDING_ACTIONS,
  flattenSteps,
  newId,
  rewriteSuggestedWording,
  WORDING_TONES,
  type AiWordingAction,
  type PlaybookStep,
  type ScriptPlaybook,
  type WordingTone,
} from "./scriptPlaybook";
import { useScriptCardReorder } from "./useScriptCardReorder";
import { insertFieldToken, type ContactFieldMeta } from "./contactFields";
import { FieldTokenOverlay, InsertFieldButton } from "./ContactFieldControls";

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

function createStep(overrides: Partial<PlaybookStep> = {}): PlaybookStep {
  return {
    id: newId("step"),
    title: "",
    suggestedWording: "",
    guidance: "",
    required: false,
    showWhen: { type: "always" },
    ...overrides,
  };
}

function withSteps(playbook: ScriptPlaybook, steps: PlaybookStep[]): ScriptPlaybook {
  const host = playbook.stages[0];
  return {
    ...playbook,
    stages: [
      {
        id: host?.id ?? newId("stage"),
        title: host?.title || "Script",
        steps,
      },
    ],
  };
}

interface TextRange {
  start: number;
  end: number;
}

interface AiDraft {
  stepId: string;
  original: string;
  title: string;
  range: TextRange;
  partial: boolean;
  source: string;
  suggestion: string;
  action: AiWordingAction;
  customInstruction: string;
  tone: WordingTone;
  seed: number;
}

function resolveRange(text: string, selection: TextRange | null): {
  start: number;
  end: number;
  partial: boolean;
} {
  if (!selection || selection.start === selection.end) {
    return { start: 0, end: text.length, partial: false };
  }
  const start = Math.max(0, Math.min(selection.start, selection.end, text.length));
  const end = Math.max(start, Math.min(text.length, Math.max(selection.start, selection.end)));
  return { start, end, partial: start > 0 || end < text.length };
}

function spliceWording(original: string, range: TextRange, replacement: string): string {
  const slice = original.slice(range.start, range.end);
  const leading = slice.match(/^\s*/)?.[0] ?? "";
  const trailing = slice.match(/\s*$/)?.[0] ?? "";
  return original.slice(0, range.start) + leading + replacement + trailing + original.slice(range.end);
}

export interface PlaybookEditorProps {
  playbook: ScriptPlaybook;
  onChange: (playbook: ScriptPlaybook) => void;
  onImportDocument?: () => void;
}

export function PlaybookEditor({
  playbook,
  onChange,
  onImportDocument,
}: PlaybookEditorProps) {
  const [aiBusyStepId, setAiBusyStepId] = React.useState<string | null>(null);
  const [menuStepId, setMenuStepId] = React.useState<string | null>(null);
  const [customStepId, setCustomStepId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<AiDraft | null>(null);
  const [orderError, setOrderError] = React.useState(false);
  const generateSeq = React.useRef(0);

  const steps = flattenSteps(playbook);
  const setSteps = (next: PlaybookStep[]) => onChange(withSteps(playbook, next));

  const updateStep = (stepId: string, patch: Partial<PlaybookStep>) => {
    setSteps(steps.map((item) => (item.id === stepId ? { ...item, ...patch } : item)));
  };

  const removeStep = (stepId: string) => {
    if (draft?.stepId === stepId) setDraft(null);
    if (menuStepId === stepId) setMenuStepId(null);
    if (customStepId === stepId) setCustomStepId(null);
    setSteps(steps.filter((item) => item.id !== stepId));
  };

  const closeAiMenu = React.useCallback(() => {
    setMenuStepId(null);
    setCustomStepId(null);
  }, []);

  const dismissDraft = React.useCallback(() => {
    generateSeq.current += 1;
    setDraft(null);
    setAiBusyStepId(null);
  }, []);

  const reorderStep = React.useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const next = [...flattenSteps(playbook)];
      const [moved] = next.splice(from, 1);
      if (!moved) return;
      next.splice(to, 0, moved);
      onChange(withSteps(playbook, next));
    },
    [playbook, onChange]
  );

  const reorder = useScriptCardReorder({
    count: steps.length,
    itemLabel: (index) => steps[index]?.title.trim() || "Untitled step",
    onReorder: reorderStep,
    onReorderFail: () => setOrderError(true),
  });

  const addStep = () => {
    setSteps([...steps, createStep()]);
    window.setTimeout(() => {
      const list = reorder.listRef.current;
      list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    }, 0);
  };

  React.useEffect(() => {
    if (!orderError) return;
    const timer = window.setTimeout(() => setOrderError(false), 4000);
    return () => window.clearTimeout(timer);
  }, [orderError]);

  const generateDraft = React.useCallback(
    (input: {
      step: PlaybookStep;
      action: AiWordingAction;
      tone: WordingTone;
      seed: number;
      selection: TextRange | null;
      customInstruction?: string;
      original?: string;
    }) => {
      const original = input.original ?? input.step.suggestedWording;
      const range = resolveRange(original, input.selection);
      const rawSlice = original.slice(range.start, range.end);
      const source = rawSlice.trim() || original.trim();
      const seq = ++generateSeq.current;

      closeAiMenu();
      setAiBusyStepId(input.step.id);
      setDraft({
        stepId: input.step.id,
        original,
        title: input.step.title,
        range,
        partial: range.partial,
        source,
        suggestion: "",
        action: input.action,
        customInstruction: input.customInstruction ?? "",
        tone: input.tone,
        seed: input.seed,
      });

      window.setTimeout(() => {
        if (generateSeq.current !== seq) return;
        const result = rewriteSuggestedWording({
          title: input.step.title,
          wording: source,
          tone: input.tone,
          action: input.action,
          customInstruction: input.customInstruction,
          seed: input.seed,
        });
        setDraft((current) =>
          current?.stepId === input.step.id
            ? { ...current, suggestion: result.wording, seed: input.seed, tone: input.tone }
            : current
        );
        setAiBusyStepId(null);
      }, 420);
    },
    [closeAiMenu]
  );

  React.useEffect(
    () => () => {
      generateSeq.current += 1;
    },
    []
  );

  const isEmpty = steps.length === 0;
  const floatingStep = reorder.from != null ? steps[reorder.from] : null;
  const reorderBusy = reorder.mode !== "idle";

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {orderError ? (
        <div
          data-state="open"
          className="toast-panel absolute top-3 right-3 z-30 w-[min(100%-24px,320px)]"
        >
          <Alert variant="error" onClose={() => setOrderError(false)}>
            Couldn't update order. Try again.
          </Alert>
        </div>
      ) : null}

      <p id="script-reorder-hint" className="sr-only">
        Press Space or Enter to pick up, up or down arrows to move, Space or Enter to drop,
        Escape to cancel.
      </p>
      <p className="sr-only" aria-live="assertive">
        {reorder.announcement}
      </p>

      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex max-w-[280px] flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-1.5">
              <h3 className="text-balance text-label-md-semi text-foreground">
                Build your script
              </h3>
              <p className="text-pretty text-paragraph-sm text-muted-foreground">
                Add your first step to get started.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button size="sm" onClick={addStep}>
                + Add first step
              </Button>
              {onImportDocument ? (
                <p className="text-paragraph-sm text-muted-foreground">
                  or{" "}
                  <button
                    type="button"
                    onClick={onImportDocument}
                    className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
                  >
                    Import document
                  </button>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
      <>
      <div
        ref={reorder.listRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto"
      >
        {steps.map((item, stepIndex) => {
          const canRewrite = Boolean(item.title.trim() || item.suggestedWording.trim());
          const itemDraft = draft?.stepId === item.id ? draft : null;
          const isPlaceholder = reorder.isPlaceholder(stepIndex);
          const isLifted = reorder.isLifted(stepIndex);
          const shift = reorder.shifts[stepIndex] ?? 0;

          return (
            <div
              key={item.id}
              ref={(node) => reorder.setSlotRef(stepIndex, node)}
              className={cn("script-card-slot", reorder.shifting && "is-shifting")}
              style={{ transform: shift ? `translateY(${shift}px)` : undefined }}
            >
              {isPlaceholder ? (
                <div
                  className="script-card-placeholder"
                  style={{ height: reorder.placeholderHeight }}
                  aria-hidden="true"
                />
              ) : (
                <ScriptStepCard
                  item={item}
                  stepIndex={stepIndex}
                  stepsLength={steps.length}
                  canRewrite={canRewrite}
                  menuOpen={menuStepId === item.id}
                  customOpen={customStepId === item.id}
                  draft={itemDraft}
                  busy={aiBusyStepId === item.id}
                  lifted={isLifted}
                  grabbing={reorderBusy && reorder.from === stepIndex}
                  handleRef={(node) => reorder.setHandleRef(stepIndex, node)}
                  onHandlePointerDown={(event) => reorder.beginPress(stepIndex, event)}
                  onHandleKeyDown={(event) => reorder.onHandleKeyDown(stepIndex, event)}
                  onUpdate={(patch) => updateStep(item.id, patch)}
                  onRemove={() => removeStep(item.id)}
                  onToggleMenu={() => {
                    if (menuStepId === item.id) {
                      closeAiMenu();
                      return;
                    }
                    setCustomStepId(null);
                    setMenuStepId(item.id);
                  }}
                  onRequestCustom={() => setCustomStepId(item.id)}
                  onBackFromCustom={() => setCustomStepId(null)}
                  onCloseMenu={closeAiMenu}
                  onGenerate={(next) => generateDraft({ step: item, ...next })}
                  onReplace={() => {
                    if (!itemDraft?.suggestion.trim()) return;
                    updateStep(item.id, {
                      suggestedWording: spliceWording(
                        itemDraft.original,
                        itemDraft.range,
                        itemDraft.suggestion
                      ),
                    });
                    dismissDraft();
                  }}
                  onCancelDraft={dismissDraft}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="shrink-0 pt-3">
        <Button variant="primary-outline" size="sm" className="w-full" onClick={addStep}>
          + Add step
        </Button>
      </div>
      </>
      )}

      {floatingStep && reorder.floatStyle
        ? createPortal(
            <div
              ref={reorder.floatNodeRef}
              className="script-card-float"
              style={reorder.floatStyle}
              inert
              aria-hidden="true"
            >
              <ScriptStepCard
                item={floatingStep}
                stepIndex={reorder.from ?? 0}
                stepsLength={steps.length}
                canRewrite={Boolean(
                  floatingStep.title.trim() || floatingStep.suggestedWording.trim()
                )}
                menuOpen={false}
                customOpen={false}
                draft={draft?.stepId === floatingStep.id ? draft : null}
                busy={aiBusyStepId === floatingStep.id}
                grabbing
                preview
                onUpdate={() => {}}
                onRemove={() => {}}
                onToggleMenu={() => {}}
                onRequestCustom={() => {}}
                onBackFromCustom={() => {}}
                onCloseMenu={() => {}}
                onGenerate={() => {}}
                onReplace={() => {}}
                onCancelDraft={() => {}}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

type GenerateInput = {
  action: AiWordingAction;
  tone: WordingTone;
  seed: number;
  selection: TextRange | null;
  customInstruction?: string;
  original?: string;
};

function ScriptStepCard({
  item,
  stepIndex,
  stepsLength,
  canRewrite,
  menuOpen,
  customOpen,
  draft,
  busy,
  lifted = false,
  grabbing = false,
  preview = false,
  handleRef,
  onHandlePointerDown,
  onHandleKeyDown,
  onUpdate,
  onRemove,
  onToggleMenu,
  onRequestCustom,
  onBackFromCustom,
  onCloseMenu,
  onGenerate,
  onReplace,
  onCancelDraft,
}: {
  item: PlaybookStep;
  stepIndex: number;
  stepsLength: number;
  canRewrite: boolean;
  menuOpen: boolean;
  customOpen: boolean;
  draft: AiDraft | null;
  busy: boolean;
  lifted?: boolean;
  grabbing?: boolean;
  preview?: boolean;
  handleRef?: (node: HTMLButtonElement | null) => void;
  onHandlePointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onHandleKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onUpdate: (patch: Partial<PlaybookStep>) => void;
  onRemove: () => void;
  onToggleMenu: () => void;
  onRequestCustom: () => void;
  onBackFromCustom: () => void;
  onCloseMenu: () => void;
  onGenerate: (input: GenerateInput) => void;
  onReplace: () => void;
  onCancelDraft: () => void;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const sparklesRef = React.useRef<HTMLButtonElement>(null);
  const selectionRef = React.useRef<TextRange | null>(null);
  const [frozenSelection, setFrozenSelection] = React.useState<TextRange | null>(null);
  const showingAi = Boolean(draft);
  const captureSelection = (target: HTMLTextAreaElement) => {
    selectionRef.current = {
      start: target.selectionStart,
      end: target.selectionEnd,
    };
  };

  /**
   * Insert at the caret the admin left, not at the end — they clicked into the
   * sentence for a reason. Focus comes back to the field with the caret past
   * the token, so the next thing they type continues the sentence.
   */
  const insertField = (field: ContactFieldMeta) => {
    const source = item.suggestedWording;
    const at = selectionRef.current ?? { start: source.length, end: source.length };
    const next = insertFieldToken(source, at.start, at.end, field);
    onUpdate({ suggestedWording: next.text });
    selectionRef.current = { start: next.caret, end: next.caret };
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(next.caret, next.caret);
    });
  };

  const handleButton = (
    <button
      ref={handleRef}
      type="button"
      data-reorder-handle=""
      aria-label={`Reorder ${item.title || "step"}`}
      aria-describedby={preview ? undefined : "script-reorder-hint"}
      aria-pressed={lifted || grabbing}
      tabIndex={preview ? -1 : 0}
      onPointerDown={preview ? undefined : onHandlePointerDown}
      onKeyDown={preview ? undefined : onHandleKeyDown}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground transition-colors duration-150",
        "hover:bg-secondary-bg hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
        "cursor-grab touch-none",
        (lifted || grabbing) && "cursor-grabbing text-foreground"
      )}
    >
      <DragHandleIcon />
    </button>
  );

  return (
    <article
      className={cn(
        "rounded-[8px] border border-line bg-white p-3",
        lifted && "script-card-lift"
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        {handleButton}
        <HeaderEditableTitle
          value={item.title}
          onChange={(title) => onUpdate({ title })}
          placeholder="Untitled step"
          nameLabel="Step title"
          size="compact"
          autoEdit={
            !preview &&
            !item.title &&
            !item.suggestedWording &&
            stepIndex === stepsLength - 1
          }
        />
        <button
          type="button"
          tabIndex={preview ? -1 : 0}
          aria-label={`Remove ${item.title || "step"}`}
          onClick={preview ? undefined : onRemove}
          className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-secondary-bg hover:text-foreground"
        >
          <IconClose size={16} />
        </button>
      </div>

      <ScriptWordingField
        item={item}
        preview={preview}
        canRewrite={canRewrite}
        onInsertField={insertField}
        menuOpen={menuOpen}
        customOpen={customOpen}
        draft={draft}
        busy={busy}
        showingAi={showingAi}
        textareaRef={textareaRef}
        sparklesRef={sparklesRef}
        frozenSelection={frozenSelection}
        onCaptureSelection={captureSelection}
        onUpdate={onUpdate}
        onToggleMenu={() => {
          if (preview) return;
          setFrozenSelection(selectionRef.current);
          onToggleMenu();
        }}
        onRequestCustom={onRequestCustom}
        onBackFromCustom={onBackFromCustom}
        onCloseMenu={onCloseMenu}
        onGenerate={(input) =>
          onGenerate({
            ...input,
            selection: input.selection ?? frozenSelection,
            original: draft?.original ?? item.suggestedWording,
          })
        }
        onReplace={onReplace}
        onCancelDraft={onCancelDraft}
      />
    </article>
  );
}

function ScriptWordingField({
  item,
  preview,
  canRewrite,
  onInsertField,
  menuOpen,
  customOpen,
  draft,
  busy,
  showingAi,
  textareaRef,
  sparklesRef,
  frozenSelection,
  onCaptureSelection,
  onUpdate,
  onToggleMenu,
  onRequestCustom,
  onBackFromCustom,
  onCloseMenu,
  onGenerate,
  onReplace,
  onCancelDraft,
}: {
  item: PlaybookStep;
  preview: boolean;
  canRewrite: boolean;
  onInsertField: (field: ContactFieldMeta) => void;
  menuOpen: boolean;
  customOpen: boolean;
  draft: AiDraft | null;
  busy: boolean;
  showingAi: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  sparklesRef: React.RefObject<HTMLButtonElement | null>;
  frozenSelection: TextRange | null;
  onCaptureSelection: (target: HTMLTextAreaElement) => void;
  onUpdate: (patch: Partial<PlaybookStep>) => void;
  onToggleMenu: () => void;
  onRequestCustom: () => void;
  onBackFromCustom: () => void;
  onCloseMenu: () => void;
  onGenerate: (input: GenerateInput) => void;
  onReplace: () => void;
  onCancelDraft: () => void;
}) {
  const menuPresence = useDropdownPresence(menuOpen && !preview);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "relative rounded-[4px] border bg-white transition-colors",
          showingAi ? "border-ai-border" : "border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/16"
        )}
      >
      {showingAi && draft ? (
        <AiSuggestionState
          draft={draft}
          busy={busy}
          onReplace={onReplace}
          onTryAgain={() =>
            onGenerate({
              action: draft.action,
              tone: draft.tone,
              seed: draft.seed + 1,
              selection: draft.range,
              customInstruction: draft.customInstruction,
              original: draft.original,
            })
          }
          onToneChange={(tone) =>
            onGenerate({
              action: draft.action,
              tone,
              seed: 0,
              selection: draft.range,
              customInstruction: draft.customInstruction,
              original: draft.original,
            })
          }
          onCancel={onCancelDraft}
        />
      ) : (
        <>
          <div className="relative">
            {/* The chips live on a mirror under the textarea; the two share
                every metric, so the padding here has to match the padding
                there exactly. */}
            <FieldTokenOverlay
              ref={overlayRef}
              text={item.suggestedWording}
              className="px-3 py-2 pr-10"
            />
            <textarea
              ref={textareaRef}
              value={item.suggestedWording}
              onChange={(event) => onUpdate({ suggestedWording: event.target.value })}
              onSelect={(event) => onCaptureSelection(event.currentTarget)}
              onKeyUp={(event) => onCaptureSelection(event.currentTarget)}
              onMouseUp={(event) => onCaptureSelection(event.currentTarget)}
              onScroll={(event) => {
                if (overlayRef.current) {
                  overlayRef.current.scrollTop = event.currentTarget.scrollTop;
                }
              }}
              placeholder="What the agent should say"
              aria-label="Suggested wording"
              rows={3}
              readOnly={preview}
              tabIndex={preview ? -1 : 0}
              className="relative block min-h-[72px] w-full resize-y rounded-[4px] bg-transparent px-3 py-2 pr-10 text-paragraph-md text-transparent caret-foreground outline-none selection:bg-brand/24 placeholder:text-muted-foreground"
            />
          </div>

          {/* Its own bar rather than a third icon in the corner: inserting a
              field is a step in writing the line, not a control over it. */}
          <div className="flex items-center justify-end rounded-b-[4px] border-t border-line bg-secondary-bg px-2 py-1.5">
            <InsertFieldButton
              disabled={preview}
              onBeforeOpen={() => {
                if (textareaRef.current) onCaptureSelection(textareaRef.current);
              }}
              onInsert={onInsertField}
            />
          </div>
        </>
      )}

      {!showingAi ? (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
          <button
            ref={sparklesRef}
            type="button"
            tabIndex={preview ? -1 : 0}
            disabled={preview || !canRewrite}
            aria-label="Improve with AI"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onMouseDown={(event) => {
              event.preventDefault();
              if (textareaRef.current) onCaptureSelection(textareaRef.current);
            }}
            onClick={() => {
              if (preview) return;
              onToggleMenu();
            }}
            className={cn(
              "flex size-7 items-center justify-center rounded-[4px] text-ai hover:bg-ai/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai/24 disabled:pointer-events-none disabled:opacity-40",
              menuOpen && "bg-ai/8"
            )}
          >
            <IconSparkles size={16} />
          </button>
        </div>
      ) : null}

      {menuPresence.mounted ? (
        <AiImprovePopover
          anchorRef={sparklesRef}
          customOpen={customOpen}
          selection={frozenSelection}
          panelState={menuPresence.state}
          onClose={onCloseMenu}
          onRequestCustom={onRequestCustom}
          onBackFromCustom={onBackFromCustom}
          onGenerate={onGenerate}
        />
      ) : null}
      </div>
    </div>
  );
}

function OriginalWording({
  text,
  range,
  partial,
}: {
  text: string;
  range: TextRange;
  partial: boolean;
}) {
  if (!text.trim()) {
    return (
      <p className="text-pretty text-paragraph-md text-muted-foreground">
        What the agent should say
      </p>
    );
  }
  if (!partial) {
    return <p className="text-pretty text-paragraph-md text-foreground">{text}</p>;
  }
  return (
    <p className="text-pretty text-paragraph-md text-foreground">
      {text.slice(0, range.start)}
      <mark className="rounded-[2px] bg-ai/12 text-foreground">
        {text.slice(range.start, range.end)}
      </mark>
      {text.slice(range.end)}
    </p>
  );
}

function AiSuggestionState({
  draft,
  busy,
  onReplace,
  onTryAgain,
  onToneChange,
  onCancel,
}: {
  draft: AiDraft;
  busy: boolean;
  onReplace: () => void;
  onTryAgain: () => void;
  onToneChange: (tone: WordingTone) => void;
  onCancel: () => void;
}) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="px-3 py-2 pr-3">
      <OriginalWording text={draft.original} range={draft.range} partial={draft.partial} />

      {busy ? (
        <p
          className="ai-suggest-in mt-2 flex items-center gap-1.5 text-label-sm text-ai"
          aria-live="polite"
        >
          <IconSparkles size={16} className="motion-safe:animate-pulse" />
          Improving wording…
        </p>
      ) : (
        <div className="ai-suggest-in mt-2 rounded-[6px] bg-ai-surface px-2.5 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1 text-label-sm text-ai">
              <IconSparkles size={16} />
              AI suggestion
            </p>
            <button
              type="button"
              aria-label="Close"
              onClick={onCancel}
              className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-white/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai/24"
            >
              <IconClose size={16} />
            </button>
          </div>
          <p className="text-pretty text-paragraph-md text-foreground">{draft.suggestion}</p>
          <AiSuggestionActions
            tone={draft.tone}
            disabled={!draft.suggestion.trim()}
            onReplace={onReplace}
            onTryAgain={onTryAgain}
            onToneChange={onToneChange}
          />
        </div>
      )}
    </div>
  );
}

function AiSuggestionActions({
  tone,
  disabled,
  onReplace,
  onTryAgain,
  onToneChange,
}: {
  tone: WordingTone;
  disabled: boolean;
  onReplace: () => void;
  onTryAgain: () => void;
  onToneChange: (tone: WordingTone) => void;
}) {
  const [toneOpen, setToneOpen] = React.useState(false);
  const { mounted: toneMounted, state: toneState } = useDropdownPresence(toneOpen);
  const toneRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!toneRef.current?.contains(event.target as Node)) setToneOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  const actionClass =
    "rounded-[4px] px-0.5 text-label-sm hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai/24 disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <button
        type="button"
        disabled={disabled}
        onClick={onReplace}
        className={cn(actionClass, "font-medium text-ai")}
      >
        Replace
      </button>
      <span className="text-muted-foreground/40" aria-hidden="true">
        ·
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onTryAgain}
        className={cn(actionClass, "text-muted-foreground hover:text-foreground")}
      >
        Try again
      </button>
      <span className="text-muted-foreground/40" aria-hidden="true">
        ·
      </span>
      <div className="relative" ref={toneRef}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={toneOpen}
          disabled={disabled}
          onClick={() => setToneOpen((open) => !open)}
          className={cn(actionClass, "inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground")}
        >
          Tone
          <IconChevronDown
            size={14}
            className="dropdown-chevron"
            data-open={toneOpen ? "true" : "false"}
          />
        </button>
        {toneMounted ? (
          <ul
            role="listbox"
            data-state={toneState}
            className="dropdown-panel absolute bottom-full left-0 z-30 mb-1 min-w-[148px] overflow-hidden rounded-[6px] border border-line bg-white py-1 shadow-200"
          >
            {WORDING_TONES.map((option) => (
              <li key={option.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === tone}
                  onClick={() => {
                    setToneOpen(false);
                    if (option.value !== tone) onToneChange(option.value);
                  }}
                  className={cn(
                    "dropdown-item flex w-full px-3 py-1.5 text-left text-paragraph-sm text-foreground hover:bg-secondary-bg",
                    option.value === tone && "bg-brand-subtle"
                  )}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function AiImprovePopover({
  anchorRef,
  customOpen,
  selection,
  panelState,
  onClose,
  onRequestCustom,
  onBackFromCustom,
  onGenerate,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  customOpen: boolean;
  selection: TextRange | null;
  panelState: "open" | "closed";
  onClose: () => void;
  onRequestCustom: () => void;
  onBackFromCustom: () => void;
  onGenerate: (input: GenerateInput) => void;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [instruction, setInstruction] = React.useState("");
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const width = customOpen ? 280 : 224;

  const updatePos = React.useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const top = rect.bottom + 4;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    setPos({ top, left, width });
  }, [anchorRef, width]);

  React.useLayoutEffect(() => {
    updatePos();
  }, [updatePos, customOpen]);

  React.useEffect(() => {
    if (customOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [customOpen]);

  React.useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (customOpen) onBackFromCustom();
      else onClose();
    };
    const onReposition = () => updatePos();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [anchorRef, customOpen, onBackFromCustom, onClose, updatePos]);

  if (!pos) return null;

  const runAction = (action: AiWordingAction, tone: WordingTone, customInstruction?: string) => {
    onGenerate({
      action,
      tone,
      seed: 0,
      selection,
      customInstruction,
    });
  };

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label="Improve with AI"
      data-state={panelState}
      className="dropdown-panel ai-improve-popover z-50 overflow-hidden rounded-[8px] border border-line bg-white py-1 shadow-200"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        transformOrigin: "top right",
      }}
    >
      <p className="px-3 pt-1.5 pb-1 text-label-sm text-muted-foreground">Improve with AI</p>
      {customOpen ? (
        <form
          className="flex flex-col gap-2 px-2 pb-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = instruction.trim();
            if (!value) return;
            runAction("custom", "natural", value);
          }}
        >
          <input
            ref={inputRef}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Make this sound less salesy"
            aria-label="Custom instruction"
            className="h-8 w-full rounded-[4px] border border-line bg-white px-2.5 text-paragraph-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/16"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onBackFromCustom}
              className="h-7 rounded-[4px] px-1 text-label-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
            >
              Back
            </button>
            <Button type="submit" size="xs" disabled={!instruction.trim()}>
              Generate
            </Button>
          </div>
        </form>
      ) : (
        AI_WORDING_ACTIONS.map((action) => (
          <React.Fragment key={action.value}>
            {action.value === "custom" ? (
              <div className="mx-2 my-1 border-t border-line" />
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (action.value === "custom") {
                  onRequestCustom();
                  return;
                }
                runAction(action.value, action.tone);
              }}
              className="dropdown-item flex w-full px-3 py-1.5 text-left text-paragraph-sm text-foreground hover:bg-secondary-bg focus-visible:bg-secondary-bg focus-visible:outline-none"
            >
              {action.label}
            </button>
          </React.Fragment>
        ))
      )}
    </div>,
    document.body
  );
}
