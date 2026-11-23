import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { AvatarColor, AvatarSize } from "./Avatar";

/**
 * Thumbnail — synced from Figma "Design System 2.0 / Thumbnail".
 *
 * Squircle counterpart to `Avatar` for content / entity imagery.
 * Same size / color / initials / image / placeholder matrix; corners are
 * rounded rectangles instead of circles.
 */

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

const thumbnailVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none",
  {
    variants: {
      size: {
        xs: "size-5 rounded-[4px]",
        sm: "size-6 rounded-[4px]",
        md: "size-8 rounded-[6px]",
        lg: "size-10 rounded-[8px]",
        xxl: "size-[68px] rounded-[12px]",
      },
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
    defaultVariants: { size: "md", color: "indigo", disabled: false },
  }
);

const initialsText: Record<Exclude<AvatarSize, never>, string> = {
  xs: "text-[10px] leading-[14px] font-normal uppercase",
  sm: "text-paragraph-sm font-medium",
  md: "text-paragraph-md",
  lg: "text-[16px] leading-6 font-medium",
  xxl: "text-heading-xxl",
};

const userIconInset: Record<AvatarSize, string> = {
  xs: "inset-[10%]",
  sm: "inset-[16.67%]",
  md: "inset-[18.75%]",
  lg: "inset-[20%]",
  xxl: "inset-[22%]",
};

const radiusBySize: Record<AvatarSize, string> = {
  xs: "rounded-[4px]",
  sm: "rounded-[4px]",
  md: "rounded-[6px]",
  lg: "rounded-[8px]",
  xxl: "rounded-[12px]",
};

export interface ThumbnailProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    Omit<VariantProps<typeof thumbnailVariants>, "disabled" | "color"> {
  src?: string;
  alt?: string;
  initials?: string;
  color?: AvatarColor;
  disabled?: boolean;
}

export const Thumbnail = React.forwardRef<HTMLSpanElement, ThumbnailProps>(
  (
    {
      className,
      size = "md",
      color = "indigo",
      src,
      alt = "",
      initials,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const resolvedSize = size ?? "md";
    const showImage = Boolean(src);
    const showInitials = !showImage && Boolean(initials);

    return (
      <span
        ref={ref}
        data-disabled={disabled || undefined}
        className={cn(
          thumbnailVariants({
            size: resolvedSize,
            color: disabled ? undefined : color,
            disabled,
          }),
          showImage && !disabled && "bg-transparent text-transparent",
          !disabled &&
            "hover:outline hover:outline-1 hover:outline-offset-0 hover:outline-brand focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand",
          className
        )}
        {...props}
      >
        {showImage ? (
          <>
            {disabled && (
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 bg-disabled-fg",
                  radiusBySize[resolvedSize]
                )}
              />
            )}
            <img
              src={src}
              alt={alt}
              className={cn(
                "absolute inset-0 size-full object-cover",
                radiusBySize[resolvedSize],
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
    );
  }
);
Thumbnail.displayName = "Thumbnail";

export { thumbnailVariants };
