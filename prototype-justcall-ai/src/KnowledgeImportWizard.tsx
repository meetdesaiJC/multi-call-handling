import * as React from "react";
import { Button } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { IconFile } from "@/components/Icon";
import {
  applyMapping,
  CSV_TEMPLATE,
  parseCsvText,
  sampleImport,
  type ImportedRow,
  type ParsedImport,
} from "./knowledgeRepository";

export interface KnowledgeImportWizardProps {
  onCancel: () => void;
  onImport: (rows: ImportedRow[], fileName: string) => void;
}

export function KnowledgeImportWizard({ onCancel, onImport }: KnowledgeImportWizardProps) {
  const [error, setError] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const importParsed = (next: ParsedImport) => {
    const mapped = applyMapping(next);
    const hasQuestion = Object.values(mapped.mapping).includes("question");
    const hasAnswer = Object.values(mapped.mapping).includes("answer");
    const rows = mapped.rows.filter((row) => row.question.trim());

    if (!hasQuestion || !hasAnswer || rows.length === 0) {
      setError("We couldn’t find Question and Answer columns. Download the CSV template and try again.");
      return;
    }

    onImport(rows, mapped.fileName);
  };

  const handleFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      importParsed({
        ...sampleImport(),
        fileName: file.name,
      });
      return;
    }
    if (!name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Use a CSV or XLSX file.");
      return;
    }
    const text = await file.text();
    const next = parseCsvText(text, file.name);
    if (next.columns.length === 0 || next.rows.length === 0) {
      setError("We couldn’t find any rows in that file. Check the format and try again.");
      return;
    }
    importParsed(next);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "faq-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-auto px-6 py-8">
      <div className="flex w-full max-w-[720px] flex-col gap-6">
        <div>
          <h2 className="text-heading-xxl text-foreground">Upload FAQs</h2>
          <p className="mt-1 text-paragraph-sm text-muted-foreground">
            We’ll import questions and answers from your file and open them in the repository.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-brand/40 bg-brand-subtle/20 px-6 py-10 text-center hover:border-brand hover:bg-brand-subtle/40"
          >
            <span className="flex size-10 items-center justify-center rounded-[8px] bg-white text-brand shadow-[0_0_0_1px_rgba(0,76,230,0.12)]">
              <IconFile size={20} />
            </span>
            <span>
              <span className="block text-label-md-semi text-foreground">Upload CSV or XLSX</span>
              <span className="mt-1 block text-paragraph-sm text-muted-foreground">
                Drop a file or click to browse. FAQs appear in the repository right away.
              </span>
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
          {error ? (
            <Banner variant="error" width="page">
              {error}
            </Banner>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={() => importParsed(sampleImport())}>
              Use sample billing FAQs
            </Button>
            <Button variant="link" size="sm" onClick={downloadTemplate}>
              Download CSV template
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="grey-outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
