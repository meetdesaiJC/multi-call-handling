import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Notes editor — a plain box that quietly knows formatting.
 *
 * Agents type notes mid-call: anything that costs a trip to a toolbar costs
 * attention they owe the customer. So nothing is on show. Formatting is reached
 * the two ways people already reach for it without looking — markdown as they
 * type (`- ` for a bullet, `## ` for a heading, `**bold**`) and the keyboard
 * (⌘B, ⌘K, ⌥⌘1) — and the one moment a toolbar genuinely helps is after the
 * fact, when text is already selected and the agent is deciding what it should
 * look like. That is the only time it appears, and it appears over the words.
 *
 * Everything runs on `contentEditable` + `execCommand`. Deprecated, yes, but it
 * is the only thing that hands us undo, IME and spellcheck for free, and this
 * prototype's job is to feel right rather than to ship an editor framework.
 */

export type NotesEditorValue = { html: string; text: string };

export type NotesEditorCaret = { offset: number; scroll: number };

export type NotesEditorHandle = {
  /** Focus the box and put the caret back where the agent left it. */
  focus: () => void;
  /** Record the caret so a later `focus()` can restore it. */
  saveCaret: () => void;
};

type BlockKind = "text" | "h1" | "h2" | "h3" | "ul" | "ol" | "quote";

type InlineCommand = "bold" | "italic" | "underline" | "strikeThrough";

const BLOCK_TAGS = new Set(["DIV", "P", "H1", "H2", "H3", "LI", "BLOCKQUOTE"]);

const BLOCK_ITEMS: { kind: BlockKind; label: string; digit: string }[] = [
  { kind: "text", label: "Text", digit: "0" },
  { kind: "h1", label: "Heading 1", digit: "1" },
  { kind: "h2", label: "Heading 2", digit: "2" },
  { kind: "h3", label: "Heading 3", digit: "3" },
  { kind: "ol", label: "Numbered list", digit: "4" },
  { kind: "ul", label: "Bulleted list", digit: "5" },
  { kind: "quote", label: "Quote", digit: "6" },
];

/** Markers typed at the head of a line, resolved on the space that closes them. */
const BLOCK_RULES: { test: RegExp; kind: BlockKind }[] = [
  { test: /^#$/, kind: "h1" },
  { test: /^##$/, kind: "h2" },
  { test: /^###$/, kind: "h3" },
  { test: /^[-*+]$/, kind: "ul" },
  { test: /^\d{1,3}[.)]$/, kind: "ol" },
  { test: /^>$/, kind: "quote" },
];

/**
 * Wrapped runs, resolved on the delimiter that closes them. The lookbehinds
 * stop `**bold**` being read as a stray italic pair, and keep `snake_case`
 * out of it entirely.
 */
const INLINE_RULES: { pattern: RegExp; command: InlineCommand }[] = [
  { pattern: /\*\*([^\s*](?:[^*]*[^\s*])?)\*\*$/, command: "bold" },
  { pattern: /(?<![\w_])__([^\s_](?:[^_]*[^\s_])?)__$/, command: "bold" },
  { pattern: /(?<![\w*])\*([^\s*](?:[^*]*[^\s*])?)\*$/, command: "italic" },
  { pattern: /(?<![\w~])~~([^\s~](?:[^~]*[^\s~])?)~~$/, command: "strikeThrough" },
];

const INLINE_TRIGGERS = new Set(["*", "_", "~"]);

const isApple =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

const MOD = isApple ? "⌘" : "Ctrl+";
const ALT_MOD = isApple ? "⌥⌘" : "Ctrl+Alt+";

function exec(command: string, value?: string) {
  try {
    document.execCommand(command, false, value);
  } catch {
    /* A few no-op edge cases throw. The note survives them. */
  }
}

function commandState(command: string) {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

function selectionIn(root: HTMLElement | null): Selection | null {
  const sel = document.getSelection();
  if (!root || !sel || sel.rangeCount === 0) return null;
  if (!root.contains(sel.getRangeAt(0).commonAncestorContainer)) return null;
  return sel;
}

function blockOf(root: HTMLElement, node: Node | null): HTMLElement | null {
  let el: HTMLElement | null =
    node instanceof HTMLElement ? node : node?.parentElement ?? null;
  while (el && el !== root) {
    if (BLOCK_TAGS.has(el.tagName)) return el;
    el = el.parentElement;
  }
  return null;
}

function blockKindOf(root: HTMLElement, node: Node | null): BlockKind {
  const block = blockOf(root, node);
  if (!block) return "text";
  switch (block.tagName) {
    case "H1":
      return "h1";
    case "H2":
      return "h2";
    case "H3":
      return "h3";
    case "BLOCKQUOTE":
      return "quote";
    case "LI":
      return block.parentElement?.tagName === "OL" ? "ol" : "ul";
    default:
      return "text";
  }
}

function anchorOf(root: HTMLElement, node: Node | null): HTMLAnchorElement | null {
  let el: HTMLElement | null =
    node instanceof HTMLElement ? node : node?.parentElement ?? null;
  while (el && el !== root) {
    if (el.tagName === "A") return el as HTMLAnchorElement;
    el = el.parentElement;
  }
  return null;
}

/** Caret position as a plain character count, so it survives a remount. */
function caretOffsetIn(root: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(root);
  try {
    range.setEnd(node, offset);
  } catch {
    return 0;
  }
  return range.toString().length;
}

function placeCaretAt(root: HTMLElement, target: number) {
  const sel = document.getSelection();
  if (!sel) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let remaining = target;
  while (walker.nextNode()) {
    const text = walker.currentNode as Text;
    if (remaining <= text.data.length) {
      range.setStart(text, remaining);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    remaining -= text.data.length;
  }
  range.selectNodeContents(root);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Text between the start of the caret's own block and the caret. */
function textBeforeCaret(root: HTMLElement, sel: Selection) {
  const node = sel.focusNode;
  if (!node) return "";
  const block = blockOf(root, node) ?? root;
  const range = document.createRange();
  range.selectNodeContents(block);
  try {
    range.setEnd(node, sel.focusOffset);
  } catch {
    return "";
  }
  return range.toString();
}

/**
 * A box is only empty when there is nothing in it at all. A bullet or heading
 * the agent has just opened holds no text yet, but it is content — keeping the
 * placeholder over it reads as a bug.
 */
function isBlank(root: HTMLElement) {
  if (root.innerText.trim()) return false;
  return !root.querySelector("ul, ol, h1, h2, h3, blockquote, a, img");
}

function normalizeUrl(raw: string) {
  const url = raw.trim();
  if (!url) return "";
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export const NotesEditor = forwardRef<
  NotesEditorHandle,
  {
    value: NotesEditorValue;
    onChange: (next: NotesEditorValue) => void;
    placeholder?: string;
    maxLength?: number;
    className?: string;
    wrapperClassName?: string;
    ariaLabel?: string;
    /** Native grabber in the bottom-right corner, the way a textarea has one. */
    resizable?: boolean;
    /** Caret to restore on focus. Parent-owned, so it outlives a remount. */
    caretRef?: MutableRefObject<NotesEditorCaret>;
  }
>(function NotesEditor(
  {
    value,
    onChange,
    placeholder,
    maxLength,
    className,
    wrapperClassName,
    ariaLabel,
    resizable,
    caretRef,
  },
  ref
) {
  const rootRef = useRef<HTMLDivElement>(null);
  // The last HTML we handed up. Anything else arriving in `value` came from
  // somewhere other than this box, and has to be written back into it.
  const emittedRef = useRef(value.html);
  const localCaret = useRef<NotesEditorCaret>({ offset: 0, scroll: 0 });
  const caret = caretRef ?? localCaret;
  const [empty, setEmpty] = useState(!value.text.trim());

  const emit = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    // Chrome leaves a lone <br> behind once the last character goes; clearing
    // it keeps the placeholder honest and the counter at zero.
    if (root.innerHTML === "<br>") root.innerHTML = "";
    const html = root.innerHTML;
    const text = root.innerText;
    emittedRef.current = html;
    setEmpty(isBlank(root));
    onChange({ html, text });
  }, [onChange]);

  const saveCaret = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const sel = selectionIn(root);
    caret.current = {
      offset:
        sel && sel.focusNode ? caretOffsetIn(root, sel.focusNode, sel.focusOffset) : 0,
      scroll: root.scrollTop,
    };
  }, [caret]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        const root = rootRef.current;
        if (!root) return;
        root.focus({ preventScroll: true });
        placeCaretAt(root, caret.current.offset);
        root.scrollTop = caret.current.scroll;
      },
      saveCaret,
    }),
    [caret, saveCaret]
  );

  // Seed the box once. React never owns these children afterwards — the
  // browser does — so the content survives every re-render untouched.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.innerHTML = value.html;
    emittedRef.current = value.html;
    setEmpty(isBlank(root));
    exec("defaultParagraphSeparator", "div");
    // Tags, not inline styles: `<b>` survives a copy into the CRM field,
    // `style="font-weight:700"` is a stylesheet's problem waiting to happen.
    exec("styleWithCSS", "false");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || value.html === emittedRef.current) return;
    root.innerHTML = value.html;
    emittedRef.current = value.html;
    setEmpty(isBlank(root));
  }, [value.html, value.text]);

  /* ---------------- block + inline commands ---------------- */

  const applyBlock = useCallback((requested: BlockKind) => {
    const root = rootRef.current;
    const sel = selectionIn(root);
    if (!root || !sel) return;
    const current = blockKindOf(root, sel.focusNode);
    // Asking for what you already have means you want out of it.
    const kind = current === requested ? "text" : requested;

    // A list is a wrapper, not a block style: step out of it before the
    // heading or quote command has anything sane to work on.
    if (current === "ul" && kind !== "ul") exec("insertUnorderedList");
    if (current === "ol" && kind !== "ol") exec("insertOrderedList");
    if (current === "quote" && kind !== "quote") exec("formatBlock", "<div>");
    // And a heading has to stop being one before it can become a list, or
    // the list is built inside the heading it was meant to replace.
    const heading = current === "h1" || current === "h2" || current === "h3";
    if (heading && (kind === "ul" || kind === "ol")) exec("formatBlock", "<div>");

    switch (kind) {
      case "ul":
        exec("insertUnorderedList");
        break;
      case "ol":
        exec("insertOrderedList");
        break;
      case "quote":
        exec("formatBlock", "<blockquote>");
        break;
      case "h1":
      case "h2":
      case "h3":
        exec("formatBlock", `<${kind}>`);
        break;
      default:
        exec("formatBlock", "<div>");
    }
  }, []);

  /** `- `, `## `, `1. ` become the real thing on the space that closes them. */
  const applyBlockRule = useCallback(() => {
    const root = rootRef.current;
    const sel = selectionIn(root);
    if (!root || !sel || !sel.isCollapsed) return false;

    const before = textBeforeCaret(root, sel);
    const rule = BLOCK_RULES.find((item) => item.test.test(before));
    if (!rule) return false;

    const node = sel.focusNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    if (sel.focusOffset < before.length) return false;

    const range = document.createRange();
    range.setStart(node, sel.focusOffset - before.length);
    range.setEnd(node, sel.focusOffset);
    sel.removeAllRanges();
    sel.addRange(range);
    exec("delete");
    // A `- ` typed at the head of a bullet the agent is already standing in
    // is muscle memory, not an instruction. Swallow the marker and leave the
    // list alone rather than leaving a literal dash in the line.
    if (blockKindOf(root, sel.focusNode) !== rule.kind) applyBlock(rule.kind);
    return true;
  }, [applyBlock]);

  /** `**run**` becomes a formatted run on the delimiter that closes it. */
  const applyInlineRule = useCallback(() => {
    const root = rootRef.current;
    const sel = selectionIn(root);
    if (!root || !sel || !sel.isCollapsed) return;
    const node = sel.focusNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;

    const before = (node as Text).data.slice(0, sel.focusOffset);
    for (const rule of INLINE_RULES) {
      const match = rule.pattern.exec(before);
      if (!match) continue;
      const content = match[1];

      const range = document.createRange();
      range.setStart(node, sel.focusOffset - match[0].length);
      range.setEnd(node, sel.focusOffset);
      sel.removeAllRanges();
      sel.addRange(range);
      exec("insertText", content);

      // The delimiters are gone; take back what they wrapped and style it.
      const after = document.getSelection();
      const end = after?.focusNode;
      if (!after || !end || end.nodeType !== Node.TEXT_NODE) return;
      if (after.focusOffset < content.length) return;
      const styled = document.createRange();
      styled.setStart(end, after.focusOffset - content.length);
      styled.setEnd(end, after.focusOffset);
      after.removeAllRanges();
      after.addRange(styled);
      // `**x**` inside a heading is a request for bold that is already
      // granted. Applying it there would toggle the heading's weight off, so
      // the markers just come away and the run is left alone.
      if (!commandState(rule.command)) {
        exec(rule.command);
        after.collapseToEnd();
        // Collapsing inside the run leaves the style armed for the next
        // keystroke, which nobody asked for. Disarm it.
        if (commandState(rule.command)) exec(rule.command);
      } else {
        after.collapseToEnd();
      }
      return;
    }
  }, []);

  /* ---------------- selection toolbar ---------------- */

  const [bubble, setBubble] = useState<{
    rect: DOMRect;
    collapsed: boolean;
    kind: BlockKind;
    marks: Record<InlineCommand, boolean>;
    link: string | null;
  } | null>(null);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const linkOpenRef = useRef(false);
  linkOpenRef.current = linkDraft !== null;
  // The range the toolbar acts on, held across the trip through its own input.
  const savedRange = useRef<Range | null>(null);

  const readSelection = useCallback(() => {
    const root = rootRef.current;
    const sel = selectionIn(root);
    const hide = () => {
      if (!linkOpenRef.current) setBubble(null);
    };
    if (!root || !sel) return hide();

    const range = sel.getRangeAt(0);
    const link = anchorOf(root, sel.focusNode);
    // A collapsed caret sitting inside a link is the other moment worth
    // interrupting for: the agent is standing on it, probably to change it.
    if (range.collapsed && !link) return hide();

    const rect = range.collapsed
      ? link!.getBoundingClientRect()
      : range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return hide();

    savedRange.current = range.cloneRange();
    setBubble({
      rect,
      collapsed: range.collapsed,
      kind: blockKindOf(root, sel.focusNode),
      marks: {
        bold: commandState("bold"),
        italic: commandState("italic"),
        underline: commandState("underline"),
        strikeThrough: commandState("strikeThrough"),
      },
      link: link?.getAttribute("href") ?? null,
    });
  }, []);

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(readSelection);
    };
    document.addEventListener("selectionchange", schedule);
    window.addEventListener("resize", schedule);
    // Capture: the notes pane scrolls inside the call workspace, so the
    // toolbar has to travel with the text rather than float over it.
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [readSelection]);

  const restoreRange = useCallback(() => {
    const root = rootRef.current;
    const range = savedRange.current;
    if (!root || !range) return false;
    root.focus({ preventScroll: true });
    const sel = document.getSelection();
    try {
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch {
      return false;
    }
    return true;
  }, []);

  const runCommand = useCallback(
    (run: () => void) => {
      restoreRange();
      run();
      emit();
      readSelection();
    },
    [emit, readSelection, restoreRange]
  );

  const openLinkEditor = useCallback(() => {
    const root = rootRef.current;
    const sel = selectionIn(root);
    const existing = root ? anchorOf(root, sel?.focusNode ?? null) : null;
    if (root && sel) {
      const range = sel.getRangeAt(0);
      savedRange.current = range.cloneRange();
      // ⌘K on a bare caret has no bubble to hang off yet — a collapsed range
      // still reports where it is, and the block behind it is the fallback.
      setBubble((current) => {
        if (current) return current;
        let rect = range.getBoundingClientRect();
        if (!rect.width && !rect.height) {
          rect = (blockOf(root, range.startContainer) ?? root).getBoundingClientRect();
        }
        return {
          rect,
          collapsed: range.collapsed,
          kind: blockKindOf(root, sel.focusNode),
          marks: {
            bold: commandState("bold"),
            italic: commandState("italic"),
            underline: commandState("underline"),
            strikeThrough: commandState("strikeThrough"),
          },
          link: existing?.getAttribute("href") ?? null,
        };
      });
    }
    setLinkDraft(existing?.getAttribute("href") ?? "");
  }, []);

  const applyLink = useCallback(
    (raw: string) => {
      const url = normalizeUrl(raw);
      setLinkDraft(null);
      if (!url) return;
      const root = rootRef.current;
      if (!root || !restoreRange()) return;

      const sel = document.getSelection();
      const existing = anchorOf(root, sel?.focusNode ?? null);
      if (existing && sel?.isCollapsed) {
        existing.setAttribute("href", url);
      } else {
        // Nothing selected: the URL becomes its own label, then the label
        // becomes the link.
        if (sel?.isCollapsed) {
          exec("insertText", url);
          const node = sel.focusNode;
          if (node && node.nodeType === Node.TEXT_NODE && sel.focusOffset >= url.length) {
            const range = document.createRange();
            range.setStart(node, sel.focusOffset - url.length);
            range.setEnd(node, sel.focusOffset);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
        exec("createLink", url);
        const made = anchorOf(root, document.getSelection()?.focusNode ?? null);
        made?.setAttribute("target", "_blank");
        made?.setAttribute("rel", "noreferrer");
      }
      emit();
      // After the next paint: the "link editor is open" latch is only cleared
      // on re-render, and until it is, the toolbar refuses to be dismissed.
      requestAnimationFrame(readSelection);
    },
    [emit, readSelection, restoreRange]
  );

  const removeLink = useCallback(() => {
    setLinkDraft(null);
    runCommand(() => exec("unlink"));
  }, [runCommand]);

  /* ---------------- typing ---------------- */

  const roomLeft = useCallback(() => {
    const root = rootRef.current;
    if (!maxLength || !root) return Number.POSITIVE_INFINITY;
    const sel = selectionIn(root);
    const selected = sel && !sel.isCollapsed ? sel.toString().length : 0;
    return maxLength - (root.innerText.length - selected);
  }, [maxLength]);

  // Native, not React's synthetic beforeinput: this one has to be able to
  // cancel the keystroke that would overflow the field.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !maxLength) return;
    const onBeforeInput = (event: Event) => {
      const input = event as InputEvent;
      if (!input.inputType?.startsWith("insert")) return;
      if ((input.data?.length ?? 1) > roomLeft()) event.preventDefault();
    };
    root.addEventListener("beforeinput", onBeforeInput);
    return () => root.removeEventListener("beforeinput", onBeforeInput);
  }, [maxLength, roomLeft]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const mod = event.metaKey || event.ctrlKey;

    if (event.key === " " && applyBlockRule()) {
      event.preventDefault();
      emit();
      return;
    }

    if (event.key === "Tab") {
      const kind = blockKindOf(root, document.getSelection()?.focusNode ?? null);
      if (kind === "ul" || kind === "ol") {
        event.preventDefault();
        exec(event.shiftKey ? "outdent" : "indent");
        emit();
      }
      return;
    }

    // Enter out of a heading lands in body text — a heading labels what comes
    // next, it is never the thing that comes next.
    if (event.key === "Enter" && !event.shiftKey && !mod) {
      const focus = document.getSelection()?.focusNode ?? null;
      const kind = blockKindOf(root, focus);
      if (kind === "h1" || kind === "h2" || kind === "h3") {
        event.preventDefault();
        exec("insertParagraph");
        exec("formatBlock", "<div>");
        emit();
        return;
      }
      // Enter on an empty quote leaves the quote, the way Enter on an empty
      // bullet leaves the list. Chrome would keep quoting forever otherwise.
      if (kind === "quote" && !blockOf(root, focus)?.textContent?.trim()) {
        event.preventDefault();
        applyBlock("text");
        emit();
      }
      return;
    }

    if (!mod) return;

    if (event.altKey) {
      const item = BLOCK_ITEMS.find((entry) => event.code === `Digit${entry.digit}`);
      if (item) {
        event.preventDefault();
        applyBlock(item.kind);
        emit();
        readSelection();
      }
      return;
    }

    const key = event.key.toLowerCase();
    if (!event.shiftKey && (key === "b" || key === "i" || key === "u")) {
      event.preventDefault();
      exec(key === "b" ? "bold" : key === "i" ? "italic" : "underline");
      emit();
      readSelection();
      return;
    }
    if (event.shiftKey && key === "x") {
      event.preventDefault();
      exec("strikeThrough");
      emit();
      readSelection();
      return;
    }
    if (key === "k") {
      event.preventDefault();
      readSelection();
      openLinkEditor();
      return;
    }
    if (key === "\\") {
      event.preventDefault();
      exec("removeFormat");
      exec("unlink");
      emit();
      readSelection();
    }
  };

  const onInput = (event: React.FormEvent<HTMLDivElement>) => {
    const data = (event.nativeEvent as InputEvent).data;
    if (data && INLINE_TRIGGERS.has(data)) applyInlineRule();
    emit();
  };

  // Pasted rich text drags a foreign stylesheet in with it. Take the words.
  const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    const room = roomLeft();
    exec("insertText", Number.isFinite(room) ? text.slice(0, Math.max(0, room)) : text);
    emit();
  };

  return (
    <div
      className={cn(
        "relative w-full min-w-0",
        // Flex only when the parent is stretching this box. A resizable field
        // has to be a block, or the browser's grabber has nothing to write to.
        !resizable && "flex min-h-0 flex-col",
        wrapperClassName
      )}
    >
      <div
        ref={rootRef}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        className={cn(
          "notes-editor w-full rounded-[4px] border border-solid border-line",
          "bg-white px-3 py-2.5 text-paragraph-md text-foreground outline-none transition-colors",
          "hover:border-control-border focus:border-brand focus:hover:border-brand",
          // The grabber writes an inline size; without a cap it can be dragged
          // past the parent. Width never leaves the column. Height is capped
          // by the caller when the parent has a definite remaining size.
          resizable
            ? "max-h-full max-w-full resize-y overflow-auto"
            : "min-h-0 overflow-y-auto",
          className
        )}
        onKeyDown={onKeyDown}
        onInput={onInput}
        onPaste={onPaste}
        onBlur={saveCaret}
        onMouseUp={readSelection}
      />
      {empty ? (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute top-2.5 left-3 text-paragraph-md text-disabled-fg"
        >
          {placeholder}
        </p>
      ) : null}

      {bubble ? (
        <SelectionToolbar
          rect={bubble.rect}
          kind={bubble.kind}
          marks={bubble.marks}
          link={bubble.link}
          collapsed={bubble.collapsed}
          linkDraft={linkDraft}
          onCommand={(command) => runCommand(() => exec(command))}
          onBlock={(kind) => runCommand(() => applyBlock(kind))}
          onLinkOpen={openLinkEditor}
          onLinkApply={applyLink}
          onLinkCancel={() => {
            setLinkDraft(null);
            requestAnimationFrame(readSelection);
          }}
          onLinkRemove={removeLink}
        />
      ) : null}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Floating toolbar                                                    */
/* ------------------------------------------------------------------ */

const TOOLBAR_GAP = 10;

function SelectionToolbar({
  rect,
  kind,
  marks,
  link,
  collapsed,
  linkDraft,
  onCommand,
  onBlock,
  onLinkOpen,
  onLinkApply,
  onLinkCancel,
  onLinkRemove,
}: {
  rect: DOMRect;
  kind: BlockKind;
  marks: Record<InlineCommand, boolean>;
  link: string | null;
  collapsed: boolean;
  linkDraft: string | null;
  onCommand: (command: InlineCommand) => void;
  onBlock: (kind: BlockKind) => void;
  onLinkOpen: () => void;
  onLinkApply: (url: string) => void;
  onLinkCancel: () => void;
  onLinkRemove: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(linkDraft ?? "");
  // The bar decides where the toolbar sits; the shell only decides how far it
  // has to stay clear of the viewport edge. Measuring them together would make
  // opening the menu jump the bar off the words it belongs to.
  const [bar, setBar] = useState({ width: 0, height: 0 });
  const [shellWidth, setShellWidth] = useState(0);

  useLayoutEffect(() => {
    const barBox = barRef.current?.getBoundingClientRect();
    if (barBox) setBar({ width: barBox.width, height: barBox.height });
    setShellWidth(shellRef.current?.getBoundingClientRect().width ?? 0);
  }, [linkDraft, collapsed, kind, link, menuOpen]);

  useEffect(() => {
    if (linkDraft === null) return;
    setMenuOpen(false);
    setDraft(linkDraft);
    const id = window.setTimeout(() => inputRef.current?.select(), 0);
    return () => window.clearTimeout(id);
  }, [linkDraft]);

  // The overlay owns Escape while it has something open — the dialer's own
  // Escape handler stands down for the marker below.
  const overlay = menuOpen || linkDraft !== null;
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setMenuOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onPointerDown, true);
    };
  }, [menuOpen]);

  // The measured height is only real after the first paint; until then the
  // toolbar would flash at the wrong end of the selection.
  const above = rect.top > bar.height + TOOLBAR_GAP + 8;
  const top = above ? rect.top - bar.height - TOOLBAR_GAP : rect.bottom + TOOLBAR_GAP;
  const left = Math.min(
    Math.max(8, rect.left + rect.width / 2 - bar.width / 2),
    Math.max(8, window.innerWidth - Math.max(shellWidth, bar.width) - 8)
  );

  const label = BLOCK_ITEMS.find((item) => item.kind === kind)?.label ?? "Text";

  return createPortal(
    <div
      ref={shellRef}
      role="toolbar"
      aria-label="Text formatting"
      data-notes-overlay={overlay ? "" : undefined}
      // Never take focus: keeping the selection alive is the whole trick.
      onMouseDown={(event) => {
        if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
      }}
      className="fixed z-[120] flex flex-col"
      style={{ top, left, opacity: bar.height ? 1 : 0 }}
    >
      {linkDraft !== null ? (
        <div
          ref={barRef}
          className="flex items-center gap-1 rounded-[10px] bg-editor-toolbar p-1 shadow-[0_12px_28px_rgba(16,24,40,0.28)]"
        >
          <IconLink className="ml-1.5 size-4 shrink-0 text-white/60" />
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onLinkApply(draft);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onLinkCancel();
              }
            }}
            placeholder="Paste or type a link"
            aria-label="Link URL"
            className="h-7 w-52 bg-transparent px-1 text-paragraph-md text-white outline-none placeholder:text-white/40"
          />
          <BubbleButton label="Apply link" onClick={() => onLinkApply(draft)}>
            <IconCheckSmall className="size-4" />
          </BubbleButton>
          {link ? (
            <BubbleButton label="Remove link" onClick={onLinkRemove}>
              <IconUnlink className="size-4" />
            </BubbleButton>
          ) : null}
        </div>
      ) : (
        <div
          ref={barRef}
          className="flex items-center gap-0.5 rounded-[10px] bg-editor-toolbar p-1 shadow-[0_12px_28px_rgba(16,24,40,0.28)]"
        >
          <BubbleButton
            label={link ? `Edit link — ${MOD}K` : `Add link — ${MOD}K`}
            active={Boolean(link)}
            onClick={onLinkOpen}
          >
            <IconLink className="size-4" />
          </BubbleButton>
          {collapsed ? (
            <BubbleButton label="Remove link" onClick={onLinkRemove}>
              <IconUnlink className="size-4" />
            </BubbleButton>
          ) : (
            <>
              <BubbleButton
                label={`Bold — ${MOD}B`}
                active={marks.bold}
                onClick={() => onCommand("bold")}
              >
                <span className="text-[15px] leading-none font-bold">B</span>
              </BubbleButton>
              <BubbleButton
                label={`Italic — ${MOD}I`}
                active={marks.italic}
                onClick={() => onCommand("italic")}
              >
                <span className="font-serif text-[15px] leading-none italic">I</span>
              </BubbleButton>
              <BubbleButton
                label={`Strikethrough — ${MOD}⇧X`}
                active={marks.strikeThrough}
                onClick={() => onCommand("strikeThrough")}
              >
                <span className="text-[15px] leading-none line-through">S</span>
              </BubbleButton>
              <span className="mx-0.5 h-4 w-px bg-white/16" aria-hidden="true" />
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className={cn(
                  "flex h-8 items-center gap-1 rounded-[6px] px-2 text-label-md whitespace-nowrap text-white",
                  "outline-none hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/40",
                  menuOpen && "bg-white/12"
                )}
              >
                {label}
                <IconChevron
                  className={cn("size-3.5 transition-transform", menuOpen && "rotate-180")}
                />
              </button>
            </>
          )}
        </div>
      )}

      {menuOpen && linkDraft === null ? (
        <div
          role="menu"
          className="mt-1.5 w-60 self-start rounded-[10px] bg-editor-toolbar p-1 shadow-[0_12px_28px_rgba(16,24,40,0.28)]"
        >
          {BLOCK_ITEMS.map((item) => (
            <button
              key={item.kind}
              type="button"
              role="menuitemradio"
              aria-checked={item.kind === kind}
              onClick={() => {
                onBlock(item.kind);
                setMenuOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-[6px] px-2.5 py-1.5 text-left",
                "text-white outline-none hover:bg-white/12 focus-visible:bg-white/12",
                item.kind === kind && "bg-white/12"
              )}
            >
              <span className={cn("truncate", BLOCK_MENU_TYPE[item.kind])}>{item.label}</span>
              <span className="shrink-0 text-label-sm whitespace-nowrap text-white/45">
                {ALT_MOD}
                {item.digit}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body
  );
}

/** The menu shows the type ramp rather than describing it. */
const BLOCK_MENU_TYPE: Record<BlockKind, string> = {
  text: "text-paragraph-md",
  h1: "text-heading-xxl",
  h2: "text-heading-xl",
  h3: "text-heading-lg",
  ol: "text-paragraph-md",
  ul: "text-paragraph-md",
  quote: "text-paragraph-md italic",
};

function BubbleButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[6px] text-white outline-none",
        "hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/40",
        active && "bg-white/16"
      )}
    >
      {children}
    </button>
  );
}

/* Local glyphs — the shared icon set carries no formatting marks. */

function IconLink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6.5 9.5a2.5 2.5 0 0 0 3.6.1l2.1-2.1a2.55 2.55 0 0 0-3.6-3.6l-1 1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M9.5 6.5a2.5 2.5 0 0 0-3.6-.1l-2.1 2.1a2.55 2.55 0 0 0 3.6 3.6l1-1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconUnlink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="M10 5.6l.6-.6a2.55 2.55 0 0 1 3.6 3.6l-1.4 1.4M6 10.4l-.6.6a2.55 2.55 0 0 1-3.6-3.6l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="m2.5 2.5 11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconCheckSmall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
