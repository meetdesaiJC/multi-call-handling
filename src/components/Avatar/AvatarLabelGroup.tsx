import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, type AvatarProps } from "./Avatar";

/**
 * AvatarLabelGroup — synced from Figma "Avatar-label-group".
 *
 * Avatar + primary / secondary text row used in lists and menus.
 *   State → hover / focus are CSS on the whole control; `disabled` greys copy
 */

export interface AvatarLabelGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  /** Bold primary line (name). */
  name: React.ReactNode;
  /** Muted secondary line (email / role). */
  description?: React.ReactNode;
  /** Passed through to the leading `Avatar`. */
  avatarProps?: Omit<AvatarProps, "size">;
  /** Grey out avatar + text. */
  disabled?: boolean;
}

export const AvatarLabelGroup = React.forwardRef<
  HTMLDivElement,
  AvatarLabelGroupProps
>(
  (
    {
      className,
      name,
      description,
      avatarProps,
      disabled = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        data-disabled={disabled || undefined}
        className={cn(
          "inline-flex items-center gap-3 rounded-[4px] outline-none",
          "focus-visible:ring-2 focus-visible:ring-brand/24",
          disabled && "pointer-events-none",
          className
        )}
        {...props}
      >
        <Avatar size="lg" disabled={disabled} {...avatarProps} />
        <div className="flex min-w-0 flex-col">
          <span
            className={cn(
              "text-label-md truncate",
              disabled ? "text-disabled-fg" : "text-foreground"
            )}
          >
            {name}
          </span>
          {description != null && description !== "" && (
            <span
              className={cn(
                "text-paragraph-sm truncate",
                disabled ? "text-disabled-fg" : "text-muted-foreground"
              )}
            >
              {description}
            </span>
          )}
        </div>
      </div>
    );
  }
);
AvatarLabelGroup.displayName = "AvatarLabelGroup";
