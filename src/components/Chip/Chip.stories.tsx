import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { useState } from "react";
import { Chip } from "./Chip";
import { IconPhoneNumber, IconSearch } from "@/components/Icon";

const SIZES = ["lg", "md", "sm"] as const;

const meta = {
  title: "Components/Chip",
  component: Chip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["filter", "suggestion"] },
    size: { control: "select", options: [...SIZES] },
    selected: { control: "boolean" },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
    children: { control: "text" },
  },
  args: {
    children: "Finance",
    variant: "filter",
    size: "lg",
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithIcon: Story = {
  args: { icon: <IconPhoneNumber size={16} /> },
};

export const Selected: Story = {
  args: { selected: true },
};

export const SelectedWithIcon: Story = {
  args: { selected: true, icon: <IconPhoneNumber size={16} /> },
};

export const Loading: Story = {
  args: { loading: true },
};

export const LoadingWithIcon: Story = {
  args: { loading: true, icon: <IconPhoneNumber size={16} /> },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Suggestion: Story = {
  args: {
    variant: "suggestion",
    children: "Health",
    icon: <IconSearch size={20} />,
  },
};

export const SuggestionTextOnly: Story = {
  args: { variant: "suggestion", children: "Health" },
};

/** Interactive filter chip — click to select / deselect. */
export const Interactive: Story = {
  render: function InteractiveChip() {
    const [selected, setSelected] = useState(false);
    return (
      <Chip
        selected={selected}
        onSelectedChange={setSelected}
        onRemove={() => setSelected(false)}
      >
        Finance
      </Chip>
    );
  },
};

/** All Figma filter states × sizes × configurations. */
export const AllFilterStates: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {SIZES.map((size) => (
        <Section
          key={size}
          title={`${size.toUpperCase()} — ${size === "lg" ? "40px" : size === "md" ? "36px" : "28px"}`}
        >
          <div className="flex flex-col gap-4">
            <Row label="Text only">
              <Chip size={size}>Finance</Chip>
              <Chip size={size} className="bg-surface-hover">
                Finance
              </Chip>
              <Chip size={size} disabled>
                Finance
              </Chip>
              <Chip size={size} selected>
                Finance
              </Chip>
              <Chip size={size} loading>
                Finance
              </Chip>
            </Row>
            <Row label="With icon">
              <Chip size={size} icon={<IconPhoneNumber size={16} />}>
                Finance
              </Chip>
              <Chip
                size={size}
                icon={<IconPhoneNumber size={16} />}
                className="bg-surface-hover"
              >
                Finance
              </Chip>
              <Chip size={size} icon={<IconPhoneNumber size={16} />} disabled>
                Finance
              </Chip>
              <Chip size={size} icon={<IconPhoneNumber size={16} />} selected>
                Finance
              </Chip>
              <Chip size={size} icon={<IconPhoneNumber size={16} />} loading>
                Finance
              </Chip>
            </Row>
          </div>
        </Section>
      ))}
    </div>
  ),
};

/** Suggestion chips — Default / Hover × icon / text. */
export const AllSuggestionStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Row label="Default">
        <Chip variant="suggestion" icon={<IconSearch size={20} />}>
          Health
        </Chip>
        <Chip variant="suggestion">Health</Chip>
      </Row>
      <Row label="Hover">
        <Chip
          variant="suggestion"
          icon={<IconSearch size={20} />}
          className="bg-surface-hover"
        >
          Health
        </Chip>
        <Chip variant="suggestion" className="bg-surface-hover">
          Health
        </Chip>
      </Row>
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
      {children}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
