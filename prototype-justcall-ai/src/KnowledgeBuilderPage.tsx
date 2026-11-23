import * as React from "react";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { Banner } from "@/components/Banner";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import { IconClose, IconFile, IconSparkles, IconWebToDevice } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { FaqEditor } from "./FaqEditor";
import { KnowledgeImportWizard } from "./KnowledgeImportWizard";
import { HeaderEditableTitle } from "./HeaderEditableTitle";
import {
  ACCEPTED_KNOWLEDGE_FILES,
  createEmptyFaq,
  createEmptyRepository,
  displayNameForUrl,
  formatFileSize,
  generateFaqsFromSources,
  isBinaryKnowledgeFile,
  isSupportedKnowledgeFile,
  knowledgeFileTypeLabel,
  nameFromSources,
  newKnowledgeId,
  parseWebpageUrl,
  PLAYBOOK_OPTIONS,
  publishRepository,
  repositoryHealth,
  rowsToFaqs,
  sampleDocumentForName,
  sampleKnowledgeSources,
  TEAM_OPTIONS,
  type GeneratedSuggestion,
  type KnowledgeCreateMethod,
  type KnowledgeRepository,
  type KnowledgeSource,
} from "./knowledgeRepository";

export type KnowledgeLaunch =
  | { type: KnowledgeCreateMethod }
  | { type: "edit"; repository: KnowledgeRepository };

type BuilderPhase = "import" | "generate" | "generating" | "edit";

const TEAM_DROPDOWN = TEAM_OPTIONS.map((team) => ({ value: team, label: team }));
const PLAYBOOK_DROPDOWN = PLAYBOOK_OPTIONS.map((playbook) => ({
  value: playbook,
  label: playbook,
}));

export interface KnowledgeBuilderPageProps {
  launch: KnowledgeLaunch;
  onClose: () => void;
  onPublish: (repository: KnowledgeRepository) => void;
  onDelete?: (repositoryId: string) => void;
}

export function KnowledgeBuilderPage({
  launch,
  onClose,
  onPublish,
  onDelete,
}: KnowledgeBuilderPageProps) {
  const [phase, setPhase] = React.useState<BuilderPhase>(() => {
    if (launch.type === "edit") return "edit";
    if (launch.type === "import") return "import";
    if (launch.type === "generate") return "generate";
    return "edit";
  });
  const [repository, setRepository] = React.useState<KnowledgeRepository>(() => {
    if (launch.type === "edit") return launch.repository;
    return createEmptyRepository({
      faqs: launch.type === "manual" ? [createEmptyFaq()] : [],
    });
  });
  const [sources, setSources] = React.useState<KnowledgeSource[]>([]);
  const [suggestions, setSuggestions] = React.useState<GeneratedSuggestion[]>([]);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [banner, setBanner] = React.useState("");

  const update = (patch: Partial<KnowledgeRepository>) => {
    setRepository((current) => ({ ...current, ...patch, updated: "Just now" }));
  };

  const health = repositoryHealth(repository);
  const canPublish = health.ready > 0;
  const headerTitle =
    phase === "import"
      ? "Import FAQs"
      : phase === "generate"
        ? "Generate FAQs with AI"
        : phase === "generating"
          ? "Generating FAQs"
          : repository.name;

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
          {phase === "edit" ? (
            <HeaderEditableTitle
              value={repository.name}
              onChange={(name) => update({ name })}
              placeholder="Untitled repository"
              nameLabel="Repository name"
            />
          ) : (
            <p className="min-w-0 truncate text-heading-lg text-foreground">{headerTitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {phase === "edit" && onDelete && launch.type === "edit" ? (
            <Button variant="error-grey-outline" size="sm" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          ) : null}
          {phase === "edit" ? (
            <Button size="sm" disabled={!canPublish} onClick={() => setPublishOpen(true)}>
              Publish
            </Button>
          ) : null}
        </div>
      </header>

      {phase === "import" ? (
        <KnowledgeImportWizard
          onCancel={() => {
            if (launch.type === "edit" || repository.faqs.length > 0) {
              setPhase("edit");
              return;
            }
            onClose();
          }}
          onImport={(rows, fileName) => {
            const faqs = rowsToFaqs(rows, true);
            const importedName = titleFromFileName(fileName);
            setRepository((current) => {
              const name =
                current.name === "Untitled repository" ? importedName : current.name;
              return {
                ...current,
                name,
                faqs: [...faqs, ...current.faqs.filter((faq) => faq.question.trim() || faq.answer.trim())],
                updated: "Just now",
              };
            });
            setBanner(`${faqs.length} FAQs added`);
            setPhase("edit");
          }}
        />
      ) : null}

      {phase === "generate" ? (
        <GenerateFromSources
          sources={sources}
          onSourcesChange={setSources}
          onCancel={() => {
            if (launch.type === "edit" || repository.faqs.length > 0) {
              setPhase("edit");
              return;
            }
            onClose();
          }}
          onGenerate={() => {
            const next = generateFaqsFromSources(sources);
            setSuggestions(next);
            update({ name: nameFromSources(sources) });
            setPhase("generating");
          }}
        />
      ) : null}

      {phase === "generating" ? (
        <GeneratingFaqs
          sources={sources}
          suggestions={suggestions}
          onDone={() => {
            setRepository((current) => ({
              ...current,
              faqs: [
                ...suggestions.map(({ selected: _selected, ...faq }) => faq),
                ...current.faqs.filter((faq) => faq.question.trim() || faq.answer.trim()),
              ],
              updated: "Just now",
            }));
            setPhase("edit");
          }}
        />
      ) : null}

      {phase === "edit" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {banner ? (
            <div className="px-6 pt-4">
              <Banner variant="success" width="page" onClose={() => setBanner("")}>
                {banner}
              </Banner>
            </div>
          ) : null}
          <div className="flex min-h-0 flex-1 gap-6 overflow-hidden bg-white px-6 py-6">
            <aside className="flex w-[300px] shrink-0 flex-col">
              <div className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4">
                <p className="text-label-md-semi text-foreground">Assign this knowledge</p>
                <Dropdown
                  label="Assign user groups"
                  placeholder="Search user groups"
                  searchPlaceholder="Search user groups"
                  options={TEAM_DROPDOWN}
                  multiple
                  searchable
                  maxVisibleTags={1}
                  value={repository.assignedTeams}
                  onValueChange={(value) =>
                    update({
                      assignedTeams: Array.isArray(value) ? value : [value],
                    })
                  }
                />
                <Dropdown
                  label="Assign scripts"
                  placeholder="Search scripts"
                  searchPlaceholder="Search scripts"
                  options={PLAYBOOK_DROPDOWN}
                  multiple
                  searchable
                  maxVisibleTags={1}
                  value={repository.assignedPlaybooks}
                  onValueChange={(value) =>
                    update({
                      assignedPlaybooks: Array.isArray(value) ? value : [value],
                    })
                  }
                />
                <p className="text-pretty text-paragraph-sm text-muted-foreground">
                  Assigned agents will see these answers on matching calls.
                </p>
              </div>
            </aside>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <FaqEditor faqs={repository.faqs} onChange={(faqs) => update({ faqs })} />
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        size="sm"
        title="Ready to publish"
        description="Agents will start seeing this knowledge on matching conversations."
        footer={
          <>
            <Button variant="grey-outline" size="sm" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onPublish(publishRepository(repository));
              }}
            >
              Publish
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-3">
          <SummaryRow label="Repository" value={repository.name} />
          <SummaryRow
            label="Knowledge"
            value={`${health.ready} ${health.ready === 1 ? "FAQ" : "FAQs"}`}
          />
          <SummaryRow
            label="Available to"
            value={assignmentLabel(repository) || "No user groups selected"}
          />
        </dl>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        size="sm"
        title="Delete this repository?"
        description="Agents will stop receiving these answers. This can’t be undone in the prototype."
        footer={
          <>
            <Button variant="grey-outline" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="error"
              size="sm"
              onClick={() => {
                onDelete?.(repository.id);
                onClose();
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </main>
  );
}

function GenerateFromSources({
  sources,
  onSourcesChange,
  onCancel,
  onGenerate,
}: {
  sources: KnowledgeSource[];
  onSourcesChange: (next: KnowledgeSource[]) => void;
  onCancel: () => void;
  onGenerate: () => void;
}) {
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const addSources = (incoming: KnowledgeSource[]) => {
    const next = [...sources];
    incoming.forEach((source) => {
      const duplicate =
        source.kind === "url"
          ? next.some((item) => item.href === source.href)
          : next.some((item) => item.kind === "file" && item.name === source.name);
      if (!duplicate) next.push(source);
    });
    onSourcesChange(next);
    setError("");
  };

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;

    const unsupported = list.filter((file) => !isSupportedKnowledgeFile(file));
    if (unsupported.length && unsupported.length === list.length) {
      setError("Use a PDF, Word, or text document — or add a webpage link instead.");
      return;
    }

    const accepted = list.filter((file) => isSupportedKnowledgeFile(file));
    const next: KnowledgeSource[] = [];
    for (const file of accepted) {
      const text = isBinaryKnowledgeFile(file.name)
        ? sampleDocumentForName(file.name)
        : (await file.text()) || sampleDocumentForName(file.name);
      next.push({
        id: newKnowledgeId("src"),
        kind: "file",
        name: file.name,
        typeLabel: knowledgeFileTypeLabel(file.name),
        sizeLabel: formatFileSize(file.size),
        text,
      });
    }
    addSources(next);
    if (unsupported.length) {
      setError("Some files were skipped. Use PDF, Word, or text documents.");
    }
  };

  const addUrl = () => {
    const parsed = parseWebpageUrl(url);
    if (!parsed) {
      setError("Enter a full webpage link, like https://help.example.com/billing.");
      return;
    }
    addSources([
      {
        id: newKnowledgeId("src"),
        kind: "url",
        name: displayNameForUrl(parsed),
        href: parsed.href,
        typeLabel: "Webpage",
        text: sampleDocumentForName(`${parsed.hostname} ${parsed.pathname}`),
      },
    ]);
    setUrl("");
  };

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-auto px-6 py-8">
      <div className="flex w-full max-w-[720px] flex-col gap-6">
        <div>
          <h2 className="text-heading-xxl text-pretty text-foreground">
            Add files or pages for AI to read
          </h2>
          <p className="mt-1 text-pretty text-paragraph-sm text-muted-foreground">
            Drop PDFs, documents, or webpage links. We’ll draft FAQs from what’s in them — nothing is
            published until you review the answers.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (event.dataTransfer.files.length) void addFiles(event.dataTransfer.files);
            }}
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-brand/40 bg-brand-subtle/20 px-6 py-10 text-center hover:border-brand hover:bg-brand-subtle/40"
          >
            <span className="flex size-10 items-center justify-center rounded-[8px] bg-white text-ai shadow-[0_0_0_1px_rgba(103,59,255,0.16)]">
              <IconSparkles size={20} />
            </span>
            <span>
              <span className="block text-label-md-semi text-foreground">
                Upload PDFs, Word, or text files
              </span>
              <span className="mt-1 block text-paragraph-sm text-muted-foreground">
                Drop files or click to browse. AI extracts questions and answers on its own.
              </span>
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPTED_KNOWLEDGE_FILES}
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />

          <div className="flex flex-col gap-2">
            <span className="text-label-sm text-foreground">Webpage link</span>
            <div className="flex items-start gap-2">
              <InputField
                placeholder="https://help.example.com/billing"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addUrl();
                  }
                }}
                wrapperClassName="flex-1"
                clearable={false}
              />
              <Button variant="grey-outline" size="md" onClick={addUrl} disabled={!url.trim()}>
                Add
              </Button>
            </div>
          </div>

          {error ? (
            <Banner variant="error" width="page">
              {error}
            </Banner>
          ) : null}

          {sources.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {sources.map((source) => (
                <li
                  key={source.id}
                  className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-foreground">
                    {source.kind === "url" ? (
                      <IconWebToDevice size={16} />
                    ) : (
                      <IconFile size={16} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label-md-semi text-foreground">
                      {source.name}
                    </span>
                    <span className="block truncate text-paragraph-sm text-muted-foreground">
                      {source.kind === "url"
                        ? source.href
                        : [source.typeLabel, source.sizeLabel].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${source.name}`}
                    onClick={() =>
                      onSourcesChange(sources.filter((item) => item.id !== source.id))
                    }
                    className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  >
                    <IconClose size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {sources.length === 0 ? (
            <Button
              variant="grey-outline"
              size="sm"
              className="self-start"
              onClick={() => addSources(sampleKnowledgeSources())}
            >
              Use sample help center
            </Button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="grey-outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            leftIcon={<IconSparkles size={16} />}
            disabled={sources.length === 0}
            onClick={onGenerate}
          >
            Generate FAQs
          </Button>
        </div>
      </div>
    </div>
  );
}

function GeneratingFaqs({
  sources,
  suggestions,
  onDone,
}: {
  sources: KnowledgeSource[];
  suggestions: GeneratedSuggestion[];
  onDone: () => void;
}) {
  const [visible, setVisible] = React.useState(0);
  const sourceNames = sources.map((source) => source.name).join(" · ");

  React.useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(suggestions.length);
      const done = window.setTimeout(onDone, 200);
      return () => window.clearTimeout(done);
    }
    const timers: number[] = [];
    suggestions.forEach((_, index) => {
      timers.push(window.setTimeout(() => setVisible(index + 1), 220 * (index + 1)));
    });
    timers.push(window.setTimeout(onDone, 220 * suggestions.length + 480));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // Bind to this suggestion set only; onDone is a phase setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions]);

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-auto px-6 py-16">
      <div className="flex w-full max-w-[480px] flex-col gap-6">
        <div className="flex items-center gap-2 text-ai">
          <IconSparkles size={16} />
          <p className="text-label-md-semi">Reading sources and drafting answers</p>
        </div>
        {sourceNames ? (
          <p className="text-paragraph-sm text-muted-foreground">{sourceNames}</p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {suggestions.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                "transition-opacity duration-200",
                index < visible ? "opacity-100" : "opacity-30"
              )}
            >
              <p className="text-label-md-semi text-foreground">{item.question}</p>
              <p className="line-clamp-2 text-paragraph-sm text-muted-foreground">{item.answer}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label-sm text-muted-foreground">{label}</dt>
      <dd className="text-paragraph-md text-foreground">{value}</dd>
    </div>
  );
}

function assignmentLabel(repo: KnowledgeRepository): string {
  return [...repo.assignedTeams, ...repo.assignedPlaybooks].join(", ");
}

function titleFromFileName(fileName: string): string {
  const stem = fileName.replace(/\.(csv|xlsx|xls)$/i, "").replace(/[-_]+/g, " ").trim();
  if (!stem) return "Imported FAQs";
  return stem.replace(/\b\w/g, (char) => char.toUpperCase());
}
