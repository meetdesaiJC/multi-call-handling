import * as React from "react";
import { Button } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { IconFile } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { cn } from "@/lib/utils";
import {
  SAMPLE_SCRIPT_DOCUMENT,
  createPlaybookFromDocument,
  type ScriptPlaybook,
} from "./scriptPlaybook";

const ACCEPTED =
  ".txt,.md,.csv,.docx,.doc,.pdf,text/plain,text/markdown,text/csv,application/pdf";

export interface ScriptUploadWizardProps {
  open: boolean;
  onClose: () => void;
  onImport: (playbook: ScriptPlaybook) => void;
}

export function ScriptUploadWizard({
  open,
  onClose,
  onImport,
}: ScriptUploadWizardProps) {
  const [error, setError] = React.useState("");
  const [isDragging, setIsDragging] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setError("");
      setIsDragging(false);
    }
  }, [open]);

  const importText = (text: string, fileName: string) => {
    const playbook = createPlaybookFromDocument(text, fileName);
    const hasContent = playbook.stages.some((stage) =>
      stage.steps.some((item) => item.title.trim() || item.suggestedWording.trim())
    );
    if (!hasContent) {
      setError("We couldn’t find any steps in that file. Try a list of titles, or Title,Wording columns in a CSV.");
      return;
    }
    onImport(playbook);
  };

  const handleFile = async (file: File) => {
    setError("");
    const name = file.name.toLowerCase();
    const binary =
      name.endsWith(".pdf") ||
      name.endsWith(".docx") ||
      name.endsWith(".doc") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".xls");

    if (binary) {
      importText(SAMPLE_SCRIPT_DOCUMENT, file.name);
      return;
    }

    if (
      !name.endsWith(".txt") &&
      !name.endsWith(".md") &&
      !name.endsWith(".csv") &&
      !file.type.startsWith("text/")
    ) {
      setError("Use a TXT, Markdown, or CSV file. PDF and Word files work in this prototype as a sample import.");
      return;
    }

    const text = await file.text();
    if (!text.trim()) {
      setError("That file looks empty. Add steps or suggested wording and try again.");
      return;
    }
    importText(text, file.name);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Upload a script"
    >
      <div className="flex flex-col gap-4">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
            isDragging
              ? "border-brand bg-brand-subtle/60"
              : "border-brand/40 bg-brand-subtle/20 hover:border-brand hover:bg-brand-subtle/40"
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-[8px] bg-white text-brand shadow-[0_0_0_1px_rgba(0,76,230,0.12)]">
            <IconFile size={20} />
          </span>
          <span>
            <span className="block text-label-md-semi text-foreground">
              Upload TXT, Markdown, or CSV
            </span>
            <span className="mt-1 block text-paragraph-sm text-muted-foreground">
              Drop a file or click to browse.
            </span>
          </span>
        </button>
        {error ? (
          <Banner variant="error" width="page">
            {error}
          </Banner>
        ) : null}
        <Button
          variant="link"
          size="sm"
          className="self-start"
          onClick={() => importText(SAMPLE_SCRIPT_DOCUMENT, "account-access-recovery.txt")}
        >
          Use sample account-access script
        </Button>
      </div>
    </Modal>
  );
}
