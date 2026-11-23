import * as React from "react";
import {
  Avatar,
  avatarVariants,
  type AvatarColor,
  type AvatarProps,
} from "@/components/Avatar";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import type { AssignmentPerson } from "./scriptPlaybook";

const MEMBER_AVATAR_COLORS: AvatarColor[] = [
  "indigo",
  "purple",
  "pink",
  "orange",
  "bluegrey",
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function colorForId(id: string): AvatarColor {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % MEMBER_AVATAR_COLORS.length;
  }
  return MEMBER_AVATAR_COLORS[hash];
}

function UsersGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.333 12.25v-.875A2.042 2.042 0 0 0 7.292 9.333H3.792A2.042 2.042 0 0 0 1.75 11.375V12.25M5.542 6.417A2.042 2.042 0 1 0 5.542 2.333a2.042 2.042 0 0 0 0 4.084ZM12.25 12.25v-.875a2.042 2.042 0 0 0-1.531-1.977M9.187 2.385a2.042 2.042 0 0 1 0 3.955"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A voice agent is software, so it gets a glyph rather than initials. */
function VoiceAgentGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.083 4.667h5.834c.966 0 1.75.783 1.75 1.75v3.208c0 .966-.784 1.75-1.75 1.75H4.083a1.75 1.75 0 0 1-1.75-1.75V6.417c0-.967.784-1.75 1.75-1.75ZM7 2.333v2.334M5.542 7.583v.875M8.458 7.583v.875"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 2.333a.583.583 0 1 0 0-1.166.583.583 0 0 0 0 1.166Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GlyphAvatar({
  glyph,
  tone,
  size = "md",
  outline = true,
  className,
  style,
  ...props
}: {
  glyph: (props: { size: number }) => React.ReactElement;
  tone: string;
} & Pick<AvatarProps, "size" | "outline" | "className" | "style"> &
  Omit<React.HTMLAttributes<HTMLSpanElement>, "color">) {
  const resolved = size === "xxl" ? "lg" : (size ?? "md");
  const iconPx =
    resolved === "xs" ? 10 : resolved === "sm" ? 12 : resolved === "md" ? 14 : 16;
  const Glyph = glyph;

  return (
    <span
      className={cn(avatarVariants({ size: resolved }), className)}
      style={style}
      {...props}
    >
      <span
        className={cn(
          "relative flex size-full items-center justify-center overflow-hidden rounded-full",
          tone,
          outline && "border border-white"
        )}
      >
        <Glyph size={iconPx} />
      </span>
    </span>
  );
}

function AssignmentFace({
  person,
  ...props
}: {
  person: AssignmentPerson;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "color">) {
  if (person.kind === "group") {
    return (
      <GlyphAvatar
        glyph={UsersGlyph}
        tone="bg-avatar-indigo-bg text-avatar-indigo-fg"
        size="md"
        outline
        tabIndex={0}
        aria-label={person.name}
        {...props}
      />
    );
  }

  if (person.kind === "agent") {
    return (
      <GlyphAvatar
        glyph={VoiceAgentGlyph}
        tone="bg-avatar-purple-bg text-avatar-purple-fg"
        size="md"
        outline
        tabIndex={0}
        aria-label={person.name}
        {...props}
      />
    );
  }

  return (
    <Avatar
      size="md"
      outline
      initials={initialsFromName(person.name)}
      color={colorForId(person.id)}
      tabIndex={0}
      aria-label={person.name}
      {...props}
    />
  );
}

export function AssignmentAvatarStack({ people }: { people: AssignmentPerson[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);

  if (people.length === 0) {
    return <span className="text-paragraph-md text-muted-foreground">–</span>;
  }

  const max = 3;
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((person, index) => (
        <span
          key={person.id}
          className="relative"
          style={{
            zIndex: openId === person.id ? 50 : visible.length - index,
          }}
        >
          <TooltipTrigger
            placement="top"
            onOpenChange={(open) => setOpenId(open ? person.id : null)}
            content={
              <Tooltip
                theme="dark"
                arrow="bottom-center"
                title={
                  person.kind === "agent"
                    ? `${person.name} · Voice agent`
                    : person.name
                }
              />
            }
          >
            <AssignmentFace person={person} />
          </TooltipTrigger>
        </span>
      ))}
      {overflow > 0 ? (
        <Avatar
          size="md"
          color="grey"
          initials={`+${overflow}`}
          outline
          className="relative"
          style={{ zIndex: 0 }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
