import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Avatar — synced from Figma "Design System 2.0 / Avatars" (node 3464:126105).
 *
 * Figma exposes it as a matrix of:
 *   Size   → `size` (xs / sm / md / lg / xxl = 20 / 24 / 32 / 40 / 68px)
 *   Type   → Image (`src`), Text (`initials`), or Placeholder (user icon)
 *   Color  → soft tag pair for text / placeholder fills
 *   State  → hover / focus are CSS; `disabled` greys the control
 *   Status → optional presence indicator (Available / OOO / On call / …)
 *   Action → XXL profile only — upload (no photo) or edit (has photo)
 */

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xxl";
export type AvatarColor =
  | "indigo"
  | "purple"
  | "pink"
  | "orange"
  | "grey"
  | "bluegrey";
export type AvatarStatus =
  | "available"
  | "ooo"
  | "on-call"
  | "wrap-up"
  | "dnd";

const avatarVariants = cva(
  // Outer shell stays overflow-visible so the status dot / XXL action
  // button can sit on the rim without being clipped.
  "relative inline-flex shrink-0 select-none",
  {
    variants: {
      size: {
        xs: "size-5",
        sm: "size-6",
        md: "size-8",
        lg: "size-10",
        xxl: "size-[68px]",
      },
    },
    defaultVariants: { size: "md" },
  }
);

const surfaceVariants = cva(
  "relative flex size-full items-center justify-center overflow-hidden rounded-full",
  {
    variants: {
      color: {
        indigo: "bg-avatar-indigo-bg text-avatar-indigo-fg",
        purple: "bg-avatar-purple-bg text-avatar-purple-fg",
        pink: "bg-avatar-pink-bg text-avatar-pink-fg",
        orange: "bg-avatar-orange-bg text-avatar-orange-fg",
        grey: "bg-avatar-grey-bg text-avatar-grey-fg",
        bluegrey: "bg-avatar-bluegrey-bg text-avatar-bluegrey-fg",
      },
      disabled: {
        true: "bg-muted text-disabled-fg",
        false: "",
      },
    },
    defaultVariants: { color: "indigo", disabled: false },
  }
);

const initialsText: Record<AvatarSize, string> = {
  xs: "text-[10px] leading-[14px] font-normal uppercase",
  sm: "text-paragraph-sm font-medium",
  md: "text-paragraph-md",
  lg: "text-[14px] leading-5 font-normal",
  xxl: "text-heading-xxl",
};

// Border is layered on top of the 8px dot (box-sizing: border-box would
// otherwise eat into the fill, making the dot look smaller than 8x8).
const indicatorSize: Record<Exclude<AvatarSize, "xxl">, string> = {
  xs: "size-[11px] border-[1.5px]",
  sm: "size-[11px] border-[1.5px]",
  md: "size-[11px] border-[1.5px]",
  lg: "size-[11px] border-[1.5px]",
};

const statusColor: Record<AvatarStatus, string> = {
  available: "bg-status-available",
  ooo: "bg-status-ooo",
  "on-call": "bg-status-on-call",
  "wrap-up": "bg-status-wrap-up",
  dnd: "bg-status-dnd",
};

const userIconInset: Record<AvatarSize, string> = {
  xs: "inset-[10%]",
  sm: "inset-[16.67%]",
  md: "inset-[18.75%]",
  lg: "inset-[20%]",
  xxl: "inset-[22%]",
};

/* ------------------------------------------------------------------ */
/* Icons — paths exported from Figma (user / upload / pencil / plus). */
/* ------------------------------------------------------------------ */

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M0.75 18.75V16.75C0.75 15.6891 1.17143 14.6717 1.92157 13.9216C2.67172 13.1714 3.68913 12.75 4.75 12.75H8.75C9.81087 12.75 10.8283 13.1714 11.5784 13.9216C12.3286 14.6717 12.75 15.6891 12.75 16.75V18.75M2.75 4.75C2.75 5.81087 3.17143 6.82828 3.92157 7.57843C4.67172 8.32857 5.68913 8.75 6.75 8.75C7.81087 8.75 8.82828 8.32857 9.57843 7.57843C10.3286 6.82828 10.75 5.81087 10.75 4.75C10.75 3.68913 10.3286 2.67172 9.57843 1.92157C8.82828 1.17143 7.81087 0.75 6.75 0.75C5.68913 0.75 4.67172 1.17143 3.92157 1.92157C3.17143 2.67172 2.75 3.68913 2.75 4.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 13"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M0.5 9.16667V10.5C0.5 10.8536 0.640476 11.1928 0.890524 11.4428C1.14057 11.6929 1.47971 11.8333 1.83333 11.8333H9.83333C10.187 11.8333 10.5261 11.6929 10.7761 11.4428C11.0262 11.1928 11.1667 10.8536 11.1667 10.5V9.16667M9.16667 3.83333L5.83333 0.5L2.5 3.83333M5.83333 0.5V8.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M6.83333 1.71891L9.5 4.38558M0.5 10.719H3.16667L10.1667 3.71895C10.5203 3.36533 10.719 2.88572 10.719 2.38562C10.719 1.88552 10.5203 1.40591 10.1667 1.05228C9.81304 0.698663 9.33343 0.5 8.83333 0.5C8.33324 0.5 7.85362 0.698663 7.5 1.05228L0.5 8.05228V10.719Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 11 11"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5.16667 0.5V9.83333M0.5 5.16667H9.83333"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Presence indicator                                                  */
/* ------------------------------------------------------------------ */

export interface AvatarIndicatorProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status?: AvatarStatus;
  size?: Exclude<AvatarSize, "xxl">;
}

export function AvatarIndicator({
  className,
  status = "available",
  size = "md",
  ...props
}: AvatarIndicatorProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute right-0 bottom-0 rounded-full border-white",
        indicatorSize[size],
        statusColor[status],
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  /** Diameter. xs/sm/md/lg/xxl = 20/24/32/40/68px. */
  size?: AvatarSize;
  /** Profile image URL. Wins over `initials` when set. */
  src?: string;
  /** Alt text for the image. */
  alt?: string;
  /** One or two initials shown when there is no `src`. */
  initials?: string;
  /** Soft fill / text pair for initials and placeholder. */
  color?: AvatarColor;
  /** Grey out the avatar (and desaturate images). */
  disabled?: boolean;
  /** Presence dot at the bottom-right. Hidden on `xxl`. */
  status?: AvatarStatus;
  /** White ring — used when stacking in an `AvatarGroup`. */
  outline?: boolean;
  /**
   * XXL profile action. Defaults to `"upload"` with no `src`, `"edit"` with
   * a `src`. Pass `false` to hide the button.
   */
  action?: "upload" | "edit" | false;
  /** Click handler for the XXL action button. */
  onActionClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      className,
      size = "md",
      color = "indigo",
      src,
      alt = "",
      initials,
      disabled = false,
      status,
      outline = false,
      action,
      onActionClick,
      ...props
    },
    ref
  ) => {
    const resolvedSize = size ?? "md";
    const isXxl = resolvedSize === "xxl";
    const showImage = Boolean(src);
    const showInitials = !showImage && Boolean(initials);
    const resolvedAction =
      !isXxl || action === false
        ? null
        : (action ?? (showImage ? "edit" : "upload"));

    // Indicator only ships on the non-profile sizes in Figma.
    const showStatus = Boolean(status) && !isXxl;

    return (
      <span
        ref={ref}
        data-disabled={disabled || undefined}
        className={cn(avatarVariants({ size: resolvedSize }), className)}
        {...props}
      >
        <span
          className={cn(
            surfaceVariants({
              color: disabled ? undefined : color,
              disabled,
            }),
            // Image avatars have no fill — the photo is the surface.
            showImage && !disabled && "bg-transparent text-transparent",
            outline && "border border-white",
            // Hover / focus ring — brand for photos, line for text/placeholder.
            !disabled &&
              (showImage
                ? "hover:outline hover:outline-1 hover:outline-offset-0 hover:outline-brand focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand"
                : "hover:outline hover:outline-1 hover:outline-offset-0 hover:outline-line focus-visible:outline focus-visible:outline-1 focus-visible:outline-line")
          )}
        >
          {showImage ? (
            <>
              {/* Disabled photos sit on a grey plate at 50% opacity. */}
              {disabled && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-disabled-fg"
                />
              )}
              <img
                src={src}
                alt={alt}
                className={cn(
                  "absolute inset-0 size-full rounded-full object-cover",
                  disabled && "opacity-50"
                )}
              />
            </>
          ) : showInitials ? (
            <span
              className={cn(
                "text-center whitespace-nowrap",
                initialsText[resolvedSize]
              )}
            >
              {initials}
            </span>
          ) : (
            <span
              className={cn(
                "absolute overflow-hidden",
                userIconInset[resolvedSize]
              )}
            >
              <UserIcon className="size-full" />
            </span>
          )}
        </span>

        {showStatus && status && (
          <AvatarIndicator
            status={status}
            size={resolvedSize as Exclude<AvatarSize, "xxl">}
          />
        )}

        {resolvedAction && (
          <button
            type="button"
            disabled={disabled}
            aria-label={
              resolvedAction === "upload" ? "Upload photo" : "Edit photo"
            }
            onClick={onActionClick}
            className={cn(
              "absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full border bg-white p-1.5 text-foreground outline-none",
              "border-line hover:bg-surface-hover",
              "focus-visible:ring-2 focus-visible:ring-brand/24",
              "disabled:pointer-events-none disabled:border-line disabled:text-disabled-fg"
            )}
          >
            {resolvedAction === "upload" ? (
              <UploadIcon className="size-4" />
            ) : (
              <PencilIcon className="size-4" />
            )}
          </button>
        )}
      </span>
    );
  }
);
Avatar.displayName = "Avatar";

export { avatarVariants };
