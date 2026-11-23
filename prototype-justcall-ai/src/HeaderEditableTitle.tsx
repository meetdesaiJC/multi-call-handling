import * as React from "react";
import { IconCheck, IconClose, IconPencil } from "@/components/Icon";
import { cn } from "@/lib/utils";

export function HeaderEditableTitle({
  value,
  onChange,
  placeholder = "Untitled script",
  nameLabel = "Script name",
  size = "heading",
  autoEdit = false,
  pencil = "hover",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  nameLabel?: string;
  size?: "heading" | "compact";
  autoEdit?: boolean;
  /**
   * "always" keeps the pencil visible — for a title that sits in a panel of
   * its own, where nothing else advertises that the name is editable.
   */
  pencil?: "hover" | "always";
}) {
  const [editing, setEditing] = React.useState(autoEdit);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const compact = size === "compact";
  const typeClass = compact ? "text-label-md-semi" : "text-heading-lg";

  React.useEffect(() => {
    if (!editing) return;
    setDraft(value);
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [editing, value]);

  const commit = () => {
    const next = draft.trim() || placeholder;
    if (next !== value) onChange(next);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        ref={rootRef}
        className={cn(
          "items-center gap-0.5 rounded-[4px] border border-brand bg-white pl-2.5 pr-1 ring-2 ring-brand/16",
          compact ? "flex min-w-0 flex-1" : "inline-flex max-w-full"
        )}
      >
        {compact ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={(event) => {
              if (rootRef.current?.contains(event.relatedTarget as Node)) return;
              commit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancel();
              }
            }}
            aria-label={nameLabel}
            className={cn(
              "min-w-0 flex-1 border-0 bg-transparent py-1 text-foreground outline-none",
              typeClass
            )}
          />
        ) : (
          <span className="grid min-w-[4ch] max-w-[min(28rem,calc(100vw-18rem))]">
            <span
              aria-hidden
              className={cn("invisible col-start-1 row-start-1 whitespace-pre py-1", typeClass)}
            >
              {draft || placeholder}
              {"\u2008"}
            </span>
            <input
              ref={inputRef}
              value={draft}
              size={1}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={(event) => {
                if (rootRef.current?.contains(event.relatedTarget as Node)) return;
                commit();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commit();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancel();
                }
              }}
              aria-label={nameLabel}
              className={cn(
                "col-start-1 row-start-1 w-full min-w-0 border-0 bg-transparent py-1 text-foreground outline-none",
                typeClass
              )}
            />
          </span>
        )}
        <button
          type="button"
          aria-label="Save name"
          onMouseDown={(event) => event.preventDefault()}
          onClick={commit}
          className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-brand hover:bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconCheck size={16} />
        </button>
        <button
          type="button"
          aria-label="Cancel renaming"
          onMouseDown={(event) => event.preventDefault()}
          onClick={cancel}
          className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-secondary-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`Rename ${nameLabel.toLowerCase()}`}
      className={cn(
        "group/title items-center rounded-[4px] py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
        compact ? "flex min-w-0 flex-1" : "inline-flex min-w-0 max-w-full"
      )}
    >
      <span
        className={cn(
          "truncate",
          typeClass,
          compact && !value.trim() ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {value.trim() || placeholder}
      </span>
      <span
        className={cn(
          "ml-1.5 group-hover/title:inline-flex group-focus-visible/title:inline-flex",
          pencil === "always" ? "inline-flex" : "hidden"
        )}
      >
        <IconPencil size={16} className="text-brand" />
      </span>
    </button>
  );
}
