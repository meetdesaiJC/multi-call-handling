import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, type AvatarProps, type AvatarSize } from "./Avatar";
import { AvatarAddButton } from "./AvatarAddButton";

/**
 * AvatarGroup — synced from Figma "Group-avatars".
 *
 * Overlapping stack of avatars with an optional "+N" overflow chip and an
 * optional trailing add button. Children should be `<Avatar>` elements;
 * extras beyond `max` collapse into the overflow count.
 */

const overlapBySize: Record<Exclude<AvatarSize, "xxl">, string> = {
  xs: "-space-x-1",
  sm: "-space-x-1.5",
  md: "-space-x-2",
  lg: "-space-x-2.5",
};

const addButtonSize: Record<
  Exclude<AvatarSize, "xxl">,
  "xsm" | "sm" | "md" | "lg"
> = {
  xs: "xsm",
  sm: "sm",
  md: "md",
  lg: "lg",
};

export interface AvatarGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Max avatars shown before collapsing into "+N". Default 3. */
  max?: number;
  /** Size applied to every avatar / overflow chip / add button. */
  size?: Exclude<AvatarSize, "xxl">;
  /** Show the trailing "+" invite button. */
  showAddButton?: boolean;
  /** Click handler for the add button. */
  onAddClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
}

export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    {
      className,
      max = 3,
      size = "md",
      showAddButton = false,
      onAddClick,
      children,
      ...props
    },
    ref
  ) => {
    const items = React.Children.toArray(children).filter(React.isValidElement);
    const visible = items.slice(0, max);
    const overflow = items.length - visible.length;

    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center gap-1", className)}
        {...props}
      >
        <div className={cn("flex items-center", overlapBySize[size])}>
          {visible.map((child, index) => {
            if (!React.isValidElement<AvatarProps>(child)) return child;
            return React.cloneElement(child, {
              size: child.props.size ?? size,
              outline: child.props.outline ?? true,
              // Later avatars sit under earlier ones (leftmost on top).
              className: cn("relative", child.props.className),
              style: {
                ...child.props.style,
                zIndex: visible.length - index,
              },
            });
          })}

          {overflow > 0 && (
            <Avatar
              size={size}
              color="grey"
              initials={`+${overflow}`}
              outline
              className="relative"
              style={{ zIndex: 0 }}
            />
          )}
        </div>

        {showAddButton && (
          <AvatarAddButton size={addButtonSize[size]} onClick={onAddClick} />
        )}
      </div>
    );
  }
);
AvatarGroup.displayName = "AvatarGroup";
