import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import type { ReactNode } from "react";
import { Tag, type TagColor } from "./Tag";
import { Avatar } from "@/components/Avatar";
import { IconFile } from "@/components/Icon";
import { DURATION } from "@/lib/motion";

const COLORS = [
  "grey",
  "blue-grey",
  "purple",
  "indigo",
  "orange",
  "pink",
  "green",
  "red",
  "ai",
] as const satisfies readonly TagColor[];

const OUTLINE_COLORS = [
  "grey",
  "blue-grey",
  "purple",
  "indigo",
  "orange",
  "pink",
  "green",
] as const satisfies readonly TagColor[];

const meta = {
  title: "Components/Tag",
  component: Tag,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    color: { control: "select", options: [...COLORS] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    outline: { control: "boolean" },
    children: { control: "text" },
  },
  args: { children: "Tags", color: "grey", size: "lg" },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

export const Grey: Story = { args: { color: "grey" } };
export const BlueGrey: Story = { args: { color: "blue-grey" } };
export const Purple: Story = { args: { color: "purple" } };
export const Indigo: Story = { args: { color: "indigo" } };
export const Orange: Story = { args: { color: "orange" } };
export const Pink: Story = { args: { color: "pink" } };
export const Green: Story = { args: { color: "green" } };
export const Red: Story = { args: { color: "red" } };
export const AI: Story = { args: { color: "ai" } };

export const Outline: Story = {
  args: { color: "purple", outline: true },
};

export const WithIcon: Story = {
  args: {
    color: "pink",
    icon: <IconFile size={20} />,
  },
};

export const WithAvatar: Story = {
  args: {
    color: "purple",
    avatar: (
      <Avatar
        size="xs"
        src="https://i.pravatar.cc/40?u=tag"
        alt=""
      />
    ),
  },
};

export const Removable: Story = {
  args: {
    color: "indigo",
    onClose: () => undefined,
  },
};

export const AvatarRemovable: Story = {
  args: {
    color: "orange",
    avatar: (
      <Avatar
        size="xs"
        src="https://i.pravatar.cc/40?u=tag-close"
        alt=""
      />
    ),
    onClose: () => undefined,
  },
};

export const IconRemovable: Story = {
  args: {
    color: "pink",
    icon: <IconFile size={20} />,
    onClose: () => undefined,
  },
};

/** All Figma colors × sizes, plus outline and content variants. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <Section title="Colors (Large)">
        {COLORS.map((color) => (
          <Tag key={color} color={color} size="lg">
            Tags
          </Tag>
        ))}
      </Section>

      <Section title="Sizes">
        <Tag size="sm" color="purple">
          Tags
        </Tag>
        <Tag size="md" color="purple">
          Tags
        </Tag>
        <Tag size="lg" color="purple">
          Tags
        </Tag>
      </Section>

      <Section title="Outline">
        {OUTLINE_COLORS.map((color) => (
          <Tag key={color} color={color} size="lg" outline>
            Tags
          </Tag>
        ))}
      </Section>

      <Section title="With close">
        {(["grey", "pink", "orange", "indigo", "purple", "blue-grey"] as const).map(
          (color) => (
            <Tag key={color} color={color} size="lg" onClose={() => undefined}>
              Tags
            </Tag>
          )
        )}
      </Section>

      <Section title="With avatar">
        {(["grey", "pink", "orange", "indigo", "purple", "blue-grey"] as const).map(
          (color) => (
            <Tag
              key={color}
              color={color}
              size="lg"
              avatar={
                <Avatar
                  size="xs"
                  src={`https://i.pravatar.cc/40?u=${color}`}
                  alt=""
                />
              }
            >
              Tags
            </Tag>
          )
        )}
      </Section>

      <Section title="Avatar + close">
        {(["grey", "pink", "orange", "indigo", "purple", "blue-grey"] as const).map(
          (color) => (
            <Tag
              key={color}
              color={color}
              size="lg"
              avatar={
                <Avatar
                  size="xs"
                  src={`https://i.pravatar.cc/40?u=${color}-x`}
                  alt=""
                />
              }
              onClose={() => undefined}
            >
              Tags
            </Tag>
          )
        )}
      </Section>

      <Section title="With icon">
        {(["grey", "pink", "orange", "indigo", "purple", "blue-grey"] as const).map(
          (color) => (
            <Tag
              key={color}
              color={color}
              size="lg"
              icon={<IconFile size={20} />}
            >
              Tags
            </Tag>
          )
        )}
      </Section>

      <Section title="Icon + close">
        {(["grey", "pink", "orange", "indigo", "purple", "blue-grey"] as const).map(
          (color) => (
            <Tag
              key={color}
              color={color}
              size="lg"
              icon={<IconFile size={20} />}
              onClose={() => undefined}
            >
              Tags
            </Tag>
          )
        )}
      </Section>

      <Section title="Group (input / table pattern)">
        <div className="flex flex-wrap items-center gap-2">
          <Tag color="purple">Tags</Tag>
          <Tag color="indigo">Tags</Tag>
          <Tag color="orange">Tags</Tag>
          <Tag color="grey">+4</Tag>
        </div>
      </Section>
    </div>
  ),
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label-sm text-muted-foreground">{title}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/**
 * `open` hands presence to the Tag. It scales rather than slides — sliding
 * one tag out of a row reads as the whole row drifting.
 */
export const Dismissible: Story = {
  render: () => {
    const [tags, setTags] = React.useState(["Design", "Engineering", "Sales"]);
    const [closing, setClosing] = React.useState<string[]>([]);
    return (
      <div className="flex items-center gap-2">
        {tags.map((t) => (
          <Tag
            key={t}
            open={!closing.includes(t)}
            onClose={() => {
              setClosing((c) => [...c, t]);
              // Drop it from the list only once the exit has played.
              window.setTimeout(
                () => setTags((list) => list.filter((x) => x !== t)),
                DURATION.fast
              );
            }}
          >
            {t}
          </Tag>
        ))}
        {tags.length === 0 && (
          <button
            type="button"
            onClick={() => {
              setClosing([]);
              setTags(["Design", "Engineering", "Sales"]);
            }}
            className="text-label-md text-brand hover:underline"
          >
            Reset
          </button>
        )}
      </div>
    );
  },
};
