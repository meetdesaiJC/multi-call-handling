import * as React from "react";
import { cn } from "@/lib/utils";
import {
  IconPhone,
  IconMessages,
  IconBell,
  IconChevronDown,
  IconChevronRight,
} from "@/components/Icon";
import { Button } from "@/components/Button";
import { LockedControl, type Lock } from "@/components/LockedControl";
import { Avatar, AvatarIndicator, type AvatarStatus } from "@/components/Avatar";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { useDropdownPresence } from "@/components/Dropdown/useDropdownPresence";
import liveCallSupportAvatar from "./assets/live-call-support-avatar.png";

/**
 * GlobalHeader — synced from Figma "User-level pricing for Add-ons / Header"
 * (node 40002537:41013 — states Default / Profile Selected / Type4 / Number
 * Indicator for Notifications).
 *
 * The top app bar: page title or breadcrumb trail, a "Live Call Support"
 * status pill, Dialer / messages / notifications actions, an availability
 * dropdown trigger, and the signed-in user's avatar.
 *
 * Figma's four states map onto this one component: "Profile Selected" is
 * just the profile button's own `:focus-visible` ring, "Number Indicator
 * for Notifications" is `notificationCount > 0`, and "Type4" is passing an
 * array to `title` for a breadcrumb trail.
 *
 * Interactive states (node 40002537:41111): the "Live Call Support" pill
 * deepens its gradient and shows an info tooltip on hover/focus (`:hover` /
 * `:focus-visible`, via `TooltipTrigger`); the availability trigger darkens
 * its border on hover and switches to a brand border + flipped chevron
 * while `availabilityOpen` (controlled) or after a click (uncontrolled).
 */

export interface GlobalHeaderBreadcrumbItem {
  label: string;
  onClick?: () => void;
}

// Figma "Live Call Support" pill fill — an 8%-opacity blue→purple wash on
// default, richening to 15% on hover/focus. No equivalent design token
// (closest is Tag's color="ai", which uses a different angle/opacity).
const LIVE_CALL_SUPPORT_BG =
  "bg-[linear-gradient(110deg,rgba(0,76,230,0.08)_46%,rgba(180,109,255,0.08)_145%),linear-gradient(90deg,var(--color-white)_0%,var(--color-white)_100%)]";
const LIVE_CALL_SUPPORT_BG_HOVER =
  "hover:bg-[linear-gradient(110deg,rgba(0,76,230,0.15)_46%,rgba(172,112,255,0.15)_145%),linear-gradient(90deg,var(--color-white)_0%,var(--color-white)_100%)] focus-visible:bg-[linear-gradient(110deg,rgba(0,76,230,0.15)_46%,rgba(172,112,255,0.15)_145%),linear-gradient(90deg,var(--color-white)_0%,var(--color-white)_100%)]";
// Figma gradient text fill for the "Live Call Support" label — likewise a
// one-off with no matching token, deepened slightly on hover/focus.
const LIVE_CALL_SUPPORT_TEXT =
  "bg-[linear-gradient(101deg,var(--color-ai-gradient-from)_5%,var(--color-ai-gradient-to)_126%)]";
const LIVE_CALL_SUPPORT_TEXT_HOVER =
  "group-hover:bg-[linear-gradient(118deg,var(--color-ai-gradient-from)_30%,var(--color-ai-gradient-to)_149%)] group-focus-visible:bg-[linear-gradient(118deg,var(--color-ai-gradient-from)_30%,var(--color-ai-gradient-to)_149%)]";

export interface GlobalHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Page title. Pass an array for a breadcrumb trail — the last item renders as the active page. */
  title: string | GlobalHeaderBreadcrumbItem[];
  /** Hide the "Live Call Support" pill entirely. */
  showLiveCallSupport?: boolean;
  /** Photo shown in the Live Call Support pill. Defaults to the Figma agent photo. */
  liveCallSupportAvatarSrc?: string;
  onLiveCallSupportClick?: () => void;
  onDialerClick?: () => void;
  /** Marks the Dialer button as active while the Dialer page is open. */
  dialerOpen?: boolean;
  /**
   * The signed-in license can't call. The Dialer stays in place, muted, and
   * says why on hover / focus / tap rather than disappearing (LockedControl).
   */
  dialerLocked?: Lock;
  onMessagesClick?: () => void;
  onNotificationsClick?: () => void;
  /** Unread count shown on the bell icon. Renders "99+" above 99; hidden at 0. */
  notificationCount?: number;
  /** Shows `notificationsPanel` anchored below the bell and suppresses its tooltip. */
  notificationsOpen?: boolean;
  /** Panel content (e.g. a notifications dropdown) rendered while `notificationsOpen`. */
  notificationsPanel?: React.ReactNode;
  /** Availability dropdown label, e.g. "Available". */
  availabilityLabel?: string;
  /** Dot color — reuses Avatar's presence palette. */
  availabilityStatus?: AvatarStatus;
  /** Controlled active/open visual (brand border + flipped chevron), e.g. while a menu is open. */
  availabilityOpen?: boolean;
  /** Initial active/open visual when uncontrolled — toggles on click. */
  defaultAvailabilityOpen?: boolean;
  onAvailabilityClick?: () => void;
  /** Signed-in user's initials, e.g. "SJ". */
  profileInitials?: string;
  onProfileClick?: () => void;
  /** Shows `profileMenuPanel` anchored below the avatar. */
  profileMenuOpen?: boolean;
  /** Panel content (e.g. a profile dropdown) rendered while `profileMenuOpen`. */
  profileMenuPanel?: React.ReactNode;
}

export const GlobalHeader = React.forwardRef<HTMLElement, GlobalHeaderProps>(
  (
    {
      title,
      showLiveCallSupport = true,
      liveCallSupportAvatarSrc = liveCallSupportAvatar,
      onLiveCallSupportClick,
      onDialerClick,
      dialerOpen = false,
      dialerLocked,
      onMessagesClick,
      onNotificationsClick,
      notificationCount = 0,
      notificationsOpen = false,
      notificationsPanel,
      availabilityLabel = "Available",
      availabilityStatus = "available",
      availabilityOpen: availabilityOpenProp,
      defaultAvailabilityOpen = false,
      onAvailabilityClick,
      profileInitials = "SJ",
      onProfileClick,
      profileMenuOpen = false,
      profileMenuPanel,
      className,
      ...props
    },
    ref
  ) => {
    const notificationLabel =
      notificationCount > 99 ? "99+" : String(notificationCount);

    const isAvailabilityOpenControlled = availabilityOpenProp !== undefined;
    const [uncontrolledAvailabilityOpen, setUncontrolledAvailabilityOpen] =
      React.useState(defaultAvailabilityOpen);
    const availabilityOpen = isAvailabilityOpenControlled
      ? availabilityOpenProp
      : uncontrolledAvailabilityOpen;

    const notificationsHeld = React.useRef(notificationsPanel);
    if (notificationsPanel) notificationsHeld.current = notificationsPanel;
    const notificationsPresence = useDropdownPresence(notificationsOpen);

    const profileHeld = React.useRef(profileMenuPanel);
    if (profileMenuPanel) profileHeld.current = profileMenuPanel;
    const profilePresence = useDropdownPresence(profileMenuOpen);

    const handleAvailabilityClick = () => {
      if (!isAvailabilityOpenControlled) {
        setUncontrolledAvailabilityOpen((open) => !open);
      }
      onAvailabilityClick?.();
    };

    return (
      <header
        ref={ref}
        className={cn(
          "flex h-[60px] w-full shrink-0 items-center justify-between gap-6 border-b border-line bg-white px-6",
          className
        )}
        {...props}
      >
        {Array.isArray(title) ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {title.map((item, index) => {
              const isLast = index === title.length - 1;
              return (
                <React.Fragment key={index}>
                  {isLast ? (
                    <h1 className="min-w-0 truncate text-heading-xl text-foreground">
                      {item.label}
                    </h1>
                  ) : (
                    <button
                      type="button"
                      onClick={item.onClick}
                      className="max-w-[148px] shrink-0 truncate text-[18px] leading-[26px] font-medium text-gray-500 outline-none hover:text-foreground focus-visible:text-foreground"
                    >
                      {item.label}
                    </button>
                  )}
                  {!isLast && (
                    <IconChevronRight
                      size={20}
                      className="shrink-0 text-disabled-fg"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <h1 className="min-w-0 flex-1 truncate text-heading-xl text-foreground">
            {title}
          </h1>
        )}

        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2">
            {showLiveCallSupport && (
              <TooltipTrigger
                placement="bottom"
                content={
                  <Tooltip
                    theme="dark"
                    arrow="top-center"
                    title="Connect to AI Voice and Chat Support instantaneously"
                  />
                }
              >
                <button
                  type="button"
                  onClick={onLiveCallSupportClick}
                  className={cn(
                    "group inline-flex shrink-0 items-center gap-2 rounded-[4px] border border-brand py-1 pr-3 pl-2 outline-none transition-colors",
                    LIVE_CALL_SUPPORT_BG,
                    LIVE_CALL_SUPPORT_BG_HOVER
                  )}
                >
                  {/* Keep the pill's status dot at 8px — Avatar's shared
                      indicator was enlarged to 11px for larger avatars. */}
                  <span className="relative inline-flex size-5 shrink-0">
                    <Avatar size="xs" src={liveCallSupportAvatarSrc} />
                    <AvatarIndicator
                      status="available"
                      size="xs"
                      className="size-2"
                    />
                  </span>
                  <span
                    className={cn(
                      "bg-clip-text text-label-sm whitespace-nowrap text-transparent",
                      LIVE_CALL_SUPPORT_TEXT,
                      LIVE_CALL_SUPPORT_TEXT_HOVER
                    )}
                  >
                    Live Call Support
                  </span>
                </button>
              </TooltipTrigger>
            )}

            <LockedControl
              locked={Boolean(dialerLocked)}
              reason={dialerLocked?.reason}
              hint={dialerLocked?.hint}
            >
              <Button
                size="xs"
                leftIcon={<IconPhone size={16} />}
                aria-pressed={dialerOpen}
                onClick={onDialerClick}
              >
                Dialer
              </Button>
            </LockedControl>

            <TooltipTrigger
              placement="bottom"
              content={<Tooltip theme="dark" arrow="top-center" title="SMS Inbox" />}
            >
              <Button
                size="xs"
                iconOnly
                variant="grey-outline"
                aria-label="Messages"
                onClick={onMessagesClick}
                className="hover:bg-header-icon-hover"
              >
                <IconMessages size={16} />
              </Button>
            </TooltipTrigger>

            <TooltipTrigger
              placement="bottom"
              disabled={notificationsOpen}
              content={<Tooltip theme="dark" arrow="top-center" title="Notifications" />}
            >
              <div className="relative">
                <Button
                  size="xs"
                  iconOnly
                  variant="grey-outline"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  onClick={onNotificationsClick}
                  className={cn(
                    "hover:bg-header-icon-hover",
                    notificationsOpen && "border-brand"
                  )}
                >
                  <IconBell size={16} />
                </Button>
                {notificationCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-[1.5px] border-white bg-notification-badge px-[3px] text-label-sm text-white"
                    aria-label={`${notificationCount} unread notifications`}
                  >
                    {notificationLabel}
                  </span>
                )}
                {notificationsPresence.mounted && notificationsHeld.current && (
                  <div
                    className="dropdown-panel absolute top-full right-0 z-50 mt-2"
                    data-state={notificationsPresence.state}
                  >
                    {notificationsHeld.current}
                  </div>
                )}
              </div>
            </TooltipTrigger>
          </div>

          <span className="h-5 w-px shrink-0 bg-line" aria-hidden="true" />

          <div className="flex w-[156px] shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleAvailabilityClick}
              aria-expanded={availabilityOpen}
              className={cn(
                "flex h-7 min-w-[120px] max-w-[160px] flex-1 items-center gap-2 rounded-[4px] border bg-white py-1.5 pr-2.5 pl-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/24",
                availabilityOpen
                  ? "border-brand"
                  : "border-line hover:border-gray-300 hover:bg-header-icon-hover"
              )}
            >
              <span className="flex flex-1 items-center gap-2">
                <AvatarIndicator
                  status={availabilityStatus}
                  size="md"
                  className="static size-2 shrink-0 border-0"
                />
                <span className="flex-1 truncate text-left text-label-sm text-foreground">
                  {availabilityLabel}
                </span>
              </span>
              <IconChevronDown
                size={16}
                className="dropdown-chevron shrink-0 text-gray-500"
                data-open={availabilityOpen ? "true" : "false"}
              />
            </button>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={onProfileClick}
                aria-label="Profile"
                aria-expanded={profileMenuOpen}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border border-white bg-avatar-brand-bg text-label-sm font-normal text-white outline-none",
                  profileMenuOpen
                    ? "shadow-[0_0_0_1px_rgba(77,139,255,0.5)]"
                    : "focus-visible:shadow-[0_0_0_1px_rgba(77,139,255,0.5)]"
                )}
              >
                {profileInitials}
              </button>
              {profilePresence.mounted && profileHeld.current && (
                <div
                  className="dropdown-panel absolute top-full right-0 z-50 mt-2"
                  data-state={profilePresence.state}
                >
                  {profileHeld.current}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }
);
GlobalHeader.displayName = "GlobalHeader";
