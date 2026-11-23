import { cn } from "@/lib/utils";
import { LockedControl, type Lock } from "@/components/LockedControl";
import {
  IconProfileSettings,
  IconProfileBilling,
  IconProfileShieldCheck,
  IconProfileCode,
  IconProfileChartPie,
  IconProfileReportSearch,
  IconProfileTool,
  IconProfileChevronRight,
  IconProfileHelp,
  IconProfileGift,
  IconProfileSubmitFeedback,
  IconProfileDevicesDown,
  IconProfileLogout,
} from "./icons";

/**
 * ProfileMenu — Figma "Header + Filter Unification / Profile Dropdown"
 * (node 4820:95530). Opened from the avatar button in `GlobalHeader` via its
 * `profileMenuOpen` / `profileMenuPanel` props.
 *
 * Only "Billing" is wired to real navigation (this prototype's entry point
 * into `BillingOverview`, alongside the notifications bell). The rest render
 * as static rows — same "filler for visual density" treatment as
 * `NotificationPanel`'s non-interactive notifications — since there's no
 * settings/compliance/etc. page to send them to.
 */

interface MenuItemData {
  icon: typeof IconProfileSettings;
  label: string;
  onClick?: () => void;
  trailingIcon?: typeof IconProfileChevronRight;
  tone?: "default" | "danger";
  locked?: Lock;
}

export interface ProfileMenuProps {
  /** Signed-in user's full name shown in the header, e.g. "Sarah Johnson". */
  userName: string;
  onBillingClick?: () => void;
  /**
   * Locks by item label (e.g. "Compliance center"). A locked row stays in the
   * menu, muted, and says why on hover / focus / tap (LockedControl).
   */
  itemLocks?: Record<string, Lock>;
}

export function ProfileMenu({ userName, onBillingClick, itemLocks }: ProfileMenuProps) {
  const primaryItems: MenuItemData[] = [
    { icon: IconProfileSettings, label: "Settings" },
    { icon: IconProfileBilling, label: "Billing", onClick: onBillingClick },
    { icon: IconProfileShieldCheck, label: "Compliance center" },
    { icon: IconProfileCode, label: "APIs and webhooks" },
    { icon: IconProfileChartPie, label: "Reports" },
    { icon: IconProfileReportSearch, label: "Audit logs" },
  ];

  const secondaryItems: MenuItemData[] = [
    { icon: IconProfileTool, label: "Troubleshoot", trailingIcon: IconProfileChevronRight },
    { icon: IconProfileHelp, label: "Help articles" },
    { icon: IconProfileGift, label: "Refer & earn" },
    { icon: IconProfileSubmitFeedback, label: "Submit feedback" },
    { icon: IconProfileDevicesDown, label: "Download JustCall apps" },
  ];

  const footerItems: MenuItemData[] = [
    { icon: IconProfileLogout, label: "Log out", tone: "danger" },
  ];

  return (
    <div className="flex w-[240px] flex-col overflow-hidden rounded-[4px] border border-line bg-white shadow-300">
      <div className="flex flex-col gap-0.5 border-b border-line bg-secondary-bg px-4 py-3">
        <p className="text-heading-lg text-foreground">{userName}</p>
      </div>

      <div className="flex flex-col gap-1 py-1">
        {primaryItems.map((item) => (
          <MenuItem key={item.label} {...item} locked={itemLocks?.[item.label]} />
        ))}
      </div>

      <div className="h-px w-full bg-line" aria-hidden="true" />

      <div className="flex flex-col gap-1 py-1">
        {secondaryItems.map((item) => (
          <MenuItem key={item.label} {...item} locked={itemLocks?.[item.label]} />
        ))}
      </div>

      <div className="h-px w-full bg-line" aria-hidden="true" />

      <div className="flex flex-col gap-1 py-1">
        {footerItems.map((item) => (
          <MenuItem key={item.label} {...item} locked={itemLocks?.[item.label]} />
        ))}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  trailingIcon: TrailingIcon,
  tone = "default",
  locked,
}: MenuItemData) {
  return (
    <LockedControl
      locked={Boolean(locked)}
      reason={locked?.reason}
      hint={locked?.hint}
      placement="left"
      triggerClassName="flex w-full"
    >
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center gap-2 px-4 py-2 text-left outline-none dropdown-item hover:bg-secondary-bg focus-visible:bg-secondary-bg data-[locked=true]:text-disabled-fg"
      >
        <Icon className="size-5 shrink-0" />
        <span
          className={cn(
            "flex-1 text-paragraph-md group-data-[locked=true]:text-disabled-fg",
            tone === "danger" ? "text-error" : "text-foreground"
          )}
        >
          {label}
        </span>
        {TrailingIcon && <TrailingIcon className="size-5 shrink-0" />}
      </button>
    </LockedControl>
  );
}
