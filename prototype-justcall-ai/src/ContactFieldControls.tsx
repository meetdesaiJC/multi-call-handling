import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { InputField } from "@/components/InputField";
import { useDropdownPresence } from "@/components/Dropdown/useDropdownPresence";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  CONTACT_FIELDS,
  SAMPLE_CONTACT,
  SPARSE_SAMPLE_CONTACT,
  contactFieldMeta,
  segmentFieldText,
  type ContactFieldId,
  type ContactFieldMeta,
  type ContactRecord,
  type FieldFallbacks,
} from "./contactFields";

/**
 * The three surfaces a contact field needs in the builder: a way to put one
 * in, a way to read it in the sentence it lands in, and a way to say what
 * happens when the record is empty. They are here rather than in
 * PlaybookEditor because the fallbacks belong to the script as a whole and the
 * other two belong to a step — one file for the feature reads better than the
 * feature split across the editor and the page that hosts it.
 */

/* ------------------------------------------------------------------ insert */

/**
 * Sits on the bar under a step's wording, at the end of the line the admin is
 * writing rather than on top of it. Braces rather than a word: the admin is
 * about to put a token in, and the glyph is the token.
 */
export function InsertFieldButton({
  disabled,
  onInsert,
  onBeforeOpen,
  className,
}: {
  disabled?: boolean;
  onInsert: (field: ContactFieldMeta) => void;
  /** Freeze the caret before focus moves to the button. */
  onBeforeOpen?: () => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  const presence = useDropdownPresence(open && !disabled);

  return (
    <>
      <TooltipTrigger
        placement="top"
        content={<Tooltip theme="dark" arrow="bottom-center" title="Insert contact field" />}
      >
        <button
          ref={anchorRef}
          type="button"
          disabled={disabled}
          aria-label="Insert contact field"
          aria-haspopup="menu"
          aria-expanded={open}
          onMouseDown={(event) => {
            event.preventDefault();
            onBeforeOpen?.();
          }}
          onClick={() => {
            if (disabled) return;
            setOpen((current) => !current);
          }}
          className={cn(
            "flex h-7 items-center justify-center rounded-[4px] border border-line bg-white px-2 text-label-sm text-muted-foreground hover:bg-secondary-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24 disabled:pointer-events-none disabled:opacity-40",
            open && "bg-secondary-bg text-foreground",
            className
          )}
        >
          {"{ }"}
        </button>
      </TooltipTrigger>

      {presence.mounted ? (
        <FieldMenu
          anchorRef={anchorRef}
          panelState={presence.state}
          onClose={() => setOpen(false)}
          onPick={(field) => {
            setOpen(false);
            onInsert(field);
          }}
        />
      ) : null}
    </>
  );
}

function FieldMenu({
  anchorRef,
  panelState,
  onClose,
  onPick,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  panelState: "open" | "closed";
  onClose: () => void;
  onPick: (field: ContactFieldMeta) => void;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; above: boolean } | null>(null);
  const WIDTH = 216;

  const updatePos = React.useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    // The trigger sits at the bottom of a tall field, so below is often off
    // screen. Measure the panel we have already rendered rather than guessing
    // at its height from the field count.
    const height = panelRef.current?.offsetHeight ?? 0;
    const above = rect.bottom + 4 + height > window.innerHeight - 8 && rect.top - 4 - height > 8;
    setPos({
      top: above ? rect.top - 4 - height : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - WIDTH, window.innerWidth - WIDTH - 8)),
      above,
    });
  }, [anchorRef]);

  React.useLayoutEffect(updatePos, [updatePos]);

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
      onClose();
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
  }, [anchorRef, onClose, updatePos]);

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label="Insert contact field"
      data-state={panelState}
      className="dropdown-panel z-50 overflow-hidden rounded-[8px] border border-line bg-white py-1 shadow-200"
      style={{
        position: "fixed",
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        width: WIDTH,
        // Hidden for the one frame between mount and measurement — the flip
        // needs a height, and a height needs a rendered panel.
        visibility: pos ? undefined : "hidden",
        transformOrigin: pos?.above ? "bottom right" : "top right",
      }}
    >
      <p className="px-3 pt-1.5 pb-1 text-label-sm text-muted-foreground">
        Insert contact field
      </p>
      {CONTACT_FIELDS.map((field) => (
        <button
          key={field.id}
          type="button"
          role="menuitem"
          onClick={() => onPick(field)}
          className="dropdown-item flex w-full items-center px-3 py-1.5 text-left hover:bg-secondary-bg focus-visible:bg-secondary-bg focus-visible:outline-none"
        >
          <span className="text-paragraph-sm text-foreground">{field.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------- chips */

/** `{{ first_name }}` split into the braces and the name between them. */
const TOKEN_PARTS = /^(\{\{\s*)([\s\S]*?)(\s*\}\})$/;

/**
 * The chips the admin sees while typing. A textarea cannot paint a background
 * behind part of its own value, so this mirror sits directly under one with
 * the same metrics and draws the tokens; the textarea on top keeps the caret,
 * the selection and the wrapping, and renders its own text transparent.
 *
 * Nothing here may change the width of a character or the two drift apart —
 * which is why the braces are still drawn, just transparent. They are the
 * chip's padding.
 */
export const FieldTokenOverlay = React.forwardRef<
  HTMLDivElement,
  { text: string; className?: string }
>(function FieldTokenOverlay({ text, className }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-paragraph-md text-foreground",
        className
      )}
    >
      {segmentFieldText(text).map((segment, index) => {
        if (segment.kind === "text") {
          return <React.Fragment key={index}>{segment.text}</React.Fragment>;
        }
        // A token naming nothing is not a field yet, so it gets no chip — it
        // reads as the typo it is.
        if (segment.kind === "unknown") {
          return <React.Fragment key={index}>{segment.raw}</React.Fragment>;
        }
        const parts = TOKEN_PARTS.exec(segment.raw);
        if (!parts) return <React.Fragment key={index}>{segment.raw}</React.Fragment>;
        return (
          <span
            key={index}
            className="box-decoration-clone rounded-[3px] bg-badge-bluegrey-bg text-foreground"
          >
            <span className="text-transparent">{parts[1]}</span>
            {parts[2]}
            <span className="text-transparent">{parts[3]}</span>
          </span>
        );
      })}
      {/* Wording that ends in a newline would otherwise leave the mirror one
          line short of the textarea. */}
      {"​"}
    </div>
  );
});

/* --------------------------------------------------------------- fallbacks */

/**
 * One fallback per field, for the whole script — a script that greets by first
 * name greets the same way on every step, so asking per step would be five
 * copies of one decision.
 *
 * Only the fields the script actually uses are listed. A script with no fields
 * has nothing to configure and shows nothing.
 */
export function FieldFallbacksCard({
  used,
  fallbacks,
  onChange,
  className,
}: {
  used: ContactFieldId[];
  fallbacks: FieldFallbacks;
  onChange: (next: FieldFallbacks) => void;
  className?: string;
}) {
  if (used.length === 0) return null;

  return (
    <section
      className={cn("flex flex-col gap-3 rounded-lg border border-line bg-white p-4", className)}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-label-md-semi text-foreground">Contact fields</h3>
        <p className="text-paragraph-sm text-muted-foreground">
          What agents say when the contact record is empty. Leave one blank to
          drop the words entirely.
        </p>
      </div>

      {used.map((id) => {
        const field = contactFieldMeta(id);
        const value = fallbacks[id] ?? field.defaultFallback;
        return (
          <InputField
            key={id}
            label={field.label}
            value={value}
            placeholder="Say nothing"
            clearable={false}
            onChange={(event) => onChange({ ...fallbacks, [id]: event.target.value })}
          />
        );
      })}
    </section>
  );
}

/* -------------------------------------------------------- preview contacts */

export type PreviewContactKey = "complete" | "sparse";

export const PREVIEW_CONTACTS: Record<
  PreviewContactKey,
  { label: string; record: ContactRecord }
> = {
  complete: { label: "Complete record", record: SAMPLE_CONTACT },
  sparse: { label: "Missing details", record: SPARSE_SAMPLE_CONTACT },
};
