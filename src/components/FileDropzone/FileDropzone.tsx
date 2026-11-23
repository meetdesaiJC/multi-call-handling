import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import { IconClose, IconEye } from "@/components/Icon";
import uploadIllustration from "./assets/upload-illustration.svg";
import csvPage from "./assets/csv-page.svg";
import csvFold from "./assets/csv-fold.svg";
import csvFoldShadow from "./assets/csv-fold-shadow.svg";
import csvLabel from "./assets/csv-label.svg";
import csvLabelShadow from "./assets/csv-label-shadow.svg";

/**
 * FileDropzone — synced from Figma "Non-Calling Licenses / Upload & attach
 * files" (node 2:1946).
 *
 * A dashed drop target with the upload illustration, a "Click to upload or
 * drag & drop" line and an accepted-types hint. Optionally followed by a
 * sample-file row ("download this to start from") with a Download button.
 *
 * The whole box is one button, so it is keyboard-reachable and the click and
 * the drop land in the same place. It reports files and nothing else: what
 * counts as valid, and what to show once a file is chosen, belong to the
 * caller.
 */

export interface FileDropzoneSample {
  /** Copy on the left of the row. */
  description: React.ReactNode;
  /** Button label. Default `"Download"`. */
  label?: React.ReactNode;
  /** 16px icon before the label — e.g. `<CsvFileIcon />`. Button form only. */
  icon?: React.ReactNode;
  /**
   * `"button"` (default, Figma node 2:1972): copy left, outline Download
   * button right. `"link"`: the action reads on as a text link at the end of
   * the sentence.
   */
  appearance?: "button" | "link";
  onDownload?: () => void;
}

export interface FileDropzoneProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrop"> {
  /** Called with the chosen or dropped files. */
  onFiles: (files: File[]) => void;
  /** Native `accept` for the file picker, e.g. `".csv"`. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Line under the call to action, e.g. accepted types and max size. */
  hint?: React.ReactNode;
  /** Sample-file row under the box. Omit to hide it. */
  sample?: FileDropzoneSample;
}

/**
 * CSV file glyph from the same Figma frame. Each part is placed as a share of
 * the box, so it draws crisply at any `size` (16 for the sample button, 32
 * for an uploaded file).
 */
export function CsvFileIcon({ size = 16, className }: { size?: number; className?: string }) {
  const part = "absolute block max-w-none";
  return (
    <span
      aria-hidden="true"
      className={cn("relative block shrink-0 overflow-clip", className)}
      style={{ width: size, height: size }}
    >
      <img src={csvPage} alt="" className={cn(part, "top-0 left-[18.75%] h-full w-[75%]")} />
      <img src={csvFold} alt="" className={cn(part, "top-0 left-[68.75%] h-1/4 w-1/4")} />
      <img src={csvFoldShadow} alt="" className={cn(part, "top-1/4 left-3/4 h-[18.75%] w-[18.75%]")} />
      <img src={csvLabel} alt="" className={cn(part, "top-[46.88%] left-[6.25%] h-[37.5%] w-[75%]")} />
      <img src={csvLabelShadow} alt="" className={cn(part, "top-[81.25%] left-[18.75%] h-[6.25%] w-[62.5%]")} />
      <span
        className="absolute top-[39.84%] left-[17.97%] font-semibold whitespace-nowrap text-white"
        // Text scales with the glyph: 3.8px on the 16px master.
        style={{ fontSize: size * 0.2375, lineHeight: `${size * 0.5}px`, letterSpacing: size * 0.00625 }}
      >
        CSV
      </span>
    </span>
  );
}

/** "team_members_import_s…3-.csv": keeps the start and the extension. */
function truncateMiddle(name: string, max = 28) {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  const tail = dot > 0 ? name.slice(Math.max(dot - 3, 0)) : name.slice(-6);
  return `${name.slice(0, max - tail.length - 3)}...${tail}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const uploadedAtFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export interface UploadedFileProps {
  name: string;
  /** Bytes. */
  size: number;
  uploadedAt: Date;
  /** File-type glyph. Default: the CSV glyph. */
  icon?: React.ReactNode;
  /** Shows the eye button when provided. */
  onPreview?: () => void;
  /** Shows the remove (✕) button when provided. */
  onRemove?: () => void;
  className?: string;
}

/**
 * UploadedFile — what a FileDropzone becomes once a file is accepted: a quiet
 * success surface naming the file, its size and when it landed, with preview
 * and remove. Long names truncate in the middle so the extension survives.
 */
export function UploadedFile({
  name,
  size,
  uploadedAt,
  icon,
  onPreview,
  onRemove,
  className,
}: UploadedFileProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-md border border-success-border/60 bg-success-secondary px-5 py-4",
        className
      )}
    >
      {icon ?? <CsvFileIcon size={32} />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-paragraph-md text-foreground" title={name}>
          <span className="text-label-md">{truncateMiddle(name)}</span> file is uploaded
          successfully.
        </p>
        <p className="text-paragraph-sm text-disabled-fg">
          {formatBytes(size)} <span aria-hidden="true">|</span> {uploadedAtFormat.format(uploadedAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {onPreview ? (
          <Button
            type="button"
            variant="grey-outline"
            size="sm"
            iconOnly
            className="[&_svg]:size-5"
            aria-label={`Preview ${name}`}
            leftIcon={<IconEye size={20} />}
            onClick={onPreview}
          />
        ) : null}
        {onRemove ? (
          <button
            type="button"
            aria-label={`Remove ${name}`}
            onClick={onRemove}
            className="flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-success-border/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={20} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export const FileDropzone = React.forwardRef<HTMLDivElement, FileDropzoneProps>(
  ({ onFiles, accept, multiple, disabled, hint, sample, className, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = React.useState(false);

    const take = (list: FileList | null) => {
      const files = list ? Array.from(list) : [];
      if (files.length) onFiles(multiple ? files : files.slice(0, 1));
    };

    return (
      <div ref={ref} className={cn("flex w-full flex-col gap-3", className)} {...props}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            take(event.target.files);
            // Cleared so picking the same file again still fires a change.
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            // Leaving into a child isn't leaving the box.
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!disabled) take(event.dataTransfer.files);
          }}
          data-dragging={dragging}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2.5 rounded-sm border border-dashed border-line bg-white px-8 py-5 transition-colors",
            "hover:border-control-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
            "data-[dragging=true]:border-brand data-[dragging=true]:bg-brand-subtle",
            "disabled:cursor-not-allowed disabled:bg-control-disabled-bg disabled:hover:border-line"
          )}
        >
          <img src={uploadIllustration} alt="" width={96} height={96} className="shrink-0" />
          <span className="flex flex-col items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="text-label-md text-brand">Click to upload</span>
              <span className="text-paragraph-sm text-muted-foreground">or drag &amp; drop</span>
            </span>
            {hint ? <span className="text-paragraph-sm text-muted-foreground">{hint}</span> : null}
          </span>
        </button>

        {sample?.appearance === "link" ? (
          <p className="text-paragraph-md text-muted-foreground">
            {sample.description}{" "}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="inline h-auto align-baseline text-paragraph-md"
              onClick={sample.onDownload}
            >
              {sample.label ?? "Download"}
            </Button>
          </p>
        ) : sample ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-paragraph-sm text-muted-foreground">{sample.description}</p>
            <Button
              type="button"
              variant="grey-outline"
              size="xs"
              className="shrink-0"
              leftIcon={sample.icon}
              onClick={sample.onDownload}
            >
              {sample.label ?? "Download"}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
);
FileDropzone.displayName = "FileDropzone";
