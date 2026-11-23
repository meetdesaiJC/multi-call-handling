import * as React from "react";
import { Modal } from "@/components/Modal";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import {
  flattenSteps,
  playbookUsedFields,
  spokenLineFor,
  type ScriptPlaybook,
} from "./scriptPlaybook";
import { resolveFieldText } from "./contactFields";
import { PREVIEW_CONTACTS, type PreviewContactKey } from "./ContactFieldControls";
import {
  ScriptStepRow,
  prefersReducedMotion,
  useScriptChecklistMotion,
} from "./ScriptChecklist";
import { SpeakProgressHint } from "./SpeakProgressHint";
import { matchingOpenStepIndexes } from "./scriptSpeechMatch";
import { useSpeechListen } from "./useSpeechListen";

export interface ScriptPreviewModalProps {
  open: boolean;
  playbook: ScriptPlaybook;
  onClose: () => void;
}

export function ScriptPreviewModal({ open, playbook, onClose }: ScriptPreviewModalProps) {
  const steps = React.useMemo(() => flattenSteps(playbook), [playbook]);
  const reduced = prefersReducedMotion();
  /**
   * Which contact the script is being read against. A script with no fields
   * reads the same either way, so the switch only appears when there is a
   * difference to see.
   */
  const [contactKey, setContactKey] = React.useState<PreviewContactKey>("complete");
  const usesFields = playbookUsedFields(playbook).length > 0;
  const contact = PREVIEW_CONTACTS[contactKey].record;
  const resolve = React.useCallback(
    (text: string) => resolveFieldText(text, contact, playbook.fieldFallbacks),
    [contact, playbook.fieldFallbacks]
  );
  const [completed, setCompleted] = React.useState<Set<number>>(() => new Set());
  const [lastChecked, setLastChecked] = React.useState<number | null>(null);
  const activeRef = React.useRef<HTMLLIElement | null>(null);
  const consumedRef = React.useRef("");

  const complete = steps.length > 0 && completed.size >= steps.length;
  const listening = open && steps.length > 0 && !complete;
  const { heard, status } = useSpeechListen(listening, `${playbook.id}:${completed.size}`);

  const resetPreview = React.useCallback(() => {
    consumedRef.current = "";
    setLastChecked(null);
    setCompleted(new Set());
  }, []);

  React.useEffect(() => {
    if (!open) return;
    resetPreview();
  }, [open, playbook.id, resetPreview]);

  React.useEffect(() => {
    if (!listening) return;
    if (!heard || heard === consumedRef.current) return;
    // The agent speaks the resolved line, so that is what the match runs on.
    const hits = matchingOpenStepIndexes(
      heard,
      steps.map((item) => ({ ...item, suggestedWording: resolve(item.suggestedWording) })),
      completed
    );
    if (hits.length === 0) return;
    consumedRef.current = heard;
    setLastChecked(hits[0] ?? null);
    setCompleted((current) => {
      const next = new Set(current);
      hits.forEach((index) => next.add(index));
      return next;
    });
  }, [heard, listening, completed, steps, resolve]);

  const { phases, glowing } = useScriptChecklistMotion({
    completed,
    stepCount: steps.length,
    reduced,
  });

  React.useEffect(() => {
    if (!open || lastChecked == null) return;
    activeRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, [lastChecked, open, reduced]);

  const announced = lastChecked != null ? steps[lastChecked] : undefined;
  const announcedLine = announced ? resolve(spokenLineFor(announced)) : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={playbook.name}
      description="What the agent sees during the call"
      bodyClassName="text-foreground"
    >
      {steps.length === 0 ? (
        <p className="rounded-lg bg-secondary-bg px-4 py-6 text-center text-paragraph-sm text-muted-foreground">
          Add steps in the editor to preview this script.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {usesFields ? (
            <div className="flex flex-col gap-1.5">
              <SegmentedTabs
                aria-label="Preview contact"
                value={contactKey}
                onValueChange={(key) => setContactKey(key as PreviewContactKey)}
                items={[
                  { key: "complete", label: PREVIEW_CONTACTS.complete.label },
                  { key: "sparse", label: PREVIEW_CONTACTS.sparse.label },
                ]}
              />
              {/* The second half of the promise: the script has to read as a
                  sentence when the CRM knows nothing, not just when it knows
                  everything. */}
              <p className="text-paragraph-sm text-muted-foreground">
                {contactKey === "complete"
                  ? "Reading against a contact with every field filled in."
                  : "Reading against a contact with only a phone number — the rest falls back."}
              </p>
            </div>
          ) : null}

          <SpeakProgressHint listening={status === "listening"}>
            {status === "denied" ? (
              "Microphone access is needed to check the script. Allow it, then open Preview again."
            ) : status === "unsupported" ? (
              "Speech isn’t available in this browser. Chrome or Safari can listen for the line."
            ) : complete ? (
              <>
                Script complete.{" "}
                <button
                  type="button"
                  onClick={resetPreview}
                  className="text-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
                >
                  Try again
                </button>
              </>
            ) : (
              "Speak any line. We’ll check it off when about half of it matches."
            )}
          </SpeakProgressHint>

          <ol className="flex flex-col" aria-label="Call script">
            {steps.map((step, index) => {
              const wording = resolve(step.suggestedWording).trim();
              return (
                <li key={step.id} ref={lastChecked === index ? activeRef : undefined}>
                  <ScriptStepRow
                    title={step.title || "Untitled step"}
                    wording={wording || undefined}
                    phase={phases[index] ?? "idle"}
                    glow={glowing.has(index)}
                    reduced={reduced}
                  />
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {complete
          ? "Script complete"
          : announced
            ? `Checked: ${announced.title}.${announcedLine ? ` ${announcedLine}` : ""}`
            : ""}
      </p>
    </Modal>
  );
}
