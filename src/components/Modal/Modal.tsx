import * as React from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";
import { usePresence } from "@/lib/usePresence";

/* Modal sizes — synced from Figma (Design System 2.0).
   sm 400 · md 640 · lg 968 · xl 1156. Below 1016px viewports the modal
   goes responsive with 24px safe margins (handled by the p-6 wrapper +
   w-full). */
const modalVariants = cva(
  "relative flex max-h-[calc(100dvh-48px)] w-full flex-col overflow-hidden rounded-xl bg-white shadow-600",
  {
    variants: {
      size: {
        sm: "max-w-[400px]",
        md: "max-w-[640px]",
        lg: "max-w-[968px]",
        xl: "max-w-[1156px]",
      },
    },
    defaultVariants: { size: "md" },
  }
);

/* Exit step for `.modal-panel[data-state="closed"]` in base.css — the
   dialog stays mounted this long so the exit animation can finish. */
const MODAL_CLOSE_MS = DURATION.base;

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export interface ModalProps extends VariantProps<typeof modalVariants> {
  /** Whether the modal is visible. */
  open: boolean;
  /** Called when the user requests to close (overlay, Escape, or close button). */
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Optional leading element (e.g. a status icon) beside the title. */
  icon?: React.ReactNode;
  /** Footer content — typically right-aligned action buttons. */
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children?: React.ReactNode;
  className?: string;
  /** Optional class for the scrollable body. Use `overflow-visible` when the body hosts dropdowns. */
  bodyClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  footer,
  size,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  className,
  bodyClassName,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const { mounted, state } = usePresence(open, MODAL_CLOSE_MS);

  // Escape and the focus trap follow `open`, not `mounted`: a dialog on its
  // way out should not be catching keys.
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
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
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnEscape, onClose]);

  // Scroll lock is keyed to `mounted`, not `open`. Releasing it the instant
  // `open` flips false would restore the scrollbar mid-exit and shift the
  // page under a dialog that is still on screen.
  React.useEffect(() => {
    if (!mounted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

  // Move focus into the dialog on open.
  React.useEffect(() => {
    if (!open) return;
    const node = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (node ?? dialogRef.current)?.focus();
  }, [open]);

  if (!mounted) return null;

  const hasHeader = Boolean(title || description || icon || showCloseButton);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="modal-scrim absolute inset-0 bg-foreground/50"
        data-state={state}
        aria-hidden="true"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        data-state={state}
        className={cn("modal-panel", modalVariants({ size }), className)}
      >
        {hasHeader && (
          <div className="flex items-start gap-3 p-6 pb-0">
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="flex-1">
              {title && (
                <h2 className="text-heading-lg text-foreground">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-paragraph-md text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-m-1.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )}

        {children && (
          <div
            className={cn(
              "flex-1 overflow-y-auto p-6 text-paragraph-md text-gray-700",
              bodyClassName
            )}
          >
            {children}
          </div>
        )}

        {footer && (
          <div className={cn("flex items-center justify-end gap-3 p-6", children ? "pt-0" : "pt-4")}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
