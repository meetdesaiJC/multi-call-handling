import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";

/**
 * Sidesheet — panel that slides in from the right edge of the viewport,
 * synced from Figma "Design System 2.0 / Sidesheet" (node 40002568:19554).
 *
 * A bare shell (overlay + fixed-right panel + focus trap), same contract as
 * `Modal`: it owns the portal, escape/overlay-to-close, and body scroll
 * lock, but leaves header/tabs/body entirely to the caller since sidesheet
 * content (contact card, tabs, forms) varies far more than a dialog's.
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export interface SidesheetProps {
  /** Whether the panel is visible. */
  open: boolean;
  /** Called when the user requests to close (overlay or Escape). */
  onClose: () => void;
  /** Panel width in px. Default 480 (Figma content 431px + 24px padding). */
  width?: number;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children?: React.ReactNode;
  className?: string;
}

// Longest of the panel/scrim closing transitions (see .sidesheet-panel /
// .sidesheet-scrim in base.css) — how long to stay mounted after `open`
// goes false so the exit animation can finish before unmounting.
const CLOSE_ANIMATION_MS = DURATION.moderate;

export function Sidesheet({
  open,
  onClose,
  width = 480,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  className,
}: SidesheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(open);
  // Drives data-state="open"|"closed". Starts false on every mount so the
  // first paint is the off-screen/transparent state, then flips true a
  // frame later to trigger the slide-in/fade-in transition.
  const [entered, setEntered] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    const timer = window.setTimeout(() => setMounted(false), CLOSE_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  React.useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (!nodes || nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted, closeOnEscape, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const node = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (node ?? panelRef.current)?.focus();
  }, [open]);

  if (!mounted) return null;

  const state = entered ? "open" : "closed";

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        data-state={state}
        className="sidesheet-scrim absolute inset-0 bg-foreground/50"
        aria-hidden="true"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div
        ref={panelRef}
        data-state={state}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{ width }}
        className={cn(
          "sidesheet-panel absolute top-0 right-0 flex h-full max-w-full flex-col bg-white shadow-600",
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
