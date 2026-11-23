import { IconChartBar, IconPhone, IconCalendar } from "@/components/Icon";
import { Button, buttonVariants } from "@/components/Button";
import { cn } from "@/lib/utils";
import { IconTranscriptionAi } from "./icons/AiInsightsIcons";

/**
 * NotificationPanel — Figma "User-level pricing for Add-ons / Notifications"
 * (node 40002619:22793), filled out with the broader feed from Figma
 * "Header + Filter Unification" (node 4820:89040) so the list doesn't read
 * as a single-item empty state. Opened from the bell icon in `GlobalHeader`
 * via its `notificationsOpen` / `notificationsPanel` props.
 *
 * Only the AI Review Assist card is interactive (it's the one live request
 * in this prototype) and shows a "Review request" CTA on hover, per Figma's
 * "Notification Card hover" state (node 40002596:61906). The rest are
 * static filler notifications — missed calls, a low call score alert, a
 * scheduled meeting — for visual density, matching Figma's mixed feed.
 */

interface DummyNotification {
  icon: typeof IconChartBar;
  title: string;
  description: string;
  time: string;
  unread?: boolean;
  tint?: "error" | "muted";
}

const DUMMY_NOTIFICATIONS: DummyNotification[] = [
  {
    icon: IconChartBar,
    title: "Low call score",
    description: "Call quality dropped below 70 on a recent call.",
    time: "Just now",
    tint: "error",
  },
  {
    icon: IconPhone,
    title: "+44 2233421231",
    description: "You missed a call on +44 7423221123.",
    time: "2 minutes ago",
    tint: "error",
  },
  {
    icon: IconCalendar,
    title: "Meeting scheduled with John Doe",
    description: "01:45 PM – 02:00 PM, 24th September 2025",
    time: "1 hour ago",
  },
  {
    icon: IconPhone,
    title: "+44 2233421231",
    description: "You missed a call on +44 7423221123.",
    time: "1 day ago",
  },
];

const UNREAD_COUNT = 1 + DUMMY_NOTIFICATIONS.filter((n) => n.unread).length;

export interface NotificationPanelProps {
  /** Name of the team member whose request is surfaced, e.g. "Talan Gouse". */
  requesterName: string;
  onReview?: () => void;
}

export function NotificationPanel({ requesterName, onReview }: NotificationPanelProps) {
  return (
    <div className="flex w-[420px] flex-col overflow-hidden rounded-[2px] border border-line bg-white shadow-300">
      <div className="flex items-center gap-4 bg-secondary-bg p-4">
        <p className="flex-1 text-heading-lg text-foreground">Notifications</p>
      </div>

      <div className="flex w-full items-center justify-between border-b border-line px-4">
        <div className="flex items-start gap-8">
          <div className="relative flex flex-col items-start gap-2 py-3">
            <span className="text-label-md text-foreground">All</span>
            <span className="absolute bottom-0 left-0 h-1 w-[17px] rounded-t-[8px] bg-brand" />
          </div>
          <span className="py-3 text-label-md text-muted-foreground">
            Unread ({UNREAD_COUNT})
          </span>
        </div>
        <button type="button" className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto py-3")}>
          Mark all as read
        </button>
      </div>

      <div className="flex max-h-[480px] w-full flex-col overflow-y-auto">
        <div
          role="button"
          tabIndex={0}
          onClick={onReview}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onReview?.();
          }}
          className="group flex w-full cursor-pointer items-start gap-3 border-b border-line bg-brand-subtle px-6 py-4 text-left outline-none"
        >
          <span className="flex shrink-0 items-center justify-center rounded-full bg-white p-2">
            <IconTranscriptionAi className="size-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="flex w-full flex-col gap-1">
              <span className="w-full text-label-md text-foreground">
                {requesterName} requested AI Review Assist access
              </span>
              <span className="w-full text-paragraph-sm text-muted-foreground">
                Review and assign a license.
              </span>
            </span>
            <span className="relative flex h-7 items-center">
              <span className="text-paragraph-sm text-disabled-fg transition-opacity group-hover:opacity-0">
                1 hour ago
              </span>
              <Button
                size="xs"
                variant="primary"
                onClick={(event) => {
                  event.stopPropagation();
                  onReview?.();
                }}
                className="pointer-events-none absolute inset-y-0 left-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
              >
                Review request
              </Button>
            </span>
          </span>
        </div>

        {DUMMY_NOTIFICATIONS.map((notification, index) => {
          const Icon = notification.icon;
          return (
            <div
              key={index}
              className={cn(
                "flex w-full items-start gap-3 border-b border-line px-6 py-4 text-left last:border-b-0",
                notification.unread ? "bg-brand-subtle" : "bg-white"
              )}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full p-2",
                  notification.unread ? "bg-white" : "bg-secondary-bg",
                  notification.tint === "error" ? "text-error" : "text-muted-foreground"
                )}
              >
                <Icon size={16} className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="w-full text-label-md text-foreground">
                  {notification.title}
                </span>
                <span className="w-full text-paragraph-sm text-muted-foreground">
                  {notification.description}
                </span>
                <span className="w-full text-paragraph-sm text-disabled-fg">
                  {notification.time}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
