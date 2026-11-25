import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { IntegrationId } from "./actionsData";
import type { CrmRecord } from "./webphoneCalls";
import { IntegrationLogo } from "./icons/IntegrationLogos";
import { WebphoneOpenInNew } from "./icons/WebphoneIcons";
import moreIcon from "./assets/legacy-dialer/queue-crm-more.svg";

const CRM_NAMES: Record<IntegrationId, string> = {
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  zendesk: "Zendesk",
  pipedrive: "Pipedrive",
};

/**
 * Logos shown before the rest collapse into "+N". One: the primary record
 * leads, and a second logo beside it was noise at 16px — the count says
 * there's more, and the menu says where.
 */
const STACK_MAX = 1;

/**
 * A queued caller's CRM records, Figma 166:962. One record is a pill with an
 * external-link mark — it opens that record in the CRM. Several lead with the
 * primary record's logo, count the rest, and swap the mark for a chevron:
 * there is now a choice to make, so the pill opens a menu of where to look
 * the contact up rather than guessing which CRM the rep meant.
 */
export function QueueCrmPill({ records }: { records: CrmRecord[] }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = React.useState<{ top: number; left: number } | null>(null);
  const several = records.length > 1;
  const shown = records.slice(0, STACK_MAX);
  const hidden = records.length - shown.length;

  // The list it sits in scrolls and clips, so the menu is placed against the
  // viewport instead — and closes on any scroll rather than drifting off its pill.
  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: rect.bottom + 6, left: rect.left });
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={
          several
            ? `Open contact in ${records.map(({ id }) => CRM_NAMES[id]).join(", ")}`
            : `Open ${records[0].contact} in ${CRM_NAMES[records[0].id]}`
        }
        aria-haspopup={several ? "menu" : undefined}
        aria-expanded={several ? open : undefined}
        // A single record would open straight in its CRM; the prototype has
        // nowhere to send it, so only the several-records pill does anything.
        onClick={several ? () => setOpen((value) => !value) : undefined}
        className={cn(
          "flex shrink-0 items-center gap-[4px] rounded-full border-[1.5px] bg-webphone-crm-pill py-px pr-[5px] pl-[2px] text-[10px] font-bold text-webphone-crm-pill-fg outline-none",
          open ? "border-webphone-crm-pill-open" : "border-transparent"
        )}
      >
        <span className="isolate flex items-center">
          {shown.map(({ id }, index) => (
            <span
              key={id}
              // Each logo sits over the next, so the first — the primary
              // record — reads as the one in front.
              style={{ zIndex: shown.length - index }}
              className={cn(
                "flex size-[16px] items-center justify-center overflow-clip rounded-full border-[1.5px] border-webphone-crm-pill bg-white",
                index > 0 && "-ml-[4px]"
              )}
            >
              <IntegrationLogo id={id} size={12} />
            </span>
          ))}
        </span>
        {hidden > 0 ? <span>+{hidden}</span> : null}
        {several ? (
          <img src={moreIcon} alt="" width={10} height={10} className="size-[10px] shrink-0" />
        ) : (
          <WebphoneOpenInNew className="size-[10px] shrink-0" />
        )}
      </button>

      {open && anchor
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Open in"
              data-state="open"
              style={{ top: anchor.top, left: anchor.left }}
              className="dropdown-panel fixed z-50 flex w-[180px] flex-col rounded-[10px] bg-white py-[6px] font-webphone shadow-webphone-menu"
            >
              <p className="px-[12px] pt-[4px] pb-[6px] text-[9px] font-bold text-webphone-crm-menu-label uppercase">
                Open in
              </p>
              {/* Each row names the record as that CRM has it — the logo
                  already says which CRM, and the name is what tells the rep
                  whether two records are the same person or a near-duplicate. */}
              {records.map(({ id, contact }) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  aria-label={`${contact} in ${CRM_NAMES[id]}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-[10px] px-[12px] py-[9px] text-left outline-none transition-colors hover:bg-webphone-crm-menu-hover focus-visible:bg-webphone-crm-menu-hover"
                >
                  <span className="flex size-[20px] shrink-0 items-center justify-center overflow-clip rounded-full bg-white">
                    <IntegrationLogo id={id} size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-webphone-crm-menu-fg">
                    {contact}
                  </span>
                  <WebphoneOpenInNew className="size-[12px] shrink-0 text-webphone-crm-menu-label" />
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
